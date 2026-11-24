import { describe, expect, it } from 'vitest'

import { trailerVideo } from '@/test/fixtures/trailer'

import { rankTrailerVideos } from './trailer'

const video = (id: string, overrides: Partial<Parameters<typeof trailerVideo>[0]> = {}) =>
  trailerVideo({
    id: `youtube:${id}`,
    videoId: id,
    ...overrides,
  })

describe('trailer presentation ranking', () => {
  it('puts official videos before unofficial videos within a type', () => {
    const ranked = rankTrailerVideos(
      [video('aaaaaaaaaaa', { official: false }), video('bbbbbbbbbbb', { official: true })],
      'en'
    )

    expect(ranked.map((entry) => entry.videoId)).toEqual(['bbbbbbbbbbb', 'aaaaaaaaaaa'])
  })

  it('never lets the language refinement override type or official precedence', () => {
    const ranked = rankTrailerVideos(
      [
        video('aaaaaaaaaaa', { type: 'teaser', official: true, language: 'en' }),
        video('bbbbbbbbbbb', { type: 'trailer', official: false, language: 'es' }),
      ],
      'es'
    )

    expect(ranked.map((entry) => entry.videoId)).toEqual(['bbbbbbbbbbb', 'aaaaaaaaaaa'])
  })

  it('refines within a step using the interface language', () => {
    const ranked = rankTrailerVideos(
      [
        video('aaaaaaaaaaa', { language: 'es' }),
        video('bbbbbbbbbbb', { language: 'ja' }),
        video('ccccccccccc', { language: 'en' }),
      ],
      'en'
    )

    expect(ranked.map((entry) => entry.videoId)).toEqual([
      'ccccccccccc',
      'aaaaaaaaaaa',
      'bbbbbbbbbbb',
    ])
  })

  it('preserves server order for equal keys instead of reordering randomly', () => {
    const input = [video('aaaaaaaaaaa'), video('bbbbbbbbbbb'), video('ccccccccccc')]

    expect(rankTrailerVideos(input, 'en').map((entry) => entry.videoId)).toEqual([
      'aaaaaaaaaaa',
      'bbbbbbbbbbb',
      'ccccccccccc',
    ])
    expect(rankTrailerVideos(input, 'en')).toEqual(rankTrailerVideos(input, 'en'))
  })

  it('re-ranks on language change without filtering or dropping videos', () => {
    const input = [
      video('aaaaaaaaaaa', { language: 'es' }),
      video('bbbbbbbbbbb', { language: 'en' }),
    ]

    const english = rankTrailerVideos(input, 'en')
    const spanish = rankTrailerVideos(input, 'es')

    expect(english).toHaveLength(2)
    expect(spanish).toHaveLength(2)
    expect(english[0]?.videoId).toBe('bbbbbbbbbbb')
    expect(spanish[0]?.videoId).toBe('aaaaaaaaaaa')
  })
})
