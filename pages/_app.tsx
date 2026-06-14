import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { Provider, useSelector, useDispatch } from 'react-redux'
import { ChakraProvider } from '@chakra-ui/react'
import { useEffect, useRef, useState } from 'react'
import { store, RootState } from '@/store'
import { setStringsRegion, setStringsTranslation, setStringsData, setCommunityData } from '@/lib/strings'
import { fetchStrings, fetchCommunity } from '@/lib/fetchData'
import { loadRegion, setRegion, Region } from '@/store/regionSlice'
import { loadTranslation, setTranslation } from '@/store/translationSlice'
import { fetchEnemyAsync } from '@/store/enemySlice'
import { fetchWorldAsync } from '@/store/worldSlice'
// fetchEnemySkillsAsync is dispatched lazily in skillTabList when an enemy is selected
import { fetchSanctumAsync } from '@/store/sanctumSlice'
import { fetchIWAsync } from '@/store/IWSlice'
import { fetchImageAsync } from '@/store/imageSlice'
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
  }, [region, dispatch]);
  return null;
}

// Keep the resolver's translation mode in sync, and apply the persisted choice
// after mount (store starts at 'community' on server + client). Returns the
// active mode so it can key the page subtree to re-render t() output on toggle.
function useTranslationSync(): string {
  const translation = useSelector((s: RootState) => s.translation.translation);
  const dispatch = useDispatch<typeof store.dispatch>();
  useEffect(() => {
    const saved = loadTranslation();
    if (saved && saved !== 'community') dispatch(setTranslation(saved));
  }, [dispatch]);
  // Push the mode into the resolver SYNCHRONOUSLY during render, not in an
  // effect: the subtree is keyed on `translation`, so it re-resolves t() in the
  // SAME render that the toggle triggers. An effect runs only AFTER that render,
  // so t() would resolve with the previous mode and every toggle would lag one
  // step behind (showing the old language until the next toggle).
  setStringsTranslation(translation);
  return translation;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <ChakraProvider theme={theme}>
        <RegionSync />
        <AppBody Component={Component} pageProps={pageProps} />
      </ChakraProvider>
    </Provider>
  );
}

// Load the localization tables from the API (Firebase in prod, where the /data
// files aren't deployed) into the t() resolver. Strings are per-region; the
// community overlay is shared/fetched once. Returns a version token that bumps
// when tables arrive so the page subtree re-renders with resolved text.
function useStringsLoader(): string {
  const region = useSelector((s: RootState) => s.region.region);
  const [ver, setVer] = useState('');
  // Keep the resolver's active region current SYNCHRONOUSLY at render time (same
  // reasoning as setStringsTranslation in useTranslationSync — an effect would
  // lag a render behind). t() reads activeRegion the moment the subtree renders.
  setStringsRegion(region);
  // shared community overlay — fetch once
  useEffect(() => {
    fetchCommunity()
      .then((d) => { if (d) { setCommunityData(d); setVer((v) => v + 'c'); } })
      .catch(() => {});
  }, []);
  // per-region official strings — fetch on mount and region change
  useEffect(() => {
    fetchStrings(region)
      .then((d) => { if (d) { setStringsData(region, d); setVer((v) => v + region[0]); } })
      .catch(() => {});
  }, [region]);
  return ver;
}

function AppBody({ Component, pageProps }: Pick<AppProps, 'Component' | 'pageProps'>) {
  const translation = useTranslationSync();
  // stringsVer drives a re-render when string tables arrive (it's state on this
  // component, so updating it re-renders the subtree and re-runs t()) — but it's
  // deliberately NOT in the key: keying on it would UNMOUNT/REMOUNT the page on
  // every async table load, flashing the loader and wiping local UI state
  // (search box, filters) a few seconds after the page settled. A plain
  // re-render refreshes t() output without tearing the tree down.
  useStringsLoader();
  // Translation toggle is user-initiated and rare; re-key on it so the whole
  // subtree re-resolves cleanly.
  return (
    <Layout>
      <div key={translation}>
        <Component {...pageProps} />
      </div>
    </Layout>
  );
}
