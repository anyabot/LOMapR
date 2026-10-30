import { useEffect, useMemo, useState } from 'react';
import { Seo } from '@/components/seo';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Box, Button, Center, Flex, HStack, Spinner, Text, VStack } from '@chakra-ui/react';
import {
  EmptyState, PageHeader, SearchBox, SegmentedButtons, TabPanel, UrlTabs, tabParam, type TabItem,
} from '@altterisk/game-hub';
import { nextRouterAdapter } from '@altterisk/game-hub/filters';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { selectRegion } from '@/store/regionSlice';
import { fetchItemsAsync, selectItems } from '@/store/itemSlice';
import { fetchWorldAsync, selectWorld } from '@/store/worldSlice';
import { fetchGeneralExchange } from '@/lib/fetchData';
import { t } from '@/lib/strings';
import { useTranslationVersion } from '@/lib/translationVersion';
import { ShopGrid } from '@/components/eventExchange';
import type { ExchangeProduct, GeneralExchange } from '@/interfaces/world';

const DESCRIPTION = 'Last Origin standing exchange shop items currently on sale, with costs and limits.';

const TAB_LABEL: Record<string, string> = {
  enchant: 'Enhancement',
  making: 'Production',
  unit: 'Unit Items',
  promotion: 'Equipment Promotion',
  iw: 'Infinite War',
  costume: 'Costumes',
  'mileage-unit': 'Mileage: Units',
  'mileage-equip': 'Mileage: Equipment',
  'mileage-orca': 'MissOrca Mileage',
};

const RESET_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'month', label: 'Monthly' },
  { value: 'other', label: 'Permanent' },
] as const;

export default function ExchangePage() {
  useTranslationVersion();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const region = useAppSelector(selectRegion);
  const items = useAppSelector(selectItems);
  const world = useAppSelector(selectWorld);
  const [data, setData] = useState<GeneralExchange | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [reset, setReset] = useState<string>('all');

  useEffect(() => {
    dispatch(fetchItemsAsync());
    dispatch(fetchWorldAsync());
  }, [dispatch, region]);

  useEffect(() => {
    let live = true;
    setData(null);
    setFailed(false);
    fetchGeneralExchange(region).then((d) => {
      if (!live) return;
      if (d) setData(d); else setFailed(true);
    });
    return () => { live = false; };
  }, [region]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const name = (p: ExchangeProduct) => [
      items[p.item] ? t(items[p.item].name) : p.item,
      p.skin && items[p.skin.unit] ? t(items[p.skin.unit].name) : '',
    ].join(' ').toLowerCase();
    const keep = (p: ExchangeProduct) =>
      (reset === 'all' || (reset === 'month' ? p.reset === 'month' : p.reset !== 'month'))
      && (!q || name(p).includes(q));
    return (data?.tabs ?? []).map((tab) => ({ ...tab, shown: tab.items.filter(keep) }));
  }, [data, items, query, reset]);
  const tabs: TabItem[] = filtered.map((tab) => ({
    id: tab.id, label: TAB_LABEL[tab.id] ?? tab.id, count: tab.shown.length,
  }));
  const [tab, setTab] = tabParam(nextRouterAdapter(router), tabs);
  const active = filtered.find((x) => x.id === tab);
  const current = Object.entries(world).find(([, w]) => w.type === 'current');

  return (
    <>
      <Seo title="Exchange" description={DESCRIPTION} />
      <VStack align="stretch" spacing={4} py={4}>
        <PageHeader title="Exchange"
          subtitle="Standing exchange shop items currently on sale. Event exchanges are on each event's page." />

        {current && current[1].exchange ? (
          <HStack spacing={3} p={3} borderWidth="1px" borderColor="accent.400" borderRadius="lg" bg="whiteAlpha.50" wrap="wrap">
            <Text fontSize="sm" color="gray.300">Current event exchange:</Text>
            <Button as={Link} href={`/world/detail?id=${encodeURIComponent(current[0])}`} size="sm" colorScheme="accent">
              {t(current[1].title)}
            </Button>
          </HStack>
        ) : null}

        {failed ? <EmptyState title="Exchange data failed to load." /> : !data ? (
          <Center py={20}><Spinner color="accent.400" /></Center>
        ) : (
          <>
            <Flex gap={3} wrap="wrap" align="center">
              <Box flex="1" minW="200px" maxW="360px">
                <SearchBox value={query} onChange={setQuery} placeholder="Search items or units" />
              </Box>
              <SegmentedButtons label="Purchase limit reset" options={RESET_OPTIONS} selected={reset}
                onToggle={setReset} />
            </Flex>
            <UrlTabs tabs={tabs} active={tab} onChange={setTab} label="Exchange tabs" idBase="exchange" />
            <TabPanel tab={tab} idBase="exchange">
              {active && active.shown.length ? (
                <ShopGrid products={active.shown} items={items} />
              ) : (
                <EmptyState title="No items match." />
              )}
            </TabPanel>
          </>
        )}
      </VStack>
    </>
  );
}
