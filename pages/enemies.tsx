import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectEnemy, selectEnemyStatus, fetchEnemyAsync, setActive } from '@/store/enemySlice';
import { selectImage, fetchImageAsync } from '@/store/imageSlice';
import { memo, useDeferredValue, useEffect, useState } from 'react';
import { EnemyData } from '@/interfaces/enemy';
import { Box, SimpleGrid, VStack, Center, Text, Heading } from '@altterisk/game-hub/ui';
import { useRouter } from 'next/router';
import { ListToolbar, SearchBox, FilterPanel, FilterRow, FilterChip, EmptyState } from '@altterisk/game-hub';
import SimpleCard from '@/components/simpleCard';
import { t } from '@/lib/strings';
import { useTranslationVersion } from '@/lib/translationVersion';
import { typeIcon, roleIcon, nextFilterMode, FilterMode } from '@/lib/rank';
import { chipColor, countActive, fillModes, useListUrl, useUrlText } from '@/lib/listUrl';
import { Image } from '@altterisk/game-hub/ui';
import { Seo } from '@/components/seo';
import { useStableList } from '@/lib/useStableList';

const DESCRIPTION = 'Every Last Origin enemy with stats and skills.';

const ROLES = ['Attacker', 'Defender', 'Supporter'] as const;
const TYPES = ['Light', 'Air', 'Heavy'] as const;
const FILTER_KEYS = ['type', 'role', 'used'];

