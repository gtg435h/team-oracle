import { useCallback, useState } from 'react';
import {
  addMarketCreator,
  getMarketCreators,
  removeMarketCreator,
  saveMarketCreators,
} from '@/lib/market/creators';
import { isAdmin } from '@/lib/market/constants';

/**
 * Returns whether a pubkey can create markets.
 * Admins always can; additionally any pubkey explicitly granted by an admin can.
 */
export function canCreateMarket(pubkey: string | undefined): boolean {
  if (!pubkey) return false;
  if (isAdmin(pubkey)) return true;
  return getMarketCreators().has(pubkey);
}

/**
 * Hook for admins to read and manage the market-creator grant list.
 * Returns the current set plus add/remove/toggle helpers that update
 * localStorage and re-render the component.
 */
export function useMarketCreators() {
  const [creators, setCreators] = useState<Set<string>>(getMarketCreators);

  const refresh = useCallback(() => {
    setCreators(new Set(getMarketCreators()));
  }, []);

  const grant = useCallback((pubkey: string) => {
    addMarketCreator(pubkey);
    refresh();
  }, [refresh]);

  const revoke = useCallback((pubkey: string) => {
    removeMarketCreator(pubkey);
    refresh();
  }, [refresh]);

  const toggle = useCallback((pubkey: string) => {
    const current = getMarketCreators();
    if (current.has(pubkey)) {
      removeMarketCreator(pubkey);
    } else {
      addMarketCreator(pubkey);
    }
    refresh();
  }, [refresh]);

  const setAll = useCallback((pubkeys: string[]) => {
    const s = new Set(pubkeys);
    saveMarketCreators(s);
    setCreators(s);
  }, []);

  return { creators, grant, revoke, toggle, setAll };
}
