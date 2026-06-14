import { useState } from 'react';
import { Box, HStack, Text, Wrap, WrapItem, Tooltip, SimpleGrid } from '@chakra-ui/react';
import { RewardEntry } from '@/interfaces/world';
import { useAppSelector } from '@/hooks';
import { selectItems, ItemInfo } from '@/store/itemSlice';
import { t } from '@/lib/strings';

// Human labels for the currency keys carried on a RewardEntry. The three
// resources display as Power / Nutrient / Gear (the `metal` key is "Gear"); cash
// is "Tuna Cans".
const CURRENCY_LABEL: Record<string, string> = {
  accountExp: 'Player EXP',
  exp: 'Unit EXP',
  skillExp: 'Skill EXP',
  cash: 'Tuna Cans',
  metal: 'Gear',
  nutrient: 'Nutrient',
  power: 'Power',
};

// Currency entries have no item table entry — map each to its real sliced sprite
// key (UI_Icon_Currency_*; cash == Tuna). Exp / SkillExp have no icon in-game and
// are intentionally omitted so they fall through to the text label.
const CURRENCY_ICON: Record<string, string> = {
  cash: 'UI_Icon_Currency_Tuna',
  metal: 'UI_Icon_Currency_Metal',
  nutrient: 'UI_Icon_Currency_Nutrient',
  power: 'UI_Icon_Currency_Power',
};

interface Resolved {
  name: string;       // display text
  icon: string;       // sprite key (placeholder shows this)
  amount?: string;    // "x10" / "+50"
  grade?: number;
  kind?: ItemInfo['kind'];
  // consumables only: the item's description loc id (e.g. "3,000 of all
  // resources"), shown in the icon tooltip. Other kinds carry no desc.
  desc?: string;
}

// Resolve one reward entry to display info using the item/unit lookup table.
function resolve(e: RewardEntry, items: { [id: string]: ItemInfo }): Resolved {
  for (const key of Object.keys(CURRENCY_LABEL)) {
    const v = (e as Record<string, unknown>)[key];
    if (typeof v === 'number') {
      return { name: CURRENCY_LABEL[key], icon: CURRENCY_ICON[key] ?? '', amount: `+${v}` };
    }
  }
  if (e.item) {
    const info = items[e.item];
    return {
      name: info ? t(info.name) : e.item,
      icon: info?.icon ?? '',
      amount: e.count ? `x${e.count}` : undefined,
      grade: info?.grade,
      kind: info?.kind,
      desc: info?.kind === 'consumable' ? info.desc : undefined,
    };
  }
  if (e.char) {
    const info = items[e.char];
    return {
      name: info ? t(info.name) : e.char,
      icon: info?.icon ?? '',
      grade: info?.grade,
      kind: info?.kind,
    };
  }
  return { name: '?', icon: '' };
}

// In-game grade rank by item grade number: 2=RE/B, 3=MP/A, 4=SP/S, 5=EX/SS,
// 6=SSS (above EX). Shown as a tag before unit/equipment names. Consumables and
// currencies have no rank tag. Returns null when there's no tag to show.
const GRADE_TAG: Record<number, string> = { 2: 'B', 3: 'A', 4: 'S', 5: 'SS', 6: 'SSS' };

function gradeTag(r: Resolved): string | null {
  if (r.kind !== 'unit' && r.kind !== 'equip') return null;
  return r.grade != null ? GRADE_TAG[r.grade] ?? null : null;
}

// Drop-sort rank for a reward entry: units & equipment first (kind weight), then
// consumables DEAD LAST; within a kind, higher grade first. Currencies/unknowns
// keep their position via a neutral middle weight. Used to order drop panels.
const KIND_WEIGHT: Record<string, number> = { unit: 0, equip: 1, consumable: 2 };

function sortRewards(rewards: RewardEntry[], items: { [id: string]: ItemInfo }): RewardEntry[] {
  const meta = (e: RewardEntry) => {
    const info = e.item ? items[e.item] : e.char ? items[e.char] : undefined;
    return {
      kw: info ? (KIND_WEIGHT[info.kind] ?? 1) : 1,
      grade: info?.grade ?? 0,
    };
  };
  // stable sort: kind weight asc (unit/equip before consumable), then grade desc.
  return rewards
    .map((e, i) => ({ e, i, ...meta(e) }))
    .sort((a, b) => (a.kw - b.kw) || (b.grade - a.grade) || (a.i - b.i))
    .map((x) => x.e);
}

// Grade -> border colour (rough rarity tint). Falls back to the tone border.
function gradeColor(grade?: number): string | null {
  switch (grade) {
    case 5: return '#d4af37'; // gold
    case 4: return '#a335ee'; // purple
    case 3: return '#0070dd'; // blue
    case 2: return '#1eff00'; // green
    default: return null;
  }
}

