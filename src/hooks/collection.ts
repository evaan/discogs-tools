import { useQuery } from '@tanstack/react-query';
import { fetchAllDiscogsPages } from '../api/discogs';
import type { DiscogsCollectionRelease, DiscogsCollectionResponse } from '../util/types';

export const getCollectionQueryKey = (username: string | null) => [
  'collection',
  username?.toLowerCase() ?? '',
] as const;

const fetchCollection = (username: string, signal: AbortSignal) => fetchAllDiscogsPages<
  DiscogsCollectionResponse,
  DiscogsCollectionRelease
>(
  `https://api.discogs.com/users/${encodeURIComponent(username)}/collection/folders/0/releases?per_page=500&sort=label&sort_order=asc`,
  'collection',
  signal,
  (page) => page.releases,
);

export const useCollection = (username: string | null) => useQuery({
  queryKey: getCollectionQueryKey(username),
  queryFn: ({ signal }) => fetchCollection(username!, signal),
  enabled: Boolean(username),
  retry: false,
  staleTime: 5 * 60 * 1000,
  gcTime: 24 * 60 * 60 * 1000,
});
