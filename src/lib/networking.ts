import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Category, GameMove, Room, RoomStatus, SyncableGameState } from '../types/game.types';
import { ROOM_CODE_LENGTH } from '../constants/game-config';

// Generate random alphanumeric room code
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 for readability
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Convert DB snake_case row to Room interface
function rowToRoom(row: Record<string, unknown>): Room {
  return {
    id: row.id as string,
    code: row.code as string,
    hostName: row.host_name as string,
    guestName: (row.guest_name as string) || null,
    categories: (row.categories as Category[]) || [],
    crosswordId: (row.crossword_id as number) || null,
    status: row.status as RoomStatus,
    language: row.language as 'es' | 'en',
  };
}

// Create a room (host)
export async function createRoom(
  hostName: string,
  categories: Category[],
  language: 'es' | 'en'
): Promise<{ room: Room | null; error: string | null }> {
  // Retry up to 3 times on code collision
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateRoomCode();
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        code,
        host_name: hostName,
        categories,
        language,
        status: 'waiting',
      })
      .select()
      .single();

    if (error) {
      // Unique constraint violation on code → retry
      if (error.code === '23505') continue;
      return { room: null, error: 'create_failed' };
    }

    return { room: rowToRoom(data), error: null };
  }

  return { room: null, error: 'code_collision' };
}

// Join a room (guest)
export async function joinRoom(
  code: string,
  guestName: string
): Promise<{ room: Room | null; error: string | null }> {
  // Find the room
  const { data: existing, error: findError } = await supabase
    .from('rooms')
    .select()
    .eq('code', code.toUpperCase())
    .eq('status', 'waiting')
    .is('guest_name', null)
    .single();

  if (findError || !existing) {
    return { room: null, error: 'room_not_found' };
  }

  // Update with guest name
  const { data: updated, error: updateError } = await supabase
    .from('rooms')
    .update({ guest_name: guestName })
    .eq('id', existing.id)
    .is('guest_name', null) // optimistic lock
    .select()
    .single();

  if (updateError || !updated) {
    return { room: null, error: 'room_full' };
  }

  return { room: rowToRoom(updated), error: null };
}

// Subscribe to room changes (Realtime postgres_changes)
export function subscribeToRoom(
  roomId: string,
  callbacks: {
    onGuestJoined?: (guestName: string) => void;
    onStatusChanged?: (status: RoomStatus) => void;
    onGameStateChanged?: (state: SyncableGameState) => void;
  }
): RealtimeChannel {
  const channel = supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`,
      },
      (payload) => {
        const row = payload.new as Record<string, unknown>;

        if (row.guest_name && callbacks.onGuestJoined) {
          callbacks.onGuestJoined(row.guest_name as string);
        }

        if (callbacks.onStatusChanged) {
          callbacks.onStatusChanged(row.status as RoomStatus);
        }

        if (row.game_state && callbacks.onGameStateChanged) {
          callbacks.onGameStateChanged(row.game_state as SyncableGameState);
        }
      }
    )
    .subscribe();

  return channel;
}

// Update room status
export async function updateRoomStatus(roomId: string, status: RoomStatus): Promise<void> {
  await supabase.from('rooms').update({ status }).eq('id', roomId);
}

// Host syncs game state to room (writes to game_state JSONB column)
export async function syncGameState(roomId: string, state: SyncableGameState): Promise<void> {
  await supabase
    .from('rooms')
    .update({
      game_state: state,
      crossword_id: state.crosswordId,
      status: state.status === 'finished' ? 'finished' : 'playing',
    })
    .eq('id', roomId);
}

// Create a Realtime broadcast channel for guest→host moves
export function createGameChannel(roomId: string): RealtimeChannel {
  return supabase.channel(`game:${roomId}`);
}

// Guest sends a move to host
export function sendMove(channel: RealtimeChannel, move: GameMove): void {
  channel.send({
    type: 'broadcast',
    event: 'game-move',
    payload: move,
  });
}

// Host listens for guest moves
export function onMove(
  channel: RealtimeChannel,
  callback: (move: GameMove) => void
): RealtimeChannel {
  return channel.on('broadcast', { event: 'game-move' }, (payload) => {
    callback(payload.payload as GameMove);
  });
}

// Presence tracking for disconnect detection
export function setupPresence(
  channel: RealtimeChannel,
  userId: string,
  onPresenceChange: (presentUsers: string[]) => void
): void {
  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const users = Object.values(state)
        .flat()
        .map((p) => (p as Record<string, string>).user_id);
      onPresenceChange(users);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: userId });
      }
    });
}

// Clean up: leave room
export async function leaveRoom(roomId: string): Promise<void> {
  // Remove all channels for this room
  const channels = supabase.getChannels();
  for (const ch of channels) {
    if (ch.topic.includes(roomId)) {
      await supabase.removeChannel(ch);
    }
  }
}

// Delete rooms older than 24 hours (opportunistic cleanup)
export async function cleanupStaleRooms(): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await supabase.from('rooms').delete().lt('created_at', cutoff);
}

// Fetch room by code (for guest before joining)
export async function getRoomByCode(code: string): Promise<{ room: Room | null; error: string | null }> {
  const { data, error } = await supabase
    .from('rooms')
    .select()
    .eq('code', code.toUpperCase())
    .single();

  if (error || !data) {
    return { room: null, error: 'Room not found' };
  }

  return { room: rowToRoom(data), error: null };
}
