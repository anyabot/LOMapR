/**
 * /misc — Miscellaneous Categorization.
 * Cross-unit lookups built by tools/transform/build/misc.py:
 *   1. Buff Lookup — REVERSE index: pick a buff/debuff type, see every unit that
 *      applies it, with values, targets and activation conditions.
 *   2. AoE — every unit skill hitting >= 2 cells, with its damage grid.
 *   3. Damage Types — units by active-skill damage type (physical/fire/ice/electric).
 */
import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Accordion, AccordionButton, AccordionIcon, AccordionItem, AccordionPanel,
  Badge, Box, Button, ButtonGroup, Center, Flex, HStack, Heading, IconButton, Image,
  Input, InputGroup, InputRightElement, Select, Spinner, Tab, TabList, TabPanel,
  TabPanels, Tabs, Text, VStack, Wrap, WrapItem,
} from '@chakra-ui/react';
import { CloseIcon, SearchIcon } from '@chakra-ui/icons';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { fetchUnitsAsync, selectUnits } from '@/store/unitSlice';
import {
  fetchMiscAsync, fetchMiscBuffAsync, selectMiscBuffStatus, selectMiscBuffs,
  selectMiscIndex, selectMiscStatus,
} from '@/store/miscSlice';
import { selectRegion } from '@/store/regionSlice';
import { BUFF_TYPE_NAMES, BuffCondTags, BuffEffectRow, TRIGGER_LABELS } from '@/components/buffList';
import SkillArea from '@/components/enemyTab/skillArea';
import UnitHoverCard from '@/components/unitHoverCard';
import { filterActiveProps, rankColor, rankTag, unitDisplayName } from '@/lib/rank';
import { t } from '@/lib/strings';
import { useTranslationVersion } from '@/lib/translationVersion';
import { MiscAoeEntry, MiscBuffEntry, MiscBuffTypeMeta, MiscSkillMeta } from '@/interfaces/misc';
import { SkillBuff } from '@/interfaces/skill';
import { UnitData } from '@/interfaces/unit';

// ── shared bits ───────────────────────────────────────────────────────────────

function UnitCell({ unit }: { unit: UnitData | undefined }) {
  const router = useRouter();
  if (!unit) return <Text fontSize="sm" color="gray.500">?</Text>;
  return (
    <UnitHoverCard unitId={unit.id} inline>
      <HStack spacing={2} cursor="pointer" minW={0}
        onClick={() => router.push(`/units/detail?id=${encodeURIComponent(unit.id)}`)}>
        {unit.icon ? (
          <Image src={`/images/icons/${unit.icon}.png`} alt="" boxSize="34px"
            borderRadius="md" objectFit="cover" flexShrink={0} />
        ) : null}
        <Box minW={0}>
          <Text fontSize="sm" color="gray.100" noOfLines={1}>{unitDisplayName(unit)}</Text>
          <HStack spacing={1}>
            <Badge fontSize="9px" bg={rankColor(unit.rarity)} color="blackAlpha.800">{rankTag(unit.rarity)}</Badge>
            <Text fontSize="10px" color="gray.500">{unit.role}</Text>
          </HStack>
        </Box>
      </HStack>
    </UnitHoverCard>
  );
}

function SkillCell({ e }: { e: MiscSkillMeta }) {
  return (
    <HStack spacing={2} minW={0}>
      {e.img ? (
        <Image src={`/images/SkillIcon/${e.img}_${e.skillType}.png`} alt="" boxSize="26px" flexShrink={0} />
      ) : null}
      <Box minW={0}>
        <Text fontSize="sm" color="gray.200" noOfLines={2}>{t(e.name)}</Text>
        <Text fontSize="10px" color={e.skillType === 'active' ? 'orange.300' : 'cyan.300'}>{e.skillType}</Text>
      </Box>
    </HStack>
  );
}

