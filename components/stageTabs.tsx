import {
  Box, HStack, VStack, Text, Image, Center, IconButton, SimpleGrid,
  Tabs, TabList, Tab, TabPanels, TabPanel, Tag, Divider, Link,
} from '@chakra-ui/react';
import { ArrowLeftIcon, ArrowRightIcon, StarIcon } from '@chakra-ui/icons';
import { Stage, WaveDrop, RewardEntry, StageMission } from '@/interfaces/world';
import { t } from '@/lib/strings';
import { unitDisplayName } from '@/lib/rank';
import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectUnits } from '@/store/unitSlice';
import { selectEnemy, setActive, fetchEnemyAsync } from '@/store/enemySlice';
import EnemyGrid from '@/components/enemyGrid';
import UnitHoverCard from '@/components/unitHoverCard';
import { RewardPanel } from '@/components/rewardList';
import styles from '@/styles/custom.module.css';

// A titled panel card matching the reference layout (header strip + body).
function Panel({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <Box borderWidth="1px" borderColor="surface.border" borderRadius="xl" overflow="hidden" bg="surface.elevated">
      {/* title wrapper is a div (not Text/<p>) so JSX titles with block content
          like an icon HStack nest validly. */}
      <Box px={4} py={2} bg="blackAlpha.300" borderBottomWidth="1px" borderBottomColor="surface.border"
        fontSize="sm" fontWeight="bold" color="gray.200">
        {title}
      </Box>
      <Box p={3}>{children}</Box>
    </Box>
  );
}

// seconds -> "1h 45m" / "45m" / "30s"
function fmtTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h ? `${h}h` : '', m ? `${m}m` : '', !h && !m ? `${sec}s` : ''].filter(Boolean).join(' ');
}

