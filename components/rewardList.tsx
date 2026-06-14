import { Box, HStack, Text, VStack, Wrap, WrapItem } from '@chakra-ui/react';
import { RewardEntry } from '@/interfaces/world';

// Human labels for the currency keys carried on a RewardEntry.
const CURRENCY_LABEL: Record<string, string> = {
  accountExp: 'Player EXP',
  exp: 'Unit EXP',
  cash: 'Cash',
  metal: 'Metal',
  nutrient: 'Nutrient',
  power: 'Power',
};

// One reward entry -> a short label. Item/char ids are raw game keys for now
// (display names + icons come later); strip the common prefixes so they read
// a little better in the meantime.
function entryLabel(e: RewardEntry): { label: string; amount?: string } {
  for (const key of Object.keys(CURRENCY_LABEL)) {
    const v = (e as Record<string, unknown>)[key];
    if (typeof v === 'number') return { label: CURRENCY_LABEL[key], amount: `+${v}` };
  }
  if (e.item) {
    const name = e.item.replace(/^(Consumable_|RobotParts_|Equip_|ResourcePack_)/, '');
    return { label: name, amount: e.count ? `x${e.count}` : undefined };
  }
  if (e.char) {
    return { label: e.char.replace(/^Char_([A-Za-z0-9]+)_/, ''), amount: 'Unit' };
  }
  return { label: '?' };
}

// A row of reward chips. `tone` colours the chip set so first-clear vs
// all-mission read distinctly.
export default function RewardList({
  rewards,
  tone = 'gray',
}: {
  rewards: RewardEntry[];
  tone?: 'gray' | 'yellow' | 'teal';
}) {
  const border = tone === 'yellow' ? 'yellow.500' : tone === 'teal' ? 'teal.500' : 'surface.border';
  const amountColor = tone === 'yellow' ? 'yellow.300' : tone === 'teal' ? 'teal.200' : 'gray.300';
  return (
    <Wrap spacing={1.5}>
      {rewards.map((e, i) => {
        const { label, amount } = entryLabel(e);
        return (
          <WrapItem key={i}>
            <HStack
              spacing={1.5}
              px={2}
              py={1}
              borderWidth="1px"
              borderColor={border}
              borderRadius="md"
              bg="blackAlpha.300"
            >
              <Text fontSize="xs" color="gray.200" noOfLines={1}>{label}</Text>
              {amount ? <Text fontSize="xs" fontWeight="bold" color={amountColor}>{amount}</Text> : null}
            </HStack>
          </WrapItem>
        );
      })}
    </Wrap>
  );
}

// Compact inline EXP summary (the stage `clear` reward) shown under the stage
// name: just the currency entries, rendered as "Player EXP +50".
export function ClearExp({ rewards }: { rewards: RewardEntry[] }) {
  const exp = rewards.filter(
    (e) => typeof e.accountExp === 'number' || typeof e.exp === 'number',
  );
  if (!exp.length) return null;
  return (
    <HStack spacing={3} mt={0.5}>
      {exp.map((e, i) => {
        const { label, amount } = entryLabel(e);
        return (
          <Text key={i} fontSize="xs" color="gray.400">
            {label} <Box as="span" color="green.300" fontWeight="bold">{amount}</Box>
          </Text>
        );
      })}
    </HStack>
  );
}
