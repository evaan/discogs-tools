import type { RecordReleaseData, RecordReleaseLayout } from '../util/types';

type RecordReleaseProps = {
  release: RecordReleaseData;
  layout?: RecordReleaseLayout;
};

const RecordRelease = ({ release, layout = 'grid' }: RecordReleaseProps) => {
  const artistNames = release.artists.join(', ');
  const isRow = layout === 'row';

  return (
    <article className={isRow ? 'w-full' : 'w-full max-w-56'}>
      <a
        href={release.discogsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${isRow ? 'flex items-center gap-3 py-3' : 'block'} group rounded-md outline-none focus-visible:ring-2 focus-visible:ring-current/30`}
      >
        <img
          src={release.coverImage}
          alt={`${release.title} cover`}
          loading="lazy"
          className={`${isRow ? 'h-16 w-16 shrink-0' : 'aspect-square w-full'} rounded-md object-cover transition-opacity group-hover:opacity-85`}
        />

        <div className={isRow ? 'min-w-0' : 'min-w-0 pt-2.5'}>
          <h3 className="truncate text-sm font-semibold tracking-[-0.015em] group-hover:underline group-hover:decoration-current/30 group-hover:underline-offset-2">{release.title}</h3>
          <p className="mt-0.5 truncate text-xs opacity-60">{artistNames}</p>
          <p className="mt-1 truncate text-[11px] opacity-40">
            {release.format.replaceAll(' / ', ', ')}
            {isRow && release.tags.length > 0 && ` · ${release.tags.join(', ')}`}
          </p>
          {!isRow && release.tags.length > 0 && (
            <p className="mt-0.5 truncate text-[11px] opacity-40">{release.tags.join(', ')}</p>
          )}
        </div>
      </a>
    </article>
  );
};

export default RecordRelease;
