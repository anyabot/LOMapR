import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import {
  Box, Button, ButtonGroup, Center, Flex, Heading, HStack, VStack, Text, Tag, Wrap, WrapItem,
  SimpleGrid, Spinner, Image, Badge, Tooltip,
  Table, Thead, Tbody, Tfoot, Tr, Th, Td, TableContainer,
  InputGroup, InputLeftAddon, NumberInput, NumberInputField, NumberInputStepper,
  NumberIncrementStepper, NumberDecrementStepper, Slider, SliderTrack, SliderFilledTrack, SliderThumb,
  Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon,
  Tabs, Tab, TabList, TabPanels, TabPanel,
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import { useAppSelector, useAppDispatch } from '@/hooks';
import {
  selectUnit, selectUnitStatus, fetchUnitsAsync,
  selectUnitSkills, selectUnitSkillStatus, fetchUnitSkillsAsync,
} from '@/store/unitSlice';
import { selectWorld, fetchWorldAsync } from '@/store/worldSlice';
import { selectItems, fetchItemsAsync, ItemInfo } from '@/store/itemSlice';
import { selectEquip, fetchEquipAsync } from '@/store/equipSlice';
import { UnitData, UnitReq, UnitStat, LinkBonus } from '@/interfaces/unit';
import { EquipData } from '@/interfaces/equip';
import { RewardEntry } from '@/interfaces/world';
import { Skill } from '@/interfaces/skill';
import { t } from '@/lib/strings';
import RewardList from '@/components/rewardList';
import SkillTab from '@/components/enemyTab/skillTab';
import CopyLink from '@/components/copyLink';
import { StatRow, StatPair, StatSection } from '@/components/statBlock';
import { rankTag, rankColor, roleRankIcon, typeIcon, roleIcon, equipIcon, factionIcon } from '@/lib/rank';

// Units cap at level 100 before the lv-limit unlocks; HP/ATK/DEF grow linearly
// from stat[grade].X[0] (lv1) to X[1] (lv100). The other stats are flat per grade.
const LV_CAP = 100;

// Solid rank chip in the official rank color (dark text for readability).
function RankTag({ grade, prefix = '', size }: { grade: number; prefix?: string; size?: string }) {
  return (
    <Tag size={size} bg={rankColor(grade)} color="blackAlpha.800" fontWeight="bold">
      {prefix}{rankTag(grade)}
    </Tag>
  );
}

// Material requirements reuse the reward chip UI: a UnitReq is just {item, count}.
const asRewards = (req: UnitReq[]): RewardEntry[] => req.map((r) => ({ item: r.id, count: r.count }));

// Render a link-bonus desc template ("HP+{0}%") with its value filled in. The value
// is shown ×100 only when the template is a PERCENT (contains '%'); otherwise it's
// a flat amount (e.g. "Action Power +{0}" → SPD +0.1, "Intersection +{0}" → Range
// +1). The table's CoreLink_Percentage_Output flag is unreliable here (SPD is
// flagged percent but displays flat), so we key off the template text. `mult` scales
// by the number of links for the normal-bonus view (×N).
function linkText(b: LinkBonus, mult = 1): string {
  const tpl = t(b.desc);
  const isPct = tpl.includes('%');
  const raw = (isPct ? b.value * 100 : b.value) * mult;
  const n = Math.round(raw * 1000) / 1000;     // trim float noise
  return tpl.replace('{0}', String(n));
}

// Linear interpolation of a [base@lv1, max@lvCap] stat pair at a given level.
function lerp(pair: [number, number], level: number): number {
  const f = (Math.min(Math.max(level, 1), LV_CAP) - 1) / (LV_CAP - 1);
  return Math.floor(pair[0] + (pair[1] - pair[0]) * f);
}

// The collection chart values (1..11) are flavor grades shown as a letter ladder
// (verified vs in-game: Gnome 4=C+/5=B/7=A). Odd = base letter, even = '+'.
const CHART_GRADES = ['D', 'D+', 'C', 'C+', 'B', 'B+', 'A', 'A+', 'S', 'S+', 'SS'];
const chartGrade = (n: number): string => CHART_GRADES[Math.min(Math.max(n, 1), 11) - 1] ?? '—';

// Profile radar-hexagon. `values` are the 6 chart stats in the data order
// [ATK, ATK rate, SPD, HP(Endurance), DEF, Assist]; we render them clockwise from
// the top as Atk / Speed / Assist / Def / Endurance / Atk Rate (the in-game layout).
function RadarChart({ values, max = 11 }: { values: number[]; max?: number }) {
  // axis order (clockwise from top) -> index into the data array + label.
  const AXES: [number, string][] = [
    [0, 'Atk'], [2, 'Speed'], [5, 'Assist'], [4, 'Def'], [3, 'Endurance'], [1, 'Atk Rate'],
  ];
  const size = 240, cx = size / 2, cy = size / 2, R = 78;
  const pt = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 6;   // start at top, clockwise
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  };
  const ring = (r: number) => AXES.map((_, i) => pt(i, r).join(',')).join(' ');
  const poly = AXES.map(([idx], i) => pt(i, R * (Math.min(values[idx] ?? 0, max) / max)).join(',')).join(' ');

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: 280 }}>
      {/* grid rings + spokes */}
      {[0.33, 0.66, 1].map((f) => (
        <polygon key={f} points={ring(R * f)} fill="none" stroke="#2c313c" strokeWidth={1} />
      ))}
      {AXES.map((_, i) => {
        const [x, y] = pt(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#2c313c" strokeWidth={1} />;
      })}
      {/* value polygon */}
      <polygon points={poly} fill="rgba(242,200,60,0.45)" stroke="#f2c83c" strokeWidth={2} />
      {/* axis labels + grade */}
      {AXES.map(([idx, label], i) => {
        const [x, y] = pt(i, R + 26);
        return (
          <g key={label}>
            <text x={x} y={y - 5} fill="#9aa0aa" fontSize={10} textAnchor="middle">{label}</text>
            <text x={x} y={y + 8} fill="#fff" fontSize={13} fontWeight="bold" textAnchor="middle">
              {chartGrade(values[idx] ?? 0)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Find a unit's full-link Skill-Power bonus value (the multiplier to skill power),
// detected by the loc template; 0 if the unit has no such option. `value` is the
// raw fraction (e.g. 0.15 = +15% skill power).
function fullLinkSkillPower(unit: UnitData): number {
  const b = unit.fullLinkBonus.find((x) => t(x.desc).toLowerCase().includes('skill power'));
  return b ? b.value : 0;
}

// Whether the unit's full-link options include the Buff/Debuff-Effect-Lv bonus
// (which grants +2 buff/debuff levels when selected).
function hasFullLinkBuffLv(unit: UnitData): boolean {
  return unit.fullLinkBonus.some((x) => /buff\/debuff effect lv/i.test(t(x.desc)));
}

// Return a level-/bonus-scaled copy of a skill for display:
//   skillLv    1..10 — scales rate (skill power) and buff values, and applies the
//              latest levelChange at-or-below the level (AP / AoE / buff turns).
//   spAdd      extra skill power added FLAT to the rate (full-link Skill Power,
//              e.g. 0.20 → +20% multiplier: 300% base becomes 320%, not 360%).
//   buffLv     extra buff/debuff levels added on top of skillLv for buff VALUES
//              only (affection +1, full-link buff +2) — not power, not AoE.
function scaleSkill(skill: Skill, skillLv: number, spAdd: number, buffLv: number): Skill {
  const lv = Math.min(Math.max(skillLv, 1), 10);
  const rate = skill.rate + (skill.rateGain ?? 0) * (lv - 1) + spAdd;

  // apply the last levelChange whose level <= lv (AP / AoE shift).
  let AP = skill.AP, area = skill.area, center = skill.center;
  for (const c of skill.levelChanges ?? []) {
    if (c.level > lv) break;
    if (c.ap != null) AP = c.ap;
    if (c.area) { area = c.area; center = c.center ?? center; }
  }

  // buff value at effective level = skillLv + buffLv (buff/debuff level adds gain
  // steps just like skill level). Only the VALUE scales — turns/AoE unaffected.
  const effLv = lv + buffLv;
  const buffs = skill.buffs.map((b) => ({
    ...b, val: Math.round((b.val + b.gain * (effLv - 1)) * 10000) / 10000,
  }));

  return { ...skill, rate: Math.round(rate * 10000) / 10000, AP, area, center, buffs };
}

export default function UnitDetail() {
  const router = useRouter();
  const id = router.query.id as string;
  const dispatch = useAppDispatch();

  const unit = useAppSelector((s) => (id ? selectUnit(s, id) : null));
  const status = useAppSelector(selectUnitStatus);
  const world = useAppSelector(selectWorld);
  const equip = useAppSelector(selectEquip);
  const skills = useAppSelector((s) => (id ? selectUnitSkills(s, id) : {}));
  const skillStatus = useAppSelector((s) => (id ? selectUnitSkillStatus(s, id) : 'idle'));

  // calculator state: selected grade (index into unit.stat) + level.
  const [gradeIdx, setGradeIdx] = useState(0);
  const [level, setLevel] = useState(LV_CAP);

  useEffect(() => { dispatch(fetchUnitsAsync()); }, [dispatch]);
  // material/unit icons (item map) + Drop-Location event names (world CONTAINER)
  // resolve from those stores; fetch them here so a direct load to a unit URL
  // populates them. Both self-skip if already loaded. (_app only auto-fetches on
  // region CHANGE, not first load.) world.json is now the light container, so this
  // is cheap — the Drop tab only needs world titles, not stage data.
  useEffect(() => { dispatch(fetchItemsAsync()); }, [dispatch]);
  useEffect(() => { dispatch(fetchWorldAsync()); }, [dispatch]);
  useEffect(() => { if (unit?.exclusiveEquip?.length) dispatch(fetchEquipAsync()); }, [unit, dispatch]);
  useEffect(() => { if (id && unit) dispatch(fetchUnitSkillsAsync(id)); }, [id, unit, dispatch]);
  // when the unit changes, default to its top grade.
  useEffect(() => {
    if (unit) setGradeIdx(unit.stat.length - 1);
  }, [unit?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!unit) {
    if (status === 'loading' || !router.isReady) return null;  // GlobalLoader covers loading
    return (
      <Center py={20}>
        <VStack>
          <Text color="gray.400">Unit not found.</Text>
          <Button as={Link} href="/units" leftIcon={<ArrowBackIcon />} size="sm" variant="outline">Back to units</Button>
        </VStack>
      </Center>
    );
  }

  // prefer the English display name from the collection profile; fall back to the
  // resolved unit name loc id.
  const name = unit.profile?.engName || t(unit.name);
  // top grade stats at lv-cap → ATK passed to SkillTab (rate → damage preview).
  const topStat = unit.stat[unit.stat.length - 1];
  const headerAtk = topStat ? topStat.ATK[1] : 0;

  return (
    <>
      <Head><title>{name} — Unit</title></Head>
      <VStack align="stretch" spacing={4} py={4}>
        <Button as={Link} href="/units" leftIcon={<ArrowBackIcon />} colorScheme="gray" variant="outline" size="sm" alignSelf="start">
          Units
        </Button>

        {/* Header: portrait + identity (always visible above the tabs) */}
        <Flex gap={4} align="center" wrap="wrap"
          bg="surface.elevated" borderWidth="1px" borderColor="surface.border" borderRadius="xl" p={4}>
          <Box boxSize="96px" borderRadius="lg" overflow="hidden" bg="blackAlpha.500" flexShrink={0}>
            {unit.icon ? (
              <Image src={`/images/icons/${unit.icon}.png`} alt={unit.icon} objectFit="cover" w="100%" h="100%" />
            ) : null}
          </Box>
          <VStack align="start" spacing={2} minW={0}>
            <HStack>
              <Heading size="lg">{name}</Heading>
              <CopyLink path={`/units/detail?id=${encodeURIComponent(unit.id)}`} />
            </HStack>
            <HStack spacing={3} align="center">
              {roleRankIcon(unit.role, unit.rarity) ? (
                <Image src={`/images/icons/${roleRankIcon(unit.role, unit.rarity)}.png`}
                  alt={`${rankTag(unit.rarity)} ${unit.role}`} h="40px" objectFit="contain" />
              ) : (
                <RankTag grade={unit.rarity} />
              )}
              <Wrap spacing={2}>
                <WrapItem>
                  <Tag colorScheme="red" gap={1}>
                    {roleIcon(unit.role) ? <Image src={roleIcon(unit.role)!} alt={unit.role} boxSize="14px" /> : null}
                    {unit.role}
                  </Tag>
                </WrapItem>
                <WrapItem>
                  <Tag colorScheme="green" gap={1}>
                    {typeIcon(unit.type) ? <Image src={typeIcon(unit.type)!} alt={unit.type} boxSize="14px" /> : null}
                    {unit.type}
                  </Tag>
                </WrapItem>
                {unit.body ? <WrapItem><Tag colorScheme="gray">{unit.body}</Tag></WrapItem> : null}
                {unit.faction ? (
                  <WrapItem>
                    <Tag colorScheme="blue" gap={1}>
                      {factionIcon(unit.faction.icon) ? (
                        <Image src={factionIcon(unit.faction.icon)!} alt={t(unit.faction.name)} boxSize="14px" />
                      ) : null}
                      {t(unit.faction.name)}
                    </Tag>
                  </WrapItem>
                ) : null}
              </Wrap>
            </HStack>
            <Text fontSize="xs" color="gray.500">{unit.id}</Text>
          </VStack>
        </Flex>

        <Tabs colorScheme="yellow" variant="enclosed" isLazy>
          <TabList flexWrap="wrap">
            <Tab>Stats</Tab>
            <Tab>Skills</Tab>
            <Tab>Profile</Tab>
            <Tab>Drop Location</Tab>
            <Tab>Promotion</Tab>
            <Tab>Limit Break</Tab>
          </TabList>

          <TabPanels>
            {/* ── Tab 1: stats calculator + manufacturing / favor / link bonus ── */}
            <TabPanel px={0}>
              <VStack align="stretch" spacing={4}>
                <ExclusiveEquip unit={unit} equip={equip} />
                <InfoTab unit={unit} gradeIdx={gradeIdx} setGradeIdx={setGradeIdx}
                  level={level} setLevel={setLevel} />
              </VStack>
            </TabPanel>

            {/* ── Tab 2: skills (with a form toggle for transform units) ────── */}
            <TabPanel px={0}>
              <SkillsTab unit={unit} skills={skills} headerAtk={headerAtk} skillStatus={skillStatus} />
            </TabPanel>

            {/* ── Tab 3: profile (collection flavor) ───────────────────────── */}
            <TabPanel px={0}>
              <ProfileTab unit={unit} />
            </TabPanel>

            {/* ── Tab 4: drop / acquisition locations ──────────────────────── */}
            <TabPanel px={0}>
              <DropTab unit={unit} world={world} />
            </TabPanel>

            {/* ── Tab 4: promotion ─────────────────────────────────────────── */}
            <TabPanel px={0}>
              <PromotionTab unit={unit} />
            </TabPanel>

            {/* ── Tab 5: limit break (level-cap unlock costs) ──────────────── */}
            <TabPanel px={0}>
              <LimitBreakTab unit={unit} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </>
  );
}

// ── Skills tab: control group (level / full-link power / affection) + skill subtabs
function SkillsTab({
  unit, skills, headerAtk, skillStatus,
}: {
  unit: UnitData;
  skills: { [key: string]: Skill };
  headerAtk: number;
  skillStatus: string;
}) {
  const hasAltForm = (unit.skillsCh || []).length > 0;
  const spBonus = fullLinkSkillPower(unit);     // full-link Skill Power value (0 if none)
  const canBuffLink = hasFullLinkBuffLv(unit);  // full-link Buff/Debuff Lv option (+2)
  const canAffection = unit.affection;          // gender 1 → can reach 200 affection (+1)

  const [form, setForm] = useState(0);          // 0 = base, 1 = change form
  const [level, setLevel] = useState(10);       // skill level 1..10
  const [usePower, setUsePower] = useState(false);   // apply full-link Skill Power
  const [useBuffLink, setUseBuffLink] = useState(false);  // full-link Buff/Debuff Lv (+2)
  const [maxAffection, setMaxAffection] = useState(false); // 200 affection / married (+1)

  const buffLv = (useBuffLink ? 2 : 0) + (maxAffection ? 1 : 0);
  const spAdd = usePower ? spBonus : 0;   // full-link Skill Power adds flat to rate

  const keys = form === 1 ? unit.skillsCh : unit.skills;
  const baseRecords: Skill[] = (keys || []).map((k) => skills[k]).filter(Boolean) as Skill[];
  const records = baseRecords.map((s) => scaleSkill(s, level, spAdd, buffLv));

  if ((unit.skills || []).length === 0) {
    return <Text color="gray.500" fontSize="sm">This unit has no skills.</Text>;
  }
  if (skillStatus === 'loading' && baseRecords.length === 0) {
    return <Center py={8}><Spinner color="yellow.400" /></Center>;
  }

  return (
    <VStack align="stretch" spacing={3}>
      {/* control group */}
      <Box borderWidth="1px" borderColor="surface.border" borderRadius="xl" bg="surface.elevated" p={4}>
        <Flex gap={4} wrap="wrap" align="center">
          {hasAltForm ? (
            <ButtonGroup isAttached size="sm">
              <Button colorScheme="yellow" variant={form === 0 ? 'solid' : 'outline'} onClick={() => setForm(0)}>Form 1</Button>
              <Button colorScheme="yellow" variant={form === 1 ? 'solid' : 'outline'} onClick={() => setForm(1)}>Form 2</Button>
            </ButtonGroup>
          ) : null}

          {/* skill level */}
          <HStack spacing={2} minW="200px" flex="1">
            <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">Skill Lv</Text>
            <Slider aria-label="skill level" value={level} min={1} max={10} flex="1"
              onChange={setLevel} focusThumbOnChange={false}>
              <SliderTrack bg="whiteAlpha.200"><SliderFilledTrack bg="yellow.400" /></SliderTrack>
              <SliderThumb boxSize={4} />
            </Slider>
            <Badge colorScheme="yellow" minW="2.2em" textAlign="center">{level}</Badge>
          </HStack>
        </Flex>

        {/* bonus toggles */}
        {(spBonus > 0 || canBuffLink || canAffection) ? (
          <Wrap spacing={2} mt={3}>
            {spBonus > 0 ? (
              <WrapItem>
                <Button size="xs" colorScheme="purple" variant={usePower ? 'solid' : 'outline'}
                  onClick={() => setUsePower((v) => !v)}>
                  Full-Link Skill Power (+{Math.round(spBonus * 100)}%)
                </Button>
              </WrapItem>
            ) : null}
            {canBuffLink ? (
              <WrapItem>
                <Button size="xs" colorScheme="teal" variant={useBuffLink ? 'solid' : 'outline'}
                  onClick={() => setUseBuffLink((v) => !v)}>
                  Full-Link Buff/Debuff Lv (+2)
                </Button>
              </WrapItem>
            ) : null}
            {canAffection ? (
              <WrapItem>
                <Button size="xs" colorScheme="pink" variant={maxAffection ? 'solid' : 'outline'}
                  onClick={() => setMaxAffection((v) => !v)}>
                  200 Affection{unit.marriage ? ' / Married' : ''} (+1 lv)
                </Button>
              </WrapItem>
            ) : null}
          </Wrap>
        ) : null}

        {buffLv > 0 ? (
          <Text fontSize="2xs" color="gray.500" mt={2}>
            Buff/Debuff effect level +{buffLv} (effect values scale as if {buffLv} extra skill level{buffLv > 1 ? 's' : ''}).
          </Text>
        ) : null}
      </Box>

      {records.length === 0 ? (
        <Text color="gray.500" fontSize="sm">No skill data.</Text>
      ) : (
        // SkillTab renders a <TabPanel>, so it must live inside <Tabs>/<TabPanels>.
        // key on form so the inner Tabs resets its selected index when swapping forms.
        <Tabs key={form} variant="unstyled" size="sm">
          <TabList flexWrap="wrap" gap={1}>
            {records.map((s) => (
              <Tab key={s.title} p={1.5} borderRadius="md" borderBottomWidth="3px"
                borderBottomColor="transparent" opacity={0.55}
                _hover={{ opacity: 0.85, bg: 'whiteAlpha.100' }}
                _selected={{ opacity: 1, borderBottomColor: 'yellow.400', bg: 'whiteAlpha.100' }}>
                <Image src={`/images/SkillIcon/${s.img}_${s.type}.png`}
                  boxSize={['32px', '38px', '42px']} alt={s.title} />
              </Tab>
            ))}
          </TabList>
          <TabPanels>
            {records.map((s) => <SkillTab key={s.title} skill={s} atk={headerAtk} showBuffs={true} />)}
          </TabPanels>
        </Tabs>
      )}
    </VStack>
  );
}

// ── Profile tab: collection flavor (radar chart, vitals, weapons, bio) ────────
function ProfileTab({ unit }: { unit: UnitData }) {
  const p = unit.profile;
  if (!p) return <Text color="gray.500" fontSize="sm">No profile data for this unit.</Text>;
  // bio uses '&n' as line breaks; also scrub the stray replacement char the source
  // text carries (a mojibake em-dash).
  const bio = p.desc ? t(p.desc).replace(/&n/g, '\n').replace(/�/g, '—') : '';

  return (
    <SimpleGrid columns={[1, 1, 2]} spacing={4}>
      <Box borderWidth="1px" borderColor="surface.border" borderRadius="xl" bg="surface.elevated" p={4}>
        <Heading size="sm" mb={3}>Profile</Heading>
        <Center mb={2}><RadarChart values={p.chart} /></Center>
        <StatSection title="Vitals">
          {p.number ? <StatRow label="No." value={`#${p.number}`} /> : null}
          {p.height ? <StatRow label="Height" value={p.height} /> : null}
          {p.weight ? <StatRow label="Weight" value={p.weight} /> : null}
          {p.weapons.map((w, i) => <StatRow key={i} label={`Weapon ${i + 1}`} value={t(w)} />)}
          <StatRow label="Secret room" value={unit.secretRoom || '—'} />
          <StatRow label="Marriage" value={unit.marriage ? 'Available' : '—'} />
        </StatSection>
      </Box>
      {bio ? (
        <Box borderWidth="1px" borderColor="surface.border" borderRadius="xl" bg="surface.elevated" p={4}>
          <Heading size="sm" mb={3}>Background</Heading>
          <Text fontSize="sm" color="gray.300" whiteSpace="pre-wrap" lineHeight="1.6">{bio}</Text>
        </Box>
      ) : null}
    </SimpleGrid>
  );
}

// ── Info tab: favor / manufacturing + the stat calculator ────────────────────
function InfoTab({
  unit, gradeIdx, setGradeIdx, level, setLevel,
}: {
  unit: UnitData;
  gradeIdx: number;
  setGradeIdx: (i: number) => void;
  level: number;
  setLevel: (n: number) => void;
}) {
  const idx = Math.min(gradeIdx, unit.stat.length - 1);
  const st: UnitStat | undefined = unit.stat[idx];
  const grade = unit.rarity + idx;

  return (
    <SimpleGrid columns={[1, 1, 2]} spacing={4}>
      {/* Stat calculator */}
      <Box borderWidth="1px" borderColor="surface.border" borderRadius="xl" bg="surface.elevated" p={4}>
        <Heading size="sm" mb={3}>Stats</Heading>

        {/* grade selector (swap promotion level) */}
        <HStack mb={3} spacing={2} align="center">
          <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">Grade</Text>
          <ButtonGroup isAttached size="xs">
            {unit.stat.map((_, i) => {
              const g = unit.rarity + i;
              return (
                <Button key={g} variant={i === idx ? 'solid' : 'outline'}
                  bg={i === idx ? rankColor(g) : undefined}
                  color={i === idx ? 'blackAlpha.800' : rankColor(g)}
                  borderColor={rankColor(g)}
                  _hover={{ bg: i === idx ? rankColor(g) : 'whiteAlpha.100' }}
                  onClick={() => setGradeIdx(i)}>{rankTag(g)}</Button>
              );
            })}
          </ButtonGroup>
        </HStack>

        {/* level control: number input + slider */}
        <InputGroup size="sm" mb={2}>
          <InputLeftAddon bg="surface.border" color="white" borderColor="surface.border" fontWeight="700">Lv.</InputLeftAddon>
          <NumberInput value={level} min={1} max={LV_CAP} w="100%" size="sm"
            onChange={(_, n) => setLevel(Number.isFinite(n) ? n : 1)}>
            <NumberInputField borderColor="surface.border" />
            <NumberInputStepper>
              <NumberIncrementStepper color="gray.300" borderColor="surface.border" _hover={{ bg: 'whiteAlpha.200' }} />
              <NumberDecrementStepper color="gray.300" borderColor="surface.border" _hover={{ bg: 'whiteAlpha.200' }} />
            </NumberInputStepper>
          </NumberInput>
        </InputGroup>
        <Slider aria-label="level" value={Math.min(level, LV_CAP)} min={1} max={LV_CAP} mb={4}
          onChange={setLevel} focusThumbOnChange={false}>
          <SliderTrack bg="whiteAlpha.200"><SliderFilledTrack bg="yellow.400" /></SliderTrack>
          <SliderThumb boxSize={4} />
        </Slider>

        {st ? (
          <VStack align="stretch" spacing={3}>
            <StatSection title={`${rankTag(grade)} · Lv ${Math.min(level, LV_CAP)}`}>
              <StatRow icon="/images/icon_HP.png" label="HP" value={lerp(st.HP, level).toLocaleString()} />
              <StatPair
                left={{ icon: '/images/icon_ATK.png', label: 'ATK', value: lerp(st.ATK, level).toLocaleString() }}
                right={{ icon: '/images/icon_DEF.png', label: 'DEF', value: lerp(st.DEF, level).toLocaleString() }}
              />
              <StatPair
                left={{ icon: '/images/icon_ACC.png', label: 'ACC', value: st.ACC }}
                right={{ icon: '/images/icon_EVA.png', label: 'EVA', value: `${st.EVA}%` }}
              />
              <StatPair
                left={{ icon: '/images/icon_CRIT.png', label: 'CRIT', value: `${st.CRI}%` }}
                right={{ icon: '/images/icon_SPD.png', label: 'SPD', value: st.SPD }}
              />
            </StatSection>
            <StatSection title="Resist">
              <HStack justify="space-around" py={1.5} px={2}>
                <HStack spacing={1}><Image alt="fire" src="/images/fire.png" boxSize="1rem" /><Text fontSize="sm" fontWeight="600">{st.resist.fire}%</Text></HStack>
                <HStack spacing={1}><Image alt="ice" src="/images/ice.png" boxSize="1rem" /><Text fontSize="sm" fontWeight="600">{st.resist.ice}%</Text></HStack>
                <HStack spacing={1}><Image alt="electric" src="/images/electric.png" boxSize="1rem" /><Text fontSize="sm" fontWeight="600">{st.resist.lightning}%</Text></HStack>
              </HStack>
            </StatSection>
          </VStack>
        ) : (
          <Text color="gray.500" fontSize="sm">No stat data.</Text>
        )}
      </Box>

      {/* Profile column: manufacturing + favor */}
      <VStack align="stretch" spacing={4}>
        <Box borderWidth="1px" borderColor="surface.border" borderRadius="xl" bg="surface.elevated" p={4}>
          <Heading size="sm" mb={3}>Manufacturing</Heading>
          <StatSection title="Info">
            <StatRow label="Craft time" value={unit.craft ? fmtTime(unit.craft) : '—'} />
            <StatRow label="Max grade" value={rankTag(unit.maxGrade)} />
          </StatSection>
        </Box>
        <Box borderWidth="1px" borderColor="surface.border" borderRadius="xl" bg="surface.elevated" p={4}>
          <Heading size="sm" mb={3}>Equipment Slots</Heading>
          <HStack spacing={3} justify="space-around">
            {unit.equip.map((s) => (
              <VStack key={s.level} spacing={1}>
                <Box boxSize="44px" borderRadius="lg" bg="blackAlpha.400" borderWidth="1px" borderColor="surface.border"
                  display="flex" alignItems="center" justifyContent="center" p="6px">
                  {equipIcon(s.type) ? (
                    <Image src={equipIcon(s.type)!} alt={s.type} maxW="100%" maxH="100%" objectFit="contain" />
                  ) : <Text fontSize="2xs">{s.type}</Text>}
                </Box>
                <Text fontSize="2xs" color="gray.300">{s.type}</Text>
                <Text fontSize="2xs" color="gray.500">Lv {s.level}</Text>
              </VStack>
            ))}
          </HStack>
        </Box>
        <Box borderWidth="1px" borderColor="surface.border" borderRadius="xl" bg="surface.elevated" p={4}>
          <Heading size="sm" mb={3}>Favor Gain</Heading>
          <StatSection title="Per source">
            {/* assistant & gift are MULTIPLIERS (×); battle clear is a flat add (+);
                on-death is a flat subtract (−). */}
            <StatPair
              left={{ label: 'Battle clear', value: `+${unit.favor.clear}` }}
              right={{ label: 'On death', value: `−${unit.favor.death}` }}
            />
            <StatPair
              left={{ label: 'Assistant', value: `+${unit.favor.assistant}` }}
              right={{ label: 'Gift', value: `×${unit.favor.present}` }}
            />
          </StatSection>
        </Box>

        {unit.linkBonus.length > 0 || unit.fullLinkBonus.length > 0 ? (
          <Box borderWidth="1px" borderColor="surface.border" borderRadius="xl" bg="surface.elevated" p={4}>
            <Heading size="sm" mb={3}>Core Link Bonus</Heading>
            {unit.linkBonus.length > 0 ? (
              <Box mb={3}>
                <Text fontSize="xs" color="gray.500" mb={1}>
                  Per link (stacks up to 5×) — showing max at 5 links:
                </Text>
                <Wrap spacing={2}>
                  {unit.linkBonus.map((b, i) => (
                    <WrapItem key={i}>
                      <Tag colorScheme="teal" size="sm">{linkText(b, 5)}</Tag>
                    </WrapItem>
                  ))}
                </Wrap>
              </Box>
            ) : null}
            {unit.fullLinkBonus.length > 0 ? (
              <Box>
                <Text fontSize="xs" color="gray.500" mb={1}>
                  Full link (500%) — pick one:
                </Text>
                <Wrap spacing={2}>
                  {unit.fullLinkBonus.map((b, i) => (
                    <WrapItem key={i}>
                      <Tag colorScheme="purple" size="sm">{linkText(b)}</Tag>
                    </WrapItem>
                  ))}
                </Wrap>
              </Box>
            ) : null}
          </Box>
        ) : null}
      </VStack>
    </SimpleGrid>
  );
}

// ── Exclusive gear: equipment locked to this unit (via pcLimit). Tiles deep-link
// to the equipment page modal. Renders nothing when the unit has no exclusive gear.
function ExclusiveEquip({ unit, equip }: { unit: UnitData; equip: Record<string, EquipData> }) {
  const ids = unit.exclusiveEquip || [];
  if (!ids.length) return null;
  return (
    <Box borderWidth="1px" borderColor="surface.border" borderRadius="xl" bg="surface.elevated" p={4}>
      <Heading size="sm" mb={3}>Exclusive Equipment</Heading>
      <Wrap spacing={3}>
        {ids.map((eid) => {
          const e = equip[eid];
          return (
            <WrapItem key={eid}>
              <HStack as={Link} href={`/equipment?equip=${encodeURIComponent(eid)}`}
                spacing={2} borderWidth="1px" borderColor="surface.border" borderRadius="lg"
                bg="blackAlpha.300" p={2} _hover={{ bg: 'whiteAlpha.100' }}>
                <Box boxSize="40px" borderRadius="md" overflow="hidden" bg="blackAlpha.500"
                  borderWidth="2px" borderColor={e ? rankColor(e.grade) : 'surface.border'} flexShrink={0} p="3px">
                  {e?.icon ? (
                    <Image src={`/images/icons/${e.icon}.png`} alt={eid} objectFit="contain" w="100%" h="100%" />
                  ) : null}
                </Box>
                <Box minW={0}>
                  <Text fontSize="sm" noOfLines={1}>{e ? t(e.name) : eid}</Text>
                  {e ? <Text fontSize="2xs" color="gray.500">{e.slot}</Text> : null}
                </Box>
              </HStack>
            </WrapItem>
          );
        })}
      </Wrap>
    </Box>
  );
}

// ── Drop Location tab: stages that grant the unit, flagged farmable vs one-time ─
function DropTab({ unit, world }: { unit: UnitData; world: any }) {
  const entries = Object.entries(unit.source || {});
  if (entries.length === 0) {
    return <Text color="gray.500" fontSize="sm">No known drop/acquisition stages.</Text>;
  }
  return (
    <VStack align="stretch" spacing={3}>
      <Text fontSize="xs" color="gray.500">
        Most stages drop this unit repeatably (farmable). Stages marked{' '}
        <Badge colorScheme="purple">one-time</Badge> only grant it once via the clear / mission reward.
      </Text>
      {entries.map(([wid, stages]) => {
        const w = world?.[wid];
        return (
          <Box key={wid} borderWidth="1px" borderColor="surface.border" borderRadius="lg" bg="surface.elevated" p={3}>
            <Text fontWeight="bold" fontSize="sm" mb={2} color="gray.200">{w ? t(w.title) : wid}</Text>
            <Wrap spacing={2}>
              {stages.map(([zone, stage, farm], i) => (
                <WrapItem key={i}>
                  <Button as={Link} size="xs"
                    variant={farm ? 'outline' : 'solid'}
                    colorScheme={farm ? 'yellow' : 'purple'}
                    href={`/world/stage?id=${encodeURIComponent(wid)}&zone=${zone}&stage=${encodeURIComponent(stage)}`}>
                    {stage}{farm ? '' : ' ·1×'}
                  </Button>
                </WrapItem>
              ))}
            </Wrap>
          </Box>
        );
      })}
    </VStack>
  );
}

// ── Promotion tab: grade-up requirements ─────────────────────────────────────
function PromotionTab({ unit }: { unit: UnitData }) {
  if (unit.promotions.length === 0) {
    return <Text color="gray.500" fontSize="sm">This unit has no promotions.</Text>;
  }
  return (
    <Accordion allowMultiple defaultIndex={unit.promotions.map((_, i) => i)}>
      {unit.promotions.map((p) => (
        <AccordionItem key={p.to} border="1px solid" borderColor="surface.border" borderRadius="lg" mb={2} bg="surface.elevated">
          <AccordionButton>
            <HStack flex="1" spacing={3} textAlign="left">
              <RankTag grade={p.to} prefix="→ " />
              <Text fontSize="sm" color="gray.400">Lv {p.level}</Text>
              <Text fontSize="sm" color="gray.400">Favor {p.favor}</Text>
            </HStack>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={4}>
            <RewardList rewards={asRewards(p.req)} columns={[1, 2, 3]} />
          </AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

// ── Limit Break tab: level-cap unlock costs as a matrix (rows=level, cols=item) ─
function LimitBreakTab({ unit }: { unit: UnitData }) {
  const items = useAppSelector(selectItems);
  if (unit.lvLimits.length === 0) {
    return <Text color="gray.500" fontSize="sm">This unit has no level-cap unlocks.</Text>;
  }

  // column order = item ids in first-seen order across the levels; per-level + total counts.
  const cols: string[] = [];
  const totals: Record<string, number> = {};
  for (const l of unit.lvLimits) {
    for (const r of l.items) {
      if (!(r.id in totals)) { cols.push(r.id); totals[r.id] = 0; }
      totals[r.id] += r.count;
    }
  }
  const countAt = (lvItems: UnitReq[], id: string) => lvItems.find((r) => r.id === id)?.count ?? 0;
  const itemInfo = (id: string): ItemInfo | undefined => items[id];

  return (
    <Box borderWidth="1px" borderColor="surface.border" borderRadius="xl" overflow="hidden" bg="surface.elevated">
      <Box px={4} py={2} bg="blackAlpha.300" fontWeight="bold" fontSize="sm" color="gray.200">
        Limit Break <Text as="span" color="gray.500" fontWeight="normal">— materials to raise the level cap (101–{unit.lvLimits[unit.lvLimits.length - 1].level})</Text>
      </Box>
      <TableContainer>
        <Table size="sm" variant="simple">
          <Thead>
            <Tr>
              <Th position="sticky" left={0} bg="surface.elevated" zIndex={1}>Lv</Th>
              {cols.map((id) => {
                const info = itemInfo(id);
                return (
                  <Th key={id} textAlign="center">
                    <Tooltip label={info ? t(info.name) : id} hasArrow openDelay={300}>
                      <Box display="inline-flex" justifyContent="center" w="100%">
                        {info?.icon ? (
                          <Image src={`/images/icons/${info.icon}.png`} alt={info ? t(info.name) : id}
                            boxSize="28px" objectFit="contain" />
                        ) : (
                          <Text fontSize="2xs" noOfLines={2}>{id}</Text>
                        )}
                      </Box>
                    </Tooltip>
                  </Th>
                );
              })}
            </Tr>
          </Thead>
          <Tbody>
            {unit.lvLimits.map((l) => (
              <Tr key={l.level}>
                <Td position="sticky" left={0} bg="surface.elevated" fontWeight="600">{l.level}</Td>
                {cols.map((id) => {
                  const c = countAt(l.items, id);
                  return <Td key={id} isNumeric color={c ? 'gray.100' : 'gray.600'}>{c || '·'}</Td>;
                })}
              </Tr>
            ))}
          </Tbody>
          <Tfoot>
            <Tr bg="blackAlpha.400">
              <Th position="sticky" left={0} bg="blackAlpha.400" color="yellow.300">Total</Th>
              {cols.map((id) => (
                <Th key={id} isNumeric color="yellow.300">{totals[id].toLocaleString()}</Th>
              ))}
            </Tr>
          </Tfoot>
        </Table>
      </TableContainer>
    </Box>
  );
}

// seconds -> "1h 2m" / "57m" / "45s"
function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h ? `${h}h` : '', m ? `${m}m` : '', !h && s ? `${s}s` : ''].filter(Boolean).join(' ') || '0s';
}
