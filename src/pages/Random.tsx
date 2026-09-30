import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { canRetryDiscogsRequest } from '../api/discogs';
import DiscogsSearch from '../components/DiscogsSearch';
import { useCollection } from '../hooks/collection';
import { useWantlist } from '../hooks/wantlist';
import { getReleaseArtistNames } from '../util/releases';
import type { DiscogsCollectionRelease, DiscogsWantlistRelease } from '../util/types';

type RouletteMode = 'collection' | 'wantlist';
type RouletteRelease = DiscogsCollectionRelease | DiscogsWantlistRelease;

type RandomProps = {
  isDark: boolean;
};

const getReleaseKey = (release: RouletteRelease) => 'instance_id' in release
  ? release.instance_id
  : release.basic_information.id;

const getInitialMuted = () => localStorage.getItem('random-reel-muted') === 'true';

const pickRelease = (
  releases: RouletteRelease[],
  excludedReleaseKeys: Set<number>,
) => {
  const availableReleases = releases.filter((release) => !excludedReleaseKeys.has(getReleaseKey(release)));
  const candidates = availableReleases.length > 0 ? availableReleases : releases;
  return candidates[Math.floor(Math.random() * candidates.length)];
};

const buildReel = (
  releases: RouletteRelease[],
  previousWinnerKey: number | null,
) => {
  const winner = pickRelease(
    releases,
    previousWinnerKey === null ? new Set() : new Set([previousWinnerKey]),
  );
  const reelReleases: RouletteRelease[] = [];
  const previousWinner = previousWinnerKey === null
    ? undefined
    : releases.find((release) => getReleaseKey(release) === previousWinnerKey);

  if (previousWinner) {
    const precedingRelease = pickRelease(releases, new Set([getReleaseKey(previousWinner), getReleaseKey(winner)]));
    const followingRelease = pickRelease(releases, new Set([getReleaseKey(precedingRelease), getReleaseKey(previousWinner), getReleaseKey(winner)]));
    reelReleases.push(precedingRelease, previousWinner, followingRelease);
  }

  for (let index = reelReleases.length; index < 22; index += 1) {
    const previousRelease = reelReleases.at(-1);
    const excludedReleaseKeys = new Set([getReleaseKey(winner)]);

    if (previousRelease) excludedReleaseKeys.add(getReleaseKey(previousRelease));
    reelReleases.push(pickRelease(releases, excludedReleaseKeys));
  }

  const lastRelease = reelReleases.at(-1);
  const precedingRelease = pickRelease(releases, new Set([
    getReleaseKey(winner),
    lastRelease ? getReleaseKey(lastRelease) : -1,
  ]));
  reelReleases.push(precedingRelease);
  const winnerIndex = reelReleases.length;
  reelReleases.push(winner);
  reelReleases.push(pickRelease(releases, new Set([getReleaseKey(winner), getReleaseKey(precedingRelease)])));

  return { releases: reelReleases, winner, winnerIndex };
};

type ReelMarkersProps = {
  isDark?: boolean;
  isSelected?: boolean;
  isWantlist?: boolean;
};

const getWantlistReelClasses = (isDark: boolean) => isDark
  ? 'border-red-900/70 bg-zinc-950 text-red-100 shadow-[inset_0_0_70px_rgb(69_10_10/0.55),0_0_24px_rgb(127_29_29/0.12)]'
  : 'border-red-300/70 bg-red-50 text-red-950';

const ReelMarkers = ({ isDark = false, isSelected = false, isWantlist = false }: ReelMarkersProps) => (
  <>
    <div className={`pointer-events-none absolute inset-x-0 top-1/3 z-10 h-1/3 border-y ${isWantlist ? isDark ? 'border-red-500/35 bg-red-950/40 shadow-[inset_0_0_25px_rgb(127_29_29/0.2)]' : 'border-red-500/25 bg-red-100/55' : 'border-current/20 bg-current/[0.025]'}`} aria-hidden="true" />
    <svg viewBox="0 0 12 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`pointer-events-none absolute top-1/2 z-30 h-5 w-3 -translate-y-1/2 transition-[left,opacity,color] duration-100 ease-out motion-reduce:transition-none ${isWantlist ? isDark ? 'text-red-500' : 'text-red-600' : ''} ${isSelected ? 'left-2 opacity-30 sm:left-5' : 'left-4 opacity-60 sm:left-8'}`} aria-hidden="true">
      <path d="m3 2 7 8-7 8" />
    </svg>
    <svg viewBox="0 0 12 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`pointer-events-none absolute top-1/2 z-30 h-5 w-3 -translate-y-1/2 transition-[right,opacity,color] duration-100 ease-out motion-reduce:transition-none ${isWantlist ? isDark ? 'text-red-500' : 'text-red-600' : ''} ${isSelected ? 'right-2 opacity-30 sm:right-5' : 'right-4 opacity-60 sm:right-8'}`} aria-hidden="true">
      <path d="m9 2-7 8 7 8" />
    </svg>
  </>
);

