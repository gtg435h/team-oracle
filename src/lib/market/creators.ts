/**
 * Market creator permissions — admin-managed, stored in localStorage.
 *
 * Admins can grant any registered user the ability to create markets
 * without adding them to ADMIN_PUBKEYS (which also grants relay/settings
 * access). Creators can create and resolve their own markets but cannot
 * access Settings, Users, or relay configuration.
 */

const CREATORS_KEY = 'oracle:market-creators';

export function getMarketCreators(): Set<string> {
  try {
    const raw = localStorage.getItem(CREATORS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function saveMarketCreators(pubkeys: Set<string>): void {
  try {
    localStorage.setItem(CREATORS_KEY, JSON.stringify([...pubkeys]));
  } catch {
    // ignore storage errors
  }
}

export function addMarketCreator(pubkey: string): void {
  const creators = getMarketCreators();
  creators.add(pubkey);
  saveMarketCreators(creators);
}

export function removeMarketCreator(pubkey: string): void {
  const creators = getMarketCreators();
  creators.delete(pubkey);
  saveMarketCreators(creators);
}