const thProps = {
  as: 'th' as const, px: 2, py: 1.5, fontSize: 'xs', color: 'gray.400',
  textTransform: 'uppercase' as const, letterSpacing: 'wide', textAlign: 'left' as const,
  borderBottomWidth: '1px', borderColor: 'surface.border',
};
const tdProps = {
  as: 'td' as const, px: 2, py: 1.5, verticalAlign: 'top' as const,
  borderTopWidth: '1px', borderColor: 'whiteAlpha.100',
};

// ── 1. reverse buff lookup ────────────────────────────────────────────────────

const ATTR_FILTERS = [
  { label: 'Buff', attrs: [0, 4] },
  { label: 'Debuff', attrs: [1, 5] },
  { label: 'Other', attrs: [2, 3] },
] as const;

// TARGET_TYPE groups (see interfaces/skill.ts): self / ally-side / enemy-side /
// both-sides (ALL_UNIT, ALL_GRID, SYSTEM).
const TARGET_FILTERS = [
  { label: 'Self', types: [0] },
  { label: 'Allies', types: [1, 2, 8] },
  { label: 'Enemies', types: [3, 4, 9] },
  { label: 'Everyone', types: [5, 6, 7] },
] as const;

// trigger label for the activation-condition dropdown: placeholders generalized.
const triggerOptionLabel = (t: number) =>
  (TRIGGER_LABELS[t] ?? `Trigger ${t}`).replace('{0}', 'N').replace('{key}', '…');

const buffValueAtLevel = (buff: SkillBuff, level: number) => buff.vals
  ? buff.vals[Math.min(level - 1, buff.vals.length - 1)]
  : Math.round((buff.val + buff.gain * (level - 1)) * 10000) / 10000;

type ValueDirection = -1 | 0 | 1;
type BuffSig = MiscBuffTypeMeta['sig'][number];
interface BuffGroup {
  key: string;
  name: string;
  types: number[];
  count: number;
  attrs: Set<number>;
  sig: BuffSig[];
  direction: ValueDirection | null;
}

const normalizeDirection = (direction: number | undefined): ValueDirection =>
  direction === 1 ? 1 : direction === -1 ? -1 : 0;

const buffDirectionAtLevel = (buff: SkillBuff, level: number): ValueDirection => {
  const value = buffValueAtLevel(buff, level) * (buff.type === 90 ? -1 : 1);
  return value > 0 ? 1 : value < 0 ? -1 : 0;
};

// The reverse lookup is not tied to the unit page's skill-level selector, so
// present the full natural skill range instead of silently showing level 1.
const buffWithLevelRange = (buff: SkillBuff): SkillBuff => {
  const lv1 = buffValueAtLevel(buff, 1);
  const lv10 = buffValueAtLevel(buff, 10);
  return lv1 === lv10 ? buff : { ...buff, vals: [lv1, lv10] };
};

// numeric value magnitude for value-sorting (skill level 10).
const buffMagnitude = (b: MiscBuffEntry) => {
  return Math.abs(buffValueAtLevel(b.buff, 10));
};

