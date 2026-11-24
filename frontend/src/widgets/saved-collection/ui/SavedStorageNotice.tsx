import { useTranslation } from 'react-i18next'

export const SavedStorageNotice = () => {
  const { t } = useTranslation()

  return (
    <section
      aria-labelledby="saved-storage-notice-heading"
      className="flex flex-col gap-1 rounded-card border border-border bg-surface-raised p-4"
    >
      <h2 id="saved-storage-notice-heading" className="text-title text-text">
        {t('saved.storageNotice.title')}
      </h2>
      <p className="max-w-prose text-caption text-text-muted">
        {t('saved.storageNotice.description')}
      </p>
    </section>
  )
}
