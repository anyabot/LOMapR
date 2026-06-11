import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectEnemy, selectEnemyStatus, fetchEnemyAsync, setActive } from '@/store/enemySlice';
import { selectImage, fetchImageAsync } from '@/store/imageSlice';
import { useEffect, useState } from 'react';
import { EnemyData } from '@/interfaces/enemy';
import {
  Button, ButtonGroup, Flex, InputGroup, Input, InputRightElement, SimpleGrid,
  VStack, HStack, Spinner, Center, Text, Heading, Badge, IconButton,
} from '@chakra-ui/react';
import { CloseIcon, SearchIcon } from '@chakra-ui/icons';
import SimpleCard from '@/components/simpleCard';
import { t } from '@/lib/strings';
import Head from 'next/head';

const ROLES = ['Attacker', 'Defender', 'Supporter'] as const;
const TYPES = ['Light', 'Flying', 'Heavy'] as const;

export default function Home() {
  const enemy = useAppSelector(selectEnemy);
  const enemyStatus = useAppSelector(selectEnemyStatus);
  const imagelink = useAppSelector(selectImage);
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchEnemyAsync());
    dispatch(fetchImageAsync());
  }, [dispatch]);

  const [searchTerm, setSearchTerm] = useState('');
  const [showUnused, setShowUnused] = useState(false);
  const [filterGroup, setFilterGroup] = useState({
    Light: true, Flying: true, Heavy: true,
    Attacker: true, Defender: true, Supporter: true,
  });

  const getImage = (id: string) => imagelink[id] || undefined;

  function handleSwitch(e: keyof typeof filterGroup) {
    setFilterGroup({ ...filterGroup, [e]: !filterGroup[e] });
  }
  function filterButton(e: EnemyData) {
    if (e.role in filterGroup && e.type in filterGroup) {
      return filterGroup[e.role as keyof typeof filterGroup] && filterGroup[e.type as keyof typeof filterGroup];
    }
    return false;
  }
  function filterName(e: EnemyData) {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    // match display name OR the internal code name (e.id)
    return t(e.name).toLowerCase().includes(q) || (e.id || '').toLowerCase().includes(q);
  }
  function filterUsed(e: EnemyData) {
    if (showUnused) return true;
    return e.used ? Object.keys(e.used).length > 0 || e.usedSanctum : false;
  }
  function enemies(list: { [key: string]: EnemyData }) {
    const out: EnemyData[] = [];
    const dupe = new Set<string>();
    for (const key in list) {
      const val = list[key];
      // dedup on the name loc-id (not the resolved text) so different enemies
      // that happen to resolve to the same string are NOT collapsed together.
      if (!dupe.has(val.name) && filterUsed(val) && filterName(val) && filterButton(val)) {
        dupe.add(val.name);
        out.push(val);
      }
    }
    return out;
  }

  if (enemyStatus == 'failed') {
    return (<><Head><title>Enemy List</title></Head><Center py={20}><Text color="red.300">Failed to load enemies.</Text></Center></>);
  }
  if (Object.keys(enemy).length === 0) {
    return (<><Head><title>Enemy List</title></Head><Center py={20}><Spinner size="xl" color="yellow.400" /></Center></>);
  }

  const list = enemies(enemy);

  return (
    <>
      <Head><title>Enemy List</title></Head>
      <VStack align="stretch" spacing={4} py={4}>
        <HStack>
          <Heading size="xl">Enemies</Heading>
          <Badge colorScheme="yellow" borderRadius="full" px={2}>{list.length}</Badge>
        </HStack>

        {/* Toolbar: filters + search */}
        <Flex
          gap={3}
          wrap="wrap"
          align="center"
          bg="surface.elevated"
          borderWidth="1px"
          borderColor="surface.border"
          borderRadius="xl"
          p={3}
        >
          <ButtonGroup isAttached size="sm">
            {ROLES.map((r) => (
              <Button key={r} colorScheme="red" variant={filterGroup[r] ? 'solid' : 'outline'}
                onClick={() => handleSwitch(r)}>{r}</Button>
            ))}
          </ButtonGroup>
          <ButtonGroup isAttached size="sm">
            {TYPES.map((ty) => (
              <Button key={ty} colorScheme="green" variant={filterGroup[ty] ? 'solid' : 'outline'}
                onClick={() => handleSwitch(ty)}>{ty}</Button>
            ))}
          </ButtonGroup>
          <Button size="sm" colorScheme="yellow" variant={showUnused ? 'solid' : 'outline'}
            onClick={() => setShowUnused(!showUnused)}>
            {showUnused ? 'All enemies' : 'Used only'}
          </Button>

          <InputGroup size="sm" maxW="260px" ml="auto">
            <Input
              placeholder="Search name"
              value={searchTerm}
              borderColor="surface.border"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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

        {list.length === 0 ? (
          <Center py={16}><Text color="gray.500">No enemies match the current filters.</Text></Center>
        ) : (
          <SimpleGrid columns={[3, 4, 5, 7, 8]} spacing={3}>
            {list.map((e) => (
              <SimpleCard key={e.id} onClick={() => dispatch(setActive([e.id, 1]))}
                headingSize="xs" img={getImage(e.img)} alt={e.img}>
                {t(e.name)}
              </SimpleCard>
            ))}
          </SimpleGrid>
        )}
      </VStack>
    </>
  );
}
