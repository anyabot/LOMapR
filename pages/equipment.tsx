import { useEffect, useState } from 'react';
import {
  VStack, HStack, Center, Text, Heading, Badge, Box, Image, SimpleGrid,
} from '@chakra-ui/react';
import { ListToolbar, SearchBox, FilterPanel, FilterRow, FilterChip, EmptyState } from '@altterisk/game-hub';
import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectEquip, selectEquipStatus, fetchEquipAsync, setActiveEquip } from '@/store/equipSlice';
import { EquipData } from '@/interfaces/equip';
import { t } from '@/lib/strings';
import { useTranslationVersion } from '@/lib/translationVersion';
import { rankTag, rankColor, equipIcon, EXCHANGE_META, filterValueAllowed } from '@/lib/rank';
import { chipColor, countActive, fillModes, useListUrl, useUrlText } from '@/lib/listUrl';
import Head from 'next/head';
import { useRouter } from 'next/router';

// The three equip slots, from the data's `slot` (the key prefix is unreliable).
const SLOTS: { label: 'Chip' | 'OS' | 'Item'; icon: string }[] = [
  { label: 'Chip', icon: 'Chip' },
  { label: 'OS', icon: 'OS' },
  { label: 'Item', icon: 'Item' },
];
const GRADES = [6, 5, 4, 3, 2] as const;   // SSS..B
const EXCHANGES = ['Sanctum', 'IW'] as const;
// Exclusive (pcLimit set) cuts across slots, so it is a filter, not a list section.
const TYPES = ['Chip', 'OS', 'Item', 'Exclusive'] as const;
type TypeFilter = typeof TYPES[number];
const FILTER_KEYS = ['type', 'grade', 'exchange'];
const isExclusive = (e: EquipData) => !!e.pcLimit;

