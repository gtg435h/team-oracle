import { marketStatus } from '@/lib/market/ledger';
import type { MarketState } from '@/lib/market/types';
import { Chip } from './Chip';
import { cn } from '@/lib/utils';

/** Colored status label: Open / Closing soon / Closed / Resolved YES / Resolved NO / Void. */
export function MarketStatusChip({ state, className }: { state: MarketState; className?: string }) {
  const status = marketStatus(state);

  if (status === 'resolved') {
    const outcome = state.resolution?.outcome;
    if (outcome === 'yes') {
      return (
        <Chip className={cn('border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400', className)}>
          Resolved YES
        </Chip>
      );
    }
    if (outcome === 'no') {
      return (
        <Chip className={cn('border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400', className)}>
          Resolved NO
        </Chip>
      );
    }
    return (
      <Chip className={cn('border-border bg-muted text-muted-foreground', className)}>Voided</Chip>
    );
  }

  if (status === 'closing-soon') {
    return (
      <Chip className={cn('border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400', className)}>
        Closing soon
      </Chip>
    );
  }

  if (status === 'closed') {
    return <Chip className={cn('border-border bg-muted text-muted-foreground', className)}>Closed</Chip>;
  }

  return (
    <Chip className={cn('border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400', className)}>
      Open
    </Chip>
  );
}
