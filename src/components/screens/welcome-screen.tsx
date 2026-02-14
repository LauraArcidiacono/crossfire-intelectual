import { useTranslation } from 'react-i18next';

export function WelcomeScreen() {
  const { t } = useTranslation();

  return (
    <div data-testid="welcome-screen" className="min-h-screen bg-cream flex flex-col items-center justify-center">
      <h1 className="font-title text-4xl font-bold text-forest-green">
        {t('welcome.title')}
      </h1>
      <p className="font-body text-lg text-warm-brown mt-2">
        {t('welcome.subtitle')}
      </p>
    </div>
  );
}