export default function Equipment() {
  useTranslationVersion();
  const equip = useAppSelector(selectEquip);
  const status = useAppSelector(selectEquipStatus);
  const dispatch = useAppDispatch();
  const router = useRouter();

  useEffect(() => { dispatch(fetchEquipAsync()); }, [dispatch]);

  // Deep link: ?equip=<id> opens that equip's modal once the list is loaded.
  useEffect(() => {
    const id = router.query.equip as string | undefined;
    if (router.isReady && id && equip[id]) dispatch(setActiveEquip(id));
  }, [router.isReady, router.query.equip, equip, dispatch]);

  const { list, ready } = useListUrl();
  const [searchTerm, setSearchTerm] = useUrlText(list, ready);
  const grades = fillModes(GRADES, list.modes('grade'));
  const exchanges = fillModes(EXCHANGES, list.modes('exchange'));
  const types = fillModes(TYPES, list.modes('type'));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilters = countActive(grades, exchanges, types);

  function matches(e: EquipData) {
    if (!filterValueAllowed(e.grade, grades)) return false;
    const exchangeIncludes = EXCHANGES.some((x) => exchanges[x] === 1);
    if (e.exchange && exchanges[e.exchange] === -1) return false;
    if (exchangeIncludes && (!e.exchange || exchanges[e.exchange] !== 1)) return false;
    const typeMatch = (ty: TypeFilter) => ty === 'Exclusive' ? isExclusive(e) : e.slot === ty;
    if (TYPES.some((ty) => types[ty] === -1 && typeMatch(ty))) return false;
    const typeIncludes = TYPES.filter((ty) => types[ty] === 1);
    if (typeIncludes.length && !typeIncludes.some(typeMatch)) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!t(e.name).toLowerCase().includes(q) && !(e.id || '').toLowerCase().includes(q)) return false;
    }
    return true;
  }

  if (status === 'failed') {
    return (<><Head><title>Equipment</title></Head><Center py={20}><Text color="red.300">Failed to load equipment.</Text></Center></>);
  }
  if (Object.keys(equip).length === 0) {
    return (<><Head><title>Equipment</title></Head></>);
  }

  const shown = Object.values(equip).filter(matches);

  return (
    <>
      <Head><title>Equipment</title></Head>
      <VStack align="stretch" spacing={4} py={4}>
        <Heading size="xl">Equipment</Heading>

        <Box>
          <ListToolbar
            search={<SearchBox value={searchTerm} onChange={setSearchTerm} placeholder="Search name or code" />}
            count={`${shown.length} items`}
            activeFilters={activeFilters + (searchTerm ? 1 : 0)}
            onClearFilters={() => { setSearchTerm(''); list.clear(FILTER_KEYS); }}
          />
          <FilterPanel open={filtersOpen} onToggle={() => setFiltersOpen((o) => !o)} activeCount={activeFilters}>
            <FilterRow label="Type">
              {TYPES.map((ty) => (
                <FilterChip key={ty} mode={types[ty]} onClick={() => list.cycleMode('type', ty)}>{ty}</FilterChip>
              ))}
            </FilterRow>
            <FilterRow label="Grade">
              {GRADES.map((g) => (
                <FilterChip key={g} mode={grades[g]} color={rankColor(g)} onClick={() => list.cycleMode('grade', String(g))}>
                  {rankTag(g)}
                </FilterChip>
              ))}
            </FilterRow>
            <FilterRow label="Exchange">
              {EXCHANGES.map((x) => (
                <FilterChip key={x} mode={exchanges[x]} color={chipColor(EXCHANGE_META[x].color)}
                  onClick={() => list.cycleMode('exchange', x)}>
                  {EXCHANGE_META[x].label}
                </FilterChip>
              ))}
            </FilterRow>
          </FilterPanel>
        </Box>

        {shown.length === 0 ? (
          <EmptyState title="No equipment matches the current filters." />
        ) : (
          SLOTS.map((slot) => {
            const items = shown.filter((e) => e.slot === slot.label)
              .sort((a, b) => (b.grade - a.grade) || t(a.name).localeCompare(t(b.name)));
            if (!items.length) return null;
            return (
              <Box key={slot.label} borderWidth="1px" borderColor="surface.border" borderRadius="xl"
                overflow="hidden" bg="surface.elevated">
                <Box px={4} py={2} bg="blackAlpha.300" borderBottomWidth="1px" borderBottomColor="surface.border">
                  <HStack spacing={2}>
                    {equipIcon(slot.icon) ? <Image src={equipIcon(slot.icon)!} alt={slot.label} boxSize="20px" /> : null}
                    <Heading size="sm" color="gray.200">{slot.label}</Heading>
                    <Badge colorScheme="gray" borderRadius="full">{items.length}</Badge>
                  </HStack>
                </Box>
                <Box p={3}>
                  <SimpleGrid columns={[3, 4, 5, 7]} spacing={3}>
                    {items.map((e) => (
                      <EquipTile key={e.id} equip={e} onClick={() => dispatch(setActiveEquip(e.id))} />
                    ))}
                  </SimpleGrid>
                </Box>
              </Box>
            );
          })
        )}
      </VStack>
    </>
  );
}

// Compact equip tile: icon (rank-colored border) + name; opens the equip modal.
function EquipTile({ equip, onClick }: { equip: EquipData; onClick: () => void }) {
  return (
    <Box onClick={onClick} cursor="pointer" role="group" textAlign="center">
      <Box position="relative" boxSize="72px" mx="auto" borderRadius="lg" overflow="hidden"
        bg="blackAlpha.500" borderWidth="2px" borderColor={rankColor(equip.grade)}
        transition="transform .12s ease" _groupHover={{ transform: 'translateY(-2px)' }} p="4px">
        {equip.icon ? (
          <Image src={`/images/icons/${equip.icon}.png`} alt={equip.icon} objectFit="contain" w="100%" h="100%" />
        ) : null}
        {equip.exchange ? (
          <Badge position="absolute" top="2px" right="2px" fontSize="2xs" px={1} borderRadius="sm"
            colorScheme={EXCHANGE_META[equip.exchange].color}
            title={`${EXCHANGE_META[equip.exchange].label} exchange`}>
            {equip.exchange === 'IW' ? 'IW' : 'SC'}
          </Badge>
        ) : null}
      </Box>
      <Text fontSize="xs" color="gray.300" noOfLines={2} mt={1} lineHeight="1.15">{t(equip.name)}</Text>
    </Box>
  );
}
