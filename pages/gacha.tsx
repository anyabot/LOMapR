import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAppSelector } from '@/hooks';
import { selectRegion } from '@/store/regionSlice';
import {
  Box, Flex, HStack, VStack, Heading, Text, Image, Badge,
  Button, ButtonGroup, SimpleGrid, Wrap, WrapItem,
  Spinner, Center, Divider, Stat, StatLabel, StatNumber,
  Tooltip,
  Tabs, TabList, TabPanels, Tab, TabPanel,
} from '@chakra-ui/react';
import Head from 'next/head';
import NextLink from 'next/link';
import { fetchGachaPools, GachaEntry, GachaPools } from '@/lib/fetchData';
import { tAny } from '@/lib/strings';
import { useTranslationVersion } from '@/lib/translationVersion';

// Derive skin-specific formation icon from the gacha entry.
// unitIcon = "FormationIcon_BR_Gnome_N", key = "Skin_BR_Gnome_1"
// -> strip trailing "N", append "NS" + numeric index (strip leading zeros)
function skinFormationIcon(entry: GachaEntry & { kind: 'skin' }): string {
  const idx = parseInt(entry.key.split('_').at(-1) ?? '1', 10);
  const base = entry.unitIcon.replace(/_N$/, '');
  return `${base}_NS${idx}`;
}

// Resolve skin display name via runtime translation layers (mirrors skins page).
function skinName(entry: GachaEntry & { kind: 'skin' }): string {
  return tAny(entry.nameId) || tAny(entry.packNameId) || tAny(entry.itemNameId) || entry.unitEngName;
}

// Resolve pre-built {en, ko} item name.
function itemName(name: { en: string; ko: string } | undefined, fallback = ''): string {
  if (!name) return fallback;
  const en = name.en?.trim();
  if (en && !/^\d+$/.test(en)) return en;
  return name.ko?.trim() || fallback;
}

// ── grade colours (matches equip/item display) ───────────────────────────────
const GRADE_COLOR: Record<number, string> = {
  5: 'yellow.300',
  4: 'purple.300',
  3: 'blue.300',
  2: 'green.300',
  1: 'gray.400',
};

// ── pool config ───────────────────────────────────────────────────────────────
type PoolKey = keyof GachaPools;

interface BoxDef {
  key: PoolKey;           // used to check if pool exists (singleKey)
  singleKey: PoolKey;
  multiKey: PoolKey | null;
  label: string;
  singleLabel: string;
  multiLabel: string | null;
  pulls: number;          // pulls per multi (ignored when multiKey is null)
  singleCost: number;     // tuna cost per single pull (0 = free/other currency)
  multiCost: number;      // tuna cost per multi pull
  hideSingle?: boolean;   // hide ×1 button (pool exists but not sold individually)
  note?: string;
}

const BOXES: BoxDef[] = [
  {
    key: 'skin_1x',
    singleKey: 'skin_1x',
    multiKey: null,       // 11x data exists but not sold
    label: 'Skin Box',
    singleLabel: '×1',
    multiLabel: null,
    pulls: 1,
    singleCost: 110,
    multiCost: 0,
  },
  {
    key: 'n_1x',
    singleKey: 'n_1x',
    multiKey: 'n_11x',
    label: 'Normal Box',
    singleLabel: '×1',
    multiLabel: '×11',
    pulls: 11,
    singleCost: 10,
    multiCost: 100,
  },
  {
    key: 'n_1x',
    singleKey: 'n_1x',
    multiKey: 'n_event_11x',
    label: 'Normal Box (Event)',
    singleLabel: '×1',
    multiLabel: '×11',
    pulls: 11,
    singleCost: 10,
    multiCost: 100,
    hideSingle: true,
    note: 'Seasonal double-rate variant',
  },
  {
    key: 'praemium_1x',
    singleKey: 'praemium_1x',
    multiKey: 'praemium_11x',
    label: 'Premium Box',
    singleLabel: '×1',
    multiLabel: '×11',
    pulls: 11,
    singleCost: 30,
    multiCost: 300,
  },
  {
    key: 'quest_1x',
    singleKey: 'quest_1x',
    multiKey: 'quest_10x',
    label: 'Quest Box',
    singleLabel: '×1',
    multiLabel: '×10',
    pulls: 10,
    singleCost: 0,
    multiCost: 0,
    note: 'Mission Reward',
  },
];

