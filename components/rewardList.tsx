import { Box, HStack, Text, Wrap, WrapItem, Tooltip, SimpleGrid } from '@chakra-ui/react';
import { RewardEntry } from '@/interfaces/world';
import { useAppSelector } from '@/hooks';
import { selectItems, ItemInfo } from '@/store/itemSlice';
import { t } from '@/lib/strings';

// Human labels for the currency keys carried on a RewardEntry.
const CURRENCY_LABEL: Record<string, string> = {
  accountExp: 'Player EXP',
  exp: 'Unit EXP',
  skillExp: 'Skill EXP',
  cash: 'Cash',
  metal: 'Metal',
  nutrient: 'Nutrient',
  power: 'Power',
};

// Currency entries have no item table entry — keep a fixed sprite key per type so
// they still render an icon placeholder consistently.
const CURRENCY_ICON: Record<string, string> = {
  accountExp: 'UI_Icon_Exp',
  exp: 'UI_Icon_Exp',
  skillExp: 'UI_Icon_SkillExp',
  cash: 'UI_Icon_Cash',
  metal: 'UI_Icon_Metal',
  nutrient: 'UI_Icon_Nutrient',
  power: 'UI_Icon_Power',
};

interface Resolved {
  name: string;       // display text
  icon: string;       // sprite key (placeholder shows this)
  amount?: string;    // "x10" / "+50"
  grade?: number;
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
    };
  }
  if (e.char) {
    const info = items[e.char];
    return { name: info ? t(info.name) : e.char, icon: info?.icon ?? '', grade: info?.grade };
  }
  return { name: '?', icon: '' };
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

// Placeholder icon box — shows a small sprite-key label until real PNGs are
// sliced from the atlases. Hover reveals the full key.
function IconPlaceholder({ icon }: { icon: string }) {
  return (
    <Tooltip label={icon || 'no icon'} placement="top" hasArrow openDelay={300}>
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
        px="2px"
      >
        <Text fontSize="7px" color="gray.500" noOfLines={2} textAlign="center" lineHeight="1.1">
          {icon ? icon.replace(/^UI_Icon_|^InvenIcon_/, '') : '?'}
        </Text>
      </Box>
    </Tooltip>
  );
}

// A row of reward chips with icon + resolved name. `tone` tints the card.
export default function RewardList({
  rewards,
  tone = 'gray',
  columns,
}: {
  rewards: RewardEntry[];
  tone?: 'gray' | 'yellow' | 'teal';
  // when set, lay chips out in a fixed-column grid (equal width) instead of the
  // default variable-width wrap. Responsive array allowed, e.g. [1, 2].
  columns?: number | number[];
}) {
  const items = useAppSelector(selectItems);
  const amountColor = tone === 'yellow' ? 'yellow.300' : tone === 'teal' ? 'teal.200' : 'gray.300';
  const chips = rewards.map((e, i) => (
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
  const border = gradeColor(r.grade) ?? toneBorder;
  return (
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
        <Text fontSize="xs" color="gray.100" noOfLines={1}>{r.name}</Text>
        {r.amount ? (
          <Text fontSize="xs" fontWeight="bold" color={amountColor}>{r.amount}</Text>
        ) : null}
      </Box>
    </HStack>
  );
}

// A titled card wrapping a RewardList — the shared building block for the
// Clear-Rewards and Drops tabs (and anywhere else a labelled reward set shows).
export function RewardPanel({
  title, rewards, tone = 'gray', columns,
}: {
  title: React.ReactNode;
  rewards: RewardEntry[];
  tone?: 'gray' | 'yellow' | 'teal';
  columns?: number | number[];
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
        <RewardList rewards={rewards} tone={tone} columns={columns} />
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
