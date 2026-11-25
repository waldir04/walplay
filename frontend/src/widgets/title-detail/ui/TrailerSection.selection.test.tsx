import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { i18n } from '@/app/i18n'
import { TrailerSection } from './TrailerSection'
import { stubMeasuredWidth } from '@/test/measuredWidth'
import { availableTrailerEnvelope, trailerVideo } from '@/test/fixtures/trailer'
import { renderWithProviders } from '@/test/renderWithProviders'

const renderWithVideos = async (videos = [trailerVideo()]) => {
  const envelope = availableTrailerEnvelope(videos)
  return renderWithProviders(
    <TrailerSection
      state={{
        status: 'ready',
        data: envelope.data,
        meta: envelope.meta,
        onRetry: vi.fn(),
      }}
    />
  )
}

const manyVideos = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    trailerVideo({
      id: `youtube:v${String(index).padStart(10, '0')}`,
      videoId: `v${String(index).padStart(10, '0')}`,
      title: `Trailer ${index + 1}`,
      official: index === 0,
      language: index % 2 === 0 ? 'en' : 'es',
      publishedAt: undefined,
      embedUrl: `https://www.youtube-nocookie.com/embed/v${String(index).padStart(
        10,
        '0'
      )}?autoplay=1&playsinline=1`,
      externalUrl: `https://www.youtube.com/watch?v=v${String(index).padStart(10, '0')}`,
    })
  )

describe('TrailerSection selection and ordering', () => {
  it('selects the first ranked video by default without playing it', async () => {
    stubMeasuredWidth(800)
    await renderWithVideos(manyVideos(3))

    expect(screen.getAllByText('Trailer 1').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Play Trailer 1' })[0]!).toBeInTheDocument()
    expect(document.querySelector('iframe')).toBeNull()
    const list = screen.getByRole('list', { name: 'Available videos' })
    const items = within(list).getAllByRole('listitem')
    expect(items[0]).toHaveAttribute('aria-current', 'true')
    expect(items[1]).not.toHaveAttribute('aria-current')
  })

  it('switches videos as one coherent change with a single frame', async () => {
    stubMeasuredWidth(800)
    const user = userEvent.setup()
    await renderWithVideos(manyVideos(3))

    await user.click(screen.getAllByRole('button', { name: 'Play Trailer 1' })[0]!)
    await user.click(screen.getAllByRole('button', { name: 'Play Trailer 2' })[0]!)

    expect(document.querySelectorAll('iframe')).toHaveLength(1)
    expect(screen.getByTitle('Trailer 2 — YouTube player')).toBeInTheDocument()
    expect(screen.queryByTitle('Trailer 1 — YouTube player')).toBeNull()
    expect(screen.getAllByText('Selected')).toHaveLength(1)
  })

  it('ignores late activation results from older choices', async () => {
    stubMeasuredWidth(800)
    const user = userEvent.setup()
    await renderWithVideos(manyVideos(3))

    const first = screen.getAllByRole('button', { name: 'Play Trailer 1' })[0]!
    const second = screen.getAllByRole('button', { name: 'Play Trailer 2' })[0]!
    await user.click(first)
    await user.click(second)

    expect(document.querySelectorAll('iframe')).toHaveLength(1)
    expect(screen.getByTitle('Trailer 2 — YouTube player')).toBeInTheDocument()
  })

  it('preserves the selection and active player across an interface-language change', async () => {
    stubMeasuredWidth(800)
    const user = userEvent.setup()
    await renderWithVideos([
      trailerVideo({
        id: 'youtube:spanish0001',
        videoId: 'spanish0001',
        title: 'Trailer en español',
        official: true,
        language: 'es',
        embedUrl: 'https://www.youtube-nocookie.com/embed/spanish0001?autoplay=1&playsinline=1',
        externalUrl: 'https://www.youtube.com/watch?v=spanish0001',
      }),
      trailerVideo({
        id: 'youtube:english0001',
        videoId: 'english0001',
        title: 'English Trailer',
        official: true,
        language: 'en',
        embedUrl: 'https://www.youtube-nocookie.com/embed/english0001?autoplay=1&playsinline=1',
        externalUrl: 'https://www.youtube.com/watch?v=english0001',
      }),
    ])

    expect(screen.getAllByRole('button', { name: 'Play English Trailer' })[0]!).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Play English Trailer' })[0]!)
    const frame = screen.getByTitle('English Trailer — YouTube player')

    await i18n.changeLanguage('es')

    await waitFor(() =>
      expect(screen.getByTitle('English Trailer — reproductor de YouTube')).toBeInTheDocument()
    )
    expect(document.querySelectorAll('iframe')).toHaveLength(1)
    expect(screen.getByTitle('English Trailer — reproductor de YouTube')).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/english0001?autoplay=1&playsinline=1'
    )
    expect(screen.getByTitle('English Trailer — reproductor de YouTube')).toBe(frame)
    const list = screen.getByRole('list', { name: 'Videos disponibles' })
    const firstItem = within(list).getAllByRole('listitem')[0]
    expect(firstItem).toHaveTextContent('Trailer en español')
  })

  it('expands the list in place without another request', async () => {
    stubMeasuredWidth(800)
    const user = userEvent.setup()
    await renderWithVideos(manyVideos(8))

    const list = screen.getByRole('list', { name: 'Available videos' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(6)

    await user.click(screen.getByRole('button', { name: 'Show more videos' }))

    expect(
      within(screen.getByRole('list', { name: 'Available videos' })).getAllByRole('listitem')
    ).toHaveLength(8)
    expect(screen.getByRole('button', { name: 'Show fewer videos' })).toHaveAttribute(
      'aria-expanded',
      'true'
    )
    expect(document.querySelector('iframe')).toBeNull()
  })

  it('never announces the default selection as activation', async () => {
    stubMeasuredWidth(800)
    await renderWithVideos(manyVideos(2))

    expect(screen.queryByText(/selected\. Loading/)).toBeNull()
  })
})
