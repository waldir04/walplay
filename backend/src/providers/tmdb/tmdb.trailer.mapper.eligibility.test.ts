import { describe, expect, it } from 'vitest'

import { mapTmdbTrailers } from './tmdb.trailer.mapper.js'
import type { TrailerRecordFixture } from '../../test/fixtures/tmdb/trailers.js'
import {
  absentOfficialTrailer,
  duplicateKeyRecord,
  malformedKeyRecord,
  mixedLanguageRecord,
  nonYouTubeRecord,
  officialTrailer,
  sampleTrailerPayload,
  unknownTypeRecord,
} from '../../test/fixtures/tmdb/trailers.js'

const context = {
  now: Date.parse('2026-11-24T12:00:00.000Z'),
  embedHosts: ['www.youtube-nocookie.com'],
  externalHosts: ['www.youtube.com'],
}

const map = (records: readonly TrailerRecordFixture[]) =>
  mapTmdbTrailers({ results: records }, context)

describe('tmdb trailer mapping eligibility', () => {
  it('keeps only YouTube, eligible, well-formed records with a usable title', () => {
    const videos = map([
      officialTrailer(),
      nonYouTubeRecord(),
      unknownTypeRecord(),
      malformedKeyRecord(),
      {
        id: '5f30',
        iso_639_1: 'en',
        iso_3166_1: 'US',
        name: '   ',
        key: 'emptytitle1',
        site: 'YouTube',
        size: null,
        type: 'Trailer',
        official: true,
        published_at: null,
      },
    ])

    expect(videos.map((video) => video.videoId)).toEqual(['dQw4w9WgXcQ'])
  })

  it('drops every record when the result list is missing or null', () => {
    expect(mapTmdbTrailers({ results: null }, context)).toEqual([])
    expect(mapTmdbTrailers({}, context)).toEqual([])
  })

  it('maps the documented provider type vocabulary and drops unknown values', () => {
    const base = officialTrailer()
    const videos = map([
      { ...base, key: 'trailer0001', type: 'Trailer' },
      { ...base, key: 'teaser00002', type: 'Teaser' },
      { ...base, key: 'featuret001', type: 'Featurette' },
      { ...base, key: 'clip0000001', type: 'Clip' },
      { ...base, key: 'behindscene', type: 'Behind the Scenes' },
      { ...base, key: 'bloopers001', type: 'Bloopers' },
      { ...base, key: 'openingcred', type: 'Opening Credits' },
      { ...base, key: 'recap000001', type: 'Recap' },
    ])

    expect(new Set(videos.map((video) => video.type))).toEqual(
      new Set(['trailer', 'teaser', 'featurette', 'clip', 'behind-the-scenes', 'bloopers'])
    )
  })

  it('keeps a duplicated identifier once and merges official, language, and date', () => {
    const videos = map([
      {
        ...officialTrailer(),
        name: 'First Listing',
        official: false,
        iso_639_1: null,
        published_at: null,
      },
      {
        ...duplicateKeyRecord(),
        name: 'Official Listing',
        official: true,
        iso_639_1: 'en',
        published_at: '2025-05-01T10:00:00.000Z',
      },
    ])

    expect(videos).toHaveLength(1)
    expect(videos[0]).toMatchObject({
      id: 'youtube:dQw4w9WgXcQ',
      title: 'Official Listing',
      official: true,
      language: 'en',
      publishedAt: '2025-05-01T10:00:00.000Z',
    })
  })

  it('marks a collapsed duplicate official when any record says official', () => {
    const videos = map([
      { ...officialTrailer(), official: false, name: 'Unofficial copy' },
      { ...duplicateKeyRecord(), official: true },
    ])

    expect(videos[0]?.official).toBe(true)
  })

  it('never invents an official claim for absent or false flags', () => {
    const videos = map([absentOfficialTrailer()])
    expect(videos[0]?.official).toBe(false)
  })

  it('keeps only usable ISO 639-1 language codes', () => {
    const base = officialTrailer()
    const videos = map([
      { ...base, key: 'validlang01', iso_639_1: 'ES' },
      { ...base, key: 'invalidlg01', iso_639_1: 'english' },
      { ...base, key: 'unknownlg01', iso_639_1: 'zz' },
      { ...base, key: 'emptylang01', iso_639_1: null },
    ])

    const byId = new Map(videos.map((video) => [video.videoId, video]))
    expect(byId.get('validlang01')?.language).toBe('es')
    expect(byId.get('invalidlg01')?.language).toBeUndefined()
    expect(byId.get('unknownlg01')?.language).toBeUndefined()
    expect(byId.get('emptylang01')?.language).toBeUndefined()
  })

  it('keeps only valid, non-future publication dates', () => {
    const videos = map([
      { ...officialTrailer(), key: 'validdate01' },
      { ...officialTrailer(), key: 'futuredate1', published_at: '2999-01-01T00:00:00.000Z' },
      { ...officialTrailer(), key: 'invaliddate', published_at: 'not-a-date' },
      { ...officialTrailer(), key: 'nodate00001', published_at: null },
    ])

    const byId = new Map(videos.map((video) => [video.videoId, video]))
    expect(byId.get('validdate01')?.publishedAt).toBe('2026-01-15T12:00:00.000Z')
    expect(byId.get('futuredate1')?.publishedAt).toBeUndefined()
    expect(byId.get('invaliddate')?.publishedAt).toBeUndefined()
    expect(byId.get('nodate00001')?.publishedAt).toBeUndefined()
  })

  it('normalizes titles without translating or inventing text', () => {
    const videos = map([
      { ...officialTrailer(), name: '  Official   Trailer  ' },
      mixedLanguageRecord(),
    ])

    expect(videos.find((video) => video.videoId === 'dQw4w9WgXcQ')?.title).toBe(
      'Official Trailer'
    )
    expect(videos.find((video) => video.videoId === 'esES1234567')?.title).toBe('Tráiler Oficial')
  })

  it('drops a record when no authorized host can build a destination', () => {
    expect(
      mapTmdbTrailers(
        { results: sampleTrailerPayload().results },
        { now: context.now, embedHosts: [], externalHosts: [] }
      )
    ).toEqual([])
  })
})
