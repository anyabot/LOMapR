import { useMemo } from 'react';
import {
  Box, Center, Flex, Heading, HStack, VStack, Text, Tag, Badge, Image, Spinner,
  Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer, Wrap, WrapItem, SimpleGrid,
} from '@chakra-ui/react';
import { useAppSelector } from '@/hooks';
import { RootState } from '@/store';
import { selectUnits, selectUnitFull, selectUnitSkills } from '@/store/unitSlice';
import { selectEquipFull } from '@/store/equipSlice';
import { Team, StatKey } from '@/interfaces/team';
import { FullUnitData, UnitData } from '@/interfaces/unit';
import { t } from '@/lib/strings';
import { useTranslationVersion } from '@/lib/translationVersion';
import { unitDisplayName } from '@/lib/rank';
import { BUFF_TYPE_NAMES, TRIGGER_LABELS, buffValue } from '@/components/buffList';
import {
  computeStats, equippedStats, equipSlotUnlocked, scaleSkillLevel,
  fullLinkSkillPowerValue, fullLinkBuffLv,
  skillUnlockRank,
} from '@/lib/team';
import {
  simulateRound1, SimUnitInput, SimNote, NoteKind, AppliedBuff,
} from '@/lib/simulate';

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

function AppliedRow({ a, units }: { a: AppliedBuff; units: Record<string, UnitData> }) {
  const { str: valStr, color } = buffValue(a.buff);
  return (
    <Tr>
      <Td py={1}>
        <HStack spacing={1.5}>
          {a.buff.icon ? <Image src={`/images/effects/BuffIcon_${a.buff.icon}.png`} boxSize="16px" alt="" /> : null}
          <Text fontSize="xs">{BUFF_TYPE_NAMES[a.buff.type] ?? `type ${a.buff.type}`}</Text>
          {a.chance ? <Badge colorScheme="yellow" fontSize="2xs">{Math.round(a.buff.rate * 100)}%</Badge> : null}
        </HStack>
      </Td>
      <Td py={1}><Text fontSize="xs" fontWeight="700" color={color}>{valStr || '—'}</Text></Td>
      <Td py={1}>
        <Text fontSize="2xs" color="gray.400" noOfLines={1}>
          {t(a.sourceName)} <Text as="span" color="gray.600">({a.sourceKind}, pass {a.pass})</Text>
        </Text>
      </Td>
    </Tr>
  );
}

