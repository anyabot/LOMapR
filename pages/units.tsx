import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectUnits, selectUnitStatus, fetchUnitsAsync } from '@/store/unitSlice';
import { useEffect, useState } from 'react';
import { UnitData } from '@/interfaces/unit';
import {
  Button, ButtonGroup, Flex, InputGroup, Input, InputRightElement,
  VStack, HStack, Center, Text, Heading, Badge, IconButton, Box, Image, Wrap, WrapItem,
} from '@chakra-ui/react';
import { CloseIcon, SearchIcon } from '@chakra-ui/icons';
import { useRouter } from 'next/router';
import { t } from '@/lib/strings';
import { rankTag, rankColor } from '@/lib/rank';
import Head from 'next/head';

// One table per class type (rows of the page); columns = role; rows = grade.
const TYPES = ['Light', 'Flying', 'Heavy'] as const;
const ROLES = ['Attacker', 'Defender', 'Supporter'] as const;
const BODIES = ['Bioroid', 'AGS'] as const;
// No SSS (grade 6) units exist, so the grid stops at SS. Tags/colors come from
// lib/rank (the official rank colors).
const GRADES = [2, 3, 4, 5] as const;  // B -> SS, top row first is SS below

type TypeKey = (typeof TYPES)[number];
type RoleKey = (typeof ROLES)[number];
type BodyKey = (typeof BODIES)[number];

