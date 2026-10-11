import { useEffect } from 'react';
import { ChangelogDialog } from '@altterisk/game-hub';
import { RELEASES, changelogKey, seen } from '@/lib/changelog';

const KIND_LABEL: Record<string, string> = { data: 'Data', feature: 'New', fix: 'Fix' };

export default function ChangelogNotice() {
  useEffect(() => {
    seen.restore();
    if (seen.isFresh()) seen.markSeen(changelogKey);
  }, []);
  const show = seen.useShouldShow(changelogKey);
  return (
    <ChangelogDialog open={show} onClose={() => seen.markSeen(changelogKey)} releases={RELEASES}
      kindLabel={(k) => KIND_LABEL[k] ?? k} />
  );
}