export default function Home() {
  useTranslationVersion();
  const enemy = useAppSelector(selectEnemy);
  const enemyStatus = useAppSelector(selectEnemyStatus);
  const dispatch = useAppDispatch();

  const router = useRouter();

  useEffect(() => {
    dispatch(fetchEnemyAsync());
    dispatch(fetchImageAsync());
  }, [dispatch]);

  // Deep link ?enemy=<id>&lv=<n>; runs when the query or the loaded set changes.
  useEffect(() => {
    if (!router.isReady) return;
    const id = router.query.enemy as string | undefined;
    if (id && enemy[id]) {
      const lv = parseInt((router.query.lv as string) || '1', 10);
      dispatch(setActive([id, Number.isFinite(lv) && lv > 0 ? lv : 1]));
    }
  }, [router.isReady, router.query.enemy, router.query.lv, enemy, dispatch]);

  const { list: urlList, ready } = useListUrl();
  const [searchTerm, setSearchTerm] = useUrlText(urlList, ready);
  const deferredSearch = useDeferredValue(searchTerm);
  const usedParam = urlList.text('used');
  const usedMode: FilterMode = usedParam === '1' ? 1 : usedParam === '-1' ? -1 : 0;
  const setUsedMode = (mode: FilterMode) => urlList.setText('used', mode ? String(mode) : '');
  const filterGroup = { ...fillModes(TYPES, urlList.modes('type')), ...fillModes(ROLES, urlList.modes('role')) };
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilters = countActive(filterGroup, { used: usedMode });

  function handleSwitch(e: keyof typeof filterGroup) {
    urlList.cycleMode((TYPES as readonly string[]).includes(e) ? 'type' : 'role', e);
  }
  function filterButton(e: EnemyData) {
    if (e.role in filterGroup && e.type in filterGroup) {
      const allowed = (value: keyof typeof filterGroup, keys: readonly (keyof typeof filterGroup)[]) =>
        filterGroup[value] !== -1
        && (!keys.some((key) => filterGroup[key] === 1) || filterGroup[value] === 1);
      return allowed(e.role as keyof typeof filterGroup, ROLES)
        && allowed(e.type as keyof typeof filterGroup, TYPES);
    }
    return false;
  }
  function filterName(e: EnemyData) {
    if (!deferredSearch) return true;
    const q = deferredSearch.toLowerCase();
    // match display name OR the internal code name (e.id)
    return t(e.name).toLowerCase().includes(q) || (e.id || '').toLowerCase().includes(q);
  }
  function filterUsed(e: EnemyData) {
    const used = e.used ? Object.keys(e.used).length > 0 || !!e.usedSanctum : false;
    return usedMode === 0 || (usedMode === 1 ? used : !used);
  }
  function enemies(list: { [key: string]: EnemyData }) {
    const out: EnemyData[] = [];
    const dupe = new Set<string>();
    for (const key in list) {
      const val = list[key];
      // dedup on the name loc-id, so enemies resolving to the same text stay separate
      if (!dupe.has(val.name) && filterUsed(val) && filterName(val) && filterButton(val)) {
        dupe.add(val.name);
        out.push(val);
      }
    }
    return out;
  }

  const list = useStableList(enemies(enemy));

  if (enemyStatus == 'failed') {
    return (<><Seo title="Enemy List" description={DESCRIPTION} /><Center py={20}><Text color="red.300">Failed to load enemies.</Text></Center></>);
  }
  if (Object.keys(enemy).length === 0) {
    // empty -> render nothing here; the layout's GlobalLoader shows the spinner
    return (<><Seo title="Enemy List" description={DESCRIPTION} /></>);
  }

  return (
    <>
      <Seo title="Enemy List" description={DESCRIPTION} />
      <VStack align="stretch" spacing={4} py={4}>
        <Heading as="h1" size="xl">Enemies</Heading>

        <Box>
          <ListToolbar
            search={<SearchBox value={searchTerm} onChange={setSearchTerm} placeholder="Search name" />}
            count={`${list.length} enemies`}
            activeFilters={activeFilters + (searchTerm ? 1 : 0)}
            onClearFilters={() => { setSearchTerm(''); urlList.clear(FILTER_KEYS); }}
          />
          <FilterPanel open={filtersOpen} onToggle={() => setFiltersOpen((o) => !o)} activeCount={activeFilters}>
            <FilterRow label="Role">
              {ROLES.map((r) => (
                <FilterChip key={r} mode={filterGroup[r]} color={chipColor('red')} onClick={() => handleSwitch(r)}>
                  {roleIcon(r) ? <Image src={roleIcon(r)!} alt="" boxSize="16px" /> : null}{r}
                </FilterChip>
              ))}
            </FilterRow>
            <FilterRow label="Type">
              {TYPES.map((ty) => (
                <FilterChip key={ty} mode={filterGroup[ty]} color={chipColor('green')} onClick={() => handleSwitch(ty)}>
                  {typeIcon(ty) ? <Image src={typeIcon(ty)!} alt="" boxSize="16px" /> : null}{ty}
                </FilterChip>
              ))}
            </FilterRow>
            <FilterRow label="Usage">
              <FilterChip mode={usedMode} onClick={() => setUsedMode(nextFilterMode(usedMode))}>
                {usedMode === 1 ? 'Used only' : usedMode === -1 ? 'Unused only' : 'Used'}
              </FilterChip>
            </FilterRow>
          </FilterPanel>
        </Box>

        {list.length === 0 ? (
          <EmptyState title="No enemies match the current filters." />
        ) : (
          <EnemyGrid list={list} />
        )}
      </VStack>
    </>
  );
}

// Memoized so keystrokes and URL updates that leave the result set unchanged skip the grid.
const EnemyGrid = memo(function EnemyGrid({ list }: { list: EnemyData[] }) {
  useTranslationVersion();
  const dispatch = useAppDispatch();
  const imagelink = useAppSelector(selectImage);
  return (
    <SimpleGrid columns={[3, 4, 5, 7, 8]} spacing={3}>
      {list.map((e) => (
        <SimpleCard key={e.id} onClick={() => dispatch(setActive([e.id, 1]))}
          headingSize="xs" img={imagelink[e.img] || undefined} alt={e.img}>
          {t(e.name)}
        </SimpleCard>
      ))}
    </SimpleGrid>
  );
});
