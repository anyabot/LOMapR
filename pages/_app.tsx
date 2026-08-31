import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head'
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
    // Non-interactive info panels; clickable cards are plain Boxes with their own hover.
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
    // The light-mode gray variants render near-white on this dark UI, so pin them.
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
      // the outline variant sets its own addon bg/border, overriding baseStyle
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

// Maps a ?server= value to a region; null when absent or unrecognized.
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

  // ?server= FORCES the region and wins over the persisted choice. The store starts
  // at 'global' on both server and client, so there is no hydration drift.
  useEffect(() => {
    const forced = forcedRegionFromUrl();
    const target = forced ?? loadRegion();
    if (target && target !== 'global') dispatch(setRegion(target));
  }, [dispatch]);

  // A region change does not re-run the active page's mount-time fetch effect, so
  // kick the fetches here; each thunk self-skips when that bucket is already loaded.
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


// Returns a counter that increments whenever t()/tAny() output could change.
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

  // Synchronous at render time, so t() in the same render tree sees the new values.
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

    // Always load KR shop chunk — KR-only skins appear in global view too
    if (region === 'global') {
      fetchStringChunk('kr', 'shop').then((d) => {
        if (d) { setChunkData('kr', 'shop', d); setVer((v) => v + 1); }
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  // Tracked in an effect rather than derived, to avoid setState-during-render.
  useEffect(() => {
    setVer((v) => v + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mtl, krMtl, community]);

  return ver;
}

// The app is dark-only: get() always returns 'dark' and set() never persists, so a
// stale `chakra-ui-color-mode: light` value can never flip it.
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
      {/* default title/description; pages with their own <title> override it */}
      <Head>
        <title>LOMapR</title>
        <meta name="description" content="LOMapR — Last Origin Information & Resources" />
      </Head>
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
