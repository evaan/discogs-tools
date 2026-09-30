import { useQueryClient } from '@tanstack/react-query';
import { useDeferredValue, useState } from 'react';
import { canRetryDiscogsRequest } from '../api/discogs';
import DiscogsSearch from '../components/DiscogsSearch';
import GenrePieChart from '../components/GenrePieChart';
import RecordRelease from '../components/RecordRelease';
import { getCollectionQueryKey, useCollection } from '../hooks/collection';
import { getArtistName, getReleaseArtistNames, getReleaseGenres } from '../util/releases';
import type {
  DiscogsCollectionRelease,
  RecordReleaseData,
  RecordReleaseLayout,
  RecordReleaseSort,
  RecordReleaseSortDirection,
} from '../util/types';

const releaseCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});
const loadingPlaceholders = Array.from({ length: 10 }, (_, index) => index);

const toRecordRelease = ({ basic_information: releaseInfo }: DiscogsCollectionRelease): RecordReleaseData => {
  const format = releaseInfo.formats.map((releaseFormat) => {
    const name = releaseFormat.qty === '1'
      ? releaseFormat.name
      : `${releaseFormat.qty}x ${releaseFormat.name}`;

    return [name, ...(releaseFormat.descriptions ?? []), releaseFormat.text]
      .filter((value): value is string => Boolean(value))
      .join(' / ');
  }).join(' / ');

  return {
    discogsUrl: `https://www.discogs.com/release/${releaseInfo.id}`,
    coverImage: releaseInfo.cover_image || releaseInfo.thumb,
    title: releaseInfo.title.trim(),
    artists: releaseInfo.artists.map(getArtistName),
    format,
    tags: releaseInfo.genres,
  };
};

const filterReleases = (
  releases: DiscogsCollectionRelease[],
  searchTerm: string,
  genreFilters: string[],
) => {
  const normalizedSearchTerm = searchTerm.trim().toLocaleLowerCase();

  if (!normalizedSearchTerm && genreFilters.length === 0) return releases;

  return releases.filter((release) => {
    const releaseInfo = release.basic_information;

    const releaseGenres = getReleaseGenres(releaseInfo);
    if (!genreFilters.every((genre) => releaseGenres.includes(genre))) {
      return false;
    }

    if (!normalizedSearchTerm) return true;

    const searchableValues = [
      releaseInfo.title,
      ...releaseInfo.artists.flatMap((artist) => [artist.name, artist.anv]),
      ...(release.notes ?? []).map((note) => note.value),
    ];

    return searchableValues.some((value) => value.toLocaleLowerCase().includes(normalizedSearchTerm));
  });
};

const sortReleases = (
  releases: DiscogsCollectionRelease[],
  sortField: RecordReleaseSort,
  direction: RecordReleaseSortDirection,
) => releases.toSorted((first, second) => {
  const firstReleaseInfo = first.basic_information;
  const secondReleaseInfo = second.basic_information;
  let comparison = 0;

  if (sortField === 'name') {
    comparison = releaseCollator.compare(firstReleaseInfo.title, secondReleaseInfo.title);
  } else if (sortField === 'artist') {
    comparison = releaseCollator.compare(
      getReleaseArtistNames(firstReleaseInfo).replace(/^the\s+/i, ''),
      getReleaseArtistNames(secondReleaseInfo).replace(/^the\s+/i, ''),
    );
  } else if (sortField === 'released') {
    if (!firstReleaseInfo.year || !secondReleaseInfo.year) {
      if (firstReleaseInfo.year !== secondReleaseInfo.year) {
        return firstReleaseInfo.year ? -1 : 1;
      }
    } else {
      comparison = firstReleaseInfo.year - secondReleaseInfo.year;
    }
  } else {
    comparison = Date.parse(first.date_added) - Date.parse(second.date_added);
  }

  const directedComparison = direction === 'asc' ? comparison : -comparison;

  return directedComparison
    || releaseCollator.compare(firstReleaseInfo.title, secondReleaseInfo.title)
    || first.instance_id - second.instance_id;
});