// ── weighted random ────────────────────────────────────────────────────────────
function weightedPick(pool: GachaEntry[]): GachaEntry {
  const total = pool.reduce((s, e) => s + e.rate, 0);
  let r = Math.random() * total;
  for (const entry of pool) {
    r -= entry.rate;
    if (r <= 0) return entry;
  }
  return pool[pool.length - 1];
}

function doPulls(pool: GachaEntry[], count: number): GachaEntry[] {
  const results: GachaEntry[] = [];
  for (let i = 0; i < count; i++) results.push(weightedPick(pool));
  return results;
}

// ── entry display ─────────────────────────────────────────────────────────────
function EntryIcon({ entry, size = '56px' }: { entry: GachaEntry; size?: string }) {
  const iconSrc = entry.kind === 'skin'
    ? `/images/icons/${skinFormationIcon(entry)}.png`
    : `/images/icons/${entry.icon}.png`;
  const grade = entry.kind === 'skin' ? 5 : entry.grade;
  const borderColor = GRADE_COLOR[grade] ?? 'gray.500';
  const label = entry.kind === 'skin' ? skinName(entry) : itemName(entry.name, entry.key);

  return (
    <Tooltip label={label} placement="top" hasArrow>
      <Box
        boxSize={size}
        borderRadius="md"
        borderWidth="2px"
        borderColor={borderColor}
        overflow="hidden"
        bg="surface.elevated"
        flexShrink={0}
      >
        <Image
          src={iconSrc}
          alt={entry.kind === 'skin' ? entry.unitEngName : entry.key}
          w="100%"
          h="100%"
          objectFit="contain"
          fallback={<Box w="100%" h="100%" bg="surface.elevated" />}
        />
      </Box>
    </Tooltip>
  );
}

function ResultCard({ entry }: { entry: GachaEntry }) {
  const name = entry.kind === 'skin'
    ? skinName(entry)
    : itemName(entry.name, entry.key);
  const sub = entry.kind === 'skin' ? entry.unitEngName : '';
  const price = entry.kind === 'skin' ? entry.price : undefined;
  const qty = entry.kind === 'item' ? entry.qty : undefined;
  const grade = entry.kind === 'skin' ? 5 : entry.grade;
  const href = entry.kind === 'skin' ? `/units/detail?id=${encodeURIComponent(entry.unitId)}` : null;

  const card = (
    <VStack
      spacing={1}
      p={2}
      bg="surface.elevated"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="surface.border"
      minW="80px"
      maxW="100px"
      align="center"
      _hover={href ? { borderColor: 'yellow.400' } : undefined}
      transition="border-color 0.12s"
    >
      <EntryIcon entry={entry} size="64px" />
      <Text fontSize="2xs" textAlign="center" noOfLines={2} color={GRADE_COLOR[grade]} lineHeight="shorter">
        {name}
      </Text>
      {sub && (
        <Text fontSize="2xs" color="whiteAlpha.500" textAlign="center" noOfLines={1} lineHeight="shorter">
          {sub}
        </Text>
      )}
      {qty != null && qty > 1 && (
        <Text fontSize="2xs" color="whiteAlpha.600" lineHeight="none">×{qty}</Text>
      )}
      {price != null && (
        <HStack spacing={0.5}>
          <Image src="/images/icons/UI_Icon_Currency_Tuna.png" boxSize="10px" alt="tuna" />
          <Text fontSize="2xs" color="cyan.300" lineHeight="none">{price}</Text>
        </HStack>
      )}
    </VStack>
  );

  return href ? <Box as={NextLink} href={href}>{card}</Box> : card;
}

