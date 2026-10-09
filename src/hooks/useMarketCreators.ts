import { useCallback } from 'react';
import { useNostr } from '@nostrify/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useCurrentUser } from './useCurrentUser';
import { useNostrPublish } from './useNostrPublish';
import { toast } from './useToast';
import {
  ADMIN_PUBKEYS,
  CREATOR_GRANT_D_TAG,
  CREATOR_GRANT_KIND,
  isAdmin,
  REFRESH_INTERVAL,
} from '@/lib/market/constants';

export const creatorGrantsKey = ['oracle', 'creator-grants'] as const;

/**
 * Fetches the set of pubkeys that have been granted market-creation
 * permission by any admin. Stored as NIP-78 kind 30078 addressable
 * events authored by admins, with p tags for each granted pubkey.
 * Each admin maintains their own grant list; the union of all is used.
 */
export function useCreatorGrants() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: creatorGrantsKey,
    queryFn: async ({ signal }) => {
      const events = await nostr.query(
        [{
          kinds: [CREATOR_GRANT_KIND],
          authors: [...ADMIN_PUBKEYS],
          '#d': [CREATOR_GRANT_D_TAG],
          limit: ADMIN_PUBKEYS.length,
        }],
        { signal },
      );

      // Union all granted pubkeys from all admin grant events.
      const granted = new Set<string>();
      for (const event of events) {
        for (const [name, value] of event.tags) {
          if (name === 'p' && value) granted.add(value);
        }
      }
      return granted;
    },
    refetchInterval: REFRESH_INTERVAL,
    staleTime: 30_000,
  });
}

/**
 * Returns whether a pubkey can create markets — either because they are
 * a hardcoded admin, or because an admin has granted them permission via
 * a kind 30078 event on the relay.
 *
 * While the grant query is loading, falls back to admin-only so the UI
 * never briefly enables the wrong state.
 */
export function useCanCreateMarket(pubkey: string | undefined): boolean {
  const { data: grants } = useCreatorGrants();
  if (!pubkey) return false;
  if (isAdmin(pubkey)) return true;
  return grants?.has(pubkey) ?? false;
}

/**
 * Admin hook: read the current grant list and toggle/grant/revoke pubkeys.
 * Publishes a new kind 30078 event (replacing the previous one) each time.
 */
export function useMarketCreatorAdmin() {
  const { user } = useCurrentUser();
  const { mutateAsync: publish } = useNostrPublish();
  const { data: grants, isPending } = useCreatorGrants();
  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: creatorGrantsKey });
  }, [queryClient]);

  /**
   * Publish an updated grant list.
   * `nextGrants` is the full new set to store — this replaces the previous event.
   */
  const publishGrants = useCallback(async (nextGrants: Set<string>) => {
    if (!user || !isAdmin(user.pubkey)) {
      throw new Error('Only admins can manage market creator grants');
    }
    await publish({
      kind: CREATOR_GRANT_KIND,
      content: '',
      tags: [
        ['d', CREATOR_GRANT_D_TAG],
        ['alt', 'Team Oracle: market creator grants'],
        ...[...nextGrants].map((pk) => ['p', pk]),
      ],
    });
    invalidate();
  }, [user, publish, invalidate]);

  const grant = useCallback(async (pubkey: string) => {
    const next = new Set(grants ?? []);
    next.add(pubkey);
    await publishGrants(next);
    toast({ title: 'Permission granted', description: 'User can now create markets.' });
  }, [grants, publishGrants]);

  const revoke = useCallback(async (pubkey: string) => {
    const next = new Set(grants ?? []);
    next.delete(pubkey);
    await publishGrants(next);
    toast({ title: 'Permission revoked', description: 'User can no longer create markets.' });
  }, [grants, publishGrants]);

  const toggle = useCallback(async (pubkey: string) => {
    const current = grants ?? new Set<string>();
    if (current.has(pubkey)) {
      await revoke(pubkey);
    } else {
      await grant(pubkey);
    }
  }, [grants, grant, revoke]);

  return {
    grants: grants ?? new Set<string>(),
    isPending,
    grant,
    revoke,
    toggle,
  };
}
