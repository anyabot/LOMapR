import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectWorld, fetchWorldAsync, fetchWorldStageAsync } from '@/store/worldSlice';
import { selectImage, fetchImageAsync } from '@/store/imageSlice';
import { fetchItemsAsync } from '@/store/itemSlice';
import { selectRegion } from '@/store/regionSlice';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router'
import Error from 'next/error';
import Link from 'next/link';
import SimpleCard from '@/components/simpleCard';
import CopyLink from '@/components/copyLink';
import EventImage from '@/components/eventImage';
import EventExchangeView from '@/components/eventExchange';
import EventDrops, { useEventDrops } from '@/components/eventDrops';
import { pickText } from '@/components/storyLines';
import { fetchExchange, fetchStoryIndex } from '@/lib/fetchData';
import { t } from '@/lib/strings';
import { useTranslationVersion } from '@/lib/translationVersion';
import { nextLink } from '@/lib/hubLink';
import { EventExchange, World } from '@/interfaces/world';
import type { StoryIndex, SubStoryGroup } from '@/interfaces/story';
import {
  AspectRatio, Badge, Box, Button, Collapse, Flex, HStack, Image, SimpleGrid, Text, VStack,
} from '@altterisk/game-hub/ui';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon } from '@altterisk/game-hub/ui';
import { Breadcrumbs, PageHeader, Panel } from '@altterisk/game-hub';
import { Seo } from '@/components/seo';

const BANNER_RATIO = 320 / 156;

const TYPE_LABEL: Record<string, string> = {
  current: 'Current Event', permanent: 'Permanent Event', past: 'Past Event', story: 'Main Story',
};

const storyHref = (id: string, zone?: number, scene?: string) =>
  `/story?world=${encodeURIComponent(id)}${zone ? `&zone=${zone}` : ''}${scene ? `&scene=${encodeURIComponent(scene)}` : ''}`;

const eventNum = (w: string) => Number(w.replace(/^Ev/, ''));

function SubStoryCard({ worldId, zone, group }: { worldId: string; zone: number; group: SubStoryGroup }) {
  return (
    <Box borderWidth="1px" borderColor="surface.border" borderRadius="lg" bg="surface.elevated" p={3}>
      <HStack spacing={3} mb={2}>
        {group.icon ? (
          <Image src={`/images/icons/${group.icon}.png`} alt="" boxSize={9} borderRadius="full" flexShrink={0} />
        ) : null}
        <Text fontWeight="bold" noOfLines={1} flex="1" minW={0}>{pickText(group.name, 'en')}</Text>
        <Badge borderRadius="full" px={2}>{group.stories.length}</Badge>
      </HStack>
      <VStack align="stretch" spacing={0}>
        {group.stories.map((s) => (
          <HStack key={s.scene} as={Link} href={storyHref(worldId, zone, s.scene)} spacing={2} px={2} py={1}
            borderRadius="md" _hover={{ bg: 'whiteAlpha.100', color: 'accent.300' }}>
            <Text fontSize="xs" color="gray.500" w="1.5em" flexShrink={0}>{s.no}</Text>
            <Text fontSize="sm" noOfLines={1}>{pickText(s.name, 'en')}</Text>
          </HStack>
        ))}
      </VStack>
    </Box>
  );
}

