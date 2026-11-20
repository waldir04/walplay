import { useTranslation } from 'react-i18next'

export const AppConfigError = () => {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-page py-16">
      <div
        role="alert"
        className="w-full max-w-md rounded-card border border-border bg-surface p-6"
      >
        <h1 className="text-title text-text">{t('errors.config.title')}</h1>
        <p className="mt-stack text-text-muted">{t('errors.config.description')}</p>
      </div>
    </div>
  )
}
