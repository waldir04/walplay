import { movieListItem, tvListItem } from './listPages.js'

export const movieWithNoPoster = () => movieListItem({ poster_path: null })
export const movieWithEmptyTitle = () =>
  movieListItem({ title: '   ', original_title: 'Original Only' })
export const movieWithoutAnyTitle = () => movieListItem({ title: null, original_title: '' })
export const movieWithoutDate = () => movieListItem({ release_date: null })
export const movieWithMalformedDate = () => movieListItem({ release_date: '15/10/1999' })
export const movieWithZeroVotes = () => movieListItem({ vote_average: 8, vote_count: 0 })
export const movieWithOutOfRangeRating = () => movieListItem({ vote_average: 42, vote_count: 10 })
export const movieWithUnknownGenres = () => movieListItem({ genre_ids: [9999] })
export const adultMovie = () => movieListItem({ adult: true })
export const tvWithoutPoster = () => tvListItem({ poster_path: '' })
