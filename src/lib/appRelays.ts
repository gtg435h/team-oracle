import type { RelayMetadata } from '@/contexts/AppContext';

/**
 * App default relays. All users connect to the company's private relay.
 * Only admins can change this list via the Settings page.
 */
export const APP_RELAYS: RelayMetadata = {
  relays: [
    { url: 'wss://nostr.honeypoocakes.net', read: true, write: true },
  ],
  updatedAt: 0,
};
