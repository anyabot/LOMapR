import { useRouter } from 'next/router';
import { Center, Spinner } from '@chakra-ui/react';
import { useAppSelector } from '@/hooks';
import { selectEnemyStatus } from '@/store/enemySlice';
import { selectWorldStatus } from '@/store/worldSlice';
import { selectSanctumStatus } from '@/store/sanctumSlice';
import { selectIWStatus } from '@/store/IWSlice';
import { selectUnitStatus } from '@/store/unitSlice';

// Which data slices each route depends on. The overlay shows while any of a
// route's slices is still loading. Routes not listed never block.
type Dep = 'enemy' | 'world' | 'sanctum' | 'iw' | 'unit';
const ROUTE_DEPS: { test: (path: string) => boolean; deps: Dep[] }[] = [
  { test: (p) => p === '/enemies', deps: ['enemy'] },
  { test: (p) => p.startsWith('/sanctum'), deps: ['sanctum'] },
  { test: (p) => p.startsWith('/iw'), deps: ['iw'] },
  { test: (p) => p.startsWith('/units'), deps: ['unit'] },
  { test: (p) => p === '/' || p.startsWith('/world'), deps: ['world'] },
];

/**
 * App-wide loading overlay rendered once in the layout. It watches the data
 * slices the current route needs and shows a centered spinner over the page
 * until they finish loading — so individual pages don't each implement their
 * own loading state.
 */
export default function GlobalLoader() {
  const router = useRouter();
  const status = {
    enemy: useAppSelector(selectEnemyStatus),
    world: useAppSelector(selectWorldStatus),
    sanctum: useAppSelector(selectSanctumStatus),
    iw: useAppSelector(selectIWStatus),
    unit: useAppSelector(selectUnitStatus),
  };

  const match = ROUTE_DEPS.find((r) => r.test(router.pathname));
  const loading = !!match && match.deps.some((d) => status[d] === 'loading');
  if (!loading) return null;

  return (
    <Center
      position="fixed"
      inset={0}
      zIndex={1500}
      bg="blackAlpha.600"
      backdropFilter="blur(2px)"
    >
      <Spinner size="xl" color="yellow.400" thickness="3px" speed="0.7s" emptyColor="whiteAlpha.200" />
    </Center>
  );
}
