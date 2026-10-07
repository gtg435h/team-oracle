import type { NostrMetadata } from '@nostrify/nostrify';
import { nip19 } from 'nostr-tools';

/** Best display name for a pubkey, falling back to a truncated npub. */
export function displayName(metadata: NostrMetadata | undefined, pubkey: string): string {
  const name = metadata?.display_name ?? metadata?.name;
  if (name?.trim()) return name.trim();
  return shortNpub(pubkey);
}

/** `npub1qv9e…` */
export function shortNpub(pubkey: string): string {
  return `${nip19.npubEncode(pubkey).slice(0, 10)}…`;
}

/** Up to two uppercase initials from a display name. */
export function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}