export default function SimulatePanel({ team }: { team: Team }) {
  useTranslationVersion();
  const units = useAppSelector(selectUnits);
  const state = useAppSelector((s: RootState) => s);

  // Build sim inputs from the configured team; null until every needed bundle
  // (unit detail + equipped-item records) has arrived.
  const { inputs, missing } = useMemo(() => {
    const inputs: SimUnitInput[] = [];
    const missing: string[] = [];
    team.forEach((slot, tile) => {
      if (!slot) return;
      const unit = selectUnitFull(state, slot.unitId);
      if (!unit) { missing.push(slot.unitId); return; }
      if (!unit.stat) { missing.push(unitDisplayName(unit)); return; }
      const full = unit as FullUnitData;
      const skills = selectUnitSkills(state, slot.unitId);
      const keys = (slot.form === 1 ? full.skillsCh : full.skills) ?? [];
      if (keys.length > 0 && Object.keys(skills).length === 0) {
        missing.push(unitDisplayName(unit)); return;
      }
      const spAdd = fullLinkSkillPowerValue(full, slot.links >= 5 ? slot.fullLink : -1);
      const buffLv = fullLinkBuffLv(full, slot.links >= 5 ? slot.fullLink : -1)
        + (slot.maxAffection && full.affection ? 1 : 0);
      const grade = unit.rarity + Math.min(slot.gradeIdx, full.stat.length - 1);
      const passives = keys
        .map((k, i) => ({ k, raw: skills[k], lv: slot.skillLv[i] ?? 10 }))
        .filter((x) => x.raw && x.raw.type === 'passive' &&
          skillUnlockRank(x.k, x.raw.leastRank, state.region.region) <= grade)
        .map((x) => ({ key: x.k, name: x.raw.name, skill: scaleSkillLevel(x.raw, x.lv, spAdd, buffLv) }));
      const equips: SimUnitInput['equips'] = [];
      let equipsReady = true;
      slot.equips.forEach((sel, i) => {
        if (!sel || !equipSlotUnlocked(unit, i, slot.level)) return;
        const fe = selectEquipFull(state, sel.id);
        if (!fe) { equipsReady = false; return; }
        const rank = fe.ranks[Math.min(sel.rank, fe.ranks.length - 1)];
        const lvl = rank.levels[Math.min(sel.level, rank.levels.length - 1)];
        equips.push({ id: sel.id, name: rank.name, buffs: lvl?.buffs ?? [] });
      });
      if (!equipsReady) { missing.push(`${unitDisplayName(unit)} (equipment)`); return; }
      const stats = computeStats(full, slot, equippedStats(slot, unit, (id) => selectEquipFull(state, id)));
      inputs.push({ tile, unit: full, slot, stats, passives, equips });
    });
    return { inputs, missing };
    // state identity changes on every store update; that's fine — memo is cheap.
  }, [team, state]);

  const result = useMemo(
    () => (missing.length === 0 && inputs.length > 0 ? simulateRound1(inputs) : null),
    [inputs, missing.length],
  );

  if (team.every((s) => !s)) {
    return <Text color="gray.500" fontSize="sm" py={6} textAlign="center">Place some units first.</Text>;
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

  // team-wide buff list grouped by buff type
  const byType = new Map<number, { targetTile: number; a: AppliedBuff }[]>();
  for (const r of result.units)
    for (const a of r.applied) {
      const list = byType.get(a.buff.type) ?? [];
      list.push({ targetTile: r.tile, a });
      byType.set(a.buff.type, list);
    }
  const typeOrder = Array.from(byType.keys()).sort((x, y) => x - y);

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
                      <Badge colorScheme="teal" fontSize="2xs">{r.applied.length} effects</Badge>
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
                        <Thead><Tr><Th>Effect</Th><Th>Value</Th><Th>Source</Th></Tr></Thead>
                        <Tbody>
                          {[...r.applied].sort((a, b) => a.buff.type - b.buff.type).map((a, i) => (
                            <AppliedRow key={i} a={a} units={units} />
                          ))}
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

      {/* team-wide buffs grouped by type */}
      <Box borderWidth="1px" borderColor="surface.border" borderRadius="xl" bg="surface.elevated" p={4}>
        <Heading size="xs" mb={2}>Applied Buffs by Type</Heading>
        {typeOrder.length === 0 ? (
          <Text fontSize="xs" color="gray.500">Nothing applied.</Text>
        ) : (
          <VStack align="stretch" spacing={2}>
            {typeOrder.map((tp) => {
              const rows = byType.get(tp)!;
              return (
                <Box key={tp} borderWidth="1px" borderColor="surface.border" borderRadius="lg" bg="blackAlpha.300" p={2}>
                  <HStack mb={1.5} spacing={2}>
                    {rows[0].a.buff.icon ? (
                      <Image src={`/images/effects/BuffIcon_${rows[0].a.buff.icon}.png`} boxSize="18px" alt="" />
                    ) : null}
                    <Text fontSize="xs" fontWeight="700" textDecoration="underline">
                      {BUFF_TYPE_NAMES[tp] ?? `type ${tp}`}
                    </Text>
                    <Badge fontSize="2xs">{rows.length}</Badge>
                  </HStack>
                  <Wrap spacing={2}>
                    {rows.map(({ targetTile, a }, i) => {
                      const u = unitOf(targetTile);
                      const { str: valStr, color } = buffValue(a.buff);
                      return (
                        <WrapItem key={i}>
                          <HStack spacing={1.5} borderWidth="1px" borderColor="surface.border"
                            borderRadius="md" px={1.5} py={0.5} bg="blackAlpha.400">
                            {u ? <UnitChip unit={u} /> : null}
                            <Text fontSize="xs" fontWeight="700" color={color}>{valStr || '—'}</Text>
                            <Text fontSize="2xs" color="gray.500" noOfLines={1}>{t(a.sourceName)}</Text>
                          </HStack>
                        </WrapItem>
                      );
                    })}
                  </Wrap>
                </Box>
              );
            })}
          </VStack>
        )}
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
