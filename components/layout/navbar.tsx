import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { CloseIcon, HamburgerIcon } from '@altterisk/game-hub/ui'
import { Flex, HStack, IconButton } from '@altterisk/game-hub/ui';
import { NavMenu, routerLinks } from '@altterisk/game-hub';
import NavLink from './navlink';
import { RegionSelect, TranslationMenu } from './navcontent';

const nextLink = routerLinks(NextLink);

const ETC_LINKS = [
  ["/npcs", "NPC Viewer"],
  ["/gacha", "Gacha Simulator"],
  ["/team", "Team Builder"],
  ["/misc", "Misc Categories"],
  ["/exchange", "Exchange"],
] as const;

export function NavItems() {
  const { pathname } = useRouter();
  return (
    <>
      <NavLink to="/">Home</NavLink>
      <NavLink to="/units">Units</NavLink>
      <NavLink to="/skins">Skins</NavLink>
      <NavLink to="/equipment">Equipment</NavLink>
      <NavLink to="/world">World</NavLink>
      <NavLink to="/story">Story</NavLink>
      <NavLink to="/sanctum">Sanctum</NavLink>
      <NavLink to="/enemies">Enemies</NavLink>
      <NavLink to="/iw">Infinite War</NavLink>
      <NavMenu
        label="Etc"
        renderLink={nextLink}
        items={ETC_LINKS.map(([href, label]) => ({ href, label, active: pathname.startsWith(href) }))}
      />
    </>
  );
}

export function NavActions({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <>
      <HStack spacing={2} display={{ base: "none", md: "flex" }}>
        <RegionSelect />
        <TranslationMenu />
      </HStack>
      <IconButton
        aria-label="Toggle menu"
        display={{ base: "inline-flex", md: "none" }}
        onClick={onToggle}
        variant="ghost"
        size="sm"
        icon={open ? <CloseIcon /> : <HamburgerIcon />}
      />
    </>
  );
}

export function MobileSettings() {
  return (
    <Flex
      display={{ base: "flex", md: "none" }}
      wrap="wrap"
      gap={2}
      justify="center"
      px={4}
      py={3}
      bg="hub.surface"
      borderBottomWidth="1px"
      borderColor="hub.border"
    >
      <RegionSelect />
      <TranslationMenu />
    </Flex>
  );
}
