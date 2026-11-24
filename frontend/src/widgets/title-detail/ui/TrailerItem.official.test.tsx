import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TrailerItem } from './TrailerItem'
import { renderWithProviders } from '@/test/renderWithProviders'
import { trailerVideo } from '@/test/fixtures/trailer'

const renderItem = (video = trailerVideo(), selected = false) =>
  renderWithProviders(
    <TrailerItem video={video} selected={selected} playing={false} onSelect={vi.fn()} />
  )

describe('TrailerItem official status', () => {
  it('shows no official claim when the provider flag is false', async () => {
    await renderItem(trailerVideo({ official: false }))

    expect(screen.queryByText('Official')).toBeNull()
  })

  it('shows the official label only for an explicit true flag', async () => {
    await renderItem(trailerVideo({ official: true }))

    expect(screen.getByText('Official')).toBeInTheDocument()
  })

  it('labels a non-interface-language video without presenting it as localized', async () => {
    await renderItem(
      trailerVideo({
        language: 'ja',
        title: '日本語トレーラー',
      })
    )

    expect(screen.getByText('Language: Japanese')).toBeInTheDocument()
    expect(screen.queryByText(/localized|dubbed|interface language/i)).toBeNull()
    expect(screen.getByText('日本語トレーラー')).toBeInTheDocument()
  })

  it('never infers an official claim from another field', async () => {
    await renderItem(
      trailerVideo({
        official: false,
        type: 'trailer',
        title: 'Official Trailer (uploader title)',
      })
    )

    expect(screen.queryByText('Official')).toBeNull()
  })
})
