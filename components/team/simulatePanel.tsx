import { useMemo } from 'react';
import {
  Box, Center, Flex, Heading, HStack, VStack, Text, Tag, Badge, Image, Spinner,
  Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer, SimpleGrid,
} from '@chakra-ui/react';
import { useAppSelector } from '@/hooks';
import { RootState } from '@/store';
import { selectUnits } from '@/store/unitSlice';
import { Team, StatKey } from '@/interfaces/team';
import { UnitData } from '@/interfaces/unit';
import { t } from '@/lib/strings';
import { useTranslationVersion } from '@/lib/translationVersion';
import { unitDisplayName } from '@/lib/rank';
import { BUFF_TYPE_NAMES, TRIGGER_LABELS, buffValue } from '@/components/buffList';
import { buildSimInputs } from '@/lib/simInputs';
import { simulateRound1, NoteKind, AppliedBuff } from '@/lib/simulate';

// Round-1 simulation output: in-battle stats, applied buffs by type, action
// order, and the review list of effects not auto-applied.

const STAT_ROWS: [StatKey, string, string][] = [
  ['HP', 'HP', ''], ['ATK', 'ATK', ''], ['DEF', 'DEF', ''],
  ['ACC', 'ACC', '%'], ['EVA', 'EVA', '%'], ['CRI', 'CRIT', '%'], ['SPD', 'SPD', ''],
  ['fireRes', 'Fire RES', '%'], ['iceRes', 'Ice RES', '%'], ['lightningRes', 'Electric RES', '%'],
];

const NOTE_META: Record<NoteKind, { label: string; color: string; blurb: string }> = {
  'enemy-target': { label: 'Enemy-side', color: 'gray',
    blurb: 'Targets the enemy side — no enemy team is simulated.' },
  event: { label: 'Mid-battle', color: 'purple',
    blurb: 'Fires on an in-battle event (attack, hit, kill…), after the round-1 snapshot.' },
  'enemy-cond': { label: 'Enemy condition', color: 'orange',
    blurb: 'Condition reads the enemy side, which is not simulated.' },
  random: { label: 'Random pick', color: 'yellow',
    blurb: 'Randomly applies one of several effects — not deterministic.' },
  unknown: { label: 'Needs review', color: 'red',
    blurb: 'Semantics unclear to the simulator — please check and report.' },
  'cond-failed': { label: 'Condition not met', color: 'blue',
    blurb: 'Evaluated normally; its condition is simply false for this team in round 1.' },
};

function UnitChip({ unit }: { unit: UnitData }) {
  return (
    <HStack spacing={1.5} flexShrink={0}>
      {unit.icon ? (
        <Image src={`/images/icons/${unit.icon}.png`} alt="" boxSize="22px" borderRadius="sm" objectFit="cover" />
      ) : null}
      <Text fontSize="xs" fontWeight="600" noOfLines={1}>{unitDisplayName(unit)}</Text>
    </HStack>
  );
}

interface AppliedGroup {
  type: number;
  rows: AppliedBuff[];
}

function groupAppliedBuffs(applied: AppliedBuff[]): AppliedGroup[] {
  const groups = new Map<number, AppliedBuff[]>();
  for (const a of applied) groups.set(a.buff.type, [...(groups.get(a.buff.type) ?? []), a]);
  return Array.from(groups, ([type, rows]) => ({ type, rows })).sort((a, b) => a.type - b.type);
}

function effectColor(attr: number): string {
  if (attr === 0 || attr === 2 || attr === 4) return 'green.300';
  if (attr === 1 || attr === 5) return 'red.300';
  return 'gray.100';
}

function durationLabel(a: AppliedBuff): string {
  const { buff } = a;
  if (buff.eraseType === 3 || buff.eraseType === 4) return 'Permanent';
  if (buff.eraseType === 0) return buff.turns > 0 ? `${buff.turns} round${buff.turns === 1 ? '' : 's'}` : 'Instant';
  if (buff.eraseType === 1) return `${buff.turns || 1} use${(buff.turns || 1) === 1 ? '' : 's'}`;
  if (buff.eraseType === 2) return 'Until triggered';
  return '—';
}