// ── rates grid section (hoisted to module level — nested component definitions
// cause React to treat them as new types each render, unmounting all images) ──
function RatesSection({ entries, label, total }: { entries: GachaEntry[]; label: string; total: number }) {
  if (!entries.length) return null;
  return (
    <Box>
      <HStack mb={2} spacing={2} wrap="wrap">
        <Text fontWeight="semibold" fontSize="sm">{label}</Text>
        <Badge colorScheme="yellow" fontSize="xs">{(total * 100).toFixed(4)}% combined</Badge>
        <Text fontSize="xs" color="whiteAlpha.500">{entries.length} entries</Text>
      </HStack>
      <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing={2}>
        {entries.map((entry) => {
          const name = entry.kind === 'skin'
            ? skinName(entry)
            : itemName(entry.name, entry.key);
          const charName = entry.kind === 'skin' ? entry.unitEngName : null;
          const price = entry.kind === 'skin' ? entry.price : undefined;
          const qty = entry.kind === 'item' ? entry.qty : undefined;
          const grade = entry.kind === 'skin' ? 5 : entry.grade;
          const highlight = entry.rate >= 0.004;
          const href = entry.kind === 'skin' ? `/units/detail?id=${encodeURIComponent(entry.unitId)}` : null;
          return (
            <VStack
              key={entry.id}
              as={href ? NextLink : undefined}
              href={href ?? undefined}
              spacing={1}
              p={2}
              bg="surface.elevated"
              borderRadius="md"
              borderWidth="1px"
              borderColor={highlight ? 'yellow.700' : 'surface.border'}
              align="center"
              _hover={href ? { borderColor: 'yellow.400' } : undefined}
              transition="border-color 0.12s"
            >
              <Box
                boxSize="52px"
                borderRadius="sm"
                borderWidth="2px"
                borderColor={GRADE_COLOR[grade] ?? 'gray.500'}
                overflow="hidden"
                bg="#0f1115"
                flexShrink={0}
              >
                <Image
                  src={entry.kind === 'skin'
                    ? `/images/icons/${skinFormationIcon(entry)}.png`
                    : `/images/icons/${entry.icon}.png`}
                  alt={name}
                  w="100%"
                  h="100%"
                  objectFit="contain"
                  fallback={<Box w="100%" h="100%" />}
                />
              </Box>
              <Text fontSize="2xs" textAlign="center" noOfLines={2} color="whiteAlpha.900" lineHeight="shorter">
                {name}
              </Text>
              {charName && charName !== name && (
                <Text fontSize="2xs" color="whiteAlpha.500" noOfLines={1} textAlign="center" lineHeight="shorter">
                  {charName}
                </Text>
              )}
              <Text
                fontSize="2xs"
                color={highlight ? 'yellow.300' : 'whiteAlpha.500'}
                fontWeight={highlight ? 'semibold' : 'normal'}
                lineHeight="none"
              >
                {(entry.rate * 100).toFixed(4)}%
              </Text>
              {qty != null && qty > 1 && (
                <Text fontSize="2xs" color="whiteAlpha.600" lineHeight="none">×{qty}</Text>
              )}
              {price != null && (
                <HStack spacing={0.5}>
                  <Image src="/images/icons/UI_Icon_Currency_Tuna.png" boxSize="10px" alt="tuna" />
                  <Text fontSize="2xs" color="cyan.300" lineHeight="none">{price}</Text>
                </HStack>
              )}
            </VStack>
          );
        })}
      </SimpleGrid>
    </Box>
  );
}

// ── rates grid ────────────────────────────────────────────────────────────────
function RatesGrid({ pool }: { pool: GachaEntry[] }) {
  const skins = [...pool.filter(e => e.kind === 'skin')].sort((a, b) => b.rate - a.rate);
  const items = [...pool.filter(e => e.kind === 'item')].sort((a, b) => b.rate - a.rate);
  const skinTotal = skins.reduce((s, e) => s + e.rate, 0);
  const itemTotal = items.reduce((s, e) => s + e.rate, 0);

  const avgTuna = skins.reduce((s, e) => {
    const price = e.kind === 'skin' ? (e.price ?? 0) : 0;
    return s + e.rate * price;
  }, 0);

  return (
    <VStack align="stretch" spacing={6}>
      {skins.length > 0 && avgTuna > 0 && (
        <HStack spacing={2} p={2} bg="surface.elevated" borderRadius="md" borderWidth="1px" borderColor="surface.border">
          <Image src="/images/icons/UI_Icon_Currency_Tuna.png" boxSize="14px" alt="tuna" />
          <Text fontSize="sm">
            Expected value per pull:{' '}
            <Text as="span" color="cyan.300" fontWeight="semibold">{avgTuna.toFixed(2)}</Text>
            {' '}tuna
          </Text>
        </HStack>
      )}
      <RatesSection entries={skins} label="Skins" total={skinTotal} />
      {items.length > 0 && <Divider borderColor="surface.border" />}
      <RatesSection entries={items} label="Items" total={itemTotal} />
    </VStack>
  );
}

