import type * as React from 'react';

import { cn } from '@/lib/utils';

/** Small rounded label used for statuses, tags, and outcomes. */
export function Chip({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        className,
      )}
      {...props}
    />
  );
}
