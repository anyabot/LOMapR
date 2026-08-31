import { useState } from 'react';
import { Box, HStack, Text, Wrap, WrapItem, Tooltip, SimpleGrid } from '@chakra-ui/react';
import { RewardEntry } from '@/interfaces/world';
import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectItems, ItemInfo } from '@/store/itemSlice';
import { setActiveEquip } from '@/store/equipSlice';
import { t } from '@/lib/strings';
import { useTranslationVersion } from '@/lib/translationVersion';
import { rankColor } from '@/lib/rank';
import UnitHoverCard from './unitHoverCard';

// Display labels for the currency keys on a RewardEntry (`metal` reads as "Gear").
const CURRENCY_LABEL: Record<string, string> = {
  accountExp: 'Player EXP',
  exp: 'Unit EXP',
  skillExp: 'Skill EXP',
  cash: 'Tuna Cans',
  metal: 'Gear',
  nutrient: 'Nutrient',
  power: 'Power',
};

// Currencies have no item-table entry. Exp/SkillExp have no in-game icon, so they
// are omitted here and fall through to the text label.
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
  // consumables only: description loc id, shown in the icon tooltip
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

// In-game grade rank; consumables and currencies have none.
const GRADE_TAG: Record<number, string> = { 2: 'B', 3: 'A', 4: 'S', 5: 'SS', 6: 'SSS' };

function gradeTag(r: Resolved): string | null {
  if (r.kind !== 'unit' && r.kind !== 'equip') return null;
  return r.grade != null ? GRADE_TAG[r.grade] ?? null : null;
}

// Units & equipment first, consumables last; higher grade first within a kind.
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

// The official rank colour, shared with the unit pages; null for non-graded entries.
function gradeColor(grade?: number): string | null {
  return grade != null && grade >= 2 && grade <= 6 ? rankColor(grade) : null;
}

// Falls back to a sprite-key label when the icon is missing or fails to load.
function IconPlaceholder({ icon }: { icon: string }) {
  const [broken, setBroken] = useState(false);
  const showImg = !!icon && !broken;
  return (
    <Box
      flexShrink={0}
      boxSize="48px"
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
  // fixed-column grid instead of the default variable-width wrap
  columns?: number | number[];
  // order for drop panels; off by default so reward order is kept
  sort?: boolean;
}) {
  useTranslationVersion();
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

// Used by both the wrap and grid layouts; in a grid it stretches to the cell width.
function RewardChip({
  entry, items, tone, amountColor,
}: {
  entry: RewardEntry;
  items: { [id: string]: ItemInfo };
  tone: 'gray' | 'yellow' | 'teal';
  amountColor: string;
}) {
  const dispatch = useAppDispatch();
  const toneBorder = tone === 'yellow' ? 'yellow.500' : tone === 'teal' ? 'teal.500' : 'surface.border';
  const r = resolve(entry, items);
  const rarity = gradeColor(r.grade);
  const border = rarity ?? toneBorder;
  const tag = gradeTag(r);  // B/A/S/SS/SSS for unit/equip; null otherwise
  // resolve() sets `desc` for consumables only, so no other kind gets a tooltip
  const descText = r.desc ? t(r.desc) : '';

  // a unit is either a `char` entry or an `item`/`char` resolving to kind 'unit'
  const unitId = r.kind === 'unit' ? (entry.char || entry.item) : undefined;
  // drop ids carry a _T<n> rank suffix; the equipment page is keyed by family
  const equipFam = r.kind === 'equip' && entry.item
    ? entry.item.replace(/_T\d+$/, '')
    : undefined;
  const linked = !!unitId || !!equipFam;

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
      {...(linked ? { _hover: { borderColor: 'yellow.400', bg: 'whiteAlpha.100' }, cursor: 'pointer' } : {})}
    >
      <IconPlaceholder icon={r.icon} />
      <Box minW={0}>
        <Text fontSize="sm" color="gray.100" noOfLines={1}>
          {tag ? (
            <Box as="span" fontWeight="bold" color={rarity ?? 'gray.300'} mr={1}>{tag}</Box>
          ) : null}
          {r.name}
        </Text>
        {r.amount ? (
          <Text fontSize="sm" fontWeight="bold" color={amountColor}>{r.amount}</Text>
        ) : null}
      </Box>
    </HStack>
  );

  // units get the hover card, equips link to the modal, everything else is bare
  const wrapped = unitId
    ? <UnitHoverCard unitId={unitId}>{chip}</UnitHoverCard>
    : equipFam
      ? <Box onClick={() => dispatch(setActiveEquip(equipFam))} display="block">{chip}</Box>
      : chip;

  if (!descText) return wrapped;
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
      {wrapped}
    </Tooltip>
  );
}

// A titled card wrapping a RewardList.
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

// Compact inline EXP summary (the stage `clear` reward), e.g. "Player EXP +50".
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
