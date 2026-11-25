export interface TrailerRecordFixture {
  readonly id: string
  readonly iso_639_1: string | null
  readonly iso_3166_1: string | null
  readonly name: string
  readonly key: string
  readonly site: string
  readonly size: number | null
  readonly type: string
  readonly official?: boolean | null
  readonly published_at: string | null
}

const record = (overrides: Partial<TrailerRecordFixture> = {}): TrailerRecordFixture => ({
  id: '5f1a',
  iso_639_1: 'en',
  iso_3166_1: 'US',
  name: 'Official Trailer',
  key: 'dQw4w9WgXcQ',
  site: 'YouTube',
  size: 1080,
  type: 'Trailer',
  official: true,
  published_at: '2026-01-15T12:00:00.000Z',
  ...overrides,
})

export const officialTrailer = (): TrailerRecordFixture => record()

export const unofficialTrailer = (): TrailerRecordFixture =>
  record({
    id: '5f1b',
    key: 'abc123DEF45',
    name: 'Unofficial Trailer',
    official: false,
  })

export const absentOfficialTrailer = (): TrailerRecordFixture =>
  record({ id: '5f1c', key: 'zzz999ZZZ99', name: 'Unmarked Trailer', official: undefined })

export const nonYouTubeRecord = (): TrailerRecordFixture =>
  record({ id: '5f1d', key: 'vimeo123456', site: 'Vimeo' })

export const unknownTypeRecord = (): TrailerRecordFixture =>
  record({ id: '5f1e', key: 'unknownTYPE', type: 'Recap' })

export const malformedKeyRecord = (): TrailerRecordFixture =>
  record({ id: '5f1f', key: 'too-short', name: 'Malformed Key' })

export const duplicateKeyRecord = (): TrailerRecordFixture =>
  record({
    id: '5f20',
    key: 'dQw4w9WgXcQ',
    name: 'Official Trailer (Duplicate)',
    official: true,
    iso_639_1: null,
    published_at: null,
  })

export const mixedLanguageRecord = (): TrailerRecordFixture =>
  record({
    id: '5f21',
    key: 'esES1234567',
    name: 'Tráiler Oficial',
    type: 'Teaser',
    iso_639_1: 'es',
    official: false,
  })

export const futureDateRecord = (): TrailerRecordFixture =>
  record({
    id: '5f22',
    key: 'futureDATE1',
    name: 'Future Trailer',
    official: false,
    published_at: '2999-01-01T00:00:00.000Z',
  })

export const sampleTrailerPayload = (): {
  readonly id: number
  readonly results: readonly TrailerRecordFixture[]
} => ({
  id: 550,
  results: [
    officialTrailer(),
    unofficialTrailer(),
    absentOfficialTrailer(),
    nonYouTubeRecord(),
    unknownTypeRecord(),
    malformedKeyRecord(),
    duplicateKeyRecord(),
    mixedLanguageRecord(),
    futureDateRecord(),
  ],
})
