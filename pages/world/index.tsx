import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectWorld, selectWorldStatus, fetchWorldAsync } from '@/store/worldSlice';
import { selectImage, fetchImageAsync } from '@/store/imageSlice';
import { useEffect } from 'react';
import EventImage from '@/components/eventImage';
import { t } from '@/lib/strings';
import { useTranslationVersion } from '@/lib/translationVersion';
import { useListUrl, useUrlText } from '@/lib/listUrl';
import { nextLink } from '@/lib/hubLink';
import { World } from '@/interfaces/world';
import {
  SimpleGrid, Heading, Divider, HStack, Badge, Center, VStack, Text,
  Box, AspectRatio, Image,
} from '@chakra-ui/react';
import { BannerCard, CardGrid, EmptyState, EntityTile, SearchBox } from '@altterisk/game-hub';
import { textMatch } from '@altterisk/game-hub/filters';
import Head from 'next/head';

// permanent-event banners are 320x156
const BANNER_RATIO = 320 / 156;

export default function Home() {
  useTranslationVersion();
  const world = useAppSelector(selectWorld);
  const worldStatus = useAppSelector(selectWorldStatus);
  const imagelink = useAppSelector(selectImage);
  const dispatch = useAppDispatch();
  const { list, ready } = useListUrl();
  const [query, setQuery] = useUrlText(list, ready);

  useEffect(() => {
    dispatch(fetchWorldAsync());
    dispatch(fetchImageAsync());
  }, [dispatch]);

  function sortNumeric(a: World, b: World) {
    return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
  }
  const getImage = (id: string) => imagelink[id] || undefined;
  const href = (w: World) => `/world/detail?id=${encodeURIComponent(w.id)}`;

  const all = Object.values(world).filter((w) => !query || textMatch(query, [t(w.title), w.id]));
  const inTypes = (...types: string[]) =>
    all.filter((w) => types.includes(w.type)).sort(sortNumeric);

  const current = all.find((w) => w.type === 'current');
  const story = inTypes('story');
  const permanent = inTypes('permanent');
  const past = inTypes('past', 'event', 'old');
  const others = inTypes('others', 'training', 'sanctum', 'daily', 'challenge');
  const matched = !!current || story.length + permanent.length + past.length + others.length > 0;

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

  const SectionHead = ({ title, count }: { title: string; count: number }) => (
    <>
      <HStack>
        <Heading size="xl">{title}</Heading>
        <Badge colorScheme="accent" borderRadius="full" px={2}>{count}</Badge>
      </HStack>
      <Divider />
    </>
  );

  const IconSection = (title: string, items: World[]) =>
    items.length === 0 ? null : (
      <VStack key={title} align="stretch" spacing={3}>
        <SectionHead title={title} count={items.length} />
        <CardGrid min={220}>
          {items.map((w) => (
            <EntityTile key={w.id} href={href(w)} renderLink={nextLink} title={t(w.title)}
              icon={getImage(w.img) ? <Image src={getImage(w.img)} alt={w.id} /> : undefined} />
          ))}
        </CardGrid>
      </VStack>
    );

  const banner = (w: World) => (
    <AspectRatio ratio={BANNER_RATIO}>
      <EventImage src={getImage(w.banner || w.img)} alt={w.id} fit="contain" />
    </AspectRatio>
  );

  return (
    <Frame>
      <VStack align="stretch" spacing={8} py={4}>
        <Box maxW="360px">
          <SearchBox value={query} onChange={setQuery} placeholder="Search worlds" />
        </Box>

        {current ? (
          <Box maxW="md">
            <BannerCard href={href(current)} renderLink={nextLink} highlight badge="Current Event"
              art={banner(current)} title={t(current.title)} />
          </Box>
        ) : null}

        {IconSection('Story', story)}

        {permanent.length ? (
          <VStack align="stretch" spacing={3}>
            <SectionHead title="Permanent Events" count={permanent.length} />
            <SimpleGrid columns={[2, 3, 4, 4]} spacing={4}>
              {permanent.map((w) => (
                <BannerCard key={w.id} href={href(w)} renderLink={nextLink} art={banner(w)} title={t(w.title)} />
              ))}
            </SimpleGrid>
          </VStack>
        ) : null}

        {IconSection('Past Events', past)}
        {IconSection('Others', others)}

        {!matched ? <EmptyState title="No worlds match the search." /> : null}
      </VStack>
    </Frame>
  );
}