function BuffLookup({ unitById }: { unitById: Record<string, UnitData> }) {
  const dispatch = useAppDispatch();
  const region = useAppSelector(selectRegion);
  const index = useAppSelector(selectMiscIndex);
  const [selected, setSelected] = useState<string | null>(null);   // display-name group
  const [search, setSearch] = useState('');
  const [attrOn, setAttrOn] = useState<Record<string, boolean>>({ Buff: true, Debuff: true, Other: true });
  const [targetOn, setTargetOn] = useState<Record<string, boolean>>(
    { Self: true, Allies: true, Enemies: true, Everyone: true });
  const [trigger, setTrigger] = useState('any');            // 'any' | trigger ordinal
  const [sortBy, setSortBy] = useState<'unit' | 'value'>('unit');

  // Group ordinals by display name. When that name has both positive and negative
  // level-10 values, expose separate +/- chips; one-sided effects remain one chip.
  const groups = useMemo(() => {
    const byName = new Map<string, { ord: number; meta: MiscBuffTypeMeta }[]>();
    for (const [k, meta] of Object.entries(index?.buffTypes ?? {})) {
      const ord = parseInt(k, 10);
      const name = BUFF_TYPE_NAMES[ord] ?? `Type ${ord}`;
      const members = byName.get(name) ?? [];
      members.push({ ord, meta });
      byName.set(name, members);
    }

    const result: BuffGroup[] = [];
    for (const [baseName, members] of Array.from(byName.entries())) {
      const signs = new Set<ValueDirection>();
      for (const { meta } of members)
        for (const sig of meta.sig ?? []) signs.add(normalizeDirection(sig[3]));
      const split = signs.has(1) && signs.has(-1);
      const directions: (ValueDirection | null)[] = split ? Array.from(signs).sort() : [null];

      for (const direction of directions) {
        const sig: BuffSig[] = [];
        const types: number[] = [];
        const attrs = new Set<number>();
        for (const { ord, meta } of members) {
          const matching = direction == null
            ? (meta.sig ?? [])
            : (meta.sig ?? []).filter((s: BuffSig) => normalizeDirection(s[3]) === direction);
          if (matching.length === 0) continue;
          types.push(ord);
          sig.push(...matching);
          matching.forEach((s: BuffSig) => attrs.add(s[1]));
        }
        const suffix = direction === 1 ? ' +' : direction === -1 ? ' −' : '';
        result.push({
          key: split ? `${baseName}:${direction}` : baseName,
          name: `${baseName}${suffix}`,
          types,
          count: sig.length,
          attrs,
          sig,
          direction,
        });
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [index]);

  const activeGroup = groups.find((g) => g.key === selected) ?? null;

  // fetch the selected group's per-type entry files (slice caches per region+type)
  useEffect(() => {
    if (activeGroup) activeGroup.types.forEach((ty) => dispatch(fetchMiscBuffAsync(ty)));
  }, [activeGroup, dispatch, region]);

  const entryLists = useAppSelector((s) =>
    activeGroup ? activeGroup.types.map((ty) => selectMiscBuffs(s, ty)) : []);
  const loading = useAppSelector((s) =>
    activeGroup ? activeGroup.types.some((ty) => selectMiscBuffStatus(s, ty) === 'loading') : false);

  const attrPass = (a: number) =>
    ATTR_FILTERS.some((f) => attrOn[f.label] && (f.attrs as readonly number[]).includes(a));
  const targetPass = (tt: number) =>
    TARGET_FILTERS.some((f) => targetOn[f.label] && (f.types as readonly number[]).includes(tt));

  const all = useMemo(() =>
    ([] as MiscBuffEntry[]).concat(...entryLists.filter(Boolean) as MiscBuffEntry[][]),
    [entryLists]);

  const directionalAll = useMemo(() => activeGroup?.direction == null
    ? all
    : all.filter((e) => buffDirectionAtLevel(e.buff, 10) === activeGroup.direction),
    [all, activeGroup]);

  // activation-condition options: only triggers present in the selected effect.
  const triggerOptions = useMemo(() => {
    const counts = new Map<number, number>();
    for (const e of directionalAll) counts.set(e.buff.trigger, (counts.get(e.buff.trigger) ?? 0) + 1);
    return Array.from(counts.entries())
      .sort((a, b) => triggerOptionLabel(a[0]).localeCompare(triggerOptionLabel(b[0])));
  }, [directionalAll]);

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = directionalAll
      .filter((e) => attrPass(e.buff.attr))
      .filter((e) => targetPass(e.buff.targetType))
      .filter((e) => trigger === 'any' || e.buff.trigger === parseInt(trigger, 10))
      .filter((e) => !q || unitDisplayName(unitById[e.unit] ?? { name: e.unit }).toLowerCase().includes(q)
        || e.unit.toLowerCase().includes(q));
    const byUnit = (a: MiscBuffEntry, b: MiscBuffEntry) =>
      unitDisplayName(unitById[a.unit] ?? { name: a.unit })
        .localeCompare(unitDisplayName(unitById[b.unit] ?? { name: b.unit }))
      || a.skill.localeCompare(b.skill);
    return filtered.sort(sortBy === 'value'
      ? (a, b) => buffMagnitude(b) - buffMagnitude(a) || byUnit(a, b)
      : byUnit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directionalAll, search, attrOn, targetOn, trigger, sortBy, unitById]);

  const chipFilter = search && !activeGroup ? groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase())) : groups;

  // filter-aware chip count: distinct units whose entries pass the attr + target
  // filters (from the compact index signatures — no per-type fetch needed).
  const groupUnitCount = (g: { sig: BuffSig[] }) => {
    const set = new Set<number>();
    for (const [u, a, tt] of g.sig) if (attrPass(a) && targetPass(tt)) set.add(u);
    return set.size;
  };

  return (
    <VStack align="stretch" spacing={3}>
      <Flex gap={3} wrap="wrap" align="center"
        bg="surface.elevated" borderWidth="1px" borderColor="surface.border" borderRadius="xl" p={3}>
        <ButtonGroup isAttached size="sm" variant="outline" colorScheme="purple">
          {ATTR_FILTERS.map((f) => (
            <Button key={f.label} {...filterActiveProps('purple', attrOn[f.label])}
              onClick={() => setAttrOn({ ...attrOn, [f.label]: !attrOn[f.label] })}>{f.label}</Button>
          ))}
        </ButtonGroup>
        <ButtonGroup isAttached size="sm" variant="outline" colorScheme="teal">
          {TARGET_FILTERS.map((f) => (
            <Button key={f.label} {...filterActiveProps('teal', targetOn[f.label])}
              onClick={() => setTargetOn({ ...targetOn, [f.label]: !targetOn[f.label] })}>{f.label}</Button>
          ))}
        </ButtonGroup>
        {activeGroup ? (
          <Select size="sm" w="auto" maxW="240px" value={trigger} borderColor="surface.border"
            onChange={(e) => setTrigger(e.target.value)}>
            <option value="any">Any activation</option>
            {triggerOptions.map(([t2, n]) => (
              <option key={t2} value={t2}>{triggerOptionLabel(t2)} ({n})</option>
            ))}
          </Select>
        ) : null}
        <ButtonGroup isAttached size="sm" variant="outline">
          {(['unit', 'value'] as const).map((s) => (
            <Button key={s} {...filterActiveProps('gray', sortBy === s)}
              onClick={() => setSortBy(s)}>{s === 'unit' ? 'A-Z' : 'By value'}</Button>
          ))}
        </ButtonGroup>
        <InputGroup size="sm" maxW="260px" ml="auto">
          <Input placeholder={activeGroup ? 'Filter units' : 'Filter effects'} value={search}
            borderColor="surface.border" onChange={(e) => setSearch(e.target.value)} />
          <InputRightElement>
            {search ? (
              <IconButton aria-label="Clear" icon={<CloseIcon boxSize={2.5} />} size="xs"
                variant="ghost" onClick={() => setSearch('')} />
            ) : <SearchIcon color="gray.500" boxSize={3} />}
          </InputRightElement>
        </InputGroup>
      </Flex>

      {/* effect picker */}
      <Wrap spacing={1.5}>
        {chipFilter
          .map((g) => ({ g, n: groupUnitCount(g) }))
          .filter(({ g, n }) => n > 0 || selected === g.key)
          .map(({ g, n }) => (
            <WrapItem key={g.key}>
              <Button size="xs" variant={selected === g.key ? 'solid' : 'outline'}
                colorScheme={selected === g.key ? 'yellow' : 'gray'}
                onClick={() => { setSelected(selected === g.key ? null : g.key); setSearch(''); setTrigger('any'); }}>
                {g.name}
                <Box as="span" ml={1} opacity={0.65}>{n}</Box>
              </Button>
            </WrapItem>
          ))}
      </Wrap>

      {!activeGroup ? (
        <Center py={10}><Text color="gray.500">Pick an effect above to list every unit that applies it.</Text></Center>
      ) : loading && rows.length === 0 ? (
        <Center py={10}><Spinner /></Center>
      ) : (
        <Box borderWidth="1px" borderColor="surface.border" borderRadius="xl" overflow="hidden" bg="surface.elevated">
          <Box px={4} py={2} bg="blackAlpha.300" borderBottomWidth="1px" borderBottomColor="surface.border">
            <HStack>
              <Heading size="sm" color="yellow.200">{activeGroup.name}</Heading>
              <Badge colorScheme="yellow" borderRadius="full" px={2}>{rows.length}</Badge>
            </HStack>
          </Box>
          <Box overflowX="auto">
            <Box as="table" w="100%" minW="980px" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <Box as="thead">
                <Box as="tr">
                  <Box {...thProps} w="170px">Unit</Box>
                  <Box {...thProps} w="180px">Skill</Box>
                  <Box {...thProps}>Effect</Box>
                  <Box {...thProps} w="92px">AoE</Box>
                  <Box {...thProps} w="28%">Trigger / Target / Conditions</Box>
                </Box>
              </Box>
              <Box as="tbody">
                {rows.map((e, i) => (
                  <Box as="tr" key={`${e.unit}-${e.skill}-${i}`}>
                    <Box {...tdProps}><UnitCell unit={unitById[e.unit]} /></Box>
                    <Box {...tdProps}><SkillCell e={e} /></Box>
                    <Box {...tdProps} p={0}><BuffEffectRow buff={buffWithLevelRange(e.buff)} /></Box>
                    <Box {...tdProps}>
                      {e.area ? <SkillArea area={e.area} center={e.center ?? 5} size={9} />
                        : <Text fontSize="xs" color="gray.600">—</Text>}
                    </Box>
                    {/* condition pills can carry long char lists — let them wrap
                        here (they're nowrap in the skill-detail buff list) */}
                    <Box {...tdProps} sx={{ '& span': { whiteSpace: 'normal' } }}>
                      <BuffCondTags rep={e.buff} />
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
      )}
    </VStack>
  );
}

// ── 2. AoE ────────────────────────────────────────────────────────────────────

function AoeList({ unitById }: { unitById: Record<string, UnitData> }) {
  const index = useAppSelector(selectMiscIndex);
  const [search, setSearch] = useState('');
  const [minCells, setMinCells] = useState(2);

  // group skills by AoE PATTERN (hit-cell mask + center) — same shape, one card.
  const groups = useMemo(() => {
    const q = search.toLowerCase();
    const m = new Map<string, { area: number[]; center: number; cells: number; entries: MiscAoeEntry[] }>();
    for (const e of index?.aoe ?? []) {
      if (e.cells < minCells) continue;
      if (q && !unitDisplayName(unitById[e.unit] ?? { name: e.unit }).toLowerCase().includes(q)) continue;
      const key = e.area.map((c) => (c > 0 ? 1 : 0)).join('') + `@${e.center}`;
      const g = m.get(key) ?? { area: e.area, center: e.center, cells: e.cells, entries: [] };
      g.entries.push(e);
      m.set(key, g);
    }
    for (const g of Array.from(m.values()))
      g.entries.sort((a: MiscAoeEntry, b: MiscAoeEntry) =>
        unitDisplayName(unitById[a.unit] ?? { name: a.unit })
          .localeCompare(unitDisplayName(unitById[b.unit] ?? { name: b.unit }))
        || a.skill.localeCompare(b.skill));
    return Array.from(m.values()).sort((a, b) => b.cells - a.cells || b.entries.length - a.entries.length);
  }, [index, search, minCells, unitById]);

  return (
    <VStack align="stretch" spacing={3}>
      <Flex gap={3} wrap="wrap" align="center"
        bg="surface.elevated" borderWidth="1px" borderColor="surface.border" borderRadius="xl" p={3}>
        <ButtonGroup isAttached size="sm" variant="outline" colorScheme="orange">
          {[2, 3, 4, 6, 9].map((n) => (
            <Button key={n} {...filterActiveProps('orange', minCells === n)}
              onClick={() => setMinCells(n)}>{n}+ cells</Button>
          ))}
        </ButtonGroup>
        <Badge colorScheme="yellow" borderRadius="full" px={2}>
          {groups.reduce((n, g) => n + g.entries.length, 0)} skills · {groups.length} shapes
        </Badge>
        <InputGroup size="sm" maxW="260px" ml="auto">
          <Input placeholder="Filter units" value={search} borderColor="surface.border"
            onChange={(e) => setSearch(e.target.value)} />
          <InputRightElement>
            {search ? (
              <IconButton aria-label="Clear" icon={<CloseIcon boxSize={2.5} />} size="xs"
                variant="ghost" onClick={() => setSearch('')} />
            ) : <SearchIcon color="gray.500" boxSize={3} />}
          </InputRightElement>
        </InputGroup>
      </Flex>

      {/* one collapsible card per AoE shape (collapsed by default; the shape +
          counts in the header are enough to decide whether to open it) */}
      <Accordion allowMultiple borderColor="transparent">
        <VStack align="stretch" spacing={3}>
          {groups.map((g, gi) => (
            <AccordionItem key={gi} border="none">
              <Box borderWidth="1px" borderColor="surface.border" borderRadius="xl"
                overflow="hidden" bg="surface.elevated">
                <AccordionButton px={4} py={2} gap={4} bg="blackAlpha.300"
                  _hover={{ bg: 'blackAlpha.400' }}>
                  <SkillArea area={g.area} center={g.center} size={13} />
                  <Text fontSize="sm" color="orange.200" fontWeight="bold" ml={4}>{g.cells} cells</Text>
                  <Badge colorScheme="yellow" borderRadius="full" px={2} ml={3}>{g.entries.length}</Badge>
                  <AccordionIcon ml="auto" color="gray.400" />
                </AccordionButton>
                <AccordionPanel p={0} borderTopWidth="1px" borderTopColor="surface.border">
                  <Box overflowX="auto">
                    <Box as="table" w="100%" minW="620px" style={{ borderCollapse: 'collapse' }}>
                      <Box as="tbody">
                        {g.entries.map((e, i) => (
                          <Box as="tr" key={`${e.unit}-${e.skill}-${i}`}>
                            <Box {...tdProps} w="240px"><UnitCell unit={unitById[e.unit]} /></Box>
                            <Box {...tdProps}><SkillCell e={e} /></Box>
                            <Box {...tdProps} w="90px"><Text fontSize="sm" color="gray.300">AP {e.ap || '—'}</Text></Box>
                            <Box {...tdProps} w="90px"><Text fontSize="sm" color="gray.300">Range {e.range || '—'}</Text></Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                </AccordionPanel>
              </Box>
            </AccordionItem>
          ))}
        </VStack>
      </Accordion>
    </VStack>
  );
}

// ── 3. damage types ───────────────────────────────────────────────────────────

const DMG_META: Record<string, { label: string; color: string }> = {
  physical: { label: 'Physical', color: 'gray' },
  fire:     { label: 'Fire', color: 'red' },
  ice:      { label: 'Ice', color: 'cyan' },
  electric: { label: 'Electric', color: 'yellow' },
};

function DamageList({ unitById }: { unitById: Record<string, UnitData> }) {
  const index = useAppSelector(selectMiscIndex);
  const [dmg, setDmg] = useState('fire');
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return (index?.damage?.[dmg] ?? [])
      .filter((e) => !q || unitDisplayName(unitById[e.unit] ?? { name: e.unit }).toLowerCase().includes(q))
      .sort((a, b) =>
        unitDisplayName(unitById[a.unit] ?? { name: a.unit })
          .localeCompare(unitDisplayName(unitById[b.unit] ?? { name: b.unit }))
        || a.skill.localeCompare(b.skill));
  }, [index, dmg, search, unitById]);

  return (
    <VStack align="stretch" spacing={3}>
      <Flex gap={3} wrap="wrap" align="center"
        bg="surface.elevated" borderWidth="1px" borderColor="surface.border" borderRadius="xl" p={3}>
        <ButtonGroup isAttached size="sm" variant="outline">
          {Object.entries(DMG_META).map(([k, m]) => (
            <Button key={k} colorScheme={m.color} {...filterActiveProps(m.color, dmg === k)}
              onClick={() => setDmg(k)}>
              {m.label}
              <Box as="span" ml={1} opacity={0.65}>
                {new Set((index?.damage?.[k] ?? []).map((e) => e.unit)).size}
              </Box>
            </Button>
          ))}
        </ButtonGroup>
        <InputGroup size="sm" maxW="260px" ml="auto">
          <Input placeholder="Filter units" value={search} borderColor="surface.border"
            onChange={(e) => setSearch(e.target.value)} />
          <InputRightElement>
            {search ? (
              <IconButton aria-label="Clear" icon={<CloseIcon boxSize={2.5} />} size="xs"
                variant="ghost" onClick={() => setSearch('')} />
            ) : <SearchIcon color="gray.500" boxSize={3} />}
          </InputRightElement>
        </InputGroup>
      </Flex>

      <Box borderWidth="1px" borderColor="surface.border" borderRadius="xl" overflow="hidden" bg="surface.elevated">
        <Box overflowX="auto">
          <Box as="table" w="100%" minW="560px" style={{ borderCollapse: 'collapse' }}>
            <Box as="thead">
              <Box as="tr">
                <Box {...thProps} w="240px">Unit</Box>
                <Box {...thProps}>Skill</Box>
                <Box {...thProps} w="140px">Skill Power</Box>
              </Box>
            </Box>
            <Box as="tbody">
              {rows.map((e, i) => (
                <Box as="tr" key={`${e.unit}-${e.skill}-${i}`}>
                  <Box {...tdProps}><UnitCell unit={unitById[e.unit]} /></Box>
                  <Box {...tdProps}><SkillCell e={e} /></Box>
                  <Box {...tdProps}>
                    <Text fontSize="sm" color={`${DMG_META[dmg].color}.300`}>×{e.rate}</Text>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </VStack>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function Misc() {
  useTranslationVersion();
  const dispatch = useAppDispatch();
  const region = useAppSelector(selectRegion);
  const status = useAppSelector(selectMiscStatus);
  const units = useAppSelector(selectUnits);

  useEffect(() => {
    dispatch(fetchMiscAsync());
    dispatch(fetchUnitsAsync());
  }, [dispatch, region]);

  return (
    <>
      <Head><title>Misc Categorization</title></Head>
      <VStack align="stretch" spacing={4} py={4}>
        <HStack>
          <Heading size="xl">Misc Categorization</Heading>
        </HStack>
        {status === 'failed' ? (
          <Center py={20}><Text color="red.300">Failed to load categorization data.</Text></Center>
        ) : status === 'loading' ? (
          <Center py={20}><Spinner /></Center>
        ) : (
          <Tabs variant="soft-rounded" colorScheme="yellow" size="sm" isLazy>
            <TabList flexWrap="wrap" gap={1}>
              <Tab>Buff Lookup</Tab>
              <Tab>AoE Skills</Tab>
              <Tab>Damage Types</Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0}><BuffLookup unitById={units} /></TabPanel>
              <TabPanel px={0}><AoeList unitById={units} /></TabPanel>
              <TabPanel px={0}><DamageList unitById={units} /></TabPanel>
            </TabPanels>
          </Tabs>
        )}
      </VStack>
    </>
  );
}
