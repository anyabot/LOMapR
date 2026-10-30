import { ShareButton } from '@altterisk/game-hub';

interface Props {
  // Path relative to the site root, e.g. "/enemies?enemy=NightChick_N".
  path: string;
  label?: string;
}

// The span keeps the click from reaching a surrounding link or accordion button.
export default function CopyLink({ path, label = 'Share link' }: Props) {
  return (
    <span style={{ display: 'inline-flex', flexShrink: 0 }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
      <ShareButton value={() => window.location.origin + path} label={label} copiedLabel="Copied!" />
    </span>
  );
}
