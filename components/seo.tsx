import { createContext, useContext } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getGame } from '@altterisk/game-hub';
import { createSiteMeta } from '@altterisk/game-hub/meta';
import { createSeo, tagElements, type SeoProps as HubSeoProps } from '@altterisk/game-hub/meta/next';
import { LEGACY_IDENTITY, legacyEntityPath } from '@/lib/href';
import type { StaticSeo } from '@/lib/entityPages';

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

const IDENTITY_PARAMS: Record<string, string[]> = {
  ...LEGACY_IDENTITY,
  '/story': ['world', 'zone', 'squad', 'story'],
};

const { useCanonical } = createSeo({ site, Head, useRouter, identityParams: IDENTITY_PARAMS });

// Build-time head of a prerendered entity page; it wins over the page's loading-state Seo.
export const StaticSeoContext = createContext<StaticSeo | null>(null);

export type SeoProps = HubSeoProps & { canonicalPath?: string; pending?: boolean };

export function Seo({ canonicalPath, pending, ...page }: SeoProps) {
  const staticSeo = useContext(StaticSeoContext);
  const { pathname, query } = useRouter();
  let url = useCanonical();
  if (pending && staticSeo) return null;
  const entity = page.title && !pending ? legacyEntityPath(pathname.replace(/\/$/, ''), query) : null;
  const path = canonicalPath ?? staticSeo?.canonicalPath ?? entity;
  if (url && path) url = new URL(path, `${SITE_URL}/`).toString();
  return <Head>{tagElements(site.headTags(page, page.noindex ? null : url))}</Head>;
}
