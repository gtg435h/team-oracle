import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';

import { useAuthor } from '@/hooks/useAuthor';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { displayName, initials } from '@/lib/market/users';
import { sanitizeUrl } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface UserChipProps {
  pubkey: string;
  size?: 'sm' | 'default' | 'lg';
  link?: boolean;
  className?: string;
  nameClassName?: string;
}

/** Avatar + display name for a pubkey. Links to the user's npub route when `link`. */
export function UserChip({ pubkey, size = 'default', link = true, className, nameClassName }: UserChipProps) {
  const author = useAuthor(pubkey);
  const metadata = author.data?.metadata;
  const name = displayName(metadata, pubkey);
  const picture = sanitizeUrl(metadata?.picture);
  const npub = nip19.npubEncode(pubkey);

  const body = (
    <>
      <Avatar size={size}>
        {picture ? <AvatarImage src={picture} alt={name} /> : null}
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
      <span className={cn('truncate font-medium', nameClassName)}>{name}</span>
    </>
  );

  if (!link) {
    return <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>{body}</span>;
  }

  return (
    <Link
      to={`/${npub}`}
      className={cn('inline-flex min-w-0 items-center gap-2 hover:underline', className)}
    >
      {body}
    </Link>
  );
}
