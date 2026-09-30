import { useQuery } from '@tanstack/react-query';
import { fetchAllDiscogsPages } from '../api/discogs';
import type { DiscogsWantlistRelease, DiscogsWantlistResponse } from '../util/types';

export const getWantlistQueryKey = (username: string | null) => [
  'wantlist',
  username?.toLowerCase() ?? '',
] as const;

const fetchWantlist = (username: string, signal: AbortSignal) => fetchAllDiscogsPages<
  DiscogsWantlistResponse,
  DiscogsWantlistRelease
>(
  `https://api.discogs.com/users/${encodeURIComponent(username)}/wants?per_page=100`,
  'wantlist',
  signal,
  (page) => page.wants,
);

export const useWantlist = (username: string | null) => useQuery({
  queryKey: getWantlistQueryKey(username),
  queryFn: ({ signal }) => fetchWantlist(username!, signal),
  enabled: Boolean(username),
  retry: false,
  staleTime: 5 * 60 * 1000,
  gcTime: 24 * 60 * 60 * 1000,
});