export default function StageTabs({
  stage, currWave, setCurrWave,
}: {
  stage: Stage;
  currWave: number;
  setCurrWave: (n: number) => void;
}) {
  const isBattle = !!stage.waves.length;
  const r = stage.rewards;
  const tabs: { label: string; icon?: React.ReactNode; panel: React.ReactNode }[] = [];

  // ── Clear Rewards: rewards (left) + unlock / missions (right) ───────────────
  // `clear` (EXP) isn't shown in this tab, so it doesn't gate it.
  const hasClearTab = !!(r?.reward_f?.length || r?.reward_am?.length
    || stage.unlock || stage.missions?.length);
  if (hasClearTab) {
    tabs.push({
      label: 'Clear Rewards',
      panel: (
        <SimpleGrid columns={[1, 1, 2]} spacing={4} alignItems="start">
          {/* left column: reward cards */}
          <VStack align="stretch" spacing={4}>
            {/* `clear` is just EXP (shown under the stage name already), so the
                panel lists only the first-clear item/unit rewards. */}
            <RewardPanel title="Clear Rewards" rewards={r?.reward_f ?? []} tone="gray" columns={2} />
            <RewardPanel
              title={<HStack spacing={1}><StarIcon boxSize={3} color="yellow.400" /><Text as="span">All Missions Rewards</Text></HStack>}
              rewards={r?.reward_am ?? []}
              tone="yellow"
              columns={2}
            />
          </VStack>

          {/* right column: unlock + missions */}
          <VStack align="stretch" spacing={4}>
            {stage.unlock ? (
              <Panel title="Unlock Condition">
                <HStack spacing={2}>
                  <Text fontSize="sm" color="gray.300">Clear</Text>
                  {stage.unlock.clearStages.map((sid) => (
                    <Tag key={sid} size="sm" colorScheme="yellow" variant="solid">{sid}</Tag>
                  ))}
                </HStack>
              </Panel>
            ) : null}
            {stage.missions?.length ? (
              <Panel title="Missions">
                <VStack align="stretch" spacing={0} divider={<Divider borderColor="surface.border" />}>
                  {stage.missions.map((m, i) => (
                    <MissionRow key={i} mission={m} />
                  ))}
                </VStack>
              </Panel>
            ) : null}
          </VStack>
        </SimpleGrid>
      ),
    });
  }

  // ── Drops: aggregate the full per-wave B/A/S data into a stage-total pool,
  //    split units vs items (exp/skillExp are hidden here — shown per wave under
  //    the Enemies tab). The table keeps the complete data; this is UI-only.
  const dropPool = aggregateDrops(stage.drops);
  if (dropPool.items.length || dropPool.units.length) {
    tabs.push({
      label: 'Drops',
      panel: (
        <SimpleGrid columns={[1, 1, 2]} spacing={4} alignItems="start">
          <RewardPanel title="Item Drops" rewards={dropPool.items} tone="gray" columns={2} sort />
          <RewardPanel title="Unit Drops" rewards={dropPool.units.map((c) => ({ char: c }))} tone="gray" columns={2} sort />
        </SimpleGrid>
      ),
    });
  }

  // ── Squad Info ─────────────────────────────────────────────────────────────
  if (stage.squad) {
    const sq = stage.squad;
    tabs.push({
      label: 'Squad Info',
      panel: (
        <Panel title="Squad Info">
          <VStack align="stretch" spacing={2}>
            {sq.count != null ? <InfoRow label="Squads" value={String(sq.count)} /> : null}
            {sq.shift != null ? <InfoRow label="Shift limit" value={String(sq.shift)} /> : null}
            <InfoRow label="Friend squad" value={sq.friend ? 'Allowed' : 'Not allowed'} />
            {sq.fixed?.length ? (
              <InfoRow label="Fixed members" value={sq.fixed.map((c) => c.replace(/^Char_[A-Za-z0-9]+_/, '')).join(', ')} />
            ) : null}
          </VStack>
        </Panel>
      ),
    });
  }

  // ── Enemies (the wave grid) ────────────────────────────────────────────────
  if (isBattle) {
    tabs.push({
      label: 'Enemies',
      panel: (
        <VStack spacing={3}>
          {/* current wave's unit / skill EXP (pulled from its drop data), above
              the wave switcher */}
          {(() => {
            const { exp, skillExp } = waveExp(stage.drops?.[currWave]);
            if (exp == null && skillExp == null) return null;
            return (
              <HStack spacing={4} fontSize="sm" color="gray.400">
                {exp != null ? (
                  <Text>Unit EXP <Box as="span" color="green.300" fontWeight="bold">+{exp}</Box></Text>
                ) : null}
                {skillExp != null ? (
                  <Text>Skill EXP <Box as="span" color="green.300" fontWeight="bold">+{skillExp}</Box></Text>
                ) : null}
              </HStack>
            );
          })()}
          <HStack spacing={2} flexWrap="wrap" justify="center">
            {stage.waves.map((e, index) => (
              <div onClick={() => setCurrWave(index)} key={index} className={styles['wave-button']}>
                {index === currWave ? (
                  <Image src="/images/map-current.png" alt="current-wave" className={styles['wave-current']} />
                ) : null}
                <Image src="/images/tbaricon/TbarIcon_MP_NightChick_N.png" alt={`wave-${index}`} />
              </div>
            ))}
          </HStack>
          <HStack as={Center} gap={[2, 4, 6]}>
            <IconButton aria-label="Previous wave" icon={<ArrowLeftIcon />}
              isRound size="md" variant="outline" colorScheme="gray"
              isDisabled={currWave === 0} onClick={() => setCurrWave(Math.max(0, currWave - 1))} />
            {stage.waves[currWave]?.enemies && <EnemyGrid wave={stage.waves[currWave].enemies} />}
            <IconButton aria-label="Next wave" icon={<ArrowRightIcon />}
              isRound size="md" variant="outline" colorScheme="gray"
              isDisabled={currWave === stage.waves.length - 1}
              onClick={() => setCurrWave(Math.min(stage.waves.length - 1, currWave + 1))} />
          </HStack>
        </VStack>
      ),
    });
  }

  // ── Exploration (Search) ───────────────────────────────────────────────────
  if (stage.search) {
    const s = stage.search;
    tabs.push({
      label: 'Exploration',
      panel: (
        <Panel title="Exploration">
          <VStack align="stretch" spacing={2}>
            {s.time != null ? <InfoRow label="Time" value={fmtTime(s.time)} /> : null}
            {s.metal != null ? <InfoRow label="Metal" value={`+${s.metal}`} /> : null}
            {s.nutrient != null ? <InfoRow label="Nutrient" value={`+${s.nutrient}`} /> : null}
            {s.power != null ? <InfoRow label="Power" value={`+${s.power}`} /> : null}
            {s.units != null ? <InfoRow label="Dispatch units" value={String(s.units)} /> : null}
            {s.unitsLv != null ? <InfoRow label="Required level" value={String(s.unitsLv)} /> : null}
          </VStack>
        </Panel>
      ),
    });
  }

  if (!tabs.length) return null;

  return (
    <Tabs variant="soft-rounded" colorScheme="teal" w="100%" isLazy>
      <TabList flexWrap="wrap" gap={1}>
        {tabs.map((tb) => (
          <Tab key={tb.label} fontSize="sm">{tb.label}</Tab>
        ))}
      </TabList>
      <TabPanels>
        {tabs.map((tb) => (
          <TabPanel key={tb.label} px={0}>{tb.panel}</TabPanel>
        ))}
      </TabPanels>
    </Tabs>
  );
}

