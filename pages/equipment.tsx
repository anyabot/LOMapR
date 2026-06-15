import { useEffect, useState } from 'react';
import {
  Button, ButtonGroup, Flex, InputGroup, Input, InputRightElement,
  VStack, HStack, Center, Text, Heading, Badge, IconButton, Box, Image, SimpleGrid,
} from '@chakra-ui/react';
import { CloseIcon, SearchIcon } from '@chakra-ui/icons';
import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectEquip, selectEquipStatus, fetchEquipAsync, setActiveEquip } from '@/store/equipSlice';
import { EquipData } from '@/interfaces/equip';
import { t } from '@/lib/strings';
import { rankTag, rankColor, equipIcon, EXCHANGE_META } from '@/lib/rank';
import Head from 'next/head';
import { useRouter } from 'next/router';

// Slot type = the family key prefix. Chip / OS (System) / Item (Sub) — the three
// equip slots (from the data's `slot`, derived from ItemType — the key prefix is
// unreliable). Icons match the unit equip-slot icons (Equip_Chip/OS/Item in common/).
const SLOTS: { label: 'Chip' | 'OS' | 'Item'; icon: string }[] = [
  { label: 'Chip', icon: 'Chip' },
  { label: 'OS', icon: 'OS' },
  { label: 'Item', icon: 'Item' },
];
const GRADES = [6, 5, 4, 3, 2] as const;   // SSS..B
const EXCHANGES = ['Sanctum', 'IW'] as const;
// Type filter: the three slots + Exclusive (unit-locked, pcLimit set). Exclusive
// cuts across slots, so it's a filter rather than its own list section.
const TYPES = ['Chip', 'OS', 'Item', 'Exclusive'] as const;
type TypeFilter = typeof TYPES[number];
const isExclusive = (e: EquipData) => !!e.pcLimit;