function AppliedGroupRow({ group }: { group: AppliedGroup }) {
  const representative = group.rows[0].buff;
  const total = Math.round(group.rows.reduce((sum, a) => sum + a.buff.val, 0) * 10000) / 10000;
  // `tid` values are effect-type IDs (for example, Debuff Immunity against AP
  // or EVA), not numeric magnitudes. Adding them can resolve to a completely
  // unrelated effect name, so categorical groups intentionally have no total.
  const totalStr = representative.fmt === 'tid'
    ? ''
    : buffValue({ ...representative, val: total, vals: undefined }).str;
  const attrs = new Set(group.rows.map((a) => a.buff.attr));
  const totalColor = attrs.size === 1 ? effectColor(representative.attr) : 'gray.100';

  return (
    <Tr>
      <Td py={2} verticalAlign="top">
        <HStack spacing={1.5}>
          {representative.icon ? (
            <Image src={`/images/effects/BuffIcon_${representative.icon}.png`} boxSize="16px" alt="" />
          ) : null}
          <Text fontSize="xs" fontWeight="700">{BUFF_TYPE_NAMES[group.type] ?? `type ${group.type}`}</Text>
          {group.rows.length > 1 ? <Badge fontSize="2xs">{group.rows.length}</Badge> : null}
        </HStack>
      </Td>
      <Td py={2} verticalAlign="top">
        <Text fontSize="xs" fontWeight="700" color={totalColor}>{totalStr || '—'}</Text>
      </Td>
      <Td py={1.5}>
        <VStack align="stretch" spacing={1}>
          {group.rows.map((a, i) => {
            const { str: valStr } = buffValue(a.buff);
            return (
              <Flex key={i} align="center" gap={2} wrap="wrap" fontSize="2xs"
                borderTopWidth={i ? '1px' : 0} borderColor="whiteAlpha.100" pt={i ? 1 : 0}>
                <Text minW="52px" fontWeight="700" color={effectColor(a.buff.attr)}>{valStr || '—'}</Text>
                <Badge colorScheme="gray" fontSize="2xs">{durationLabel(a)}</Badge>
                {a.chance ? <Badge colorScheme="yellow" fontSize="2xs">{Math.round(a.buff.rate * 100)}%</Badge> : null}
                <Text color="gray.400">
                  {t(a.sourceName)} <Text as="span" color="gray.600">({a.sourceKind}, pass {a.pass})</Text>
                </Text>
              </Flex>
            );
          })}
        </VStack>
      </Td>
    </Tr>
  );
}

