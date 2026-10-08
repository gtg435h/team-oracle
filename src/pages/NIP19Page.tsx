import { nip19 } from 'nostr-tools';
import { useParams } from 'react-router-dom';
import NotFound from './NotFound';
import { ProfilePage } from './ProfilePage';

export function NIP19Page() {
  const { nip19: identifier } = useParams<{ nip19: string }>();

  if (!identifier) {
    return <NotFound />;
  }

  let decoded;
  try {
    decoded = nip19.decode(identifier);
  } catch {
    return <NotFound />;
  }

  const { type, data } = decoded;

  switch (type) {
    case 'npub':
      return <ProfilePage pubkey={data} />;

    case 'nprofile':
      return <ProfilePage pubkey={data.pubkey} />;

    case 'note':
    case 'nevent':
    case 'naddr':
      return <NotFound />;

    default:
      return <NotFound />;
  }
}