export default function Equipment() {
  const equip = useAppSelector(selectEquip);
  const status = useAppSelector(selectEquipStatus);
  const dispatch = useAppDispatch();
  const router = useRouter();

  useEffect(() => { dispatch(fetchEquipAsync()); }, [dispatch]);

  // Deep link: ?equip=<id> opens that equip's modal once the list is loaded.
  useEffect(() => {
    const id = router.query.equip as string | undefined;
    if (router.isReady && id && equip[id]) dispatch(setActiveEquip(id));
  }, [router.isReady, router.query.equip, equip, dispatch]);

  const [searchTerm, setSearchTerm] = useState('');
  const [grades, setGrades] = useState<Record<number, boolean>>(
    Object.fromEntries(GRADES.map((g) => [g, true])),
  );
  const [exchange, setExchange] = useState<'Sanctum' | 'IW' | null>(null);
  const [type, setType] = useState<TypeFilter | null>(null);

  function matches(e: EquipData) {
    if (!grades[e.grade]) return false;
    if (exchange && e.exchange !== exchange) return false;
    if (type === 'Exclusive' ? !isExclusive(e) : type ? e.slot !== type : false) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!t(e.name).toLowerCase().includes(q) && !(e.id || '').toLowerCase().includes(q)) return false;
    }
    return true;
  }

  if (status === 'failed') {
    return (<><Head><title>Equipment</title></Head><Center py={20}><Text color="red.300">Failed to load equipment.</Text></Center></>);
  }
  if (Object.keys(equip).length === 0) {
    return (<><Head><title>Equipment</title></Head></>);
  }

  const shown = Object.values(equip).filter(matches);

  return (
    <>
      <Head><title>Equipment</title></Head>
      <VStack align="stretch" spacing={4} py={4}>
        <HStack>
          <Heading size="xl">Equipment</Heading>
          <Badge colorScheme="yellow" borderRadius="full" px={2}>{shown.length}</Badge>
        </HStack>

        <Flex gap={3} wrap="wrap" align="center"
          bg="surface.elevated" borderWidth="1px" borderColor="surface.border" borderRadius="xl" p={3}>
          <ButtonGroup isAttached size="sm">
            {TYPES.map((ty) => (
              <Button key={ty} variant={type === ty ? 'solid' : 'outline'}
                colorScheme={type === ty ? 'yellow' : 'gray'}
                borderColor="surface.border"
                onClick={() => setType(type === ty ? null : ty)}>
                {ty}
              </Button>
            ))}
          </ButtonGroup>
          <ButtonGroup isAttached size="sm">
            {GRADES.map((g) => (
              <Button key={g} variant={grades[g] ? 'solid' : 'outline'}
                bg={grades[g] ? rankColor(g) : undefined}
                color={grades[g] ? 'blackAlpha.800' : rankColor(g)}
                borderColor={rankColor(g)}
                _hover={{ bg: grades[g] ? rankColor(g) : 'whiteAlpha.100' }}
                onClick={() => setGrades({ ...grades, [g]: !grades[g] })}>{rankTag(g)}</Button>
            ))}
          </ButtonGroup>
          <ButtonGroup isAttached size="sm">
            {EXCHANGES.map((x) => (
              <Button key={x} variant={exchange === x ? 'solid' : 'outline'}
                colorScheme={EXCHANGE_META[x].color}
                onClick={() => setExchange(exchange === x ? null : x)}>
                {EXCHANGE_META[x].label}
              </Button>
            ))}
          </ButtonGroup>
          <InputGroup size="sm" maxW="260px" ml="auto">
            <Input placeholder="Search name or code" value={searchTerm} borderColor="surface.border"
              onChange={(e) => setSearchTerm(e.target.value)} />
            <InputRightElement>
              {searchTerm ? (
                <IconButton aria-label="Clear" icon={<CloseIcon boxSize={2.5} />} size="xs"
                  variant="ghost" onClick={() => setSearchTerm('')} />
              ) : (
                <SearchIcon color="gray.500" boxSize={3} />
              )}
            </InputRightElement>
          </InputGroup>
        </Flex>

        {shown.length === 0 ? (
          <Center py={16}><Text color="gray.500">No equipment matches the current filters.</Text></Center>
        ) : (
          SLOTS.map((slot) => {
            const items = shown.filter((e) => e.slot === slot.label)
              .sort((a, b) => (b.grade - a.grade) || t(a.name).localeCompare(t(b.name)));
            if (!items.length) return null;
            return (
              <Box key={slot.label} borderWidth="1px" borderColor="surface.border" borderRadius="xl"
                overflow="hidden" bg="surface.elevated">
                <Box px={4} py={2} bg="blackAlpha.300" borderBottomWidth="1px" borderBottomColor="surface.border">
                  <HStack spacing={2}>
                    {equipIcon(slot.icon) ? <Image src={equipIcon(slot.icon)!} alt={slot.label} boxSize="20px" /> : null}
                    <Heading size="sm" color="gray.200">{slot.label}</Heading>
                    <Badge colorScheme="gray" borderRadius="full">{items.length}</Badge>
                  </HStack>
                </Box>
                <Box p={3}>
                  <SimpleGrid columns={[3, 4, 6, 8]} spacing={3}>
                    {items.map((e) => (
                      <EquipTile key={e.id} equip={e} onClick={() => dispatch(setActiveEquip(e.id))} />
                    ))}
                  </SimpleGrid>
                </Box>
              </Box>
            );
          })
        )}
      </VStack>
    </>
  );
}

// Compact equip tile: icon (rank-colored border) + name; opens the equip modal.
function EquipTile({ equip, onClick }: { equip: EquipData; onClick: () => void }) {
  return (
    <Box onClick={onClick} cursor="pointer" role="group" textAlign="center">
      <Box position="relative" boxSize="56px" mx="auto" borderRadius="lg" overflow="hidden"
        bg="blackAlpha.500" borderWidth="2px" borderColor={rankColor(equip.grade)}
        transition="transform .12s ease" _groupHover={{ transform: 'translateY(-2px)' }} p="4px">
        {equip.icon ? (
          <Image src={`/images/icons/${equip.icon}.png`} alt={equip.icon} objectFit="contain" w="100%" h="100%" />
        ) : null}
        {equip.exchange ? (
          <Badge position="absolute" top="2px" right="2px" fontSize="9px" px={1} borderRadius="sm"
            colorScheme={EXCHANGE_META[equip.exchange].color}
            title={`${EXCHANGE_META[equip.exchange].label} exchange`}>
            {equip.exchange === 'IW' ? 'IW' : 'SC'}
          </Badge>
        ) : null}
      </Box>
      <Text fontSize="2xs" color="gray.300" noOfLines={2} mt={1} lineHeight="1.1">{t(equip.name)}</Text>
    </Box>
  );
}
