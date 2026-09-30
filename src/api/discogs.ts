import type { DiscogsPagination } from '../util/types';

type PaginatedDiscogsResponse = {
  pagination: DiscogsPagination;
};

type DiscogsResource = 'collection' | 'wantlist';

class DiscogsRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'DiscogsRequestError';
    this.status = status;
  }
}

export const canRetryDiscogsRequest = (error: unknown) => !(
  error instanceof DiscogsRequestError
  && (error.status === 403 || error.status === 404)
);

const getRequestError = (resource: DiscogsResource, status: number) => {
  if (status === 429) {
    return new DiscogsRequestError(
      'Discogs rate limit reached. Try again in a few minutes.',
      status,
    );
  }

  if (status === 403 || status === 404) {
    return new DiscogsRequestError(
      `This ${resource} can't be shown. Check the username and make sure the ${resource} is public.`,
      status,
    );
  }

  return new DiscogsRequestError(`Discogs request failed (${status}). Try again later.`, status);
};

export const fetchAllDiscogsPages = async <Page extends PaginatedDiscogsResponse, Item>(
  initialUrl: string,
  resource: DiscogsResource,
  signal: AbortSignal,
  getPageItems: (page: Page) => Item[],
): Promise<Item[]> => {
  const items: Item[] = [];
  let nextUrl: string | undefined = initialUrl;

  while (nextUrl) {
    let response: Response;

    try {
      response = await fetch(nextUrl, { signal });
    } catch (error) {
      if (signal.aborted) throw error;

      if (navigator.onLine) {
        throw new DiscogsRequestError(
          'Discogs rate limit reached. Try again in a few minutes.',
          429,
        );
      }

      throw new DiscogsRequestError(
        'Discogs could not be reached. Check your connection and try again.',
        0,
      );
    }

    if (!response.ok) {
      throw getRequestError(resource, response.status);
    }

    const page = await response.json() as Page;
    items.push(...getPageItems(page));
    nextUrl = page.pagination.urls.next;
  }

  return items;
};