export default function Units() {
  const units = useAppSelector(selectUnits);
  const status = useAppSelector(selectUnitStatus);
  const dispatch = useAppDispatch();
  const router = useRouter();

  useEffect(() => {
    dispatch(fetchUnitsAsync());
  }, [dispatch]);

  const [searchTerm, setSearchTerm] = useState('');
  const [types, setTypes] = useState<Record<TypeKey, boolean>>({ Light: true, Flying: true, Heavy: true });
  const [roles, setRoles] = useState<Record<RoleKey, boolean>>({ Attacker: true, Defender: true, Supporter: true });
  const [bodies, setBodies] = useState<Record<BodyKey, boolean>>({ Bioroid: true, AGS: true });
  const [grades, setGrades] = useState<Record<number, boolean>>(
    Object.fromEntries(GRADES.map((g) => [g, true])),
  );

  function matches(u: UnitData) {
    if (!types[u.type as TypeKey]) return false;
    if (!roles[u.role as RoleKey]) return false;
    if (!bodies[u.body as BodyKey]) return false;
    if (!grades[u.rarity]) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!t(u.name).toLowerCase().includes(q) && !(u.id || '').toLowerCase().includes(q)) return false;
    }
    return true;
  }

  if (status === 'failed') {
    return (<><Head><title>Units</title></Head><Center py={20}><Text color="red.300">Failed to load units.</Text></Center></>);
  }
  if (Object.keys(units).length === 0) {
    return (<><Head><title>Units</title></Head></>);
  }

  const shown = Object.values(units).filter(matches);
  // active rows/cols follow the toggles, so a filtered-out type/role/grade drops
  // its whole table / column / row from the grid.
  const activeRoles = ROLES.filter((r) => roles[r]);
  const activeGrades = [...GRADES].filter((g) => grades[g]).reverse();  // SS at top

  // cell lookup: type -> role -> grade -> units (name-sorted)
  function cell(type: TypeKey, role: RoleKey, grade: number) {
    return shown
      .filter((u) => u.type === type && u.role === role && u.rarity === grade)
      .sort((a, b) => t(a.name).localeCompare(t(b.name)));
  }

  return (
    <>
      <Head><title>Units</title></Head>
      <VStack align="stretch" spacing={4} py={4}>
        <HStack>
          <Heading size="xl">Units</Heading>
          <Badge colorScheme="yellow" borderRadius="full" px={2}>{shown.length}</Badge>
        </HStack>

        {/* Toolbar: type / role / body / grade filters + search */}
        <Flex gap={3} wrap="wrap" align="center"
          bg="surface.elevated" borderWidth="1px" borderColor="surface.border" borderRadius="xl" p={3}>
          <ButtonGroup isAttached size="sm">
            {TYPES.map((ty) => (
              <Button key={ty} colorScheme="green" variant={types[ty] ? 'solid' : 'outline'}
                onClick={() => setTypes({ ...types, [ty]: !types[ty] })}>{ty}</Button>
            ))}
          </ButtonGroup>
          <ButtonGroup isAttached size="sm">
            {ROLES.map((r) => (
              <Button key={r} colorScheme="red" variant={roles[r] ? 'solid' : 'outline'}
                onClick={() => setRoles({ ...roles, [r]: !roles[r] })}>{r}</Button>
            ))}
          </ButtonGroup>
          <ButtonGroup isAttached size="sm">
            {BODIES.map((b) => (
              <Button key={b} colorScheme="teal" variant={bodies[b] ? 'solid' : 'outline'}
                onClick={() => setBodies({ ...bodies, [b]: !bodies[b] })}>{b}</Button>
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

          <InputGroup size="sm" maxW="260px" ml="auto">
            <Input placeholder="Search name" value={searchTerm} borderColor="surface.border"
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
          <Center py={16}><Text color="gray.500">No units match the current filters.</Text></Center>
        ) : (
          // one table per active class type; columns = active roles, rows = active grades.
          TYPES.filter((ty) => types[ty]).map((type) => (
            <Box key={type} borderWidth="1px" borderColor="surface.border" borderRadius="xl"
              overflow="hidden" bg="surface.elevated">
              <Box px={4} py={2} bg="blackAlpha.300" borderBottomWidth="1px" borderBottomColor="surface.border">
                <Heading size="sm" color="green.200">{type}</Heading>
              </Box>
              <Box overflowX="auto">
                <Box as="table" w="100%" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <Box as="thead">
                    <Box as="tr">
                      <Box as="th" w="44px" />
                      {activeRoles.map((role) => (
                        <Box as="th" key={role} px={2} py={1.5} textAlign="center"
                          borderBottomWidth="1px" borderColor="surface.border"
                          fontSize="xs" color="red.200" textTransform="uppercase" letterSpacing="wide">
                          {role}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  <Box as="tbody">
                    {activeGrades.map((grade) => (
                      <Box as="tr" key={grade}>
                        <Box as="th" px={2} py={2} textAlign="center" verticalAlign="middle"
                          borderTopWidth="1px" borderColor="surface.border">
                          <Badge fontSize="sm" bg={rankColor(grade)} color="blackAlpha.800">{rankTag(grade)}</Badge>
                        </Box>
                        {activeRoles.map((role) => (
                          <Box as="td" key={role} px={2} py={2} verticalAlign="top"
                            borderTopWidth="1px" borderLeftWidth="1px" borderColor="surface.border">
                            <Wrap spacing={2} justify="center">
                              {cell(type, role, grade).map((u) => (
                                <WrapItem key={u.id}>
                                  <UnitTile unit={u} onClick={() => router.push(`/units/${u.id}`)} />
                                </WrapItem>
                              ))}
                            </Wrap>
                          </Box>
                        ))}
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            </Box>
          ))
        )}
      </VStack>
    </>
  );
}

// Compact unit cell: formation portrait + name, links to the detail page.
function UnitTile({ unit, onClick }: { unit: UnitData; onClick: () => void }) {
  return (
    <Box onClick={onClick} cursor="pointer" w="72px" role="group" textAlign="center">
      <Box boxSize="72px" borderRadius="lg" overflow="hidden" bg="blackAlpha.500"
        borderWidth="1px" borderColor="surface.border"
        transition="border-color .12s ease, transform .12s ease"
        _groupHover={{ borderColor: 'yellow.400', transform: 'translateY(-2px)' }}>
        {unit.icon ? (
          <Image src={`/images/icons/${unit.icon}.png`} alt={unit.icon} objectFit="cover" w="100%" h="100%"
            _groupHover={{ transform: 'scale(1.05)' }} transition="transform .2s ease" />
        ) : null}
      </Box>
      <Text fontSize="2xs" color="gray.300" noOfLines={2} mt={1} lineHeight="1.1">
        {t(unit.name)}
      </Text>
    </Box>
  );
}
