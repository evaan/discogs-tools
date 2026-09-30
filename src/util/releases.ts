import type { DiscogsArtist, DiscogsBasicInformation } from './types';

export const getArtistName = (artist: DiscogsArtist) => (
  artist.anv || artist.name
).replace(/\s+\(\d+\)$/, '');

export const getReleaseArtistNames = (release: DiscogsBasicInformation) => release.artists
  .map(getArtistName)
  .join(', ');

export const getReleaseGenres = (release: DiscogsBasicInformation) => {
  const genres = release.genres
    .map((genre) => genre.trim())
    .filter(Boolean);

  return genres.length > 0 ? genres : ['Uncategorized'];
};
