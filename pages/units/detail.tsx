import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { Seo } from '@/components/seo';
import Link from 'next/link';
import {
  Box, Button, ButtonGroup, Center, Flex, Heading, HStack, VStack, Text, Tag, Wrap, WrapItem,
  SimpleGrid, Spinner, Image, Badge, Tooltip,
  Table, Thead, Tbody, Tfoot, Tr, Th, Td, TableContainer,
  Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon,
  Tabs, Tab, TabList, TabPanels,
} from '@chakra-ui/react';
import {
  Breadcrumbs, PageHeader, MetaChips, MetaChip, Panel, StatRows, UrlTabs, TabPanel, tabParam, LevelControl,
  type StatItem, type TabItem,
} from '@altterisk/game-hub';
import { nextRouterAdapter } from '@altterisk/game-hub/filters';
import { nextLink } from '@/lib/hubLink';
import { ArrowBackIcon } from '@chakra-ui/icons';
import { useAppSelector, useAppDispatch } from '@/hooks';
import {
  selectUnitFull, selectUnits, selectUnitStatus, fetchUnitsAsync,
  selectUnitSkills, selectUnitSkillStatus, fetchUnitBundleAsync, EMPTY_SKILLS,
} from '@/store/unitSlice';
import { selectWorld, fetchWorldAsync } from '@/store/worldSlice';
import { selectItems, fetchItemsAsync, ItemInfo } from '@/store/itemSlice';
import { selectEquip, fetchEquipAsync, setActiveEquip } from '@/store/equipSlice';
import { selectRegion } from '@/store/regionSlice';
import { UnitData, FullUnitData, UnitReq, UnitStat, LinkBonus } from '@/interfaces/unit';
import { EquipData } from '@/interfaces/equip';
import { RewardEntry } from '@/interfaces/world';
import { Skill } from '@/interfaces/skill';
import { t, tKr, tAny } from '@/lib/strings';
import { useTranslationVersion } from '@/lib/translationVersion';
import RewardList from '@/components/rewardList';
import SkillTab from '@/components/enemyTab/skillTab';
import SkinViewer from '@/components/skinViewer';
import VoiceTab from '@/components/voiceTab';
import CopyLink from '@/components/copyLink';
import StatHeading from '@/components/statHeading';
import { rankTag, rankColor, roleRankIcon, typeIcon, roleIcon, bodyIcon, equipIcon, factionIcon, factionKey, factionName, unitDisplayName } from '@/lib/rank';
import { NPCS, NpcEntry } from '@/lib/npcs';
import { getGame, tokens } from '@altterisk/game-hub';
import type { UnitVoice } from '@/interfaces/voice';
import {
  AFFECTION_TIERS, DUB_OPTIONS, OATH_TIER, TOUCH_LOCK_MS, clipId, dubFor, entryDubs, entryForSkin, oathEntryForSkin,
  playClip, setPreferredDub, stopVoice, touchLine, useNowPlaying, usePreferredDub, useUnitVoice,
} from '@/lib/voice';
import { ControlRow, ControlSection, SegmentedControl, ToggleRow } from '@altterisk/game-hub/viewer';

// HP/ATK/DEF grow linearly from stat[grade].X[0] (lv1) to X[1]; the rest are flat.
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

// The CoreLink_Percentage_Output flag is unreliable, so key off the template text.
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
  return Math.ceil(pair[0] + (pair[1] - pair[0]) * f);
}

// Flavor grades 1..11 as a letter ladder; odd = base letter, even = '+'.
const CHART_GRADES = ['D', 'D+', 'C', 'C+', 'B', 'B+', 'A', 'A+', 'S', 'S+', 'SS'];
const chartGrade = (n: number): string => CHART_GRADES[Math.min(Math.max(n, 1), 11) - 1] ?? '—';

