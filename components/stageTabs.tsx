import {
  Box, HStack, VStack, Text, Image, Center, IconButton, SimpleGrid,
  Tabs, TabList, Tab, TabPanels, TabPanel, Tag, Divider,
} from '@chakra-ui/react';
import { ArrowLeftIcon, ArrowRightIcon, StarIcon } from '@chakra-ui/icons';
import { Stage, WaveDrop, RewardEntry } from '@/interfaces/world';
import { t } from '@/lib/strings';
import EnemyGrid from '@/components/enemyGrid';
import RewardList from '@/components/rewardList';
import styles from '@/styles/custom.module.css';

// A titled panel card matching the reference layout (header strip + body).
function Panel({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <Box borderWidth="1px" borderColor="surface.border" borderRadius="xl" overflow="hidden" bg="surface.elevated">
      <Box px={4} py={2} bg="blackAlpha.300" borderBottomWidth="1px" borderBottomColor="surface.border">
        <Text fontSize="sm" fontWeight="bold" color="gray.200">{title}</Text>
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
  const hasClearTab = !!(r?.clear?.length || r?.reward_f?.length || r?.reward_am?.length
    || stage.unlock || stage.missions?.length);
  if (hasClearTab) {
    tabs.push({
      label: 'Clear Rewards',
      panel: (
        <SimpleGrid columns={[1, 1, 2]} spacing={4} alignItems="start">
          {/* left column: reward cards */}
          <VStack align="stretch" spacing={4}>
            {r?.clear?.length || r?.reward_f?.length ? (
              <Panel title="Clear Rewards">
                <RewardList rewards={[...(r?.clear ?? []), ...(r?.reward_f ?? [])]} tone="gray" />
              </Panel>
            ) : null}
            {r?.reward_am?.length ? (
              <Panel title={<HStack spacing={1}><StarIcon boxSize={3} color="yellow.400" /><Text as="span">All Missions Rewards</Text></HStack>}>
                <RewardList rewards={r.reward_am} tone="yellow" />
              </Panel>
            ) : null}
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
                    <HStack key={i} spacing={2} py={2} align="center">
                      <StarIcon boxSize={3} color="gray.400" flexShrink={0} />
                      <Text fontSize="sm" color="gray.200">{t(m.desc)}</Text>
                    </HStack>
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
        <VStack align="stretch" spacing={4}>
          {dropPool.items.length ? (
            <Panel title="Item Drops">
              <RewardList rewards={dropPool.items} tone="gray" />
            </Panel>
          ) : null}
          {dropPool.units.length ? (
            <Panel title="Unit Drops">
              <RewardList rewards={dropPool.units.map((c) => ({ char: c }))} tone="gray" />
            </Panel>
          ) : null}
        </VStack>
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
