export type RecordReleaseData = {
  discogsUrl: string;
  coverImage: string;
  title: string;
  artists: string[];
  format: string;
  tags: string[];
};

export type RecordReleaseLayout = 'grid' | 'row';

export type RecordReleaseSort = 'name' | 'artist' | 'released' | 'added';

export type RecordReleaseSortDirection = 'asc' | 'desc';

type DiscogsPaginationUrls = {
  next?: string;
};

export type DiscogsPagination = {
  urls: DiscogsPaginationUrls;
};

export type DiscogsFormat = {
  name: string;
  qty: string;
  text?: string;
  descriptions?: string[];
};

export type DiscogsArtist = {
  name: string;
  anv: string;
};

export type DiscogsBasicInformation = {
  id: number;
  thumb: string;
  cover_image: string;
  title: string;
  year: number;
  formats: DiscogsFormat[];
  artists: DiscogsArtist[];
  genres: string[];
};

export type DiscogsCollectionNote = {
  value: string;
};

export type DiscogsCollectionRelease = {
  instance_id: number;
  date_added: string;
  notes?: DiscogsCollectionNote[];
  basic_information: DiscogsBasicInformation;
};

export type DiscogsCollectionResponse = {
  pagination: DiscogsPagination;
  releases: DiscogsCollectionRelease[];
};

export type DiscogsWantlistRelease = {
  basic_information: DiscogsBasicInformation;
};

export type DiscogsWantlistResponse = {
  pagination: DiscogsPagination;
  wants: DiscogsWantlistRelease[];
};