const ReelPlaceholder = ({ isDark, isWantlist }: { isDark: boolean; isWantlist: boolean }) => (
  <section className="mx-auto mt-10 max-w-3xl" role="status" aria-label={`Loading ${isWantlist ? 'wantlist' : 'collection'}`}>
    <div className={`album-reel relative overflow-hidden border-y transition-[background-color,border-color,box-shadow,color] duration-200 ${isWantlist ? getWantlistReelClasses(isDark) : 'border-current/15'}`}>
      <ReelMarkers isDark={isDark} isWantlist={isWantlist} />
      <div className="reel-track" aria-hidden="true">
        {[0, 1, 2].map((placeholder) => (
          <div key={placeholder} className="reel-card flex items-center gap-3 px-10 sm:gap-4 sm:px-20">
            <div className="h-16 w-16 shrink-0 animate-pulse bg-current/8 sm:h-20 sm:w-20" />
            <div className="min-w-0 flex-1">
              <div className="h-4 w-2/3 animate-pulse rounded bg-current/10" />
              <div className="mt-2 h-3 w-2/5 animate-pulse rounded bg-current/7" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Random = ({ isDark }: RandomProps) => {
  const [mode, setMode] = useState<RouletteMode>('collection');
  const [reelMode, setReelMode] = useState<RouletteMode>('collection');
  const [username, setUsername] = useState<string | null>(null);
  const [reelReleases, setReelReleases] = useState<RouletteRelease[]>([]);
  const [winnerIndex, setWinnerIndex] = useState(-1);
  const [reelOffset, setReelOffset] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinRequest, setSpinRequest] = useState(0);
  const [isMuted, setIsMuted] = useState(getInitialMuted);
  const reelTrack = useRef<HTMLDivElement>(null);
  const reelAnimation = useRef<Animation | null>(null);
  const tickAudioContext = useRef<AudioContext | null>(null);
  const tickNoiseBuffer = useRef<AudioBuffer | null>(null);
  const tickFrame = useRef<number | null>(null);
  const isMutedRef = useRef(isMuted);
  const lastSelectedReleaseKey = useRef<number | null>(null);
  const shouldAutoSpin = useRef(false);
  const handledSpinRequest = useRef(0);
  const collectionQuery = useCollection(mode === 'collection' ? username : null);
  const wantlistQuery = useWantlist(mode === 'wantlist' ? username : null);
  const activeQuery = mode === 'collection' ? collectionQuery : wantlistQuery;
  const releases = activeQuery.data;

  const prepareTickAudio = () => {
    if (isMutedRef.current) return;

    const context = tickAudioContext.current ?? new AudioContext();
    tickAudioContext.current = context;

    if (context.state === 'suspended') {
      void context.resume().catch(() => undefined);
    }
  };

  const playTick = () => {
    const context = tickAudioContext.current;
    if (isMutedRef.current || !context || context.state !== 'running') return;

    if (!tickNoiseBuffer.current) {
      const sampleCount = Math.floor(context.sampleRate * 0.018);
      const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
      const samples = buffer.getChannelData(0);

      for (let index = 0; index < sampleCount; index += 1) {
        const decay = 1 - index / sampleCount;
        samples[index] = (Math.random() * 2 - 1) * decay * decay;
      }

      tickNoiseBuffer.current = buffer;
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const now = context.currentTime;

    source.buffer = tickNoiseBuffer.current;
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.Q.setValueAtTime(0.8, now);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.016);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    source.start(now);
    source.addEventListener('ended', () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    }, { once: true });
  };

  const playSelectionJingle = (isOminous = false) => {
    const context = tickAudioContext.current;
    if (isMutedRef.current || !context || context.state !== 'running') return;

    const startTime = context.currentTime;

    if (isOminous) {
      const filter = context.createBiquadFilter();
      const oscillators: OscillatorNode[] = [];
      const gains: GainNode[] = [];
      const notes = [246.94, 185];

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(950, startTime);
      filter.Q.setValueAtTime(0.7, startTime);
      filter.connect(context.destination);

      notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const noteStart = startTime + index * 0.12;
        const noteDuration = index === notes.length - 1 ? 0.22 : 0.1;
        const noteEnd = noteStart + noteDuration;

        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(frequency, noteStart);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.98, noteEnd);
        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.exponentialRampToValueAtTime(index === notes.length - 1 ? 0.13 : 0.11, noteStart + 0.012);
        gain.gain.setValueAtTime(index === notes.length - 1 ? 0.13 : 0.11, noteEnd - 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
        oscillator.connect(gain);
        gain.connect(filter);
        oscillator.start(noteStart);
        oscillator.stop(noteEnd);
        oscillators.push(oscillator);
        gains.push(gain);
      });

      oscillators.at(-1)?.addEventListener('ended', () => {
        oscillators.forEach((oscillator) => oscillator.disconnect());
        gains.forEach((gain) => gain.disconnect());
        filter.disconnect();
      }, { once: true });
      return;
    }

    const notes = [659.25, 783.99, 1046.5];

    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const noteStart = startTime + index * 0.09;
      const noteEnd = noteStart + (index === notes.length - 1 ? 0.28 : 0.16);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, noteStart);
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.045, noteStart + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteEnd);
      oscillator.addEventListener('ended', () => {
        oscillator.disconnect();
        gain.disconnect();
      }, { once: true });
    });
  };

  const submitUsername = (nextUsername: string) => {
    prepareTickAudio();
    shouldAutoSpin.current = true;

    if (username?.toLowerCase() === nextUsername.toLowerCase()) {
      if (releases?.length) {
        shouldAutoSpin.current = false;
        setSpinRequest((currentRequest) => currentRequest + 1);
        return;
      }

      if (activeQuery.isError) {
        if (canRetryDiscogsRequest(activeQuery.error)) {
          void activeQuery.refetch();
        } else {
          shouldAutoSpin.current = false;
        }
        return;
      }

      return;
    }

    setUsername(nextUsername);
  };

  const selectMode = (nextMode: RouletteMode) => {
    if (nextMode === mode) return;

    lastSelectedReleaseKey.current = null;
    shouldAutoSpin.current = false;
    setMode(nextMode);
  };

  const requestSpin = () => {
    prepareTickAudio();
    setSpinRequest((currentRequest) => currentRequest + 1);
  };

  const toggleMuted = () => {
    const nextMuted = !isMuted;
    isMutedRef.current = nextMuted;
    setIsMuted(nextMuted);
    localStorage.setItem('random-reel-muted', String(nextMuted));

    if (!nextMuted) prepareTickAudio();
  };

  useEffect(() => () => {
    if (tickFrame.current !== null) window.cancelAnimationFrame(tickFrame.current);
    const context = tickAudioContext.current;
    tickAudioContext.current = null;
    tickNoiseBuffer.current = null;
    if (context && context.state !== 'closed') void context.close();
  }, []);

  useEffect(() => {
    if (!releases?.length) return;

    const isRequestedSpin = spinRequest !== handledSpinRequest.current;
    if (!shouldAutoSpin.current && !isRequestedSpin) return;

    shouldAutoSpin.current = false;
    handledSpinRequest.current = spinRequest;
    if (document.activeElement instanceof HTMLInputElement) document.activeElement.blur();

    reelAnimation.current?.cancel();
    if (tickFrame.current !== null) window.cancelAnimationFrame(tickFrame.current);
    const reel = buildReel(releases, lastSelectedReleaseKey.current);
    let spinFrame: number | null = null;
    let revealTimeout: number | null = null;
    let redirectTimeout: number | null = null;
    let lastTickIndex = 1;
    const revealWinner = () => {
      flushSync(() => setIsSpinning(false));
      playSelectionJingle(mode === 'wantlist');

      if (mode === 'wantlist') {
        redirectTimeout = window.setTimeout(() => {
          window.location.assign(`https://www.discogs.com/sell/release/${reel.winner.basic_information.id}`);
        }, 550);
      }
    };
    const resetFrame = window.requestAnimationFrame(() => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      setIsSpinning(true);
      setReelOffset(0);
      setWinnerIndex(reel.winnerIndex);
      setReelReleases(reel.releases);
      setReelMode(mode);
      lastSelectedReleaseKey.current = getReleaseKey(reel.winner);

      if (prefersReducedMotion) {
        setReelOffset(reel.winnerIndex - 1);
        revealWinner();
        return;
      }

      spinFrame = window.requestAnimationFrame(() => {
        const targetOffset = reel.winnerIndex - 1;
        const animation = reelTrack.current?.animate([
          { transform: 'translate3d(0, 0, 0)' },
          { transform: `translate3d(0, -${targetOffset * 6}rem, 0)` },
        ], {
          duration: 2800,
          easing: 'cubic-bezier(0.12, 0.72, 0.08, 1)',
          fill: 'forwards',
        });

        if (!animation) {
          setReelOffset(targetOffset);
          revealTimeout = window.setTimeout(() => {
            revealWinner();
          }, 650);
          return;
        }

        reelAnimation.current = animation;
        const firstCard = reelTrack.current?.querySelector<HTMLElement>('.reel-card');
        const cardHeight = firstCard?.offsetHeight ?? 96;
        const followCenteredItem = () => {
          if (animation.playState === 'finished' || animation.playState === 'idle') return;

          const track = reelTrack.current;
          if (track) {
            const transform = window.getComputedStyle(track).transform;
            const translateY = transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42;
            const centeredIndex = Math.round(-translateY / cardHeight) + 1;

            if (centeredIndex !== lastTickIndex) {
              lastTickIndex = centeredIndex;
              playTick();
            }
          }

          tickFrame.current = window.requestAnimationFrame(followCenteredItem);
        };

        tickFrame.current = window.requestAnimationFrame(followCenteredItem);
        animation.onfinish = () => {
          if (lastTickIndex !== reel.winnerIndex) playTick();
          if (tickFrame.current !== null) window.cancelAnimationFrame(tickFrame.current);
          tickFrame.current = null;
          setReelOffset(targetOffset);
          revealTimeout = window.setTimeout(() => {
            revealWinner();
          }, 650);
        };
      });
    });

    return () => {
      window.cancelAnimationFrame(resetFrame);
      if (spinFrame !== null) window.cancelAnimationFrame(spinFrame);
      if (revealTimeout !== null) window.clearTimeout(revealTimeout);
      if (redirectTimeout !== null) window.clearTimeout(redirectTimeout);
      if (tickFrame.current !== null) window.cancelAnimationFrame(tickFrame.current);
      tickFrame.current = null;
      reelAnimation.current?.cancel();
    };
  }, [mode, releases, spinRequest]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isSpinning || winnerIndex < 0 || event.repeat) return;

      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, button, a, [contenteditable="true"]')) return;

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        requestSpin();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSpinning, winnerIndex]);

  return (
    <main className="mx-auto max-w-7xl px-5 py-5 sm:px-8 lg:px-10">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <DiscogsSearch
            label={mode === 'collection'
              ? 'Enter username to select album from collection'
              : 'Enter username to select album to waste money on'}
            labelAction={(
              <button
                type="button"
                role="switch"
                aria-checked={mode === 'wantlist'}
                onClick={() => selectMode(mode === 'wantlist' ? 'collection' : 'wantlist')}
                disabled={isSpinning || activeQuery.isFetching}
                className={`flex h-6 shrink-0 items-center gap-1.5 rounded-full px-1.5 pr-2 text-xs font-semibold transition-[color,opacity] duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-40 ${mode === 'wantlist'
                  ? isDark
                    ? 'text-red-400'
                    : 'text-red-700'
                  : ''}`}
              >
                <span className={`relative h-5 w-9 rounded-full border transition-colors duration-200 ease-out ${mode === 'wantlist'
                  ? isDark ? 'border-rose-600 bg-rose-600' : 'border-rose-700 bg-rose-700'
                  : 'border-current/20 bg-current/10'}`} aria-hidden="true">
                  <span className={`absolute top-1/2 left-0.5 h-4 w-4 -translate-y-1/2 rounded-full shadow-sm transition-[transform,background-color] duration-200 ease-out ${mode === 'wantlist' ? 'translate-x-4 bg-white' : 'translate-x-0 bg-current/60'}`} />
                </span>
                <span>Wantlist Roulette</span>
              </button>
            )}
            onSubmit={submitUsername}
          />
        </div>
        <button
          type="button"
          onClick={toggleMuted}
          className="flex h-[50px] shrink-0 items-center justify-center gap-2 rounded-xl border border-current/20 px-4 text-xs font-semibold transition-colors hover:bg-current/6"
          aria-label={isMuted ? 'Unmute reel sounds' : 'Mute reel sounds'}
          aria-pressed={isMuted}
        >
          {isMuted ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M11 5 6 9H2v6h4l5 4V5Z" />
              <path d="m16 9 5 5M21 9l-5 5" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M11 5 6 9H2v6h4l5 4V5Z" />
              <path d="M15.5 8.5a5 5 0 0 1 0 7" />
              <path d="M18.5 5.5a9 9 0 0 1 0 13" />
            </svg>
          )}
          <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Sound'}</span>
        </button>
      </div>
      {activeQuery.isFetching && activeQuery.data === undefined && reelReleases.length === 0 && (
        <ReelPlaceholder isDark={isDark} isWantlist={mode === 'wantlist'} />
      )}
      {activeQuery.isError && (
        <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600">
          {activeQuery.error.message}
        </p>
      )}
      {releases?.length === 0 && (
        <p className="mt-6 text-sm opacity-60">No releases found.</p>
      )}
      {reelReleases.length > 0 && (
        <section className="mx-auto mt-10 max-w-3xl text-center">
          <div className={`album-reel relative overflow-hidden border-y transition-[background-color,border-color,box-shadow,color] duration-200 ${mode === 'wantlist' ? getWantlistReelClasses(isDark) : 'border-current/15'}`}>
            <ReelMarkers isDark={isDark} isSelected={!isSpinning && winnerIndex >= 0} isWantlist={mode === 'wantlist'} />

            <div
              ref={reelTrack}
              className="reel-track"
              style={{ transform: `translate3d(0, -${reelOffset * 6}rem, 0)` }}
            >
              {reelReleases.map((release, index) => {
                const releaseInfo = release.basic_information;
                const isWinner = index === winnerIndex;

                return (
                  <article
                    key={`${index}-${getReleaseKey(release)}`}
                    className={`reel-card relative flex min-w-0 items-center gap-3 px-10 text-left transition-[transform,background-color,box-shadow,opacity,filter] duration-500 ease-out sm:gap-4 sm:px-20 ${isWinner && !isSpinning
                      ? `selected-release z-20 ${mode === 'wantlist' ? isDark ? 'bg-red-950/70 shadow-[inset_0_0_35px_rgb(185_28_28/0.2)]' : 'bg-red-100/70 shadow-[inset_0_0_35px_rgb(248_113_113/0.12)]' : 'bg-current/5'}`
                      : !isSpinning ? 'unselected-release' : 'opacity-70'}`}
                    aria-hidden={isSpinning || !isWinner}
                  >
                    <img
                      src={releaseInfo.thumb || releaseInfo.cover_image}
                      alt=""
                      decoding="async"
                      className="h-16 w-16 shrink-0 object-cover sm:h-20 sm:w-20"
                    />
                    <div className="min-w-0">
                      <h2 className={`truncate tracking-[-0.015em] ${isWinner && !isSpinning ? 'text-base font-bold sm:text-lg' : 'text-sm font-semibold sm:text-base'}`}>
                        {releaseInfo.title.trim()}
                      </h2>
                      <p className="mt-1 truncate text-xs opacity-55 sm:text-sm">{getReleaseArtistNames(releaseInfo)}</p>
                    </div>
                  </article>
                );
              })}
            </div>

          </div>

          {reelMode === 'collection' && (
            <div className="mt-6 min-h-10">
              {winnerIndex >= 0 && reelReleases[winnerIndex] && (
              <button
                type="button"
                onClick={requestSpin}
                disabled={isSpinning || releases?.length === 0}
                aria-keyshortcuts="Enter Space"
                className="w-full rounded-lg bg-current px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <span className="text-zinc-100 mix-blend-difference">Respin</span>
              </button>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
};

export default Random;
