import { useState } from 'react';
import { getReleaseGenres } from '../util/releases';
import type { DiscogsCollectionRelease } from '../util/types';

type GenrePieChartProps = {
  onGenreSelect: (name: string) => void;
  releases: DiscogsCollectionRelease[];
  selectedGenres: string[];
};

type GenreSlice = {
  color: string;
  count: number;
  name: string;
};

type GenreTooltip = {
  count: number;
  name: string;
  placement: 'bottom' | 'left' | 'right' | 'top';
  x: number;
  y: number;
};

type PositionedGenreSlice = GenreSlice & {
  percentage: number;
  startPercentage: number;
};

const genreColors = [
  '#f97316',
  '#06b6d4',
  '#8b5cf6',
  '#22c55e',
  '#eab308',
  '#ec4899',
  '#64748b',
  '#ef4444',
  '#14b8a6',
  '#6366f1',
  '#84cc16',
  '#f59e0b',
  '#d946ef',
  '#0ea5e9',
  '#a16207',
];
const genreCollator = new Intl.Collator(undefined, { sensitivity: 'base' });

const getGenreSlices = (releases: DiscogsCollectionRelease[]): GenreSlice[] => {
  const genreCounts = new Map<string, number>();

  releases.forEach((release) => {
    const releaseGenres = new Set(getReleaseGenres(release.basic_information));

    releaseGenres.forEach((genre) => {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    });
  });

  return [...genreCounts]
    .sort(([firstName, firstCount], [secondName, secondCount]) => (
      secondCount - firstCount || genreCollator.compare(firstName, secondName)
    ))
    .map(([name, count], index) => ({
      color: genreColors[index % genreColors.length],
      count,
      name,
    }));
};

const GenrePieChart = ({ onGenreSelect, releases, selectedGenres }: GenrePieChartProps) => {
  const [hoveredGenre, setHoveredGenre] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<GenreTooltip | null>(null);

  if (releases.length === 0) return null;

  const slices = getGenreSlices(releases);
  const totalGenreCount = slices.reduce((total, slice) => total + slice.count, 0);
  const positionedSlices = slices.map((slice, index) => {
    const precedingCount = slices
      .slice(0, index)
      .reduce((total, precedingSlice) => total + precedingSlice.count, 0);
    return {
      ...slice,
      percentage: slice.count / totalGenreCount * 100,
      startPercentage: precedingCount / totalGenreCount * 100,
    };
  });
  const chartDescription = slices
    .map((slice) => `${slice.name}: ${slice.count}`)
    .join(', ');

  const showTooltip = (slice: PositionedGenreSlice) => {
    const middleAngle = (slice.startPercentage + slice.percentage / 2) / 100 * Math.PI * 2 - Math.PI / 2;
    const horizontalDirection = Math.cos(middleAngle);
    const verticalDirection = Math.sin(middleAngle);
    const tooltipRadius = 50;
    const placement = Math.abs(horizontalDirection) > Math.abs(verticalDirection)
      ? horizontalDirection > 0 ? 'right' : 'left'
      : verticalDirection > 0 ? 'bottom' : 'top';

    setTooltip({
      count: slice.count,
      name: slice.name,
      placement,
      x: 50 + horizontalDirection * tooltipRadius,
      y: 50 + verticalDirection * tooltipRadius,
    });
  };

  return (
    <section className="mb-5 border-y border-current/10 py-3.5" aria-labelledby="genre-breakdown-title">
      <h2 id="genre-breakdown-title" className="mb-2.5 text-sm font-bold tracking-[-0.02em]">Genre breakdown</h2>
      <div className="grid grid-cols-[6rem_1fr] items-center gap-3 sm:grid-cols-[7rem_1fr] sm:gap-6">
        <div className="relative h-24 w-24 sm:h-28 sm:w-28">
          <svg
            viewBox="0 0 100 100"
            role="group"
            aria-label={`Interactive genre breakdown. ${chartDescription}`}
            className="absolute inset-0 overflow-visible"
          >
            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="18" opacity="0.08" />
            {positionedSlices.map((slice) => (
              <circle
                key={slice.name}
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={slice.color}
                strokeWidth="18"
                pathLength="100"
                strokeDasharray={`${slice.percentage} ${100 - slice.percentage}`}
                strokeDashoffset={-slice.startPercentage}
                transform="rotate(-90 50 50)"
                role="img"
                tabIndex={0}
                aria-label={`${slice.name}: ${slice.count} releases`}
                className="outline-none"
                onPointerEnter={() => showTooltip(slice)}
                onPointerLeave={() => setTooltip(null)}
                onFocus={() => showTooltip(slice)}
                onBlur={() => setTooltip(null)}
              />
            ))}
          </svg>
          {tooltip && (
            <div
              role="tooltip"
              className={`pointer-events-none absolute z-10 max-w-36 whitespace-nowrap rounded border border-current/15 bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-950 shadow-sm ${tooltip.placement === 'right'
                ? 'translate-x-2 -translate-y-1/2'
                : tooltip.placement === 'left'
                  ? '-translate-x-[calc(100%+0.5rem)] -translate-y-1/2'
                  : tooltip.placement === 'bottom'
                    ? '-translate-x-1/2 translate-y-2'
                    : '-translate-x-1/2 -translate-y-[calc(100%+0.5rem)]'}`}
              style={{ left: `${tooltip.x}%`, top: `${tooltip.y}%` }}
            >
              {tooltip.name} <span className="ml-1 opacity-45">{tooltip.count}</span>
            </div>
          )}
        </div>
        <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
          {slices.map((slice) => (
            <li key={slice.name}>
              <button
                type="button"
                aria-pressed={selectedGenres.includes(slice.name)}
                className={`flex w-full min-w-0 items-center gap-2 rounded px-1.5 py-1 text-left text-xs outline-none focus-visible:ring-1 focus-visible:ring-current/25 ${selectedGenres.includes(slice.name) ? 'bg-current/8' : hoveredGenre === slice.name ? 'bg-current/5' : ''}`}
                onClick={() => onGenreSelect(slice.name)}
                onMouseEnter={() => setHoveredGenre(slice.name)}
                onMouseLeave={() => setHoveredGenre(null)}
                onFocus={() => setHoveredGenre(slice.name)}
                onBlur={() => setHoveredGenre(null)}
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate font-medium">{slice.name}</span>
                <span className="shrink-0 text-[11px] tabular-nums opacity-45">
                  {slice.count}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default GenrePieChart;