// Strip the table prefix off a Char_/MOB_-style key for a fallback display name
// (e.g. Char_BR_Khan_N -> Khan, EmperorChick_EW -> EmperorChick).
const shortKey = (k: string) =>
  k.replace(/^Char_[A-Za-z0-9]+_/, '').replace(/_(N|EW\d*|TU\d+|CH)$/, '').replace(/_/g, ' ');

// Skill display name: the community SkillName_ override if present, else a readable
// fallback from the key. (t() passes the raw key through when it isn't a known id,
// so check that the resolved text actually differs from the lookup key.)
function skillName(skillKey: string): string {
  const key = `SkillName_${skillKey}`;
  const resolved = t(key);
  return resolved !== key ? resolved : shortKey(skillKey).replace(/^MP /, '');
}

// Readable phrasing for each MISSION_TRIGGER_TYPE. {v} is the trigger's value;
// {u}/{s} mark where the linked unit/skill name goes (filled in by MissionRow).
// A trigger absent here just shows its raw name (forward-compatible).
const TRIGGER_TEXT: Record<string, string> = {
  ROUND_LIMIT_LESS: 'within {v} rounds',
  DEATH_COUNT_LESS: 'with {v} or fewer deaths',
  BEATEN_LESS: 'taking {v} or fewer hits',
  BY_ONESKILL: 'using a single skill',
  BY_SPCCHARACTER: 'using {u}',
  WITH_SPCCHARACTER: 'with {u} in the squad',
  SPCCHARACTER_ALIVE: 'keeping {u} alive',
  BY_SPC_SKILL: 'using {s}',
  NO_SPC_SKILL: 'without using {s}',
  WITH_TROOPER_LESS: 'with {v} or fewer Light units',
  WITH_TROOPER_MORE: 'with {v} or more Light units',
  WITH_ARMORED_LESS: 'with {v} or fewer Heavy units',
  WITH_ARMORED_MORE: 'with {v} or more Heavy units',
  WITH_MOBILITY_LESS: 'with {v} or fewer Air units',
  WITH_MOBILITY_MORE: 'with {v} or more Air units',
  WITH_ROBOT_LESS: 'with {v} or fewer AGS units',
  WITH_ROBOT_MORE: 'with {v} or more AGS units',
  WITH_ANDROID_LESS: 'with {v} or fewer Bioroid units',
  WITH_ANDROID_MORE: 'with {v} or more Bioroid units',
  SQUAD_LESS: 'using {v} or fewer squads',
  SQUAD_MORE: 'using {v} or more squads',
  SQUAD_CHANGE_LESS: 'with {v} or fewer squad changes',
  SQUAD_CHANGE_MORE: 'with {v} or more squad changes',
  DAMAGE_RECORD: 'dealing {v}+ recorded damage',
};

// Natural phrasing for the value-0 case of the "or fewer" triggers ("0 or fewer
// hits" -> "without taking damage"). Falls back to the generic template otherwise.
const TRIGGER_TEXT_ZERO: Record<string, string> = {
  DEATH_COUNT_LESS: 'without any deaths',
  BEATEN_LESS: 'without taking damage',
  WITH_TROOPER_LESS: 'with no Light units',
  WITH_ARMORED_LESS: 'with no Heavy units',
  WITH_MOBILITY_LESS: 'with no Air units',
  WITH_ROBOT_LESS: 'with no AGS units',
  WITH_ANDROID_LESS: 'with no Bioroid units',
  SQUAD_CHANGE_LESS: 'without changing squads',
};