const Collection = () => {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState<string | null>(null);
  const [releaseLayout, setReleaseLayout] = useState<RecordReleaseLayout>('grid');
  const [sortField, setSortField] = useState<RecordReleaseSort>('name');
  const [sortDirection, setSortDirection] = useState<RecordReleaseSortDirection>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [genreFilters, setGenreFilters] = useState<string[]>([]);
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const collectionQuery = useCollection(username);
  const filteredReleases = collectionQuery.data === undefined
    ? []
    : filterReleases(collectionQuery.data, deferredSearchTerm, genreFilters);
  const sortedReleases = sortReleases(filteredReleases, sortField, sortDirection);
  const hasSearchTerm = deferredSearchTerm.trim().length > 0;
  const hasActiveFilters = hasSearchTerm || genreFilters.length > 0;

  const handleUsernameSubmit = async (submittedUsername: string) => {
    setSearchTerm('');
    setGenreFilters([]);

    if (
      username?.toLowerCase() === submittedUsername.toLowerCase()
      && collectionQuery.isError
    ) {
      if (canRetryDiscogsRequest(collectionQuery.error)) {
        await collectionQuery.refetch();
      }
      return;
    }

    setUsername(submittedUsername);
    await queryClient.invalidateQueries({ queryKey: getCollectionQueryKey(submittedUsername) });
  };

  const handleGenreSelect = (name: string) => {
    setGenreFilters((currentFilters) => currentFilters.includes(name)
      ? currentFilters.filter((genre) => genre !== name)
      : [...currentFilters, name]);
  };

  return (
    <main className="mx-auto max-w-7xl px-5 py-5 sm:px-8 lg:px-10">
      <DiscogsSearch
        label="Enter username to search collection"
        onSubmit={handleUsernameSubmit}
      />
      {collectionQuery.isFetching && collectionQuery.data === undefined && (
        <section className="mt-8" role="status" aria-label="Loading collection">
          <div className="mb-5 flex items-center gap-2 text-xs font-medium opacity-50">
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 animate-spin" aria-hidden="true">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity="0.2" />
              <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Loading collection
          </div>
          <div className={releaseLayout === 'row'
            ? 'divide-y divide-current/10'
            : 'grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'} aria-hidden="true">
            {loadingPlaceholders.map((placeholder) => (
              <div key={placeholder} className={releaseLayout === 'row' ? 'flex items-center gap-3 py-3' : 'w-full max-w-56'}>
                <div className={`${releaseLayout === 'row' ? 'h-16 w-16 shrink-0' : 'aspect-square w-full'} animate-pulse rounded-md bg-current/8`} />
                <div className={releaseLayout === 'row' ? 'min-w-0 flex-1' : 'pt-2.5'}>
                  <div className="h-3.5 w-2/3 animate-pulse rounded bg-current/10" />
                  <div className="mt-2 h-2.5 w-1/2 animate-pulse rounded bg-current/7" />
                  <div className="mt-2 h-2 w-4/5 animate-pulse rounded bg-current/5" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {collectionQuery.isError && (
        <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600">
          {collectionQuery.error.message}
        </p>
      )}
      {collectionQuery.data !== undefined && (
        <section className="mt-5 [overflow-anchor:none]">
          <GenrePieChart
            releases={collectionQuery.data}
            selectedGenres={genreFilters}
            onGenreSelect={handleGenreSelect}
          />
          <div className="mb-5 flex w-full flex-wrap items-center gap-3">
            <p className="shrink-0 text-xs font-semibold uppercase tracking-wider opacity-45">
              Releases ({hasActiveFilters
                ? `${sortedReleases.length} of ${collectionQuery.data.length}`
                : collectionQuery.data.length})
            </p>
            <div className="relative min-w-40 flex-1">
              <label htmlFor="release-search" className="sr-only">Search releases</label>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-40" aria-hidden="true">
                <circle cx="7" cy="7" r="4.5" />
                <path d="m10.5 10.5 3 3" />
              </svg>
              <input
                id="release-search"
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search albums, artists, or notes (if they are public)"
                className="h-8 w-full rounded-md border border-current/20 bg-transparent pl-8 pr-8 text-xs outline-none transition-shadow placeholder:opacity-35 focus:border-current/50 focus:ring-3 focus:ring-current/10"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded opacity-40 transition-opacity hover:opacity-100"
                  aria-label="Clear release search"
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-3 w-3" aria-hidden="true">
                    <path d="m4 4 8 8M12 4l-8 8" />
                  </svg>
                </button>
              )}
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <label htmlFor="release-sort" className="sr-only">Sort releases</label>
              <div className="relative">
                <select
                  id="release-sort"
                  value={sortField}
                  onChange={(event) => setSortField(event.target.value as RecordReleaseSort)}
                  className="h-8 w-28 appearance-none rounded-md border border-current/20 bg-transparent pl-2.5 pr-7 text-xs font-medium outline-none focus:border-current/50"
                >
                  <option value="name">Name</option>
                  <option value="artist">Artist</option>
                  <option value="released">Release date</option>
                  <option value="added">Date added</option>
                </select>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 opacity-50" aria-hidden="true">
                  <path d="m4 6 4 4 4-4" />
                </svg>
              </div>
              <button
                type="button"
                onClick={() => setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-current/20 opacity-60 transition-opacity hover:opacity-100"
                aria-label={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
                title={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} aria-hidden="true">
                  <path d="M8 13.5v-11M4.5 6 8 2.5 11.5 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setReleaseLayout((current) => current === 'grid' ? 'row' : 'grid')}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-current/20 opacity-60 transition-opacity hover:opacity-100"
                aria-label={`Switch to ${releaseLayout === 'grid' ? 'row' : 'grid'} view`}
                title={`Switch to ${releaseLayout === 'grid' ? 'row' : 'grid'} view`}
              >
                {releaseLayout === 'grid' ? (
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
                    <path d="M2.5 3.5h11M2.5 8h11M2.5 12.5h11" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" className="h-4 w-4" aria-hidden="true">
                    <rect x="2" y="2" width="5" height="5" rx="0.75" />
                    <rect x="9" y="2" width="5" height="5" rx="0.75" />
                    <rect x="2" y="9" width="5" height="5" rx="0.75" />
                    <rect x="9" y="9" width="5" height="5" rx="0.75" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          {sortedReleases.length > 0 ? (
            <div className={releaseLayout === 'row'
              ? 'divide-y divide-current/15'
              : 'grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'}>
              {sortedReleases.map((release) => (
                <RecordRelease
                  key={release.instance_id}
                  release={toRecordRelease(release)}
                  layout={releaseLayout}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm opacity-60">
              {hasActiveFilters ? 'No matching releases.' : 'No releases found.'}
            </p>
          )}
        </section>
      )}
    </main>
  );
};

export default Collection;