export default function SimulatePanel({ team }: { team: Team }) {
  useTranslationVersion();
  const units = useAppSelector(selectUnits);
  const state = useAppSelector((s: RootState) => s);

  // Build sim inputs from the configured team; empty until every needed bundle
  // (unit detail + equipped-item records) has arrived.
  // state identity changes on every store update; that's fine — memo is cheap.
  const { inputs, missing, unavailable } = useMemo(() => buildSimInputs(team, state), [team, state]);

  const result = useMemo(
    () => (missing.length === 0 && inputs.length > 0 ? simulateRound1(inputs) : null),
    [inputs, missing.length],
  );

  if (team.every((s) => !s)) {
    return <Text color="gray.500" fontSize="sm" py={6} textAlign="center">Place some units first.</Text>;
  }
  if (unavailable.length > 0) {
    return (
      <Box borderWidth="1px" borderColor="red.700" borderRadius="lg" bg="surface.elevated" p={4}>
        <Text color="red.300" fontSize="sm">
          Unavailable on the current server: {unavailable.join(', ')}. Swap or remove these units,
          or switch back to the server where they are available.
        </Text>
      </Box>
    );
  }
  if (missing.length > 0) {
    return (
      <Center py={10}>
        <VStack>
          <Spinner color="yellow.400" />
          <Text fontSize="xs" color="gray.500">Loading data for: {missing.join(', ')}</Text>
        </VStack>
      </Center>
    );
  }
  if (!result) return null;

  const byTile = new Map(result.units.map((r) => [r.tile, r]));
  const unitOf = (tile: number) => units[team[tile]!.unitId];

  return (
    <VStack align="stretch" spacing={4}>
      <Box borderWidth="1px" borderColor="orange.400" borderRadius="lg"
        bg="orange.900" color="orange.100" px={3} py={2} fontSize="xs">
        This simulation does not match the game 100%. Please report any incorrect stats,
        effects, AP, or action order so it can be fixed.
      </Box>
      <Text fontSize="2xs" color="gray.500">
        Round-1 snapshot: battle-start / round-start / always-on passives and equipment effects,
        re-applied in passes until nothing new activates ({result.passes} pass{result.passes > 1 ? 'es' : ''}).
        Configured HP percentages are used for HP-dependent effects; the enemy side is not simulated.
      </Text>

      {/* Persistent, recomputed result cards: these are the simulation's source of truth. */}
      <Box borderWidth="1px" borderColor="surface.border" borderRadius="xl" bg="surface.elevated" p={4}>
        <Heading size="xs" mb={3}>Live Battle Stats <Text as="span" fontSize="2xs"
          color="gray.500" fontWeight="normal">after all round-start effects</Text></Heading>
        <SimpleGrid columns={[1, 1, 2]} spacing={3}>
          {result.units.map((r) => {
            const u = unitOf(r.tile);
            if (!u) return null;
            return (
              <Box key={r.tile} borderWidth="1px" borderColor="surface.border" borderRadius="lg"
                bg="blackAlpha.300" p={3}>
                <Flex align="center" justify="space-between" gap={2} mb={2}>
                  <UnitChip unit={u} />
                  <HStack spacing={1}>
                    <Badge colorScheme="yellow">AP {r.ap}</Badge>
                    <Badge colorScheme="teal">tile {r.tile + 1}</Badge>
                  </HStack>
                </Flex>
                <SimpleGrid columns={2} spacingX={4} spacingY={1}>
                  {STAT_ROWS.map(([k, label, suffix]) => (
                    <Flex key={k} justify="space-between" gap={2} fontSize="xs">
                      <Text color="gray.500">{label}</Text>
                      <Text fontWeight="700">
                        {r.battle[k].toLocaleString()}{suffix}
                        {r.delta[k] ? (
                          <Text as="span" ml={1} color={r.delta[k] > 0 ? 'green.300' : 'red.300'}>
                            ({r.delta[k] > 0 ? '+' : ''}{r.delta[k].toLocaleString()}{suffix})
                          </Text>
                        ) : null}
                      </Text>
                    </Flex>
                  ))}
                </SimpleGrid>
              </Box>
            );
          })}
        </SimpleGrid>
      </Box>

      {/* AP timeline — like the in-game bar, the rightmost unit acts first. */}
      <Box borderWidth="1px" borderColor="surface.border" borderRadius="xl" bg="surface.elevated" p={4}>
        <Heading size="xs" mb={1}>First Action Timeline <Text as="span" fontSize="2xs" color="gray.500" fontWeight="normal">
          first combat round starts at cycle {result.firstCycle}; rightmost acts first
        </Text></Heading>
        <Text fontSize="2xs" color="gray.500" mb={3}>
          A round starts as soon as any unit reaches 10 AP. Units left of a dashed marker are not
          actionable yet and gain AP in the following round.
        </Text>
        <Box overflowX="auto">
          <HStack spacing={3} minW="max-content" py={1} align="stretch" justify="flex-end">
            {[...result.timeline].reverse().map((group, groupIndex) => (
              <Box key={group.round} pl={groupIndex ? 3 : 0}
                borderLeftWidth={groupIndex ? '2px' : 0} borderLeftStyle="dashed"
                borderLeftColor="yellow.400">
                <Badge colorScheme={group.round === 1 ? 'yellow' : 'gray'} mb={2}>
                  Round {group.round} · cycle {group.cycle}
                </Badge>
                <HStack spacing={2} align="end">
                  {[...group.tiles].reverse().map((tile) => {
                    const r = byTile.get(tile)!;
                    const u = unitOf(tile);
                    return (
                      <VStack key={tile} spacing={1} w="68px" flexShrink={0}>
                        {u?.icon ? (
                          <Image src={`/images/icons/${u.icon}.png`} alt={u ? unitDisplayName(u) : ''}
                            boxSize="48px" borderRadius="lg" objectFit="cover" borderWidth="2px"
                            borderColor={group.round === 1 ? 'yellow.400' : 'surface.border'} />
                        ) : null}
                        <Text fontSize="2xs" fontWeight="600" noOfLines={1} maxW="68px">
                          {u ? unitDisplayName(u) : ''}
                        </Text>
                        <Text fontSize="xs" color={group.round === 1 ? 'cyan.300' : 'gray.400'} fontWeight="700"
                          title={group.round === 1 ? undefined : `Projected ${r.readyAp} AP when ready`}>
                          {r.ap.toLocaleString()} AP
                        </Text>
                      </VStack>
                    );
                  })}
                </HStack>
              </Box>
            ))}
          </HStack>
        </Box>
      </Box>

      {/* per-unit battle stats + buffs */}
      <Box borderWidth="1px" borderColor="surface.border" borderRadius="xl" bg="surface.elevated" p={4}>
        <Heading size="xs" mb={2}>Effects by Unit</Heading>
        <Accordion allowMultiple defaultIndex={[]}>
          {result.units.map((r) => {
            const u = unitOf(r.tile);
            if (!u) return null;
            const effectGroups = groupAppliedBuffs(r.applied);
            return (
              <AccordionItem key={r.tile} border="1px solid" borderColor="surface.border"
                borderRadius="lg" mb={2} bg="blackAlpha.300">
                <AccordionButton px={3} py={2}>
                  <Flex flex="1" align="center" gap={3} wrap="wrap" textAlign="left">
                    <UnitChip unit={u} />
                    <HStack spacing={2} fontSize="2xs" color="gray.400">
                      <Text>ATK {r.battle.ATK.toLocaleString()}{r.delta.ATK ? <Text as="span" color="yellow.300"> ({r.delta.ATK > 0 ? '+' : ''}{r.delta.ATK.toLocaleString()})</Text> : null}</Text>
                      <Text>SPD {r.spd}</Text>
                      <Text>AP {r.ap}</Text>
                      <Badge colorScheme="teal" fontSize="2xs">
                        {effectGroups.length} effect type{effectGroups.length === 1 ? '' : 's'}
                      </Badge>
                    </HStack>
                  </Flex>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel px={3} pb={3}>
                  <TableContainer mb={2}>
                    <Table size="sm" variant="simple" minW="320px">
                      <Thead><Tr><Th>Stat</Th><Th isNumeric>In battle</Th><Th isNumeric>Δ vs setup</Th></Tr></Thead>
                      <Tbody>
                        {STAT_ROWS.map(([k, label, suffix]) => (
                          <Tr key={k}>
                            <Td py={1} fontSize="xs">{label}</Td>
                            <Td py={1} isNumeric fontSize="xs" fontWeight="700">
                              {r.battle[k].toLocaleString()}{suffix}
                            </Td>
                            <Td py={1} isNumeric fontSize="xs"
                              color={r.delta[k] > 0 ? 'green.300' : r.delta[k] < 0 ? 'red.300' : 'gray.600'}>
                              {r.delta[k] ? `${r.delta[k] > 0 ? '+' : ''}${r.delta[k].toLocaleString()}${suffix}` : '—'}
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
                  {r.applied.length ? (
                    <TableContainer>
                      <Table size="sm" variant="simple" minW="420px">
                        <Thead><Tr><Th>Effect</Th><Th>Total</Th><Th>Individual effects</Th></Tr></Thead>
                        <Tbody>
                          {effectGroups.map((group) => <AppliedGroupRow key={group.type} group={group} />)}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  ) : <Text fontSize="xs" color="gray.500">No effects applied.</Text>}
                </AccordionPanel>
              </AccordionItem>
            );
          })}
        </Accordion>
      </Box>

      {/* review notes — everything NOT auto-applied */}
      <Box borderWidth="1px" borderColor="surface.border" borderRadius="xl" bg="surface.elevated" p={4}>
        <Heading size="xs" mb={1}>Not Auto-Applied <Text as="span" fontSize="2xs" color="gray.500" fontWeight="normal">
          — every effect the simulator left out, with the reason. Check and report anything wrong.
        </Text></Heading>
        {result.notes.length === 0 ? (
          <Text fontSize="xs" color="gray.500" mt={2}>Everything was applied.</Text>
        ) : (
          <Accordion allowMultiple defaultIndex={[]} mt={2}>
            {(Object.keys(NOTE_META) as NoteKind[]).map((kind) => {
              const list = result.notes.filter((n) => n.kind === kind);
              if (!list.length) return null;
              const meta = NOTE_META[kind];
              return (
                <AccordionItem key={kind} border="1px solid" borderColor="surface.border"
                  borderRadius="lg" mb={2} bg="blackAlpha.300">
                  <AccordionButton px={3} py={2}>
                    <HStack flex="1" spacing={2} textAlign="left">
                      <Tag size="sm" colorScheme={meta.color}>{meta.label}</Tag>
                      <Badge fontSize="2xs">{list.length}</Badge>
                      <Text fontSize="2xs" color="gray.500" noOfLines={1}>{meta.blurb}</Text>
                    </HStack>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel px={3} pb={3}>
                    <TableContainer>
                      <Table size="sm" variant="simple" minW="520px">
                        <Thead><Tr><Th>Unit</Th><Th>Source</Th><Th>Effect</Th><Th>Trigger</Th><Th>Detail</Th></Tr></Thead>
                        <Tbody>
                          {list.map((n, i) => {
                            const u = units[n.unitId];
                            return (
                              <Tr key={i}>
                                <Td py={1}>{u ? <UnitChip unit={u} /> : <Text fontSize="xs">{n.unitId}</Text>}</Td>
                                <Td py={1}><Text fontSize="2xs" noOfLines={1}>{t(n.sourceName)} <Text as="span" color="gray.600">({n.sourceKind})</Text></Text></Td>
                                <Td py={1}>
                                  <HStack spacing={1}>
                                    {n.buff.icon ? <Image src={`/images/effects/BuffIcon_${n.buff.icon}.png`} boxSize="14px" alt="" /> : null}
                                    <Text fontSize="2xs">{BUFF_TYPE_NAMES[n.buff.type] ?? `type ${n.buff.type}`}</Text>
                                  </HStack>
                                </Td>
                                <Td py={1}><Text fontSize="2xs" color="gray.400">{TRIGGER_LABELS[n.buff.trigger] ?? `#${n.buff.trigger}`}</Text></Td>
                                <Td py={1}><Text fontSize="2xs" color="gray.500">{n.detail}</Text></Td>
                              </Tr>
                            );
                          })}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  </AccordionPanel>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </Box>
    </VStack>
  );
}
