/** Number, price, and date formatting helpers. */

const creditsFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Format credits, trimming trailing zeros (e.g. `9,500` or `9,500.25`). */
export function formatCredits(n: number): string {
  return creditsFormatter.format(n);
}

/** Format credits compactly for stat chips (e.g. `12.4K`). */
export function formatCompact(n: number): string {
  return compactFormatter.format(n);
}

/** Format a price in credits per share as cents (e.g. `58¢`). */
export function formatCents(p: number): string {
  return `${Math.round(p)}¢`;
}

/** Signed credits, e.g. `+1,250` or `-430.5`. */
export function formatSignedCredits(n: number): string {
  const s = formatCredits(Math.abs(n));
  return `${n < 0 ? '−' : '+'}${s}`;
}

/** `Jan 7, 2027` */
export function formatDate(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** `Jan 7, 3:30 PM` */
export function formatDateTime(unix: number): string {
  return new Date(unix * 1000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** `3d 4h ago` / `in 2h 5m` */
export function formatRelative(unix: number, now = Date.now() / 1000): string {
  const diff = now - unix;
  const abs = Math.abs(diff);
  const mins = Math.floor(abs / 60);
  const hours = Math.floor(abs / 3600);
  const days = Math.floor(abs / 86400);

  let text: string;
  if (abs < 60) text = 'just now';
  else if (mins < 60) text = `${mins}m`;
  else if (hours < 24) text = `${hours}h ${mins % 60}m`;
  else if (days < 30) text = `${days}d`;
  else text = `${Math.floor(days / 30)}mo`;

  if (text === 'just now') return text;
  return diff >= 0 ? `${text} ago` : `in ${text}`;
}

/** Time left until a future timestamp: `3d 4h left` / `12m left` / `closed`. */
export function formatTimeLeft(unix: number, now = Date.now() / 1000): string {
  const left = unix - now;
  if (left <= 0) return 'closed';
  const mins = Math.floor(left / 60);
  const hours = Math.floor(left / 3600);
  const days = Math.floor(left / 86400);
  if (days >= 1) return `${days}d ${hours % 24}h left`;
  if (hours >= 1) return `${hours}h ${mins % 60}m left`;
  if (mins >= 1) return `${mins}m left`;
  return 'closing';
}

/** Local `yyyy-MM-ddTHH:mm` string for `<input type="datetime-local">`. */
export function toLocalInputValue(unix: number): string {
  const d = new Date(unix * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parse a `datetime-local` input value to unix seconds. */
export function fromLocalInputValue(value: string): number {
  return Math.floor(new Date(value).getTime() / 1000);
}