// ── history types ─────────────────────────────────────────────────────────────
interface PullSession {
  entries: GachaEntry[];
  cost: number;       // tuna spent
  skinValue: number;  // tuna value of skins received
}

// ── history stats ─────────────────────────────────────────────────────────────
function HistoryStats({ history }: { history: PullSession[] }) {
  const allEntries = history.flatMap(s => s.entries);
  const total      = allEntries.length;
  const skinCount  = allEntries.filter(e => e.kind === 'skin').length;
  const skinRate   = total > 0 ? (skinCount / total * 100).toFixed(1) : '0.0';
  const totalCost  = history.reduce((s, p) => s + p.cost, 0);
  const totalValue = history.reduce((s, p) => s + p.skinValue, 0);
  const net        = totalValue - totalCost;

  const counts: Record<string, { entry: GachaEntry; count: number }> = {};
  for (const e of allEntries) {
    if (!counts[e.key]) counts[e.key] = { entry: e, count: 0 };
    counts[e.key].count++;
  }
  const sorted = Object.values(counts).sort((a, b) => b.count - a.count);

  return (
    <VStack align="stretch" spacing={3}>
      <HStack spacing={6} wrap="wrap">
        <Stat size="sm">
          <StatLabel>Total pulls</StatLabel>
          <StatNumber>{total}</StatNumber>
        </Stat>
        <Stat size="sm">
          <StatLabel>Skins pulled</StatLabel>
          <StatNumber>{skinCount}</StatNumber>
        </Stat>
        <Stat size="sm">
          <StatLabel>Skin rate</StatLabel>
          <StatNumber>{skinRate}%</StatNumber>
        </Stat>
      </HStack>
      {(totalCost > 0 || totalValue > 0) && (
        <HStack spacing={3} p={2} bg="surface.elevated" borderRadius="md" borderWidth="1px" borderColor="surface.border" wrap="wrap">
          <Image src="/images/icons/UI_Icon_Currency_Tuna.png" boxSize="14px" alt="tuna" flexShrink={0} />
          {totalCost > 0 && (
            <Text fontSize="sm" color="whiteAlpha.600">Spent: <Text as="span" color="whiteAlpha.800" fontWeight="semibold">{totalCost}</Text></Text>
          )}
          {totalValue > 0 && (
            <Text fontSize="sm" color="whiteAlpha.600">Skins: <Text as="span" color="cyan.300" fontWeight="semibold">{totalValue}</Text></Text>
          )}
          {totalCost > 0 && (
            <Text fontSize="sm" color="whiteAlpha.600">Net: <Text as="span" color={net >= 0 ? 'green.300' : 'red.300'} fontWeight="semibold">{net >= 0 ? '+' : ''}{net}</Text></Text>
          )}
        </HStack>
      )}
      {sorted.length > 0 && (
        <>
          <Text fontSize="sm" fontWeight="semibold" color="whiteAlpha.700">All pulls</Text>
          <Wrap spacing={2}>
            {sorted.map(({ entry, count }) => (
              <WrapItem key={entry.id}>
                <VStack spacing={0} align="center">
                  <EntryIcon entry={entry} size="44px" />
                  <Badge fontSize="2xs" colorScheme={count > 1 ? 'yellow' : 'gray'}>×{count}</Badge>
                </VStack>
              </WrapItem>
            ))}
          </Wrap>
        </>
      )}
    </VStack>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function GachaPage() {
  useTranslationVersion();
  const region = useAppSelector(selectRegion);
  const [pools, setPools] = useState<GachaPools | null>(null);
  const [loading, setLoading] = useState(true);

  const [boxIdx, setBoxIdx] = useState(0);
  const [results, setResults] = useState<GachaEntry[]>([]);
  const [lastCost, setLastCost] = useState(0);
  const [history, setHistory] = useState<PullSession[]>([]);
  const [tab, setTab] = useState(1);   // default: Rates tab

  useEffect(() => {
    setLoading(true);
    setPools(null);
    setResults([]);
    setLastCost(0);
    setHistory([]);
    fetchGachaPools(region).then(d => {
      setPools(d);
      setLoading(false);
    });
  }, [region]);

  const box = BOXES[boxIdx];
  const singlePool = pools?.[box.singleKey] ?? [];
  const multiPool  = box.multiKey ? (pools?.[box.multiKey] ?? []) : [];

  const pull = useCallback((count: number, cost: number, pool: GachaEntry[]) => {
    if (!pool.length) return;
    const drawn = doPulls(pool, count);
    const skinValue = drawn.reduce((s, e) => s + (e.kind === 'skin' ? (e.price ?? 0) : 0), 0);
    setResults(drawn);
    setLastCost(cost);
    setHistory(prev => {
      const session: PullSession = { entries: drawn, cost, skinValue };
      // cap at ~1000 total individual pulls
      const next = [session, ...prev];
      let total = 0;
      const trimmed: PullSession[] = [];
      for (const s of next) {
        total += s.entries.length;
        trimmed.push(s);
        if (total >= 1000) break;
      }
      return trimmed;
    });
    setTab(0);
  }, []);

  const reset = () => {
    setResults([]);
    setLastCost(0);
    setHistory([]);
  };

  return (
    <>
      <Head><title>Gacha Simulator | LoMapR</title></Head>
      <Box maxW="1100px" mx="auto" px={4} py={6}>
        <Heading size="lg" mb={1}>Gacha Simulator</Heading>
        <Text fontSize="sm" color="whiteAlpha.600" mb={5}>
          Rates reflect the live {region === 'kr' ? 'KR' : 'Global'} data. Results are for entertainment only.
        </Text>

        {loading && (
          <Center py={20}><Spinner size="xl" /></Center>
        )}

        {!loading && !pools && (
          <Center py={20}><Text color="whiteAlpha.500">No data available for this region.</Text></Center>
        )}

        {!loading && pools && (
          <Flex gap={6} direction={{ base: 'column', md: 'row' }} align="flex-start">
            {/* ── left panel: box selector + pull buttons ── */}
            <VStack
              spacing={4}
              align="stretch"
              minW="220px"
              maxW={{ base: '100%', md: '240px' }}
              bg="surface.elevated"
              borderRadius="xl"
              borderWidth="1px"
              borderColor="surface.border"
              p={4}
            >
              <Text fontWeight="semibold" fontSize="sm" color="whiteAlpha.700">Box type</Text>
              {BOXES.map((b, i) => {
                // event box: only show if the event pool exists in data
                const available = !!(pools[b.singleKey]?.length) &&
                  (b.multiKey === null || b.multiKey === undefined || !b.multiKey.includes('event') || !!(pools[b.multiKey]?.length));
                if (!available && b.multiKey?.includes('event')) return null;
                return (
                  <Box
                    key={`${b.label}-${i}`}
                    p={3}
                    borderRadius="lg"
                    borderWidth="1px"
                    borderColor={boxIdx === i ? 'yellow.400' : 'surface.border'}
                    bg={boxIdx === i ? 'whiteAlpha.100' : 'transparent'}
                    cursor={available ? 'pointer' : 'not-allowed'}
                    opacity={available ? 1 : 0.4}
                    onClick={() => available && setBoxIdx(i)}
                    _hover={available ? { borderColor: 'yellow.400' } : {}}
                    transition="border-color 0.15s"
                  >
                    <Text fontSize="sm" fontWeight="semibold">{b.label}</Text>
                    {b.note && <Text fontSize="xs" color="whiteAlpha.500">{b.note}</Text>}
                  </Box>
                );
              })}

              <Divider borderColor="surface.border" />

              <VStack spacing={2} align="stretch">
                {!box.hideSingle && (
                  <Button
                    colorScheme="yellow"
                    size="sm"
                    onClick={() => pull(1, box.singleCost, singlePool)}
                    isDisabled={!singlePool.length}
                  >
                    Pull {box.singleLabel}{box.singleCost > 0 ? ` - ${box.singleCost} tuna` : ''}
                  </Button>
                )}
                {box.multiKey && (
                  <Button
                    colorScheme="yellow"
                    variant="outline"
                    size="sm"
                    onClick={() => pull(box.pulls, box.multiCost, multiPool)}
                    isDisabled={!multiPool.length}
                  >
                    Pull {box.multiLabel}{box.multiCost > 0 ? ` - ${box.multiCost} tuna` : ''}
                  </Button>
                )}
                <Button
                  size="xs"
                  variant="ghost"
                  color="whiteAlpha.500"
                  onClick={reset}
                  isDisabled={!history.length}
                >
                  Reset history
                </Button>
              </VStack>
            </VStack>

            {/* ── right panel: tabs ── */}
            <Box flex={1} minW={0}>
              <Tabs index={tab} onChange={setTab} variant="soft-rounded" colorScheme="yellow" size="sm">
                <TabList mb={3}>
                  <Tab>Last pull {results.length > 0 && `(${results.length})`}</Tab>
                  <Tab>Rates</Tab>
                  <Tab>History {history.length > 0 && `(${history.reduce((s, p) => s + p.entries.length, 0)})`}</Tab>
                </TabList>
                <TabPanels>
                  {/* Results */}
                  <TabPanel p={0}>
                    {results.length === 0 ? (
                      <Center py={16}>
                        <Text color="whiteAlpha.400" fontSize="sm">Pull to see results</Text>
                      </Center>
                    ) : (() => {
                      const skinValue = results.reduce((s, e) => s + (e.kind === 'skin' ? (e.price ?? 0) : 0), 0);
                      const net = skinValue - lastCost;
                      const showTally = lastCost > 0 || skinValue > 0;
                      return (
                        <VStack align="stretch" spacing={3}>
                          {showTally && (
                            <HStack spacing={3} p={2} bg="surface.elevated" borderRadius="md" borderWidth="1px" borderColor="surface.border" wrap="wrap">
                              <Image src="/images/icons/UI_Icon_Currency_Tuna.png" boxSize="14px" alt="tuna" flexShrink={0} />
                              {lastCost > 0 && (
                                <Text fontSize="sm" color="whiteAlpha.600">Cost: <Text as="span" color="whiteAlpha.800" fontWeight="semibold">{lastCost}</Text></Text>
                              )}
                              {skinValue > 0 && (
                                <Text fontSize="sm" color="whiteAlpha.600">Skins: <Text as="span" color="cyan.300" fontWeight="semibold">{skinValue}</Text></Text>
                              )}
                              {lastCost > 0 && (
                                <Text fontSize="sm" color="whiteAlpha.600">Net: <Text as="span" color={net >= 0 ? 'green.300' : 'red.300'} fontWeight="semibold">{net >= 0 ? '+' : ''}{net}</Text></Text>
                              )}
                            </HStack>
                          )}
                          <Wrap spacing={2}>
                            {results.map((entry, i) => (
                              <WrapItem key={i}>
                                <ResultCard entry={entry} />
                              </WrapItem>
                            ))}
                          </Wrap>
                        </VStack>
                      );
                    })()}
                  </TabPanel>

                  {/* Rates */}
                  <TabPanel p={0}>
                    <RatesGrid pool={box.multiKey && box.multiKey !== box.singleKey && multiPool.length ? multiPool : singlePool} />
                  </TabPanel>

                  {/* History */}
                  <TabPanel p={0}>
                    {history.length === 0 ? (
                      <Center py={16}>
                        <Text color="whiteAlpha.400" fontSize="sm">No pulls yet</Text>
                      </Center>
                    ) : (
                      <HistoryStats history={history} />
                    )}
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </Box>
          </Flex>
        )}
      </Box>
    </>
  );
}
