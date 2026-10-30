import { ReactNode, useState } from 'react'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { SiteShell, homeLink } from '@altterisk/game-hub'
import EnemyModal from './enemyTab/enemyModal';
import EquipModal from './equipModal';
import { MobileSettings, NavActions, NavItems } from './layout/navbar'
import { FOOTER } from './layout/footer';
import GlobalLoader from './globalLoader';

const nextHome = homeLink(NextLink);

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <SiteShell
      game="lo"
      renderHomeLink={nextHome}
      nav={<NavItems />}
      actions={<NavActions open={menuOpen} onToggle={() => setMenuOpen((v) => !v)} />}
      belowBar={<>{menuOpen && <MobileSettings />}<GlobalLoader /></>}
      footer={FOOTER}
      resetKey={pathname}
      contentWidth="80rem"
      scrollTop
    >
      <EnemyModal />
      <EquipModal />
      {children}
    </SiteShell>
  )
}
