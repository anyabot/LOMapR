import { useEffect, useMemo } from 'react';
import { Box, Heading, SimpleGrid, Text, VStack } from '@altterisk/game-hub/ui';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { selectItems, ItemMap } from '@/store/itemSlice';
import { selectUnits, fetchUnitsAsync } from '@/store/unitSlice';
import { RewardItem } from '@/components/rewardList';
import { RewardEntry, World, isBattleStage } from '@/interfaces/world';
import { unitDisplayName } from '@/lib/rank';
import { t } from '@/lib/strings';
import { useTranslationVersion } from '@/lib/translationVersion';

interface Drop { key: string; entry: RewardEntry; name: string; grade: number; stages: string[] }

type Units = ReturnType<typeof selectUnits>;

function collect(w: World, items: ItemMap, units: Units) {
  const found = new Map<string, Drop>();
  const add = (key: string, entry: RewardEntry, stage: string) => {
    let d = found.get(key);
    if (!d) {
      const unit = entry.char ? units[key] : undefined;
      d = {
        key, entry, stages: [],
        name: unit ? unitDisplayName(unit) : items[key] ? t(items[key].name) : key,
        grade: items[key]?.grade ?? unit?.rarity ?? 0,
      };
      found.set(key, d);
    }
    if (!d.stages.includes(stage)) d.stages.push(stage);
  };
  for (const z of w.zones) {
    for (const s of (z.subzones ? z.subzones.flat() : z.stages)) {
      if (!isBattleStage(s)) continue;
      for (const wave of s.drops ?? []) {
        for (const e of [...(wave.B ?? []), ...(wave.A ?? []), ...(wave.S ?? [])]) {
          const key = e.char ?? e.item;
          if (!key) continue;
          const kind = items[key]?.kind;
          if (e.char || kind === 'unit') add(key, { char: key }, s.title);
          else if (kind === 'equip') add(key, { item: key }, s.title);
        }
      }
    }
  }
  const all = Array.from(found.values()).sort((a, b) => (b.grade - a.grade) || a.name.localeCompare(b.name));
  return { units: all.filter((d) => d.entry.char), equips: all.filter((d) => !d.entry.char) };
}

function DropGrid({ title, drops }: { title: string; drops: Drop[] }) {
  if (!drops.length) return null;
  return (
    <Box>
      <Heading size="xs" color="gray.300" mb={2}>{title} ({drops.length})</Heading>
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing={2}>
        {drops.map((d) => (
          <Box key={d.key} minW={0}>
            <RewardItem entry={d.entry} />
            <Text fontSize="2xs" color="gray.500" px={1} mt={0.5} noOfLines={2}>{d.stages.join(' · ')}</Text>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}

export function useEventDrops(w: World | undefined) {
  useTranslationVersion();
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectItems);
  const units = useAppSelector(selectUnits);
  useEffect(() => { dispatch(fetchUnitsAsync()); }, [dispatch]);
  return useMemo(() => (w ? collect(w, items, units) : { units: [], equips: [] }), [w, items, units]);
}

export default function EventDrops({ units, equips }: ReturnType<typeof useEventDrops>) {
  return (
    <VStack align="stretch" spacing={4}>
      <DropGrid title="Units" drops={units} />
      <DropGrid title="Equipment" drops={equips} />
    </VStack>
  );
}
