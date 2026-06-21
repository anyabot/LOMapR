import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { Provider, useSelector, useDispatch } from 'react-redux'
import { ChakraProvider, type ColorModeProviderProps } from '@chakra-ui/react'
import { useEffect, useRef, useState } from 'react'
import { store, RootState } from '@/store'
import { setStringsRegion, setStringsLayers, setChunkData, setCommunityData, setMtlData, setKrMtlData } from '@/lib/strings'
import { fetchStringChunk, fetchCommunity, fetchMtl, fetchKrMtl } from '@/lib/fetchData'
import { markChunkLoaded, setTransitioning, selectTransitioning } from '@/store/stringsSlice'
import { loadRegion, setRegion, Region } from '@/store/regionSlice'
import { loadTranslationLayers, setMtl, setKrMtl, setCommunity,
         setMtlLoaded, setKrMtlLoaded, setCommunityLoaded,
         selectMtl, selectKrMtl, selectCommunity } from '@/store/translationSlice'
import { TranslationVersionContext } from '@/lib/translationVersion'
import { fetchEnemyAsync } from '@/store/enemySlice'
import { fetchWorldAsync } from '@/store/worldSlice'
// fetchEnemySkillsAsync is dispatched lazily in skillTabList when an enemy is selected
import { fetchSanctumAsync } from '@/store/sanctumSlice'
import { fetchIWAsync } from '@/store/IWSlice'
import { fetchImageAsync } from '@/store/imageSlice'
import { fetchItemsAsync } from '@/store/itemSlice'
import { fetchUnitsAsync } from '@/store/unitSlice'
import { fetchEquipAsync } from '@/store/equipSlice'
// fetchEnemyAIAsync is dispatched lazily in skillTabList when an enemy is selected
import Layout from '@/components/layout'

import { extendTheme } from '@chakra-ui/react'

const theme = extendTheme({
  config: { initialColorMode: 'dark', useSystemColorMode: false },
  fonts: {
    heading: `'NewYork'`,
    body: `'NewYork'`,
  },
  colors: {
    surface: {
      DEFAULT: '#181b22',
      elevated: '#21252e',
      border: '#2c313c',
    },
  },
  styles: {
    global: {
      body: { bg: '#0f1115', color: '#e8eaed' },
      'h1, h2': { fontWeight: 700 },
    },
  },
  components: {
    // Static dark surface for Cards. Clickable cards (SimpleCard, banners) are
    // plain Boxes that add their own hover — Cards here are non-interactive info
    // panels, so no hover lift.
    Card: {
      baseStyle: {
        container: {
          bg: '#181b22',
          color: '#e8eaed',
          borderRadius: 'xl',
          borderWidth: '1px',
          borderColor: '#2c313c',
        },
      },
    },
    Table: {
      baseStyle: {
        th: { borderColor: '#2c313c', color: '#9aa0aa' },
        td: { borderColor: '#2c313c' },
      },
      variants: {
        // dark zebra stripe (the default striped variant uses a light bg)
        striped: {
          th: { borderColor: '#2c313c', color: '#9aa0aa' },
          td: { borderColor: '#2c313c' },
          tbody: {
            tr: {
              '&:nth-of-type(odd) td': { background: 'whiteAlpha.50' },
              '&:nth-of-type(even) td': { background: 'transparent' },
            },
          },
        },
      },
    },
    Divider: { baseStyle: { borderColor: '#2c313c', opacity: 1 } },
    // Dark defaults that don't depend on color-mode resolution. The light-mode
    // gray variants render near-white on this dark UI, so pin them.
    Button: {
      variants: {
        solid: (props: { colorScheme: string }) =>
          props.colorScheme === 'gray'
            ? { bg: '#2c313c', color: '#e8eaed', _hover: { bg: '#3a4150' }, _active: { bg: '#3a4150' } }
            : {},
        outline: (props: { colorScheme: string }) =>
          props.colorScheme === 'gray'
            ? { color: '#e8eaed', borderColor: '#3a4150', _hover: { bg: 'whiteAlpha.200' } }
            : {},
      },
    },
    Input: {
      defaultProps: { focusBorderColor: 'yellow.400' },
      baseStyle: {
        field: { bg: '#181b22', borderColor: '#2c313c' },
        addon: { bg: '#2c313c', color: '#e8eaed', borderColor: '#2c313c' },
      },
      // the outline variant (default) sets its own addon bg/border, overriding
      // baseStyle — pin it dark here too.
      variants: {
        outline: {
          field: { bg: '#181b22', borderColor: '#2c313c' },
          addon: { bg: '#2c313c', color: '#e8eaed', borderColor: '#2c313c' },
        },
      },
    },
    Select: {
      defaultProps: { focusBorderColor: 'yellow.400' },
      baseStyle: { field: { bg: '#181b22', borderColor: '#2c313c' } },
    },
  },
})

// Keep the string resolver pointed at the active region, and on a region CHANGE
// re-dispatch the data fetches. The setRegion reducer already cleared each
// slice's cache, but the active page's mount-time fetch effect won't re-run, so
// we kick the fetches here. (Each thunk self-skips if data is already present.)
// Optional ?server= override (only used when forcing a region). Maps the game
// server name to a region: global -> global; kr / korea / korean -> kr.
// Returns null when the param is absent/unrecognized.
function forcedRegionFromUrl(): Region | null {
  if (typeof window === 'undefined') return null;
  const v = (new URLSearchParams(window.location.search).get('server') || '').toLowerCase();
  if (v === 'global' || v === 'gl' || v === 'en') return 'global';
  if (v === 'kr' || v === 'korea' || v === 'korean') return 'kr';
  return null;
}

