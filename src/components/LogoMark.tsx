import { cn } from '@/lib/utils';

/** Team Oracle brand mark — rounded gradient square with a rising price line. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 shadow-md shadow-indigo-500/25',
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="white" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 16.5 L9.5 11 L13 14 L20 6.5" />
        <circle cx="20" cy="6.5" r="1.4" fill="white" stroke="none" />
      </svg>
    </span>
  );
}
