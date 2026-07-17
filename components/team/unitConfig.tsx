import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Button, ButtonGroup, Center, Checkbox, Flex, Heading, HStack, VStack, Text, Tag,
  Wrap, WrapItem, Image, Badge, Spinner, IconButton, Select, SimpleGrid, GridItem,
  InputGroup, InputLeftAddon, NumberInput, NumberInputField, NumberInputStepper,
  NumberIncrementStepper, NumberDecrementStepper, Slider, SliderTrack,
  SliderFilledTrack, SliderThumb, Accordion, AccordionItem, AccordionButton,
  AccordionPanel, AccordionIcon,
} from '@chakra-ui/react';
import { CloseIcon, SmallCloseIcon } from '@chakra-ui/icons';
import Link from 'next/link';
import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectUnitSkills, selectUnitSkillStatus } from '@/store/unitSlice';
import { selectEquip, fetchEquipFullAsync, setActiveEquip } from '@/store/equipSlice';
import { selectRegion } from '@/store/regionSlice';
import { RootState } from '@/store';
import { UnitData, FullUnitData, LinkBonus } from '@/interfaces/unit';
import { EquipData } from '@/interfaces/equip';
import { Team, TeamSlot, TeamEquipSel, StatKey } from '@/interfaces/team';
import { Skill } from '@/interfaces/skill';
import { t } from '@/lib/strings';
import { useTranslationVersion } from '@/lib/translationVersion';
import { rankTag, rankColor, equipIcon, unitDisplayName } from '@/lib/rank';
import { StatSection } from '@/components/statBlock';
import BuffList from '@/components/buffList';
import {
  LV_MAX, POINTS_PER_LEVEL, POINT_STATS, STAT_PER_POINT, LINK_UNLOCK_LEVELS,
  maxLinksAt, totalPointsAt, equipSlotUnlocked, equippedStats, computeStats,
  scaleSkillLevel, fullLinkSkillPowerValue, fullLinkBuffLv,
  skillUnlockRank,
} from '@/lib/team';
import { buildSimInputs } from '@/lib/simInputs';
import { solveAutoPoints } from '@/lib/autoStats';
import EquipPicker from './equipPicker';

// Per-tile config: level/grade, links, stat points, equipment, skill levels
// (click icon = AoE preview) and the resulting stat block.

interface Props {
  tile: number;
  slot: TeamSlot;
  unit: UnitData;                 // full once the bundle merges
  team: Team;                     // whole team — the auto-stat solver simulates round 1
  onChange: (patch: Partial<TeamSlot>) => void;
  onRemove: () => void;
  onReplace: () => void;
  onSkillClick: (key: string, skill: Skill) => void;
  aoeSkillKey: string | null;
}

// render a link-bonus template with its (possibly stacked) value
function linkText(b: LinkBonus, mult = 1): string {
  const tpl = t(b.desc);
  const raw = (tpl.includes('%') ? b.value * 100 : b.value) * mult;
  return tpl.replace('{0}', String(Math.round(raw * 1000) / 1000));
}

const STAT_ICON: Record<string, string> = {
  ATK: '/images/icon_ATK.png', DEF: '/images/icon_DEF.png', HP: '/images/icon_HP.png',
  ACC: '/images/icon_ACC.png', EVA: '/images/icon_EVA.png', CRIT: '/images/icon_CRIT.png',
  SPD: '/images/icon_SPD.png',
};

// Game-style stat tiles: name + point input on top, value (+bonus) below.
// ptIdx indexes TeamSlot.points ([ATK, DEF, HP, ACC, EVA, CRIT]); SPD has none.
const STAT_CELLS: { key: StatKey; label: string; suffix: string; ptIdx: number | null; span: number }[] = [
  { key: 'HP', label: 'HP', suffix: '', ptIdx: 2, span: 2 },
  { key: 'ATK', label: 'ATK', suffix: '', ptIdx: 0, span: 1 },
  { key: 'DEF', label: 'DEF', suffix: '', ptIdx: 1, span: 1 },
  { key: 'ACC', label: 'ACC', suffix: '%', ptIdx: 3, span: 1 },
  { key: 'EVA', label: 'EVA', suffix: '%', ptIdx: 4, span: 1 },
  { key: 'CRI', label: 'CRIT', suffix: '%', ptIdx: 5, span: 1 },
  { key: 'SPD', label: 'SPD', suffix: '', ptIdx: null, span: 1 },
];

function ConfigSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <AccordionItem border="1px solid" borderColor="surface.border" borderRadius="xl"
      bg="surface.elevated" mb={3} overflow="hidden">
      <AccordionButton px={4} py={3} _hover={{ bg: 'whiteAlpha.50' }}>
        <Heading size="xs" flex="1" textAlign="left">{title}</Heading>
        <AccordionIcon />
      </AccordionButton>
      <AccordionPanel px={4} pt={0} pb={4}>{children}</AccordionPanel>
    </AccordionItem>
  );
}

export default function UnitConfig({ tile, slot, unit, team, onChange, onRemove, onReplace, onSkillClick, aoeSkillKey }: Props) {
  useTranslationVersion();
  const dispatch = useAppDispatch();
  const equipList = useAppSelector(selectEquip);
  const region = useAppSelector(selectRegion);
  const skills = useAppSelector((s) => selectUnitSkills(s, unit.id));
  const skillStatus = useAppSelector((s) => selectUnitSkillStatus(s, unit.id));
  const state = useAppSelector((s: RootState) => s);
  const fullMap = useAppSelector((s: RootState) => s.equip.byRegion[s.region.region].full);
  const getFull = useCallback((id: string) => fullMap[id] ?? null, [fullMap]);

  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [openEqSlot, setOpenEqSlot] = useState<number | null>(null);

  // auto-stat: solve points for 100% round-1 CRIT (+ optional ACC floor)
  const [autoStat, setAutoStat] = useState(false);
  const [accTarget, setAccTarget] = useState(0);

  const detail = !!unit.stat;
  const full = unit as FullUnitData;

  // clamp links when the level drops below an unlock
  const maxLinks = maxLinksAt(slot.level);
  useEffect(() => {
    if (slot.links > maxLinks) onChange({ links: maxLinks, fullLink: -1 });
  }, [maxLinks]); // eslint-disable-line react-hooks/exhaustive-deps

  // keep skillLv sized to the active form's skill list once the bundle loads
  const skillKeys = (slot.form === 1 ? full.skillsCh : full.skills) ?? [];
  useEffect(() => {
    if (!detail) return;
    if (slot.skillLv.length !== skillKeys.length) {
      const next = skillKeys.map((_, i) => slot.skillLv[i] ?? 10);
      onChange({ skillLv: next });
    }
  }, [detail, skillKeys.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // While auto-stat is on, re-solve whenever anything feeding the round-1 sim
  // changes (equipment, level, links, teammates, …) and write the points back.
  const simBuild = useMemo(
    () => (autoStat && detail ? buildSimInputs(team, state) : null),
    [autoStat, detail, team, state],
  );
  const autoSolution = useMemo(() => {
    if (!simBuild || simBuild.missing.length > 0 || simBuild.unavailable.length > 0) return null;
    return solveAutoPoints({
      inputs: simBuild.inputs, tile, unit: full, slot, getFull, accTarget,
    });
  }, [simBuild, tile, full, slot, getFull, accTarget]);
  useEffect(() => {
    if (!autoStat || !autoSolution) return;
    if (autoSolution.points.some((p, i) => p !== (slot.points[i] ?? 0))) {
      onChange({ points: autoSolution.points });
    }
  }, [autoStat, autoSolution, slot.points, onChange]);

  if (!detail) {
    return (
      <Box borderWidth="1px" borderColor="surface.border" borderRadius="xl" bg="surface.elevated" p={4}>
        <Center py={8}><Spinner color="yellow.400" /></Center>
      </Box>
    );
  }

  const totalPts = totalPointsAt(slot.level);
  const spentPts = slot.points.reduce((s, n) => s + n, 0);
  const remaining = totalPts - spentPts;

  const stats = computeStats(full, slot, equippedStats(slot, unit, getFull));
  const currentHp = slot.currentHp > 0
    ? Math.min(slot.currentHp, stats.total.HP)
    : slot.hpPercent != null
      ? Math.max(1, Math.round(stats.total.HP * slot.hpPercent / 100))
      : stats.total.HP;
  const grade = unit.rarity + Math.min(slot.gradeIdx, full.stat.length - 1);

  const spAdd = fullLinkSkillPowerValue(full, slot.links >= 5 ? slot.fullLink : -1);
  const affectionLv = slot.maxAffection && full.affection ? 1 : 0;
  const buffLv = fullLinkBuffLv(full, slot.links >= 5 ? slot.fullLink : -1) + affectionLv;

  const setPoint = (i: number, v: number) => {
    const points = [...slot.points];
    const others = spentPts - (points[i] ?? 0);
    points[i] = Math.max(0, Math.min(v, totalPts - others));
    onChange({ points });
  };
  // a hand edit takes over from the solver
  const setPointManual = (i: number, v: number) => {
    if (autoStat) setAutoStat(false);
    setPoint(i, v);
  };

  const setEquip = (i: number, e: TeamEquipSel | null) => {
    const equips = [...slot.equips];
    equips[i] = e;
    onChange({ equips });
  };

  const fmtBonus = (n: number, suffix = '') =>
    n === 0 ? null : (
      <Text as="span" color="yellow.300" fontWeight="700" ml={1.5}>
        ({n > 0 ? '+' : ''}{Number.isInteger(n) ? n.toLocaleString() : n}{suffix})
      </Text>
    );
  const statVal = (key: keyof typeof stats.total, suffix = '') => (
    <>
      {stats.total[key].toLocaleString()}{suffix}
      {fmtBonus(stats.bonus[key], suffix)}
    </>
  );

  return (
    <VStack align="stretch" spacing={4}>
      {/* header */}
      <Flex gap={3} align="center"
        bg="surface.elevated" borderWidth="1px" borderColor="surface.border" borderRadius="xl" p={3}>
        <Box boxSize="56px" borderRadius="lg" overflow="hidden" bg="blackAlpha.500" flexShrink={0}>
          {unit.icon ? <Image src={`/images/icons/${unit.icon}.png`} alt="" objectFit="cover" w="100%" h="100%" /> : null}
        </Box>
        <Box minW={0} flex="1">
          <Heading size="sm" noOfLines={1}>
            <Link href={`/units/detail?id=${encodeURIComponent(unit.id)}`}>
              <Text as="span" _hover={{ color: 'yellow.300', textDecoration: 'underline' }}>
                {unitDisplayName(unit)}
              </Text>
            </Link>
          </Heading>
          <HStack spacing={1.5} mt={1}>
            <Tag size="sm" bg={rankColor(grade)} color="blackAlpha.800" fontWeight="bold">{rankTag(grade)}</Tag>
            <Tag size="sm" colorScheme="red">{unit.role}</Tag>
            <Tag size="sm" colorScheme="green">{unit.type}</Tag>
          </HStack>
        </Box>
        <Button size="xs" variant="outline" colorScheme="teal" onClick={onReplace}>Swap</Button>
        <IconButton aria-label="remove unit" icon={<CloseIcon />} size="sm" variant="outline"
          colorScheme="red" onClick={onRemove} />
      </Flex>

      {/* level + grade */}
      <Box borderWidth="1px" borderColor="surface.border" borderRadius="xl" bg="surface.elevated" p={4}>
        <Flex gap={4} wrap="wrap" align="center">
          <HStack spacing={2}>
            <Text fontSize="xs" color="gray.500">Grade</Text>
            <ButtonGroup isAttached size="xs">
              {full.stat.map((_, i) => {
                const g = unit.rarity + i;
                return (
                  <Button key={g} variant={i === slot.gradeIdx ? 'solid' : 'outline'}
                    bg={i === slot.gradeIdx ? rankColor(g) : undefined}
                    color={i === slot.gradeIdx ? 'blackAlpha.800' : rankColor(g)}
                    borderColor={rankColor(g)}
                    _hover={{ bg: i === slot.gradeIdx ? rankColor(g) : 'whiteAlpha.100' }}
                    onClick={() => onChange({ gradeIdx: i })}>{rankTag(g)}</Button>
                );
              })}
            </ButtonGroup>
          </HStack>
          <InputGroup size="sm" w="150px">
            <InputLeftAddon bg="surface.border" color="white" borderColor="surface.border" fontWeight="700">Lv.</InputLeftAddon>
            <NumberInput value={slot.level} min={1} max={LV_MAX} size="sm"
              onChange={(_, n) => onChange({ level: Number.isFinite(n) ? Math.min(Math.max(n, 1), LV_MAX) : 1 })}>
              <NumberInputField borderColor="surface.border" />
              <NumberInputStepper>
                <NumberIncrementStepper color="gray.300" borderColor="surface.border" />
                <NumberDecrementStepper color="gray.300" borderColor="surface.border" />
              </NumberInputStepper>
            </NumberInput>
          </InputGroup>
          <Slider aria-label="level" value={slot.level} min={1} max={LV_MAX} flex="1" minW="120px"
            onChange={(v) => onChange({ level: v })} focusThumbOnChange={false}>
            <SliderTrack bg="whiteAlpha.200"><SliderFilledTrack bg="yellow.400" /></SliderTrack>
            <SliderThumb boxSize={4} />
          </Slider>
        </Flex>
        {slot.level > 100 ? (
          <Text fontSize="2xs" color="gray.500" mt={1}>Lv {slot.level} needs limit break in game (101–120).</Text>
        ) : null}
        <Flex mt={3} gap={3} align="center" wrap="wrap">
          {full.affection ? (
            <Button size="xs" colorScheme="pink" variant={slot.maxAffection ? 'solid' : 'outline'}
              onClick={() => onChange({ maxAffection: !slot.maxAffection })}>
              200 Affection{full.marriage ? ' / Married' : ''} (+1 buff/debuff lv)
            </Button>
          ) : null}
          <HStack spacing={2}>
            <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">Current HP</Text>
            <NumberInput value={currentHp} min={1} max={stats.total.HP} size="xs" w="110px"
              onChange={(_, n) => onChange({
                currentHp: Number.isFinite(n) ? Math.min(Math.max(n, 1), stats.total.HP) : stats.total.HP,
                hpPercent: undefined,
              })}>
              <NumberInputField borderColor="surface.border" pr="24px" />
              <NumberInputStepper>
                <NumberIncrementStepper color="gray.300" borderColor="surface.border" />
                <NumberDecrementStepper color="gray.300" borderColor="surface.border" />
              </NumberInputStepper>
            </NumberInput>
            <Text fontSize="2xs" color="gray.500">
              / {stats.total.HP.toLocaleString()} ({Math.round(currentHp / stats.total.HP * 100)}%)
            </Text>
          </HStack>
        </Flex>
      </Box>

      {/* Live output stays visible while the configuration sections collapse.
          Game-style tiles: stat name + point input on top, value (+bonus) below. */}
      <Box borderWidth="1px" borderColor="surface.border" borderRadius="xl" bg="surface.elevated" p={4}>
        <Flex align="center" justify="space-between" gap={2} mb={1} wrap="wrap">
          <Heading size="xs">Stats <Text as="span" fontSize="2xs" color="gray.500" fontWeight="normal">
            {rankTag(grade)} · Lv {slot.level} — total <Text as="span" color="yellow.300">(+bonus)</Text>
          </Text></Heading>
          <HStack spacing={2}>
            <Badge colorScheme={remaining > 0 ? 'yellow' : 'gray'}>{remaining} / {totalPts} pts left</Badge>
            <Button size="xs" variant="outline"
              onClick={() => { setAutoStat(false); onChange({ points: [0, 0, 0, 0, 0, 0] }); }}>
              Reset
            </Button>
          </HStack>
        </Flex>
        <Text fontSize="2xs" color="gray.500" mb={2}>
          {POINTS_PER_LEVEL} points per level — spend them directly on each stat.
        </Text>
        <SimpleGrid columns={2} spacing={2}>
          {STAT_CELLS.map(({ key, label, suffix, ptIdx, span }) => {
            const per = ptIdx != null ? STAT_PER_POINT[POINT_STATS[ptIdx]] : 0;
            return (
              <GridItem key={key} colSpan={span} bg="blackAlpha.300" borderWidth="1px"
                borderColor="surface.border" borderRadius="lg" px={2.5} py={2}>
                <Flex align="center" justify="space-between" gap={2} minH="24px">
                  <HStack spacing={1.5} minW={0}>
                    {STAT_ICON[label] ? <Image src={STAT_ICON[label]} alt={label} boxSize="0.9rem" /> : null}
                    <Text fontSize="xs" fontWeight="700" color="gray.400">{label}</Text>
                  </HStack>
                  {ptIdx != null ? (
                    <NumberInput size="xs" value={slot.points[ptIdx] ?? 0} min={0}
                      max={(slot.points[ptIdx] ?? 0) + remaining} w="72px"
                      onChange={(_, n) => setPointManual(ptIdx, Number.isFinite(n) ? n : 0)}>
                      <NumberInputField borderColor="surface.border" pr="20px"
                        title={`+${per < 1 ? `${per * 100}%` : per} per point`} />
                      <NumberInputStepper>
                        <NumberIncrementStepper color="gray.300" borderColor="surface.border" />
                        <NumberDecrementStepper color="gray.300" borderColor="surface.border" />
                      </NumberInputStepper>
                    </NumberInput>
                  ) : null}
                </Flex>
                <Text fontSize="sm" fontWeight="700" mt={1} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {statVal(key, suffix)}
                </Text>
              </GridItem>
            );
          })}
        </SimpleGrid>

        {/* auto-stat: 100% round-1 CRIT + optional ACC floor, surplus into one stat */}
        <Box mt={3} pt={2} borderTopWidth="1px" borderColor="whiteAlpha.100">
          <Flex align="center" gap={3} wrap="wrap">
            <Checkbox size="sm" colorScheme="yellow" isChecked={autoStat}
              onChange={(e) => setAutoStat(e.target.checked)}>
              <Text fontSize="xs" fontWeight="600">Auto stats</Text>
            </Checkbox>
            <HStack spacing={1.5}>
              <Text fontSize="2xs" color="gray.500" whiteSpace="nowrap">CRIT 100% + ACC ≥</Text>
              <NumberInput size="xs" value={accTarget} min={0} max={999} w="72px"
                onChange={(_, n) => setAccTarget(Number.isFinite(n) ? Math.max(n, 0) : 0)}>
                <NumberInputField borderColor="surface.border" pr="20px" />
                <NumberInputStepper>
                  <NumberIncrementStepper color="gray.300" borderColor="surface.border" />
                  <NumberDecrementStepper color="gray.300" borderColor="surface.border" />
                </NumberInputStepper>
              </NumberInput>
              <Text fontSize="2xs" color="gray.500" whiteSpace="nowrap">% (0 = ignore ACC)</Text>
            </HStack>
          </Flex>
          {autoStat ? (
            simBuild && simBuild.unavailable.length > 0 ? (
              <Text fontSize="2xs" color="red.300" mt={1}>
                Cannot simulate — unavailable on this server: {simBuild.unavailable.join(', ')}.
              </Text>
            ) : !autoSolution ? (
              <Text fontSize="2xs" color="gray.500" mt={1}>Loading team data…</Text>
            ) : autoSolution.possible ? (
              <Text fontSize="2xs" color="green.300" mt={1}>
                Possible — CRIT {autoSolution.critPts} pts{accTarget > 0 ? `, ACC ${autoSolution.accPts} pts` : ''},
                {' '}{autoSolution.leftover} pts left to spend. Recomputes as equipment / team changes.
              </Text>
            ) : (
              <Text fontSize="2xs" color="red.300" mt={1}>
                Not possible — round-1 CRIT 100%{accTarget > 0 ? ` + ACC ${accTarget}%` : ''} needs{' '}
                {autoSolution.needed} pts, only {totalPts} available. Best effort applied (CRIT first).
              </Text>
            )
          ) : (
            <Text fontSize="2xs" color="gray.500" mt={1}>
              Targets use round-1 in-battle stats (team buffs included). Editing points by hand turns this off.
            </Text>
          )}
        </Box>

        <Box mt={3}>
          <StatSection title="Resist">
            <HStack justify="space-around" py={1.5} px={2}>
              <HStack spacing={1}><Image alt="fire" src="/images/fire.png" boxSize="1rem" /><Text fontSize="sm" fontWeight="600">{stats.total.fireRes}%{fmtBonus(stats.bonus.fireRes, '%')}</Text></HStack>
              <HStack spacing={1}><Image alt="ice" src="/images/ice.png" boxSize="1rem" /><Text fontSize="sm" fontWeight="600">{stats.total.iceRes}%{fmtBonus(stats.bonus.iceRes, '%')}</Text></HStack>
              <HStack spacing={1}><Image alt="electric" src="/images/electric.png" boxSize="1rem" /><Text fontSize="sm" fontWeight="600">{stats.total.lightningRes}%{fmtBonus(stats.bonus.lightningRes, '%')}</Text></HStack>
            </HStack>
          </StatSection>
        </Box>
      </Box>

      <Accordion allowMultiple reduceMotion>
      {/* core links */}
      <ConfigSection title="Core Link">
        <HStack spacing={2} wrap="wrap">
          <ButtonGroup isAttached size="xs">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <Button key={n} variant={slot.links === n ? 'solid' : 'outline'} colorScheme="teal"
                isDisabled={n > maxLinks}
                onClick={() => onChange({ links: n, ...(n < 5 ? { fullLink: -1 } : {}) })}>
                {n * 100}%
              </Button>
            ))}
          </ButtonGroup>
          <Text fontSize="2xs" color="gray.500">
            slots unlock at Lv {LINK_UNLOCK_LEVELS.join('/')}
          </Text>
        </HStack>
        {slot.links > 0 && full.linkBonus.length > 0 ? (
          <Wrap spacing={1.5} mt={2}>
            {full.linkBonus.map((b, i) => (
              <WrapItem key={i}><Tag colorScheme="teal" size="sm">{linkText(b, slot.links)}</Tag></WrapItem>
            ))}
          </Wrap>
        ) : null}
        {slot.links >= 5 && full.fullLinkBonus.length > 0 ? (
          <HStack mt={2} spacing={2}>
            <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">Full link:</Text>
            <Select size="xs" value={slot.fullLink}
              onChange={(e) => onChange({ fullLink: parseInt(e.target.value, 10) })}>
              <option value={-1}>— pick one —</option>
              {full.fullLinkBonus.map((b, i) => (
                <option key={i} value={i}>{linkText(b)}</option>
              ))}
            </Select>
          </HStack>
        ) : null}
      </ConfigSection>

      {/* equipment — 4 slot boxes like the in-game loadout */}
      <ConfigSection title="Equipment">
        <HStack spacing={3} justify="space-around">
          {(full.equip ?? []).map((meta, i) => {
            const sel = slot.equips[i];
            const unlocked = equipSlotUnlocked(unit, i, slot.level);
            const fullEq = sel ? getFull(sel.id) : null;
            const listEq: EquipData | undefined = sel ? equipList[sel.id] : undefined;
            const rank = fullEq?.ranks[Math.min(sel?.rank ?? 0, (fullEq?.ranks.length ?? 1) - 1)];
            const icon = rank?.icon || listEq?.icon;
            const isOpen = openEqSlot === i;
            return (
              <VStack key={i} spacing={1} opacity={unlocked ? 1 : 0.45}>
                <Box as="button" boxSize="52px" borderRadius="lg" bg="blackAlpha.400"
                  borderWidth="2px" p="4px"
                  borderColor={isOpen ? 'yellow.400' : sel && rank ? rankColor(rank.grade) : 'surface.border'}
                  display="flex" alignItems="center" justifyContent="center"
                  _hover={unlocked ? { borderColor: 'yellow.300' } : undefined}
                  onClick={() => {
                    if (!unlocked) return;
                    if (!sel) setPickerSlot(i);
                    else setOpenEqSlot(isOpen ? null : i);
                  }}>
                  {sel && icon ? (
                    <Image src={`/images/icons/${icon}.png`} alt={meta.type} maxW="100%" maxH="100%" objectFit="contain" />
                  ) : equipIcon(meta.type) ? (
                    <Image src={equipIcon(meta.type)!} alt={meta.type} maxW="100%" maxH="100%" objectFit="contain" />
                  ) : <Text fontSize="2xs">{meta.type}</Text>}
                </Box>
                <ButtonGroup isAttached size="xs">
                  <Button variant="outline" colorScheme="teal"
                    isDisabled={!unlocked} onClick={() => setPickerSlot(i)}>
                    {sel ? 'Swap' : 'Add'}
                  </Button>
                  {sel ? (
                    <IconButton aria-label={`remove ${meta.type} equipment`} icon={<SmallCloseIcon />}
                      variant="outline" colorScheme="red"
                      onClick={() => { setEquip(i, null); if (isOpen) setOpenEqSlot(null); }} />
                  ) : null}
                </ButtonGroup>
                <Text fontSize="2xs" color="gray.300">{meta.type}{sel ? ` +${sel.level}` : ''}</Text>
                <Text fontSize="2xs" color={unlocked ? 'gray.500' : 'red.300'}>Lv {meta.level}</Text>
              </VStack>
            );
          })}
        </HStack>
        {openEqSlot != null && slot.equips[openEqSlot] ? (() => {
          const i = openEqSlot;
          const sel = slot.equips[i]!;
          const fullEq = getFull(sel.id);
          const listEq: EquipData | undefined = equipList[sel.id];
          const rank = fullEq?.ranks[Math.min(sel.rank, (fullEq?.ranks.length ?? 1) - 1)];
          return (
            <Box mt={3} borderWidth="1px" borderColor="surface.border" borderRadius="lg" bg="blackAlpha.300" p={2.5}>
              <Flex align="center" gap={2} wrap="wrap">
                <Text fontSize="xs" fontWeight="600" noOfLines={1} flex="1" minW="120px"
                  cursor="pointer" _hover={{ color: 'yellow.300', textDecoration: 'underline' }}
                  onClick={() => dispatch(setActiveEquip(sel.id))}>
                  {t(rank?.name || listEq?.name || sel.id)}
                </Text>
                <Button size="xs" variant="ghost" onClick={() => setPickerSlot(i)}>Change</Button>
                <IconButton aria-label="unequip" icon={<SmallCloseIcon />} size="xs"
                  variant="ghost" colorScheme="red"
                  onClick={() => { setEquip(i, null); setOpenEqSlot(null); }} />
              </Flex>
              <Flex align="center" gap={3} mt={2} wrap="wrap">
                {fullEq && fullEq.ranks.length > 1 ? (
                  <ButtonGroup isAttached size="xs">
                    {fullEq.ranks.map((rk, ri) => (
                      <Button key={ri} variant={ri === sel.rank ? 'solid' : 'outline'}
                        bg={ri === sel.rank ? rankColor(rk.grade) : undefined}
                        color={ri === sel.rank ? 'blackAlpha.800' : rankColor(rk.grade)}
                        borderColor={rankColor(rk.grade)}
                        onClick={() => setEquip(i, { ...sel, rank: ri })}>
                        {rankTag(rk.grade)}
                      </Button>
                    ))}
                  </ButtonGroup>
                ) : null}
                <HStack spacing={2} flex="1" minW="140px">
                  <Text fontSize="2xs" color="gray.500" whiteSpace="nowrap">Lv {sel.level}</Text>
                  <Slider aria-label="equip level" value={sel.level} min={0} max={10}
                    onChange={(v) => setEquip(i, { ...sel, level: v })} focusThumbOnChange={false}>
                    <SliderTrack bg="whiteAlpha.200"><SliderFilledTrack bg="yellow.400" /></SliderTrack>
                    <SliderThumb boxSize={3} />
                  </Slider>
                </HStack>
              </Flex>
            </Box>
          );
        })() : null}
      </ConfigSection>

      {/* skills */}
      <ConfigSection title="Skills">
        <Flex justify="flex-end" align="center" mb={2} wrap="wrap" gap={2}>
          {(full.skillsCh ?? []).length > 0 ? (
            <ButtonGroup isAttached size="xs">
              <Button colorScheme="yellow" variant={slot.form === 0 ? 'solid' : 'outline'}
                onClick={() => onChange({ form: 0 })}>Form 1</Button>
              <Button colorScheme="yellow" variant={slot.form === 1 ? 'solid' : 'outline'}
                onClick={() => onChange({ form: 1 })}>Form 2</Button>
            </ButtonGroup>
          ) : null}
        </Flex>
        <Text fontSize="2xs" color="gray.500" mb={2}>
          Click a skill icon to highlight the tiles it reaches on the map (ally-affecting skills only).
        </Text>
        {skillStatus === 'loading' && Object.keys(skills).length === 0 ? (
          <Center py={4}><Spinner size="sm" color="yellow.400" /></Center>
        ) : (
          <Accordion allowMultiple>
            {skillKeys.map((key, i) => {
              const raw = skills[key];
              if (!raw) return null;
              const lv = slot.skillLv[i] ?? 10;
              const scaled = scaleSkillLevel(raw, lv, spAdd, buffLv);
              const isAoe = aoeSkillKey === key;
              const requiredRank = skillUnlockRank(key, raw.leastRank, region);
              const locked = requiredRank > grade;
              return (
                <AccordionItem key={key} border="1px solid" borderColor={isAoe ? 'yellow.400' : 'surface.border'}
                  borderRadius="lg" mb={2} bg="blackAlpha.300" opacity={locked ? 0.55 : 1}>
                  <Flex align="center" gap={2} px={2} py={1.5} wrap="wrap">
                    <Image src={`/images/SkillIcon/${scaled.img}_${scaled.type}.png`} alt={scaled.title}
                      boxSize="34px" cursor={locked ? 'not-allowed' : 'pointer'}
                      filter={locked ? 'grayscale(1)' : undefined}
                      outline={isAoe ? '2px solid var(--chakra-colors-yellow-400)' : undefined}
                      borderRadius="md"
                      onClick={() => { if (!locked) onSkillClick(key, scaled); }} />
                    <Box minW={0} flex="1" cursor={locked ? 'default' : 'pointer'}
                      onClick={() => { if (!locked) onSkillClick(key, scaled); }}>
                      <Text fontSize="xs" fontWeight="600" noOfLines={1}>{t(scaled.name)}</Text>
                      <HStack spacing={1}>
                        <Badge colorScheme={scaled.type === 'active' ? 'blue' : 'purple'} fontSize="2xs">
                          {scaled.type}
                        </Badge>
                        {scaled.type === 'active' ? <Badge fontSize="2xs">AP {scaled.AP}</Badge> : null}
                        {locked ? (
                          <Badge colorScheme="orange" fontSize="2xs">Unlocks at {rankTag(requiredRank)}</Badge>
                        ) : null}
                      </HStack>
                    </Box>
                    <HStack spacing={1} w="110px" flexShrink={0}>
                      <Text fontSize="2xs" color="gray.500" whiteSpace="nowrap">Lv {lv}</Text>
                      <Slider aria-label="skill level" value={lv} min={1} max={10} size="sm"
                        isDisabled={locked}
                        onChange={(v) => {
                          const skillLv = [...slot.skillLv];
                          skillLv[i] = v;
                          onChange({ skillLv });
                        }} focusThumbOnChange={false}>
                        <SliderTrack bg="whiteAlpha.200"><SliderFilledTrack bg="yellow.400" /></SliderTrack>
                        <SliderThumb boxSize={3} />
                      </Slider>
                    </HStack>
                    <AccordionButton w="auto" p={1}><AccordionIcon /></AccordionButton>
                  </Flex>
                  <AccordionPanel pt={0} pb={2} px={2}>
                    {scaled.buffs.length ? <BuffList buffs={scaled.buffs} /> : (
                      <Text fontSize="xs" color="gray.500">No effects.</Text>
                    )}
                  </AccordionPanel>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </ConfigSection>
      </Accordion>

      {/* equip picker modal */}
      {pickerSlot != null && full.equip?.[pickerSlot] ? (
        <EquipPicker
          isOpen
          onClose={() => setPickerSlot(null)}
          equip={equipList}
          unit={unit}
          slotType={full.equip[pickerSlot].type}
          onPick={(e) => {
            setEquip(pickerSlot, { id: e.id, rank: Math.max(0, e.rankCount - 1), level: 10 });
            dispatch(fetchEquipFullAsync(e.id));
            setPickerSlot(null);
          }}
        />
      ) : null}
    </VStack>
  );
}
