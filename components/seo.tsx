import Head from 'next/head';
import { useRouter } from 'next/router';
import { getGame } from '@altterisk/game-hub';
import { createSiteMeta } from '@altterisk/game-hub/meta';
import { createSeo, tagElements, type SeoProps as HubSeoProps } from '@altterisk/game-hub/meta/next';
import { parseRegion } from '@/store/regionSlice';

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
  '/units/detail': ['id'],
  '/world/detail': ['id'],
  '/world/stage': ['id', 'zone', 'stage'],
  '/iw/detail': ['id'],
  '/story': ['world', 'zone', 'squad', 'story'],
};

const { useCanonical } = createSeo({ site, Head, useRouter, identityParams: IDENTITY_PARAMS });

export type SeoProps = HubSeoProps & { canonicalId?: string };

// Entity pages keep ?server=kr in the canonical: a KR-only entity does not exist on the default region.
export function Seo({ canonicalId, ...page }: SeoProps) {
  const { pathname, query } = useRouter();
  let url = useCanonical();
  if (url && IDENTITY_PARAMS[pathname.replace(/\/$/, '')]) {
    const u = new URL(url);
    if (canonicalId) u.searchParams.set('id', canonicalId);
    if (parseRegion(query.server) === 'kr') u.searchParams.set('server', 'kr');
    url = u.toString();
  }
  return <Head>{tagElements(site.headTags(page, page.noindex ? null : url))}</Head>;
}