// `values` are the 6 chart stats in data order [ATK, ATK rate, SPD, HP, DEF, Assist].
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
        <polygon key={f} points={ring(R * f)} fill="none" stroke={tokens.color.border} strokeWidth={1} />
      ))}
      {AXES.map((_, i) => {
        const [x, y] = pt(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={tokens.color.border} strokeWidth={1} />;
      })}
      {/* value polygon */}
      <polygon points={poly} fill={`${getGame('lo').accent}73`} stroke={getGame('lo').accent} strokeWidth={2} />
      {/* axis labels + grade */}
      {AXES.map(([idx, label], i) => {
        const [x, y] = pt(i, R + 26);
        return (
          <g key={label}>
            <text x={x} y={y - 5} fill={tokens.color.textMuted} fontSize={10} textAnchor="middle">{label}</text>
            <text x={x} y={y + 8} fill="#fff" fontSize={13} fontWeight="bold" textAnchor="middle">
              {chartGrade(values[idx] ?? 0)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// `value` is the raw fraction (0.15 = +15% skill power); 0 when the unit has none.
function fullLinkSkillPower(unit: FullUnitData): number {
  const b = unit.fullLinkBonus.find((x) => t(x.desc).toLowerCase().includes('skill power'));
  return b ? b.value : 0;
}

// The Buff/Debuff-Effect-Lv full-link option grants +2 buff/debuff levels.
function hasFullLinkBuffLv(unit: FullUnitData): boolean {
  return unit.fullLinkBonus.some((x) => /buff\/debuff effect lv/i.test(t(x.desc)));
}

// Scaling rules (spAdd is flat, buffLv moves values only): .ai/knowledge/schemas.md
function scaleSkill(skill: Skill, skillLv: number, spAdd: number, buffLv: number): Skill {
  const lv = Math.min(Math.max(skillLv, 1), 10);
  const rate = skill.rate + (skill.rateGain ?? 0) * (lv - 1) + spAdd;

  // apply the last levelChange whose level <= lv (AP / AoE shift).
  let AP = skill.AP, cooldown = skill.cooldown, area = skill.area, center = skill.center;
  for (const c of skill.levelChanges ?? []) {
    if (c.level > lv) break;
    if (c.ap != null) AP = c.ap;
    if (c.cd != null) cooldown = c.cd;
    if (c.area) { area = c.area; center = c.center ?? center; }
  }

  // Only the buff VALUE scales with effLv; turns and AoE do not.
  const effLv = lv + buffLv;
  const buffs = skill.buffs.map((b) => {
    const val = b.vals
      ? b.vals[Math.min(lv - 1, b.vals.length - 1)]
      : Math.round((b.val + b.gain * (effLv - 1)) * 10000) / 10000;
    return { ...b, val, vals: undefined };
  });

  return { ...skill, rate: Math.round(rate * 10000) / 10000, AP, cooldown, area, center, buffs };
}

export default function UnitDetail() {
  useTranslationVersion();
  const router = useRouter();
  const id = router.query.id as string;
  const dispatch = useAppDispatch();

  // Detail fields (stat/promotions) are absent until the heavy bundle loads.
  const unit = useAppSelector((s) => (id ? selectUnitFull(s, id) : null));
  const units = useAppSelector(selectUnits);
  const status = useAppSelector(selectUnitStatus);
  const world = useAppSelector(selectWorld);
  const equip = useAppSelector(selectEquip);
  const skills = useAppSelector((s) => (id ? selectUnitSkills(s, id) : EMPTY_SKILLS));
  const skillStatus = useAppSelector((s) => (id ? selectUnitSkillStatus(s, id) : 'idle'));
  const region = useAppSelector(selectRegion);
  const { voice, loaded: voiceLoaded } = useUnitVoice(region, id);
  // The heavy detail half rides in the same bundle as skills.
  const detailLoaded = !!unit?.stat;
  // Keeps the page rendered across a region switch, so the tab index survives.
  const lastFullRef = useRef<FullUnitData | null>(null);
  const lastSkillsRef = useRef<{ [key: string]: Skill }>({});
  if (detailLoaded && unit) {
    lastFullRef.current = unit as FullUnitData;
    if (Object.keys(skills).length > 0) lastSkillsRef.current = skills;
  }

  // calculator state: selected grade (index into unit.stat) + level.
  const [gradeIdx, setGradeIdx] = useState(0);
  const [level, setLevel] = useState(LV_CAP);

  useEffect(() => { dispatch(fetchUnitsAsync()); }, [dispatch]);
  // _app auto-fetches on region CHANGE only, so a direct URL load needs these.
  useEffect(() => { dispatch(fetchItemsAsync()); }, [dispatch]);
  useEffect(() => { dispatch(fetchWorldAsync()); }, [dispatch]);
  const hasExclusive = !!unit?.exclusiveEquip?.length;
  useEffect(() => { if (hasExclusive) dispatch(fetchEquipAsync()); }, [hasExclusive, dispatch]);
  // `region` is required: setRegion wipes the bundles while `id` stays the same.
  useEffect(() => { if (id) dispatch(fetchUnitBundleAsync(id)); }, [id, region, dispatch]);
  // when the bundle (stats) loads or the unit changes, default to its top grade.
  useEffect(() => {
    if (unit?.stat) setGradeIdx(unit.stat.length - 1);
  }, [unit?.id, detailLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Prefer the collection profile's English name over the unit name loc id.
  const name = unitDisplayName(unit);
  // Top-grade ATK at lv-cap, for SkillTab's damage preview; absent until loaded.
  const topStat = unit.stat?.[unit.stat.length - 1];
  const headerAtk = topStat ? topStat.ATK[1] : 0;

  return (
    <>
      <Seo title={name} description={`${name}: Last Origin unit stats, skills and skins.`}
        image={unit.icon ? `/images/icons/${unit.icon}.png` : null} />
      <VStack align="stretch" spacing={4} py={4}>
        <Breadcrumbs renderLink={nextLink} items={[{ label: 'Units', href: '/units' }, { label: name }]} />

        <PageHeader
          art={
            <Box boxSize="96px" borderRadius="lg" overflow="hidden" bg="blackAlpha.500">
              {unit.icon ? (
                <Image src={`/images/icons/${unit.icon}.png`} alt={unit.icon} objectFit="cover" w="100%" h="100%" />
              ) : null}
            </Box>
          }
          title={name}
          id={unit.id}
          badges={roleRankIcon(unit.role, unit.rarity) ? (
            <Image src={`/images/icons/${roleRankIcon(unit.role, unit.rarity)}.png`}
              alt={`${rankTag(unit.rarity)} ${unit.role}`} h="40px" objectFit="contain" alignSelf="center" />
          ) : (
            <RankTag grade={unit.rarity} />
          )}
          actions={<CopyLink path={`/units/detail?id=${encodeURIComponent(unit.id)}`} />}
          meta={
            <MetaChips>
              <MetaChip renderLink={nextLink} href={`/units?role=${encodeURIComponent(unit.role)}`} value={unit.role}
                icon={roleIcon(unit.role) ? <Image src={roleIcon(unit.role)!} alt="" /> : undefined} />
              <MetaChip renderLink={nextLink} href={`/units?type=${encodeURIComponent(unit.type)}`} value={unit.type}
                icon={typeIcon(unit.type) ? <Image src={typeIcon(unit.type)!} alt="" /> : undefined} />
              {unit.body ? (
                <MetaChip renderLink={nextLink} href={`/units?body=${encodeURIComponent(unit.body)}`} value={unit.body}
                  icon={bodyIcon(unit.body) ? <Image src={bodyIcon(unit.body)!} alt="" /> : undefined} />
              ) : null}
              {unit.faction ? (
                <MetaChip renderLink={nextLink} href={`/units?faction=${encodeURIComponent(factionKey(unit.faction.icon))}`}
                  value={factionName(unit.faction.name)}
                  icon={factionIcon(unit.faction.icon) ? <Image src={factionIcon(unit.faction.icon)!} alt="" /> : undefined} />
              ) : null}
            </MetaChips>
          }
        />
        {(!detailLoaded && !lastFullRef.current) ? (
          <Center py={20}><Spinner color="accent.400" /></Center>
        ) : (() => {
        // Fall back to last-known during a region switch, so the tabs stay mounted.
        const full = (detailLoaded ? unit : lastFullRef.current) as FullUnitData;
        const tabs: TabItem[] = [
          { id: 'stats', label: 'Stats' },
          { id: 'skills', label: 'Skills', hidden: !full.skills?.length },
          { id: 'profile', label: 'Profile', hidden: !full.profile },
          { id: 'drops', label: 'Drop Location', hidden: !Object.keys(full.source || {}).length },
          { id: 'promotion', label: 'Promotion', hidden: !full.promotions.length },
          { id: 'limit-break', label: 'Limit Break', hidden: !full.lvLimits.length },
          { id: 'skin', label: 'Skin', hidden: !full.skins?.length },
          { id: 'voice', label: 'Voice', hidden: voiceLoaded && !voice },
        ];
        const [tab, setTab] = tabParam(nextRouterAdapter(router), tabs);
        return (
          <Box>
            <UrlTabs tabs={tabs} active={tab} onChange={setTab} label="Unit sections" idBase="unit" />
            <TabPanel tab={tab} idBase="unit">
              {tab === 'stats' ? (
                <VStack align="stretch" spacing={4}>
                  <ExclusiveEquip unit={full} equip={equip} />
                  <InfoTab unit={full} gradeIdx={gradeIdx} setGradeIdx={setGradeIdx}
                    level={level} setLevel={setLevel} />
                </VStack>
              ) : tab === 'skills' ? (
                <SkillsTab unit={full} skills={detailLoaded ? skills : lastSkillsRef.current} headerAtk={headerAtk} skillStatus={skillStatus} />
              ) : tab === 'profile' ? (
                <ProfileTab unit={full} />
              ) : tab === 'drops' ? (
                <DropTab unit={full} world={world} />
              ) : tab === 'promotion' ? (
                <PromotionTab unit={full} />
              ) : tab === 'limit-break' ? (
                <LimitBreakTab unit={full} />
              ) : tab === 'voice' ? (
                voice ? <VoiceTab unit={full} voice={voice} /> : <Center py={10}><Spinner color="accent.400" /></Center>
              ) : (
                <SkinTab unit={full} voice={voice} />
              )}
            </TabPanel>
          </Box>
        );
        })()}
        <FactionSection unit={unit} units={Object.values(units)} />
        <LoreGroupsSection unit={unit} units={Object.values(units)} />
      </VStack>
    </>
  );
}

// Preserve the game's named squads (max five members) instead of flattening them.
function FactionSection({ unit, units }: { unit: UnitData; units: UnitData[] }) {
  if (!unit.faction) return null;

  const factionUnits = units.filter((candidate) => candidate.faction?.icon === unit.faction?.icon);
  const squads = new Map<string, UnitData[]>();
  for (const member of factionUnits) {
    if (!member.faction) continue;
    const members = squads.get(member.faction.name) || [];
    members.push(member);
    squads.set(member.faction.name, members);
  }
  if (squads.size === 0) return null;

  const title = factionName(factionUnits[0]?.faction?.name || unit.faction.name);

  return (
    <Box borderWidth="1px" borderColor="surface.border" borderRadius="xl" bg="surface.elevated" overflow="hidden">
      <HStack px={4} py={3} bg="blackAlpha.300" borderBottomWidth="1px" borderBottomColor="surface.border">
        {factionIcon(unit.faction.icon) ? (
          <Image src={factionIcon(unit.faction.icon)!} alt={title} boxSize="30px" />
        ) : null}
        <Box>
          <Text fontSize="2xs" color="gray.500" fontWeight="bold" textTransform="uppercase" letterSpacing="wide">
            Faction
          </Text>
          <Heading size="sm">{title}</Heading>
        </Box>
      </HStack>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} p={4} alignItems="start">
        {Array.from(squads, ([squadName, members]) => ({ squadName, members })).map(({ squadName, members }) => (
          <Box key={squadName} borderWidth="1px" borderColor="surface.border" borderRadius="lg"
            bg="blackAlpha.200" p={3} minW={0}>
            <HStack mb={2} minH="20px">
              <Heading as="h3" size="xs" color="blue.200">{t(squadName)}</Heading>
              <Badge colorScheme="blue" borderRadius="full">{members.length}/5</Badge>
            </HStack>
            {/* Every squad owns one five-slot row, even when fewer slots are filled. */}
            <UnitMemberGrid currentUnit={unit} members={members} />
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}

// Lore groups overlap official factions and deliberately have no faction icon.
// Squad 21 comes from Table_PC's Is21Squad; the rest are curated from skill targets.
function LoreGroupsSection({ unit, units }: { unit: UnitData; units: UnitData[] }) {
  const groups = unit.loreGroups || [];
  if (groups.length === 0) return null;

  return (
    <Box borderWidth="1px" borderColor="surface.border" borderRadius="xl" bg="surface.elevated" overflow="hidden">
      <Box px={4} py={3} bg="blackAlpha.300" borderBottomWidth="1px" borderBottomColor="surface.border">
        <Text fontSize="2xs" color="gray.500" fontWeight="bold" textTransform="uppercase" letterSpacing="wide">
          Story &amp; skill affiliations
        </Text>
        <Heading size="sm">Lore Groups</Heading>
      </Box>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} p={4} alignItems="start">
        {groups.map((group) => {
          const members = units.filter((candidate) =>
            candidate.loreGroups?.some((candidateGroup) => candidateGroup.key === group.key));
          const npcMembers = NPCS.filter((candidate) => candidate.loreGroups?.includes(group.key));
          return (
            <Box key={group.key} borderWidth="1px" borderColor="surface.border" borderRadius="lg"
              bg="blackAlpha.200" p={3} minW={0}>
              <HStack mb={2} minH="20px">
                <Heading as="h3" size="xs" color="purple.200">{group.name}</Heading>
                <Badge colorScheme="purple" borderRadius="full">{members.length + npcMembers.length}</Badge>
              </HStack>
              <LoreMemberGrid currentUnit={unit} members={members} npcMembers={npcMembers} />
            </Box>
          );
        })}
      </SimpleGrid>
    </Box>
  );
}

function LoreMemberGrid({ currentUnit, members, npcMembers }: {
  currentUnit: UnitData;
  members: UnitData[];
  npcMembers: NpcEntry[];
}) {
  return (
    <SimpleGrid columns={5} spacing={{ base: 1, sm: 2 }} maxW="420px">
      {members.map((member) => (
        <UnitMemberCard key={member.id} currentUnit={currentUnit} member={member} />
      ))}
      {npcMembers.map((member) => {
        const memberName = t(member.name);
        return (
          <Link key={member.id} href={`/npcs?id=${encodeURIComponent(member.id)}`}
            aria-label={`View ${memberName}`}>
            <Box borderWidth="1px" borderColor="surface.border" borderRadius="lg"
              bg="blackAlpha.300" overflow="hidden" role="group"
              transition="border-color .12s ease, transform .12s ease"
              _hover={{ borderColor: 'accent.400', transform: 'translateY(-2px)' }}>
              <Box position="relative" w="100%" pt="100%" bg="blackAlpha.500">
                <Image src={member.thumbnail} alt={memberName} position="absolute" inset={0}
                  objectFit="cover" w="100%" h="100%" />
                <Badge position="absolute" top={1} right={1} colorScheme="purple" fontSize="8px">NPC</Badge>
              </Box>
              <Text px={1} py={1} fontSize="2xs" fontWeight="semibold" textAlign="center" noOfLines={2}
                color="gray.200">{memberName}</Text>
            </Box>
          </Link>
        );
      })}
    </SimpleGrid>
  );
}

// Fixed five-column rows; more than five members wrap into another five-slot row.
function UnitMemberGrid({ currentUnit, members }: { currentUnit: UnitData; members: UnitData[] }) {
  return (
    <SimpleGrid columns={5} spacing={{ base: 1, sm: 2 }} maxW="420px">
      {members.map((member) => <UnitMemberCard key={member.id} currentUnit={currentUnit} member={member} />)}
    </SimpleGrid>
  );
}

function UnitMemberCard({ currentUnit, member }: { currentUnit: UnitData; member: UnitData }) {
  const memberName = unitDisplayName(member);
  const current = member.id === currentUnit.id;
  const card = (
    <Box borderWidth="1px" borderColor={current ? 'accent.400' : 'surface.border'} borderRadius="lg"
      bg={current ? 'var(--hub-accent-soft)' : 'blackAlpha.300'} overflow="hidden" role="group"
      transition="border-color .12s ease, transform .12s ease"
      _hover={current ? undefined : { borderColor: 'accent.400', transform: 'translateY(-2px)' }}>
      <Box position="relative" w="100%" pt="100%" bg="blackAlpha.500">
        {member.icon ? (
          <Image src={`/images/icons/${member.icon}.png`} alt={memberName}
            position="absolute" inset={0} objectFit="cover" w="100%" h="100%" />
        ) : null}
      </Box>
      <Text px={1} py={1} fontSize="2xs" fontWeight="semibold" textAlign="center" noOfLines={2}
        color={current ? 'accent.200' : 'gray.200'}>{memberName}</Text>
    </Box>
  );
  return current ? <Box>{card}</Box> : (
    <Link href={`/units/detail?id=${encodeURIComponent(member.id)}`} aria-label={`View ${memberName}`}>{card}</Link>
  );
}

// ── Skills tab: level / full-link power / affection controls + per-skill subtabs
function SkillsTab({
  unit, skills, headerAtk, skillStatus,
}: {
  unit: FullUnitData;
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
    return <Center py={8}><Spinner color="accent.400" /></Center>;
  }

  return (
    <VStack align="stretch" spacing={3}>
      {/* control group */}
      <Box borderWidth="1px" borderColor="surface.border" borderRadius="xl" bg="surface.elevated" p={4}>
        <Flex gap={4} wrap="wrap" align="center">
          {hasAltForm ? (
            <ButtonGroup isAttached size="sm">
              <Button colorScheme="accent" variant={form === 0 ? 'solid' : 'outline'} onClick={() => setForm(0)}>Form 1</Button>
              <Button colorScheme="accent" variant={form === 1 ? 'solid' : 'outline'} onClick={() => setForm(1)}>Form 2</Button>
            </ButtonGroup>
          ) : null}

          {/* skill level */}
          <HStack spacing={2} minW="200px" flex="1">
            <LevelControl label="Skill level" value={level} min={1} max={10} onChange={setLevel} />
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
        // SkillTab renders a <TabPanel>, so it must live inside <Tabs>/<TabPanels>;
        // `key` on form resets the inner Tabs index when swapping forms.
        <Tabs key={form} variant="unstyled" size="sm">
          <TabList flexWrap="wrap" gap={1}>
            {records.map((s) => (
              <Tab key={s.title} p={1.5} borderRadius="md" borderBottomWidth="3px"
                borderBottomColor="transparent" opacity={0.55}
                _hover={{ opacity: 0.85, bg: 'whiteAlpha.100' }}
                _selected={{ opacity: 1, borderBottomColor: 'accent.400', bg: 'whiteAlpha.100' }}>
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
function ProfileTab({ unit }: { unit: FullUnitData }) {
  const p = unit.profile;
  if (!p) return <Text color="gray.500" fontSize="sm">No profile data for this unit.</Text>;
  // bio uses '&n' for line breaks and carries a mojibake em-dash.
  const bio = p.desc ? t(p.desc).replace(/&n/g, '\n').replace(/�/g, '—') : '';

  const vitals: StatItem[] = [];
  if (p.number) vitals.push({ label: 'No.', value: String(p.number).padStart(3, '0') });
  if (p.height) vitals.push({ label: 'Height', value: p.height });
  if (p.weight) vitals.push({ label: 'Weight', value: p.weight });
  p.weapons.forEach((w, i) => vitals.push({ label: `Weapon ${i + 1}`, value: t(w) }));
  vitals.push({ label: 'Secret room', value: unit.secretRoom || '—' });
  vitals.push({ label: 'Marriage', value: unit.marriage ? 'Available' : '—' });

  return (
    <SimpleGrid columns={[1, 1, 2]} spacing={4} alignItems="start">
      <Panel title="Profile">
        <Center mb={2}><RadarChart values={p.chart} /></Center>
        <StatRows rows={vitals} columns={1} />
      </Panel>
      {bio ? (
        <Panel title="Introduction">
          <Text fontSize="sm" color="gray.300" whiteSpace="pre-wrap" lineHeight="1.6">{bio}</Text>
        </Panel>
      ) : null}
    </SimpleGrid>
  );
}

// ── Info tab: favor / manufacturing + the stat calculator ────────────────────
function InfoTab({
  unit, gradeIdx, setGradeIdx, level, setLevel,
}: {
  unit: FullUnitData;
  gradeIdx: number;
  setGradeIdx: (i: number) => void;
  level: number;
  setLevel: (n: number) => void;
}) {
  const idx = Math.min(gradeIdx, unit.stat.length - 1);
  const st: UnitStat | undefined = unit.stat[idx];
  const grade = unit.rarity + idx;

  return (
    <SimpleGrid columns={[1, 1, 2]} spacing={4} alignItems="start">
      <Panel title="Stats">
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

        <Box mb={4}>
          <LevelControl label="Level" value={Math.min(level, LV_CAP)} min={1} max={LV_CAP} onChange={setLevel} />
        </Box>

        {st ? (
          <VStack align="stretch" spacing={3}>
            <StatHeading>{`${rankTag(grade)} · Lv ${Math.min(level, LV_CAP)}`}</StatHeading>
            <StatRows rows={[
              { label: 'HP', value: lerp(st.HP, level).toLocaleString(), icon: statIcon('/images/icon_HP.png', 'HP') },
              { label: 'SPD', value: st.SPD, icon: statIcon('/images/icon_SPD.png', 'SPD') },
              { label: 'ATK', value: lerp(st.ATK, level).toLocaleString(), icon: statIcon('/images/icon_ATK.png', 'ATK') },
              { label: 'DEF', value: lerp(st.DEF, level).toLocaleString(), icon: statIcon('/images/icon_DEF.png', 'DEF') },
              { label: 'ACC', value: st.ACC, icon: statIcon('/images/icon_ACC.png', 'ACC') },
              { label: 'EVA', value: `${st.EVA}%`, icon: statIcon('/images/icon_EVA.png', 'EVA') },
              { label: 'CRIT', value: `${st.CRI}%`, icon: statIcon('/images/icon_CRIT.png', 'CRIT') },
            ]} />
            <StatHeading>Resist</StatHeading>
            <StatRows columns={3} rows={[
              { label: 'Fire', value: `${st.resist.fire}%`, icon: statIcon('/images/fire.png', 'fire') },
              { label: 'Ice', value: `${st.resist.ice}%`, icon: statIcon('/images/ice.png', 'ice') },
              { label: 'Electric', value: `${st.resist.lightning}%`, icon: statIcon('/images/electric.png', 'electric') },
            ]} />
          </VStack>
        ) : (
          <Text color="gray.500" fontSize="sm">No stat data.</Text>
        )}
      </Panel>

      {/* Profile column: manufacturing + favor */}
      <VStack align="stretch" spacing={4}>
        <Panel title="Manufacturing">
          <StatRows columns={1} rows={[
            { label: 'Craft time', value: unit.craft ? fmtTime(unit.craft) : '—' },
            { label: 'Max grade', value: rankTag(unit.maxGrade) },
          ]} />
        </Panel>
        <Panel title="Equipment Slots">
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
        </Panel>
        <Panel title="Favor Gain">
          <StatRows rows={[
            { label: 'Battle clear', value: `+${unit.favor.clear}` },
            { label: 'On death', value: `−${unit.favor.death}` },
            { label: 'Assistant', value: `+${unit.favor.assistant}` },
            { label: 'Gift', value: `×${unit.favor.present}` },
          ]} />
        </Panel>

        {unit.linkBonus.length > 0 || unit.fullLinkBonus.length > 0 ? (
          <Panel title="Core Link Bonus">
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
          </Panel>
        ) : null}
      </VStack>
    </SimpleGrid>
  );
}

const statIcon = (src: string, alt: string) => <Image src={src} alt={alt} />;

// ── Exclusive gear: equipment locked to this unit via pcLimit ────────────────
function ExclusiveEquip({ unit, equip }: { unit: UnitData; equip: Record<string, EquipData> }) {
  const dispatch = useAppDispatch();
  const ids = unit.exclusiveEquip || [];
  if (!ids.length) return null;
  return (
    <Panel title="Exclusive Equipment">
      <Wrap spacing={3} justify="center">
        {ids.map((eid) => {
          const e = equip[eid];
          return (
            <WrapItem key={eid}>
              <HStack onClick={() => dispatch(setActiveEquip(eid))} cursor="pointer"
                spacing={3} minW="220px" borderWidth="1px" borderColor="surface.border" borderRadius="lg"
                bg="blackAlpha.300" p={2.5} _hover={{ bg: 'whiteAlpha.100' }}>
                <Box boxSize="56px" borderRadius="md" overflow="hidden" bg="blackAlpha.500"
                  borderWidth="2px" borderColor={e ? rankColor(e.grade) : 'surface.border'} flexShrink={0} p="3px">
                  {e?.icon ? (
                    <Image src={`/images/icons/${e.icon}.png`} alt={eid} objectFit="contain" w="100%" h="100%" />
                  ) : null}
                </Box>
                <Box minW={0}>
                  <Text fontSize="sm" noOfLines={2}>{e ? t(e.name) : eid}</Text>
                  {e ? <Text fontSize="2xs" color="gray.500">{e.slot}</Text> : null}
                </Box>
              </HStack>
            </WrapItem>
          );
        })}
      </Wrap>
    </Panel>
  );
}

// ── Drop Location tab: stages that grant the unit, flagged farmable vs one-time ─
function DropTab({ unit, world }: { unit: FullUnitData; world: any }) {
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
function PromotionTab({ unit }: { unit: FullUnitData }) {
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
function LimitBreakTab({ unit }: { unit: FullUnitData }) {
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
              <Th position="sticky" left={0} bg="blackAlpha.400" color="accent.300">Total</Th>
              {cols.map((id) => (
                <Th key={id} isNumeric color="accent.300">{totals[id].toLocaleString()}</Th>
              ))}
            </Tr>
          </Tfoot>
        </Table>
      </TableContainer>
    </Box>
  );
}

function skinFaceIcon(faceKey: string): string {
  return `/images/icons/${faceKey.replace(/^CharFace_/, 'FormationIcon_')}.png`;
}


// ── Skin tab: pick a skin, render it through the shared viewer ──────────────
function SkinTab({ unit, voice }: { unit: FullUnitData; voice: UnitVoice | null }) {
  useTranslationVersion();
  const region = useAppSelector(selectRegion);
  const skins = unit.skins || [];
  const [idx, setIdx] = useState(0);
  const [showDam, setShowDam] = useState(false);
  useEffect(() => { setShowDam(false); }, [idx]);
  const skin = skins[idx];

  const preferredDub = usePreferredDub();
  const [tier, setTier] = useState('1');
  const normalEntry = skin ? entryForSkin(voice, skin.key) : null;
  const oathEntry = skin ? oathEntryForSkin(voice, skin.key) : null;
  const oathMode = tier === OATH_TIER && !!oathEntry;
  const entry = oathMode ? oathEntry : normalEntry;
  const dub = dubFor(entry, preferredDub);
  const voiced = (e: typeof entry) => !!(e?.tiers?.some((l) => l.length) || e?.special?.some((l) => l.length));
  const touchVoiced = !!dub && voiced(entry);
  const tierOptions = [...AFFECTION_TIERS, ...(voiced(oathEntry) ? [{ value: OATH_TIER, label: 'Oath' }] : [])];
  const [voiceOn, setVoiceOn] = useState(true);
  const [married, setMarried] = useState(false);
  const lastTouchRef = useRef(0);
  const [subtitle, setSubtitle] = useState<{ id: string; text: string } | null>(null);
  const nowPlaying = useNowPlaying();
  useEffect(() => {
    setSubtitle(null);
    stopVoice();
  }, [idx]);
  useEffect(() => () => stopVoice(), []);
  const onTouch = (zone: string) => {
    if (!voiceOn || !entry || !dub) return;
    const now = Date.now();
    if (now - lastTouchRef.current < TOUCH_LOCK_MS) return;
    const line = touchLine(entry, zone, oathMode ? 1 : Number(tier), married && !oathMode);
    if (!line) return;
    lastTouchRef.current = now;
    const text = t(line[0]);
    setSubtitle({ id: clipId(dub, line[1]), text: text && text !== line[0] ? text.replace(/&n/g, '\n') : '' });
    void playClip(entry, dub, line[1]);
  };

  if (skins.length === 0) {
    return <Text color="gray.500" fontSize="sm">No skin data for this unit.</Text>;
  }

  const hasDam = !!(skin.modelDam);
  const baseAsset = (skin.model || '').toLowerCase();
  const damAsset = (skin.modelDam || '').toLowerCase();
  const asset = (showDam && hasDam ? damAsset : baseAsset);
  // Both engines take the bare asset name: skinned variants are handled by Unity,
  // fixed/spine variants are embedded in the single archive.
  const isSkinnedBase = skin.viewerKind === 'skinned' && !(showDam && hasDam);
  const diverged = showDam && hasDam ? (skin as any).modelDamDiverged : (skin as any).modelDiverged;
  const archiveKey = diverged ? `${asset}__${region}` : asset;
  const effectiveViewerKind = isSkinnedBase ? 'skinned' : skin.viewerKind === 'skinned' ? undefined : skin.viewerKind;

  return (
    <VStack align="stretch" spacing={4}>
      {/* Skin picker: horizontal scrollable card row */}
      <Box overflowX="auto" pb={1}>
        <HStack spacing={3} align="stretch" minW="max-content">
          {skins.map((s, i) => {
            const selected = i === idx;
            const iconSrc = s.faceKey ? skinFaceIcon(s.faceKey) : null;
            return (
              <Box
                key={s.key || 'base'}
                as="button"
                onClick={() => setIdx(i)}
                borderWidth={2}
                borderColor={selected ? 'accent.400' : 'gray.600'}
                borderRadius="md"
                bg={selected ? 'whiteAlpha.100' : 'transparent'}
                p={2}
                textAlign="center"
                minW="100px"
                maxW="120px"
                cursor="pointer"
                _hover={{ borderColor: 'accent.300' }}
                transition="border-color 0.15s"
              >
                {iconSrc && (
                  <Image
                    src={iconSrc}
                    alt={t(s.name || s.packName || s.itemName) || s.key || 'Base'}
                    boxSize="80px"
                    objectFit="contain"
                    mx="auto"
                    mb={1}
                    borderRadius="sm"
                  />
                )}
                <Text fontSize="xs" fontWeight={selected ? 'bold' : 'normal'} noOfLines={2} lineHeight="1.3">
                  {s.key === '' ? 'Default' : t(s.name || s.packName || s.itemName) || s.key}
                </Text>

                <Box mt={1}>
                  {s.price != null ? (
                    <HStack spacing={1} justify="center">
                      <Image src="/images/icons/UI_Icon_Currency_Tuna.png" boxSize="14px" alt="tuna" />
                      <Text fontSize="xs" color="yellow.300" fontWeight="bold">{s.price}</Text>
                    </HStack>
                  ) : s.key === '' ? (
                    <Badge colorScheme="green" fontSize="2xs">Default</Badge>
                  ) : (
                    <Badge colorScheme="red" fontSize="2xs">Not For Sale</Badge>
                  )}
                </Box>
              </Box>
            );
          })}
        </HStack>
      </Box>

      {/* Skin info table */}
      {skin.key !== '' && (
        <Box borderWidth={1} borderColor="whiteAlpha.200" borderRadius="md" overflow="hidden" fontSize="sm">
          <Table size="sm" variant="simple">
            <Tbody>
              {skin.itemName && (
                <Tr>
                  <Td fontWeight="semibold" color="gray.400" w="90px" whiteSpace="nowrap">Name</Td>
                  <Td>{t(skin.itemName) || skin.key}</Td>
                </Tr>
              )}
              {!skin.itemName && (
                <Tr>
                  <Td fontWeight="semibold" color="gray.400" w="90px" whiteSpace="nowrap">Name</Td>
                  <Td>{t(skin.name) || skin.key}</Td>
                </Tr>
              )}
              {skin.packName && t(skin.packName) !== t(skin.itemName) && (
                <Tr>
                  <Td fontWeight="semibold" color="gray.400" whiteSpace="nowrap">Pack</Td>
                  <Td>{t(skin.packName)}</Td>
                </Tr>
              )}
              {skin.desc && (
                <Tr>
                  <Td fontWeight="semibold" color="gray.400" verticalAlign="top">Description</Td>
                  <Td whiteSpace="pre-wrap">{t(skin.desc)}</Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </Box>
      )}

      {/* Viewer */}
      {!asset ? (
        <Text color="gray.500" fontSize="sm">This skin has no model data.</Text>
      ) : !skin.viewerKind ? (
        <Text color="gray.500" fontSize="sm">Not processed yet.</Text>
      ) : (
        <Box position="relative">
          <SkinViewer
            key={isSkinnedBase ? asset : archiveKey}
            skin={isSkinnedBase ? asset : archiveKey}
            height="60vh"
            parts={skin.parts}
            hasDam={hasDam}
            showDam={showDam}
            onToggleDam={() => setShowDam((v) => !v)}
            viewerKind={effectiveViewerKind}
            hasRplus={(skin as any).hasRplus}
            hasBg={(skin as any).bgUse}
            onTouch={touchVoiced ? onTouch : undefined}
            touchZones={voice?.zones?.[asset]}
            stageOverlay={subtitle?.text && nowPlaying === subtitle.id ? (
              <Box position="absolute" bottom={3} left="50%" transform="translateX(-50%)" w="max-content" maxW="90%"
                bg="blackAlpha.800" borderRadius="md" px={3} py={2} pointerEvents="none" zIndex={2}>
                <Text fontSize="sm" whiteSpace="pre-wrap" textAlign="center">{subtitle.text}</Text>
              </Box>
            ) : null}
            extraPanel={voiced(normalEntry) || voiced(oathEntry) ? (
              <ControlSection title="Voice">
                <ToggleRow label="On touch" value={voiceOn}
                  onChange={(on) => { setVoiceOn(on); if (!on) stopVoice(); }} />
                {entryDubs(entry).length > 1 && (
                  <ControlRow label="Language">
                    <SegmentedControl value={dub!} ariaLabel="Voice language"
                      options={DUB_OPTIONS.filter((o) => entryDubs(entry).includes(o.value))}
                      onChange={(d) => { stopVoice(); setPreferredDub(d); }} />
                  </ControlRow>
                )}
                <ControlRow label="Affection">
                  <SegmentedControl value={tier} ariaLabel="Affection" onChange={(v) => { stopVoice(); setTier(v); }}
                    options={tierOptions} />
                </ControlRow>
                {!oathMode && (normalEntry?.oath?.length ?? 0) > 0 && (
                  <ToggleRow label="Married" value={married} onChange={setMarried} />
                )}
              </ControlSection>
            ) : null}
          />
        </Box>
      )}
    </VStack>
  );
}

// seconds -> "1h 2m" / "57m" / "45s"
function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h ? `${h}h` : '', m ? `${m}m` : '', !h && s ? `${s}s` : ''].filter(Boolean).join(' ') || '0s';
}