// One star mission, rendered from its parsed condition. The base goal (clear / kill
// N enemies / kill a specific enemy) plus the trigger constraint, with the required
// unit and the target enemy shown as clickable links (unit -> hover card + detail
// page; enemy -> opens the global enemy modal). Falls back to t(desc) if there's no
// structured object (older data).
function MissionRow({ mission: m }: { mission: StageMission }) {
  const dispatch = useAppDispatch();
  const units = useAppSelector(selectUnits);
  const enemies = useAppSelector(selectEnemy);

  // resolve the target enemy's name (self-skips if the list is already loaded).
  // UnitHoverCard loads the unit list itself, so units need no fetch here.
  useEffect(() => { if (m.enemy) dispatch(fetchEnemyAsync()); }, [m.enemy, dispatch]);

  if (!m.object) {
    return (
      <HStack spacing={2} py={2} align="center">
        <StarIcon boxSize={3} color="gray.400" flexShrink={0} />
        <Text fontSize="sm" color="gray.200">{t(m.desc)}</Text>
      </HStack>
    );
  }

  // a clickable unit reference (hover card + link to the detail page), inline so it
  // sits inside the requirement sentence without breaking onto its own line.
  const unitLink = (id: string) => {
    const u = units[id];
    const label = u ? unitDisplayName(u) : shortKey(id);
    return (
      <UnitHoverCard unitId={id} inline>
        <Box as="span" color="yellow.300" fontWeight="semibold" cursor="pointer"
          _hover={{ textDecoration: 'underline' }}>{label}</Box>
      </UnitHoverCard>
    );
  };

  // a clickable enemy reference (opens the global enemy modal at lv 1).
  const enemyLink = (id: string) => {
    const e = enemies[id];
    const label = e ? t(e.name) : shortKey(id);
    return (
      <Link color="red.300" fontWeight="semibold" onClick={() => dispatch(setActive([id, 1]))}
        _hover={{ textDecoration: 'underline' }}>{label}</Link>
    );
  };

  // base goal phrase.
  const goal: React.ReactNode =
    m.object === 'KILL_SPCENEMY' && m.enemy
      ? <>Defeat {enemyLink(m.enemy)}</>
      : m.object === 'KILL_ENEMY'
        ? `Defeat ${m.count ?? 0} ${(m.count ?? 0) === 1 ? 'enemy' : 'enemies'}`
        : 'Clear the stage';

  // trigger constraint phrase, with {v}/{u}/{s} substituted (unit/skill -> links).
  let constraint: React.ReactNode = null;
  if (m.trigger) {
    const tpl = (m.value === 0 && TRIGGER_TEXT_ZERO[m.trigger]) || TRIGGER_TEXT[m.trigger];
    if (tpl) {
      // split on the placeholders so we can inject link nodes, not just strings.
      const parts = tpl.split(/(\{v\}|\{u\}|\{s\})/);
      constraint = (
        <>{' '}{parts.map((p, i) => {
          if (p === '{v}') return <Text as="span" key={i} fontWeight="semibold" color="gray.100">{m.value ?? 0}</Text>;
          if (p === '{u}') return <Box as="span" key={i}>{m.unit ? unitLink(m.unit) : 'a unit'}</Box>;
          if (p === '{s}') return <Text as="span" key={i} fontWeight="semibold" color="gray.100">{m.skill ? skillName(m.skill) : 'a skill'}</Text>;
          return <Box as="span" key={i}>{p}</Box>;
        })}</>
      );
    } else {
      constraint = <> ({m.trigger})</>;   // unknown trigger: show raw, don't hide it
    }
  }

  return (
    <HStack spacing={2} py={2} align="center">
      <StarIcon boxSize={3} color="gray.400" flexShrink={0} />
      <Text fontSize="sm" color="gray.200">{goal}{constraint}</Text>
    </HStack>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <HStack justify="space-between">
      <Text fontSize="sm" color="gray.400">{label}</Text>
      <Text fontSize="sm" color="gray.100" fontWeight="medium">{value}</Text>
    </HStack>
  );
}

// Collapse the full per-wave B/A/S drop data into a single stage-total pool,
// split into unit (char) and item drops, deduped (items keep the max count).
// EXP entries are ignored here — they're surfaced per wave in the Enemies tab.
function aggregateDrops(drops?: WaveDrop[]): { units: string[]; items: { item: string; count?: number }[] } {
  const units: string[] = [];
  const seenUnits = new Set<string>();
  const itemCount = new Map<string, number | undefined>();
  const itemOrder: string[] = [];
  for (const wave of drops ?? []) {
    for (const rank of ['B', 'A', 'S'] as const) {
      for (const e of wave[rank] ?? []) {
        if (e.char) {
          if (!seenUnits.has(e.char)) { seenUnits.add(e.char); units.push(e.char); }
        } else if (e.item) {
          if (!itemCount.has(e.item)) { itemOrder.push(e.item); itemCount.set(e.item, e.count); }
          else {
            const prev = itemCount.get(e.item);
            if (e.count != null && (prev == null || e.count > prev)) itemCount.set(e.item, e.count);
          }
        }
      }
    }
  }
  const items = itemOrder.map((item) => {
    const count = itemCount.get(item);
    return count != null ? { item, count } : { item };
  });
  return { units, items };
}

// A wave's unit / skill EXP, read from its drop reward (same across B/A/S).
function waveExp(wave?: WaveDrop): { exp?: number; skillExp?: number } {
  const entries: RewardEntry[] = wave?.B ?? wave?.A ?? wave?.S ?? [];
  const out: { exp?: number; skillExp?: number } = {};
  for (const e of entries) {
    if (e.exp != null) out.exp = e.exp;
    if (e.skillExp != null) out.skillExp = e.skillExp;
  }
  return out;
}
