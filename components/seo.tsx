import Head from 'next/head';
import { useRouter } from 'next/router';
import { getGame } from '@altterisk/game-hub';

const GAME = getGame('lo');
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? GAME.url).replace(/\/$/, '');
export const HOME_TITLE = `${GAME.name} — ${GAME.title} Information & Resources`;
export const HOME_DESCRIPTION =
  'Last Origin database for global and KR: units, equipment, enemies, world and event stages, story, skins and a team builder.';
const DEFAULT_IMAGE = '/images/icons/Ev_Consumable_BADKSticker.png';

// Query params that identify the entity on query-routed pages; anything else is UI state.
const IDENTITY_PARAMS: Record<string, string[]> = {
  '/units/detail': ['id'],
  '/world/detail': ['id'],
  '/world/stage': ['id', 'zone', 'stage'],
  '/iw/detail': ['id'],
  '/story': ['world', 'zone', 'squad', 'story'],
  '/npcs': ['id'],
};

function canonicalPath(asPath: string, pathname: string, query: Record<string, string | string[] | undefined>): string {
  const path = asPath.split(/[?#]/)[0];
  const base = path.endsWith('/') ? path : `${path}/`;
  const params = new URLSearchParams();
  for (const key of IDENTITY_PARAMS[pathname] ?? []) {
    const v = query[key];
    if (typeof v === 'string' && v) params.set(key, v);
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export type SeoProps = {
  title?: string;
  description?: string;
  image?: string | null;
  jsonLd?: object;
};

export function Seo({ title, description, image, jsonLd }: SeoProps) {
  const { asPath, pathname, query, isReady } = useRouter();
  // Prerendered HTML never sees the query, so query-routed pages get a canonical only after hydration.
  const url = isReady || !IDENTITY_PARAMS[pathname] ? `${SITE_URL}${canonicalPath(asPath, pathname, query)}` : null;
  const full = title ? `${title} — ${GAME.title} | ${GAME.name}` : HOME_TITLE;
  const desc = description ?? HOME_DESCRIPTION;
  const img = `${SITE_URL}${image ?? DEFAULT_IMAGE}`;
  return (
    <Head>
      <title>{full}</title>
      <meta key="description" name="description" content={desc} />
      {url && <link key="canonical" rel="canonical" href={url} />}
      <meta key="og:site_name" property="og:site_name" content={GAME.name} />
      <meta key="og:type" property="og:type" content="website" />
      <meta key="og:title" property="og:title" content={full} />
      <meta key="og:description" property="og:description" content={desc} />
      {url && <meta key="og:url" property="og:url" content={url} />}
      <meta key="og:image" property="og:image" content={img} />
      <meta key="twitter:card" name="twitter:card" content="summary" />
      {jsonLd && (
        <script key="ld-json" type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      )}
    </Head>
  );
}