export default function Home() {
  useTranslationVersion();
  const world = useAppSelector(selectWorld);
  const imagelink = useAppSelector(selectImage);
  const region = useAppSelector(selectRegion);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const id = router.query.id as string;
  const [story, setStory] = useState<StoryIndex | null>(null);
  const [exchange, setExchange] = useState<EventExchange | null>(null);

  useEffect(() => {
    dispatch(fetchWorldAsync());
    dispatch(fetchImageAsync());
    dispatch(fetchItemsAsync());
  }, [dispatch, region]);

  useEffect(() => {
    let live = true;
    setStory(null);
    fetchStoryIndex(region).then((d) => { if (live) setStory(d); });
    return () => { live = false; };
  }, [region]);

  const worldLoaded = !!(id && world[id]);
  useEffect(() => { if (worldLoaded) dispatch(fetchWorldStageAsync(id)); }, [worldLoaded, id, region, dispatch]);
  const drops = useEventDrops(id ? world[id] : undefined);
  const [dropsOpen, setDropsOpen] = useState(false);

  const hasExchange = !!(id && world[id]?.exchange);
  useEffect(() => {
    let live = true;
    setExchange(null);
    if (hasExchange) fetchExchange(region, id).then((d) => { if (live) setExchange(d); });
    return () => { live = false; };
  }, [region, id, hasExchange]);

  if (Object.keys(world).length === 0 || !id) {
    return (
      <>
        <Seo title="Zone List" />
      </>
    );
  }
  if (!(id in world)) {
    return <Error statusCode={404} />;
  }

  const w = world[id];
  const banner = imagelink[w.banner || ''] || undefined;
  const storyZones = story?.[id] ?? [];
  const hasStory = storyZones.some(Boolean);
  const subs = storyZones.flatMap((z, i) => (z?.sub ?? []).map((g) => ({ zone: i + 1, group: g })));
  const subCount = subs.reduce((n, s) => n + s.group.stories.length, 0);

  const events = Object.entries(world)
    .filter(([k, v]: [string, World]) => v.type !== 'story' && /^Ev\d+$/.test(k))
    .map(([k]) => k)
    .sort((a, b) => eventNum(a) - eventNum(b));
  const at = events.indexOf(id);
  const prev = at > 0 ? events[at - 1] : null;
  const next = at >= 0 && at < events.length - 1 ? events[at + 1] : null;
  const navButton = (target: string, dir: 'prev' | 'next') => (
    <Button as={Link} href={`/world/detail?id=${encodeURIComponent(target)}`} size="sm" variant="ghost"
      leftIcon={dir === 'prev' ? <ChevronLeftIcon /> : undefined}
      rightIcon={dir === 'next' ? <ChevronRightIcon /> : undefined}
      maxW="100%" whiteSpace="normal" textAlign={dir === 'prev' ? 'left' : 'right'} ml={dir === 'next' ? 'auto' : undefined}>
      {t(world[target].title)}
    </Button>
  );

  return (
    <>
      <Seo title={t(w.title)} description={`${t(w.title)} in Last Origin: stages, story and rewards.`} />
      <VStack align="stretch" spacing={6} py={4}>
        <Breadcrumbs renderLink={nextLink} items={[{ label: 'World', href: '/world' }, { label: t(w.title) }]} />

        {prev || next ? (
          <Flex gap={2} wrap="wrap" justify="space-between">
            {prev ? navButton(prev, 'prev') : <Box />}
            {next ? navButton(next, 'next') : null}
          </Flex>
        ) : null}

        <Flex direction={{ base: 'column', md: 'row' }} gap={5} align={{ md: 'center' }}>
          {banner ? (
            <Box w={{ base: '100%', md: '360px' }} flexShrink={0} borderRadius="xl" overflow="hidden"
              borderWidth="1px" borderColor="surface.border" bg="blackAlpha.400">
              <AspectRatio ratio={BANNER_RATIO}>
                <EventImage src={banner} alt={w.id} fit="contain" />
              </AspectRatio>
            </Box>
          ) : null}
          <VStack align="stretch" spacing={3} flex="1" minW={0}>
            <PageHeader
              title={t(w.title)}
              subtitle={w.desc && t(w.desc) !== w.desc ? t(w.desc) : undefined}
              badges={
                <HStack spacing={2} wrap="wrap">
                  <Badge colorScheme={w.type === 'current' ? 'green' : 'accent'} borderRadius="full" px={2}>
                    {TYPE_LABEL[w.type] ?? w.type}
                  </Badge>
                  <Badge borderRadius="full" px={2}>{w.zones.length} {w.zones.length === 1 ? 'zone' : 'zones'}</Badge>
                  {w.end ? <Badge colorScheme="orange" borderRadius="full" px={2}>Ends {w.end}</Badge> : null}
                </HStack>
              }
              actions={<CopyLink path={`/world/detail?id=${encodeURIComponent(id)}`} />}
            />
            {hasStory ? (
              <HStack spacing={2} wrap="wrap">
                <Button as={Link} href={storyHref(id)} size="sm" colorScheme="accent">
                  Read story{subCount ? ` · ${subCount} sub stories` : ''}
                </Button>
              </HStack>
            ) : null}
          </VStack>
        </Flex>

        <Panel title="Zones">
          <SimpleGrid columns={[2, 3, 3, 4, 5]} spacing={4}>
            {w.zones.map((z, index) => (
              <Link key={index} href={`/world/stage?id=${encodeURIComponent(id)}&zone=${index + 1}`}>
                <SimpleCard img={imagelink[z.img]} alt={`${id}-${index}`}>{t(z.title)}</SimpleCard>
              </Link>
            ))}
          </SimpleGrid>
        </Panel>

        {subs.length ? (
          <Panel title="Sub Stories" note={`${subCount} stories`}>
            <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={3}>
              {subs.map(({ zone, group }, i) => (
                <SubStoryCard key={i} worldId={id} zone={zone} group={group} />
              ))}
            </SimpleGrid>
          </Panel>
        ) : null}

        {drops.units.length || drops.equips.length ? (
          <Panel title="Drops" note={`${drops.units.length} units · ${drops.equips.length} equipment`}
            actions={
              <Button size="sm" variant="ghost" onClick={() => setDropsOpen((o) => !o)}
                rightIcon={dropsOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}>
                {dropsOpen ? 'Hide' : 'Show'}
              </Button>
            }>
            <Collapse in={dropsOpen} animateOpacity unmountOnExit>
              <EventDrops {...drops} />
            </Collapse>
          </Panel>
        ) : null}

        {exchange?.shops.length ? (
          <Panel title="Exchange" note={`${exchange.shops.reduce((n, s) => n + s.items.length, 0)} items`}>
            <EventExchangeView exchange={exchange} />
          </Panel>
        ) : null}
      </VStack>
    </>
  );
}
