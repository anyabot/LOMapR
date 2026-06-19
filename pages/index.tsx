import { useAppSelector, useAppDispatch } from '../hooks';
import { selectWorld, fetchWorldAsync } from '@/store/worldSlice';
import { selectImage, fetchImageAsync } from '@/store/imageSlice';
import { useEffect } from 'react';
import {
  Heading, Text, Divider, Center, VStack, HStack, Box,
  SimpleGrid, Wrap, WrapItem, Tag, TagLabel, Badge,
  AspectRatio,
} from '@chakra-ui/react';
import { ArrowForwardIcon, ExternalLinkIcon } from '@chakra-ui/icons';
import EventImage from '@/components/eventImage';
import { t } from '@/lib/strings';
import Link from 'next/link';
import Head from 'next/head';

const SECTIONS: [string, string, string][] = [
  ['/units', 'Units', 'Playable units with stats, skills and skins'],
  ['/equipment', 'Equipment', 'All equipment with stats and set effects'],
  ['/world', 'World', 'Story & event stages, waves and enemies'],
  ['/enemies', 'Enemy List', 'Every enemy with stats and skills'],
  ['/sanctum', 'Sanctum of Alteration', 'Floors, restrictions and resource gain'],
  ['/iw', 'Infinite War', 'Boss seasons and phases'],
];

const LINKS: [string, string][] = [
  ['Original Korean Last Origin Map', 'https://lastoriginmap.github.io/index.html'],
  ['Swaytwig (KR Info Site)', 'https://lo.swaytwig.com'],
  ['Arca.live (KR Forum)', 'https://arca.live/b/lastorigin'],
  ['English Last Origin Wiki', 'https://lastorigin.fandom.com/wiki/Last_Origin_Wiki'],
  ['Official Global Discord', 'https://discord.com/invite/tgmbFm3JCA'],
  ['Community Discord', 'https://discord.com/invite/3kqR5XAGUk'],
  ['Community Discord (Alt)', 'https://discord.gg/jPHsNx8'],
];

export default function Home() {
  const world = useAppSelector(selectWorld);
  const imagelink = useAppSelector(selectImage);
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(fetchWorldAsync());
    dispatch(fetchImageAsync());
  }, [dispatch]);

  const id = Object.keys(world).find((k) => world[k].type == 'current');
  const current = id ? world[id] : null;

  return (
    <>
      <Head>
        <title>Last Origin Map</title>
      </Head>

      <VStack spacing={8} align="stretch" py={4}>
        {/* Hero */}
        <VStack spacing={3} textAlign="center">
          <Heading size="2xl" lineHeight={1.3}>
            Last Origin Map
          </Heading>
          <Text fontSize={['md', 'lg']} color="gray.400" maxW="2xl">
            An enemy &amp; stage information site for the mobile game{' '}
            <Text as="span" color="yellow.300" fontWeight="bold">Last Origin</Text>.
          </Text>
        </VStack>

        {/* Current event feature */}
        {current ? (
          <Center>
            <Box
              as={Link}
              href={`/world/detail?id=${encodeURIComponent(current.id)}`}
              w="100%"
              maxW="2xl"
              bg="surface.elevated"
              borderWidth="1px"
              borderColor="surface.border"
              borderRadius="xl"
              overflow="hidden"
              transition="transform .12s ease, border-color .12s ease, box-shadow .12s ease"
              _hover={{ transform: 'translateY(-3px)', borderColor: 'yellow.400', boxShadow: '0 6px 20px rgba(0,0,0,.5)' }}
            >
              <HStack spacing={4} align="stretch">
                <Box w={['120px', '180px', '220px']} flexShrink={0}>
                  <AspectRatio ratio={1}>
                    <EventImage src={imagelink[current.img]} alt={current.id} fit="cover" />
                  </AspectRatio>
                </Box>
                <VStack align="start" justify="center" py={3} pr={4} spacing={1}>
                  <Badge colorScheme="yellow">Current Event</Badge>
                  <Heading size={['sm', 'md', 'lg']}>{t(current.title)}</Heading>
                  <HStack color="yellow.300" fontSize="sm">
                    <Text>View stages</Text>
                    <ArrowForwardIcon />
                  </HStack>
                </VStack>
              </HStack>
            </Box>
          </Center>
        ) : null}

        {/* Section quick-nav */}
        <SimpleGrid columns={[1, 2, 3, 3]} spacing={4}>
          {SECTIONS.map(([href, title, desc]) => (
            <Box
              key={href}
              as={Link}
              href={href}
              bg="surface.elevated"
              borderWidth="1px"
              borderColor="surface.border"
              borderRadius="xl"
              p={4}
              transition="transform .12s ease, border-color .12s ease"
              _hover={{ transform: 'translateY(-3px)', borderColor: 'yellow.400' }}
            >
              <Heading size="md" mb={1}>{title}</Heading>
              <Text fontSize="sm" color="gray.400">{desc}</Text>
            </Box>
          ))}
        </SimpleGrid>

        <Divider />

        {/* External links */}
        <VStack spacing={3}>
          <Heading size="md" color="gray.300">Related Sites</Heading>
          <Wrap justify="center" spacing={3}>
            {LINKS.map(([label, url]) => (
              <WrapItem key={url}>
                <Tag
                  size="lg"
                  borderRadius="full"
                  variant="subtle"
                  colorScheme="blue"
                  as={Link}
                  href={url}
                  target="_blank"
                  _hover={{ bg: 'blue.600', color: 'white' }}
                >
                  <TagLabel>{label}</TagLabel>
                  <ExternalLinkIcon ml={2} />
                </Tag>
              </WrapItem>
            ))}
          </Wrap>
        </VStack>

        <Divider />

        {/* Attribution */}
        <Center>
          <Text textAlign="center" fontSize="xs" color="gray.500" maxW="3xl">
            All resources such as equipment and unit icons, and data values used in
            Valofe&apos;s Last Origin are the property of Valofe. All rights of the
            resources belong to Valofe.
          </Text>
        </Center>
      </VStack>
    </>
  );
}