// Reward/drop icon box. Renders the real sliced PNG (/images/icons/<key>.png,
// extracted by tools/download/download_atlas_icons.py); falls back to a small
// sprite-key label when the icon is missing (key not in either atlas) or fails to
// load. No tooltip here — the consumable-desc tooltip wraps the whole chip.
function IconPlaceholder({ icon }: { icon: string }) {
  const [broken, setBroken] = useState(false);
  const showImg = !!icon && !broken;
  return (
    <Box
      flexShrink={0}
      boxSize="34px"
      borderRadius="md"
      bg="blackAlpha.500"
      borderWidth="1px"
      borderColor="whiteAlpha.300"
      display="flex"
      alignItems="center"
      justifyContent="center"
      overflow="hidden"
      p="3px"
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/images/icons/${icon}.png`}
          alt={icon}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          onError={() => setBroken(true)}
        />
      ) : (
        <Text fontSize="7px" color="gray.500" noOfLines={2} textAlign="center" lineHeight="1.1">
          {icon ? icon.replace(/^UI_Icon_|^InvenIcon_/, '') : '?'}
        </Text>
      )}
    </Box>
  );
}

// A row of reward chips with icon + resolved name. `tone` tints the card.
export default function RewardList({
  rewards,
  tone = 'gray',
  columns,
  sort = false,
}: {
  rewards: RewardEntry[];
  tone?: 'gray' | 'yellow' | 'teal';
  // when set, lay chips out in a fixed-column grid (equal width) instead of the
  // default variable-width wrap. Responsive array allowed, e.g. [1, 2].
  columns?: number | number[];
  // when set, order entries: unit/equip first, consumables last; higher grade
  // first within a kind (drop panels). Off by default so reward order is kept.
  sort?: boolean;
}) {
  const items = useAppSelector(selectItems);
  const amountColor = tone === 'yellow' ? 'yellow.300' : tone === 'teal' ? 'teal.200' : 'gray.300';
  const ordered = sort ? sortRewards(rewards, items) : rewards;
  const chips = ordered.map((e, i) => (
    <RewardChip key={i} entry={e} items={items} tone={tone} amountColor={amountColor} />
  ));

  if (columns) {
    return <SimpleGrid columns={columns} spacing={2}>{chips}</SimpleGrid>;
  }
  return <Wrap spacing={2}>{chips.map((c, i) => <WrapItem key={i}>{c}</WrapItem>)}</Wrap>;
}

// One reward entry rendered as an icon + name (+ amount) chip. Used by both the
// wrap and grid layouts; in a grid it stretches to the cell width.
function RewardChip({
  entry, items, tone, amountColor,
}: {
  entry: RewardEntry;
  items: { [id: string]: ItemInfo };
  tone: 'gray' | 'yellow' | 'teal';
  amountColor: string;
}) {
  const toneBorder = tone === 'yellow' ? 'yellow.500' : tone === 'teal' ? 'teal.500' : 'surface.border';
  const r = resolve(entry, items);
  const rarity = gradeColor(r.grade);
  const border = rarity ?? toneBorder;
  const tag = gradeTag(r);  // B/A/S/SS/SSS for unit/equip; null otherwise
  // Tooltip ONLY for consumables that have a description (what the item grants,
  // e.g. "There are 3,000 of all resources."). `r.desc` is set by resolve() for
  // consumables only, so no other kind gets a tooltip — units/equip/currencies
  // show nothing on hover.
  const descText = r.desc ? t(r.desc) : '';

  const chip = (
    <HStack
      spacing={2}
      pr={2.5}
      py={1}
      pl={1}
      w="100%"
      borderWidth="1px"
      borderColor={border}
      borderRadius="lg"
      bg="blackAlpha.300"
    >
      <IconPlaceholder icon={r.icon} />
      <Box minW={0}>
        <Text fontSize="xs" color="gray.100" noOfLines={1}>
          {tag ? (
            <Box as="span" fontWeight="bold" color={rarity ?? 'gray.300'} mr={1}>{tag}</Box>
          ) : null}
          {r.name}
        </Text>
        {r.amount ? (
          <Text fontSize="xs" fontWeight="bold" color={amountColor}>{r.amount}</Text>
        ) : null}
      </Box>
    </HStack>
  );

  if (!descText) return chip;
  return (
    <Tooltip
      label={
        <Box>
          <Text fontSize="xs" fontWeight="bold">{r.name}</Text>
          <Text fontSize="xs">{descText}</Text>
        </Box>
      }
      placement="top"
      hasArrow
      openDelay={300}
    >
      {chip}
    </Tooltip>
  );
}

// A titled card wrapping a RewardList — the shared building block for the
// Clear-Rewards and Drops tabs (and anywhere else a labelled reward set shows).
export function RewardPanel({
  title, rewards, tone = 'gray', columns, sort = false,
}: {
  title: React.ReactNode;
  rewards: RewardEntry[];
  tone?: 'gray' | 'yellow' | 'teal';
  columns?: number | number[];
  sort?: boolean;
}) {
  if (!rewards.length) return null;
  return (
    <Box borderWidth="1px" borderColor="surface.border" borderRadius="xl" overflow="hidden" bg="surface.elevated">
      {/* title is a div (not <p>/Text): it may contain block content like an
          HStack with an icon, which is invalid inside a <p>. */}
      <Box px={4} py={2} bg="blackAlpha.300" borderBottomWidth="1px" borderBottomColor="surface.border"
        fontSize="sm" fontWeight="bold" color="gray.200">
        {title}
      </Box>
      <Box p={3}>
        <RewardList rewards={rewards} tone={tone} columns={columns} sort={sort} />
      </Box>
    </Box>
  );
}

// Compact inline EXP summary (the stage `clear` reward) shown under the stage
// name: just the currency entries, rendered as "Player EXP +50".
export function ClearExp({ rewards }: { rewards: RewardEntry[] }) {
  const items = useAppSelector(selectItems);
  const exp = rewards.filter(
    (e) => typeof e.accountExp === 'number' || typeof e.exp === 'number',
  );
  if (!exp.length) return null;
  return (
    <HStack spacing={3} mt={0.5}>
      {exp.map((e, i) => {
        const r = resolve(e, items);
        return (
          <Text key={i} fontSize="xs" color="gray.400">
            {r.name} <Box as="span" color="green.300" fontWeight="bold">{r.amount}</Box>
          </Text>
        );
      })}
    </HStack>
  );
}
