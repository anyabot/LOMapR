import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Badge, Box, Button, ButtonGroup, Center, Heading, HStack, Image, Input,
  SimpleGrid, Text, VStack,
} from '@chakra-ui/react';
import SkinViewer from '@/components/skinViewer';
import { NPCS, NPCS_BY_ID, NpcCategory, NpcEntry } from '@/lib/npcs';
import { t } from '@/lib/strings';
import { useTranslationVersion } from '@/lib/translationVersion';

const CATEGORY_LABELS: Record<NpcCategory, string> = {
  character: 'Characters',
  enemy: 'Enemies',
  other: 'Other',
};

const AVAILABLE_CATEGORIES = (Object.keys(CATEGORY_LABELS) as NpcCategory[])
  .filter((key) => NPCS.some((entry) => entry.category === key));

export default function NpcsPage() {
  useTranslationVersion();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<NpcCategory | 'all'>('all');

  const queryId = typeof router.query.id === 'string' ? router.query.id : '';
  const selected = NPCS_BY_ID.get(queryId) || NPCS[0];
  const queryModel = typeof router.query.model === 'string' ? router.query.model : '';
  const activeModel = selected.models.find((model) => model.key === queryModel) || selected.models[0];
  const activeThumbnail = activeModel.thumbnail || selected.thumbnail;

  useEffect(() => {
    if (!router.isReady || queryId) return;
    router.replace({ pathname: '/npcs', query: { id: selected.id } }, undefined, { shallow: true });
  }, [queryId, router, selected.id]);

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return NPCS.filter((entry) => {
      if (category !== 'all' && entry.category !== category) return false;
      return !needle || t(entry.name).toLowerCase().includes(needle) || entry.id.includes(needle) ||
        entry.models.some((model) => model.asset.includes(needle));
    });
  }, [category, search]);

  const selectNpc = (entry: NpcEntry) => {
    router.replace({ pathname: '/npcs', query: { id: entry.id } }, undefined, { shallow: true, scroll: false });
  };

  const selectModel = (key: string) => {
    const query: Record<string, string> = { id: selected.id };
    if (key !== selected.models[0].key) query.model = key;
    router.replace({ pathname: '/npcs', query }, undefined, { shallow: true, scroll: false });
  };

  return (
    <>
      <Head><title>NPC Viewer - LOMapR</title></Head>
      <VStack align="stretch" spacing={5}>
        <Box>
          <Heading size="lg">NPC Viewer</Heading>
          <Text color="gray.400" mt={1}>
            Non-playable character and enemy illustrations found in the game&apos;s 2D model assets.
          </Text>
        </Box>

        <VStack align="stretch" spacing={3} bg="surface.elevated" borderWidth="1px"
          borderColor="surface.border" borderRadius="xl" p={4}>
          <HStack flexWrap="wrap" spacing={2}>
            <Button size="sm" colorScheme={category === 'all' ? 'yellow' : 'gray'}
              variant={category === 'all' ? 'solid' : 'outline'} onClick={() => setCategory('all')}>
              All <Badge ml={2}>{NPCS.length}</Badge>
            </Button>
            {AVAILABLE_CATEGORIES.map((key) => (
              <Button key={key} size="sm" colorScheme={category === key ? 'yellow' : 'gray'}
                variant={category === key ? 'solid' : 'outline'} onClick={() => setCategory(key)}>
                {CATEGORY_LABELS[key]}
              </Button>
            ))}
          </HStack>
          <Input value={search} onChange={(event) => setSearch(event.target.value)}
            placeholder="Search NPC or model key" maxW="360px" />
        </VStack>

        {shown.length === 0 ? (
          <Center py={12}><Text color="gray.500">No NPCs match the current filters.</Text></Center>
        ) : (
          <SimpleGrid columns={{ base: 3, sm: 4, md: 6, lg: 8 }} spacing={3}>
            {shown.map((entry) => {
              const isSelected = entry.id === selected.id;
              return (
                <Box as="button" key={entry.id} onClick={() => selectNpc(entry)} minW={0}
                  borderWidth="2px" borderColor={isSelected ? 'yellow.400' : 'surface.border'}
                  bg={isSelected ? 'yellowAlpha.100' : 'surface.elevated'} borderRadius="lg" overflow="hidden"
                  transition="border-color .12s ease, transform .12s ease"
                  _hover={{ borderColor: 'yellow.300', transform: 'translateY(-2px)' }}>
                  <Box position="relative" w="100%" pt="100%" bg="blackAlpha.400">
                    <Image src={isSelected ? activeThumbnail : entry.thumbnail} alt={t(entry.name)}
                      position="absolute" inset={0} w="100%" h="100%" objectFit="cover" />
                  </Box>
                  <Text px={1} py={2} fontSize="2xs" fontWeight="semibold" noOfLines={2} textAlign="center">
                    {t(entry.name)}
                  </Text>
                </Box>
              );
            })}
          </SimpleGrid>
        )}

        <Box bg="surface.elevated" borderWidth="1px" borderColor="surface.border" borderRadius="xl" p={4}>
          <HStack justify="space-between" align="start" mb={3} flexWrap="wrap">
            <HStack>
              <Image src={activeThumbnail} alt="" boxSize="48px" objectFit="cover" borderRadius="md"
                borderWidth="1px" borderColor="surface.border" />
              <Box>
                <HStack>
                  <Heading size="md">{t(selected.name)}</Heading>
                  {activeModel.hasCensoredVariant && (
                    <Badge colorScheme="orange">Google Play variation</Badge>
                  )}
                </HStack>
                <Text fontSize="xs" color="gray.500" mt={1}>{activeModel.asset}</Text>
              </Box>
            </HStack>
            {selected.models.length > 1 && (
              <ButtonGroup size="sm" isAttached variant="outline">
                {selected.models.map((model) => (
                  <Button key={model.key} colorScheme={activeModel.key === model.key ? 'yellow' : 'gray'}
                    variant={activeModel.key === model.key ? 'solid' : 'outline'}
                    onClick={() => selectModel(model.key)}>
                    {model.thumbnail && <Image src={model.thumbnail} alt="" boxSize="24px" objectFit="cover" mr={1.5} />}
                    {model.name}
                  </Button>
                ))}
              </ButtonGroup>
            )}
          </HStack>
          <SkinViewer key={activeModel.asset} skin={activeModel.asset} viewerKind="fixed" height="65vh" />
        </Box>
      </VStack>
    </>
  );
}
