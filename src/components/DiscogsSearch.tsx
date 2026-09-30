import { useId, useState, type ReactNode, type SubmitEvent } from 'react';

type DiscogsSearchProps = {
  label: string;
  labelAction?: ReactNode;
  onSubmit: (value: string) => void | Promise<void>;
};

const DiscogsSearch = ({ label, labelAction, onSubmit }: DiscogsSearchProps) => {
  const id = useId();
  const [value, setValue] = useState('');

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedValue = value.trim();
    if (!trimmedValue) return;

    void onSubmit(trimmedValue);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label htmlFor={id} className="min-w-0 truncate text-sm font-semibold">{label}</label>
        {labelAction}
      </div>
      <div className="flex items-center overflow-hidden rounded-xl border border-current/20 transition-shadow focus-within:border-current/50 focus-within:ring-3 focus-within:ring-current/10">
        <span className="shrink-0 border-r border-current/15 px-4 py-3.5 text-sm opacity-50">discogs.com/user/</span>
        <input
          id={id}
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="username"
          spellCheck="false"
          className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-sm outline-none placeholder:opacity-35"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="mr-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-current transition-opacity disabled:cursor-not-allowed disabled:opacity-25"
          aria-label={`Submit ${label.toLowerCase()}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-zinc-100 mix-blend-difference" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
          </svg>
        </button>
      </div>
    </form>
  );
};

export default DiscogsSearch;
