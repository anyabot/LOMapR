import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { Provider, useSelector, useDispatch } from 'react-redux'
import { ChakraProvider } from '@chakra-ui/react'
import { useEffect, useRef } from 'react'
import { store, RootState } from '@/store'
import { setStringsRegion } from '@/lib/strings'
import { loadRegion, setRegion } from '@/store/regionSlice'
import { fetchEnemyAsync } from '@/store/enemySlice'
import { fetchWorldAsync } from '@/store/worldSlice'
import { fetchSkillAsync } from '@/store/skillSlice'
import { fetchSanctumAsync } from '@/store/sanctumSlice'
import { fetchIWAsync } from '@/store/IWSlice'
import { fetchImageAsync } from '@/store/imageSlice'
import Layout from '@/components/layout'
import 'bootstrap/dist/css/bootstrap.min.css';

import { extendTheme } from '@chakra-ui/react'

const theme = extendTheme({
  fonts: {
    heading: `'NewYork'`,
    body: `'NewYork'`,
  },
})

// Keep the string resolver pointed at the active region, and on a region CHANGE
// re-dispatch the data fetches. The setRegion reducer already cleared each
// slice's cache, but the active page's mount-time fetch effect won't re-run, so
// we kick the fetches here. (Each thunk self-skips if data is already present.)
function RegionSync() {
  const region = useSelector((s: RootState) => s.region.region);
  const dispatch = useDispatch<typeof store.dispatch>();
  const first = useRef(true);

  // After mount, apply the persisted region. The store starts at 'global' on
  // both server and client (no hydration mismatch); the saved choice is applied
  // here, which (via setRegion -> slice resets -> the effect below) refetches.
  useEffect(() => {
    const saved = loadRegion();
    if (saved && saved !== 'global') dispatch(setRegion(saved));
  }, [dispatch]);

  // Keep the string resolver on the active region; on a region CHANGE, refetch
  // (the active page's mount-time effect won't re-run on its own).
  useEffect(() => {
    setStringsRegion(region);
    if (first.current) { first.current = false; return; }  // pages handle initial load
    dispatch(fetchEnemyAsync());
    dispatch(fetchWorldAsync());
    dispatch(fetchSkillAsync());
    dispatch(fetchSanctumAsync());
    dispatch(fetchIWAsync());
    dispatch(fetchImageAsync());
  }, [region, dispatch]);
  return null;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
  <Provider store={store}>
    <ChakraProvider theme={theme}>
      <RegionSync />
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </ChakraProvider>
  </Provider>
  )
}
