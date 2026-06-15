import { Box, Flex, HStack, Image, Text } from '@chakra-ui/react';

// Shared stat-display primitives used by the enemy modal and the unit detail page:
//   StatSection — a titled group (yellow caption + bordered panel)
//   StatRow     — one icon + label + value line
//   StatPair    — two icon+label+value cells side by side (the game's paired layout)

// One icon + label + value row inside a stat section.
export function StatRow({ icon, label, value }: { icon?: string; label: React.ReactNode; value: React.ReactNode }) {
  return (
    <Flex align="center" justify="space-between" py={1} px={2} borderRadius="md"
      _odd={{ bg: 'whiteAlpha.50' }}>
      <HStack spacing={1.5} color="gray.400" minW={0}>
        {icon ? <Image alt={typeof label === 'string' ? label : ''} src={icon} boxSize="0.95rem" /> : null}
        <Text fontSize="sm" fontWeight="600">{label}</Text>
      </HStack>
      <Text fontSize="sm" fontWeight="600" sx={{ fontVariantNumeric: 'tabular-nums' }} color="gray.100">
        {value}
      </Text>
    </Flex>
  );
}

// Two icon+label+value cells on a single row (the game's paired stat layout).
export function StatPair({ left, right }: {
  left: { icon?: string; label: string; value: React.ReactNode };
  right?: { icon?: string; label: string; value: React.ReactNode };
}) {
  const Cell = ({ icon, label, value }: { icon?: string; label: string; value: React.ReactNode }) => (
    <Flex align="center" justify="space-between" flex={1} minW={0}>
      <HStack spacing={1.5} color="gray.400" minW={0}>
        {icon ? <Image alt={label} src={icon} boxSize="0.95rem" /> : null}
        <Text fontSize="sm" fontWeight="600">{label}</Text>
      </HStack>
      <Text fontSize="sm" fontWeight="600" sx={{ fontVariantNumeric: 'tabular-nums' }} color="gray.100">
        {value}
      </Text>
    </Flex>
  );
  return (
    <HStack spacing={4} py={1} px={2} borderRadius="md" _odd={{ bg: 'whiteAlpha.50' }}
      divider={<Box w="1px" alignSelf="stretch" bg="whiteAlpha.200" />}>
      <Cell {...left} />
      {right ? <Cell {...right} /> : <Box flex={1} />}
    </HStack>
  );
}

// A titled group of stat rows.
export function StatSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box>
      <Text fontSize="2xs" letterSpacing="wider" textTransform="uppercase"
        color="yellow.400" fontWeight="700" mb={1} px={2}>
        {title}
      </Text>
      <Box bg="blackAlpha.300" borderRadius="lg" borderWidth="1px" borderColor="surface.border" py={0.5}>
        {children}
      </Box>
    </Box>
  );
}
