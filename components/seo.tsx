import Head from 'next/head';
import { useRouter } from 'next/router';
import { getGame } from '@altterisk/game-hub';
import { createSiteMeta } from '@altterisk/game-hub/meta';
import { createSeo, type SeoProps } from '@altterisk/game-hub/meta/next';

const GAME = getGame('lo');
export const HOME_TITLE = `${GAME.name} — ${GAME.title} Information & Resources`;
export const HOME_DESCRIPTION =
  'Last Origin database for global and KR: units, equipment, enemies, world and event stages, story, skins and a team builder.';

export const site = createSiteMeta({
  game: 'lo',
  url: process.env.NEXT_PUBLIC_SITE_URL,
  homeTitle: HOME_TITLE,
  defaultDescription: HOME_DESCRIPTION,
  defaultImage: '/images/icons/Ev_Consumable_BADKSticker.png',
});
export const SITE_URL = site.url;

export const { Seo } = createSeo({
  site,
  Head,
  useRouter,
  identityParams: {
    '/units/detail': ['id'],
    '/world/detail': ['id'],
    '/world/stage': ['id', 'zone', 'stage'],
    '/iw/detail': ['id'],
    '/story': ['world', 'zone', 'squad', 'story'],
    '/npcs': ['id'],
  },
});

export type { SeoProps };