function RegionSync() {
  const region = useSelector((s: RootState) => s.region.region);
  const dispatch = useDispatch<typeof store.dispatch>();
  const first = useRef(true);

  // After mount, pick the active region. A ?server= query param (global | kr /
  // korea / korean) FORCES the region and wins over the persisted choice — it's
  // only meant as an explicit override. Otherwise fall back to the persisted
  // region. Either applied via setRegion -> slice resets -> the effect below
  // refetches. (Store starts at 'global' on server + client: no hydration drift.)
  useEffect(() => {
    const forced = forcedRegionFromUrl();
    const target = forced ?? loadRegion();
    if (target && target !== 'global') dispatch(setRegion(target));
  }, [dispatch]);

  // Keep the string resolver on the active region; on a region CHANGE, kick the
  // fetches for the now-active region (the active page's mount-time effect won't
  // re-run on its own). Each thunk self-skips if that region's bucket is already
  // loaded, and switching regions no longer wipes any data — so a repeat visit
  // to a region is instant with no loader flash.
  useEffect(() => {
    if (first.current) { first.current = false; return; }  // pages handle initial load
    dispatch(fetchEnemyAsync());
    dispatch(fetchWorldAsync());
    dispatch(fetchSanctumAsync());
    dispatch(fetchIWAsync());
    dispatch(fetchImageAsync());
    dispatch(fetchItemsAsync());
    dispatch(fetchUnitsAsync());
    dispatch(fetchEquipAsync());
  }, [region, dispatch]);
  return null;
}


// Unified hook: keeps resolver flags + region in sync, loads all string chunks,
// and returns a version counter that increments whenever t()/tAny() output could
// change. Components subscribe via useTranslationVersion() to re-render in place.
function useStringsAndTranslation(): number {
  const region    = useSelector((s: RootState) => s.region.region);
  const mtl       = useSelector(selectMtl);
  const krMtl     = useSelector(selectKrMtl);
  const community = useSelector(selectCommunity);
  const dispatch  = useDispatch<typeof store.dispatch>();
  const [ver, setVer] = useState(0);

  // Restore persisted translation choices once on mount.
  useEffect(() => {
    const saved = loadTranslationLayers();
    if (saved) {
      if (saved.mtl       != null) dispatch(setMtl(saved.mtl));
      if (saved.krMtl     != null) dispatch(setKrMtl(saved.krMtl));
      if (saved.community != null) dispatch(setCommunity(saved.community));
    }
  }, [dispatch]);

  // Push flags + region into the resolver SYNCHRONOUSLY at render time so that
  // t()/tAny() calls in the same render tree already see the updated values.
  setStringsRegion(region);
  setStringsLayers({ mtl, krMtl, community });

  // Shared overlay data — fetch once, region-independent.
  useEffect(() => {
    fetchMtl()
      .then((d) => { if (d) { setMtlData(d); dispatch(setMtlLoaded()); setVer((v) => v + 1); } })
      .catch(() => {});
    fetchKrMtl()
      .then((d) => { if (d) { setKrMtlData(d); dispatch(setKrMtlLoaded()); setVer((v) => v + 1); } })
      .catch(() => {});
    fetchCommunity()
      .then((d) => { if (d) { setCommunityData(d); dispatch(setCommunityLoaded()); setVer((v) => v + 1); } })
      .catch(() => {});
  }, [dispatch]);

  // Per-region chunk loading.
  const prevRegion = useRef<string>('');
  useEffect(() => {
    const isSwitch = prevRegion.current !== '' && prevRegion.current !== region;
    prevRegion.current = region;
    if (isSwitch) dispatch(setTransitioning(true));

    const chunks = (['common', 'skill', 'buff', 'stage', 'item', 'shop'] as const);
    const regionsToLoad: Array<typeof region> = region === 'global' ? ['global'] : ['global', region];

    for (const r of regionsToLoad) {
      for (const chunk of chunks) {
        fetchStringChunk(r, chunk).then((d) => {
          if (d) {
            setChunkData(r, chunk, d);
            dispatch(markChunkLoaded({ region: r, chunk }));
            setVer((v) => v + 1);
            if (r === region && chunk === 'common') dispatch(setTransitioning(false));
          }
        }).catch(() => {
          if (r === region && chunk === 'common') dispatch(setTransitioning(false));
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  // Flag changes bump the version via a derived value so context consumers re-render.
  // We track via useEffect to avoid setState-during-render.
  useEffect(() => {
    setVer((v) => v + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mtl, krMtl, community]);

  return ver;
}

// Fixed color-mode manager: the app is dark-only. This pins Chakra to dark and
// IGNORES localStorage / system preference, so a stale `chakra-ui-color-mode:
// light` value (which made local render light while deploy was dark) can never
// flip it. get() always returns 'dark'; set() is a no-op (never persist).
const darkOnlyManager: ColorModeProviderProps['colorModeManager'] = {
  type: 'localStorage',
  ssr: true,
  get: () => 'dark',
  set: () => {},
};

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <ChakraProvider theme={theme} colorModeManager={darkOnlyManager}>
        <RegionSync />
        <AppBody Component={Component} pageProps={pageProps} />
      </ChakraProvider>
    </Provider>
  );
}

function AppBody({ Component, pageProps }: Pick<AppProps, 'Component' | 'pageProps'>) {
  const translationVer = useStringsAndTranslation();
  const transitioning  = useSelector(selectTransitioning);
  return (
    <TranslationVersionContext.Provider value={translationVer}>
      <Layout>
        {transitioning && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15,17,21,0.7)', backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'opacity 0.15s',
          }}>
            <div style={{ width: 36, height: 36, border: '3px solid #2c313c',
              borderTopColor: '#ECC94B', borderRadius: '50%',
              animation: 'spin 0.7s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
        <Component {...pageProps} />
      </Layout>
    </TranslationVersionContext.Provider>
  );
}
