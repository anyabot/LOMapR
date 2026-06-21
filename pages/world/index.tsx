import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectWorld, selectWorldStatus, fetchWorldAsync } from '@/store/worldSlice';
import { selectImage, fetchImageAsync } from '@/store/imageSlice';
import { useEffect } from 'react';
import Link from 'next/link'
import SimpleCard from '@/components/simpleCard';
import EventImage from '@/components/eventImage';
import { t } from '@/lib/strings';
import { useTranslationVersion } from '@/lib/translationVersion';
import { World } from '@/interfaces/world';
import {
  SimpleGrid, Heading, Divider, HStack, Badge, Center, VStack, Text,
  Box, AspectRatio,
} from '@chakra-ui/react';
import { ArrowForwardIcon } from '@chakra-ui/icons';
import Head from 'next/head';

export default function Home() {
  useTranslationVersion();
  const world = useAppSelector(selectWorld);
  const worldStatus = useAppSelector(selectWorldStatus);
  const imagelink = useAppSelector(selectImage);
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchWorldAsync());
    dispatch(fetchImageAsync());
  }, [dispatch]);

  function sortNumeric(a: World, b: World) {
    return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
  }
  const getImage = (id: string) => imagelink[id] || undefined;
  const href = (w: World) => `/world/detail?id=${encodeURIComponent(w.id)}`;

  const all = Object.values(world);
  const inTypes = (...types: string[]) =>
    all.filter((w) => types.includes(w.type)).sort(sortNumeric);

  const current = all.find((w) => w.type === 'current');
  const story = inTypes('story');
  const permanent = inTypes('permanent');
  const past = inTypes('past', 'event', 'old');
  const others = inTypes('others', 'training', 'sanctum', 'daily', 'challenge');

  const Frame = ({ children }: { children: React.ReactNode }) => (
    <>
      <Head><title>World List</title></Head>
      {children}
    </>
  );

  if (worldStatus == 'failed') {
    return <Frame><Center py={20}><Text color="red.300">Failed to load worlds.</Text></Center></Frame>;
  }
  if (Object.keys(world).length === 0) {
    return <Frame><></></Frame>;
  }

  // section of square icon cards
  const IconSection = (title: string, items: World[]) =>
    items.length === 0 ? null : (
      <VStack key={title} align="stretch" spacing={3}>
        <HStack>
          <Heading size="xl">{title}</Heading>
          <Badge colorScheme="yellow" borderRadius="full" px={2}>{items.length}</Badge>
        </HStack>
        <Divider />
        <SimpleGrid columns={[2, 3, 3, 4, 5]} spacing={4}>
          {items.map((w) => (
            <Link key={w.id} href={href(w)}>
              <SimpleCard img={getImage(w.img)} alt={w.id}>{t(w.title)}</SimpleCard>
            </Link>
          ))}
        </SimpleGrid>
      </VStack>
    );

  // wide banner card (permanent events)
  // permanent-event banners are 320x156 (~2.05:1)
  const BANNER_RATIO = 320 / 156;
  const BannerCard = (w: World) => (
    <Box
      key={w.id}
      as={Link}
      href={href(w)}
      position="relative"
      borderRadius="xl"
      overflow="hidden"
      borderWidth="1px"
      borderColor="surface.border"
      transition="transform .12s ease, border-color .12s ease, box-shadow .12s ease"
      _hover={{ transform: 'translateY(-3px)', borderColor: 'yellow.400', boxShadow: '0 6px 18px rgba(0,0,0,.45)' }}
    >
      <AspectRatio ratio={BANNER_RATIO}>
        <EventImage src={getImage(w.banner || w.img)} alt={w.id} fit="contain" />
      </AspectRatio>
      <Box position="absolute" bottom={0} left={0} right={0} pt={8} px={3} pb={2}
        bgGradient="linear(to-t, blackAlpha.900 20%, blackAlpha.800 55%, transparent)">
        <Text fontWeight="bold" color="white" noOfLines={2} textShadow="0 1px 3px rgba(0,0,0,0.9)">{t(w.title)}</Text>
      </Box>
    </Box>
  );

  return (
    <Frame>
      <VStack align="stretch" spacing={8} py={4}>
        {/* Current event hero: square icon left, title right */}
        {current ? (
          <HStack
            as={Link}
            href={href(current)}
            w="100%"
            spacing={[4, 5, 6]}
            p={[3, 4]}
            bg="surface.elevated"
            borderRadius="xl"
            borderWidth="1px"
            borderColor="yellow.500"
            color="white"
            transition="transform .12s ease, box-shadow .12s ease"
            _hover={{ transform: 'translateY(-3px)', boxShadow: '0 8px 24px rgba(0,0,0,.5)', textDecoration: 'none', color: 'white' }}
          >
            <Box boxSize={['90px', '120px', '140px']} flexShrink={0} borderRadius="lg" overflow="hidden">
              <EventImage src={getImage(current.img)} alt={current.id} fit="cover" borderRadius="lg" />
            </Box>
            <VStack align="start" spacing={2} flex={1} minW={0}>
              <Badge colorScheme="yellow">Current Event</Badge>
              <Heading size={['lg', 'xl', '2xl']} lineHeight={1.1} color="white">{t(current.title)}</Heading>
              <HStack color="yellow.300" fontSize={['sm', 'md']}>
                <Text>View stages</Text>
                <ArrowForwardIcon />
              </HStack>
            </VStack>
          </HStack>
        ) : null}

        {IconSection('Story', story)}

        {permanent.length ? (
          <VStack align="stretch" spacing={3}>
            <HStack>
              <Heading size="xl">Permanent Events</Heading>
              <Badge colorScheme="yellow" borderRadius="full" px={2}>{permanent.length}</Badge>
            </HStack>
            <Divider />
            <SimpleGrid columns={[2, 3, 4, 4]} spacing={4}>
              {permanent.map(BannerCard)}
            </SimpleGrid>
          </VStack>
        ) : null}

        {IconSection('Past Events', past)}
        {IconSection('Others', others)}
      </VStack>
    </Frame>
  );
}
