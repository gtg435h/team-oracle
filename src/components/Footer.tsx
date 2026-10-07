import { Coins } from 'lucide-react';

import { APP_NAME } from '@/lib/market/constants';

/** App-wide footer. */
export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="container flex flex-col items-center justify-between gap-4 py-8 text-sm text-muted-foreground sm:flex-row">
        <p className="inline-flex items-center gap-1.5">
          <Coins className="size-4" />
          {APP_NAME} — play-money markets. Credits have no cash value.
        </p>
        <p>
          Vibed with 🎭{' '}
          <a
            href="https://shakespeare.diy"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-primary"
          >
            Shakespeare
          </a>
        </p>
      </div>
    </footer>
  );
}
