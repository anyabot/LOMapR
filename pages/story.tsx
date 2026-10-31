import { useEffect, useMemo, useState } from 'react';
import { Seo } from '@/components/seo';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import {
  Accordion, AccordionButton, AccordionIcon, AccordionItem, AccordionPanel, AspectRatio, Badge, Box,
  Button, Center, Divider, Flex, Heading, HStack, Image, SimpleGrid, Spinner, Text, VStack,
} from '@altterisk/game-hub/ui';
import {
  BannerCard, Breadcrumbs, CardGrid, EmptyState, EntityTile, PageHeader, SegmentedButtons,
} from '@altterisk/game-hub';
import { createSetting } from '@altterisk/game-hub/persist';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { selectRegion } from '@/store/regionSlice';
import { fetchWorldAsync, selectWorld } from '@/store/worldSlice';
import { fetchImageAsync, selectImage } from '@/store/imageSlice';
import { fetchCharStories, fetchCharStoryText, fetchStoryIndex, fetchStoryZone } from '@/lib/fetchData';
import { fetchItemsAsync } from '@/store/itemSlice';
import { RewardPanel } from '@/components/rewardList';
import { t } from '@/lib/strings';
import { useTranslationVersion } from '@/lib/translationVersion';
import { nextLink } from '@/lib/hubLink';
import CopyLink from '@/components/copyLink';
import EventImage from '@/components/eventImage';
import StoryLines, { pickText, type StoryLang } from '@/components/storyLines';
import { STAGE_ICON_SRC, type World } from '@/interfaces/world';
import type {
  CharStoryGroup, CharStoryIndex, CharStorySquad, StoryIndex, StoryScene, StoryZone, StoryZoneText,
} from '@/interfaces/story';

const DESCRIPTION = 'Last Origin story reader: main story, character stories and event stories.';

const BANNER_RATIO = 320 / 156;

const langSetting = createSetting<StoryLang>({
  key: 'lomapr.storyLang',
  initial: 'en',
  sanitize: (raw) => (raw === 'ko' ? 'ko' : 'en'),
});
const setLang = langSetting.set;
const useStoryLang = (): StoryLang => langSetting.use()[0];

const LANG_OPTIONS = [{ value: 'en', label: 'EN' }, { value: 'ko', label: 'KO' }] as const;

function LangToggle() {
  const lang = useStoryLang();
  return <SegmentedButtons label="Text language" options={LANG_OPTIONS} selected={lang}
    onToggle={(v) => setLang(v === 'ko' ? 'ko' : 'en')} />;
}

const worldHref = (id: string) => `/story?world=${encodeURIComponent(id)}`;
const zoneHref = (id: string, zone: number) => `${worldHref(id)}&zone=${zone}`;
const squadHref = (key: string) => `/story?squad=${encodeURIComponent(key)}`;

const STORY_WORLDS = ['StoryNew', 'Story'];

function storyZones(index: StoryIndex, id: string): number[] {
  return (index[id] ?? []).flatMap((z, i) => (z ? [i + 1] : []));
}

export default function StoryPage() {
  useTranslationVersion();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const region = useAppSelector(selectRegion);
  const world = useAppSelector(selectWorld);
  const images = useAppSelector(selectImage);
  const [index, setIndex] = useState<StoryIndex | null>(null);
  const [chars, setChars] = useState<CharStoryIndex | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    dispatch(fetchWorldAsync());
    dispatch(fetchImageAsync());
  }, [dispatch, region]);

  useEffect(() => {
    let live = true;
    setIndex(null);
    setFailed(false);
    setChars(null);
    fetchStoryIndex(region).then((data) => {
      if (!live) return;
      if (data) setIndex(data); else setFailed(true);
    });
    fetchCharStories(region).then((data) => { if (live) setChars(data); });
    return () => { live = false; };
  }, [region]);

  const worldId = typeof router.query.world === 'string' ? router.query.world : null;
  const zoneParam = typeof router.query.zone === 'string' ? parseInt(router.query.zone, 10) : NaN;
  const scene = typeof router.query.scene === 'string' ? router.query.scene : null;
  const squadKey = typeof router.query.squad === 'string' ? router.query.squad : null;
  const storyKey = typeof router.query.story === 'string' ? router.query.story : null;

  if (failed) {
    return <><Seo title="Story" description={DESCRIPTION} /><EmptyState title="Story data failed to load." /></>;
  }
  if (!index || !router.isReady) {
    return (
      <>
        <Seo title="Story" description={DESCRIPTION} />
        <Center py={20}><Spinner /></Center>
      </>
    );
  }
  const squad = squadKey ? chars?.squads.find((q) => q.key === squadKey) : undefined;
  if (squadKey && !chars) return <><Seo title="Story" description={DESCRIPTION} /><Center py={20}><Spinner /></Center></>;
  if (squad && chars) return <SquadView squad={squad} groups={chars.groups} story={storyKey} />;
  if (worldId && index[worldId]) {
    const zones = storyZones(index, worldId);
    const zoneNum = !Number.isNaN(zoneParam) ? zoneParam : zones.length === 1 ? zones[0] : NaN;
    const zone = index[worldId][zoneNum - 1];
    if (zone) {
      return <Reader worldId={worldId} world={world[worldId]} zoneNum={zoneNum} zone={zone} zones={zones}
        scene={scene} />;
    }
    return <ZoneList worldId={worldId} world={world[worldId]} index={index} images={images} />;
  }
  return <StoryList index={index} chars={chars} world={world} images={images} />;
}

function StoryList({ index, chars, world, images }: {
  index: StoryIndex; chars: CharStoryIndex | null; world: Record<string, World>; images: Record<string, string>;
}) {
  const lang = useStoryLang();
  const worlds = Object.keys(index).map((id) => world[id]).filter((w): w is World => !!w);
  const byId = (a: World, b: World) => a.id.localeCompare(b.id, undefined, { numeric: true });
  const mains = STORY_WORLDS.filter((id) => world[id] && index[id]).map((id) => world[id]);
  const current = worlds.find((w) => w.type === 'current');
  const permanent = worlds.filter((w) => w.type === 'permanent').sort(byId);
  const past = worlds.filter((w) => w.type !== 'story' && w.type !== 'current' && w.type !== 'permanent').sort(byId);
  const img = (key: string) => images[key] || undefined;
  const count = (id: string) => {
    const zones = index[id] ?? [];
    const stages = zones.reduce((n, z) => n + (z?.stages.length ?? 0), 0);
    const subs = zones.reduce((n, z) => n + (z?.sub?.reduce((m, g) => m + g.stories.length, 0) ?? 0), 0);
    return [`${stages} stages`, subs ? `${subs} sub stories` : ''].filter(Boolean).join(' · ');
  };
  const banner = (w: World) => (
    <AspectRatio ratio={BANNER_RATIO}>
      <EventImage src={img(w.banner || w.img)} alt={w.id} fit="contain" />
    </AspectRatio>
  );
  const Section = ({ title, n, children }: { title: string; n: number; children: React.ReactNode }) => (
    <VStack align="stretch" spacing={3}>
      <HStack>
        <Heading size="lg">{title}</Heading>
        <Badge colorScheme="accent" borderRadius="full" px={2}>{n}</Badge>
      </HStack>
      <Divider />
      {children}
    </VStack>
  );

  return (
    <>
      <Seo title="Story" description={DESCRIPTION} />
      <VStack align="stretch" spacing={8} py={4}>
        <Flex align="center" gap={3} wrap="wrap">
          <Heading size="xl">Story</Heading>
          <Box flex="1" />
          <LangToggle />
        </Flex>

        {mains.map((m) => (
          <Section key={m.id} title={m.title} n={storyZones(index, m.id).length}>
            <CardGrid min={220}>
              {m.zones.map((z, i) => index[m.id][i] ? (
                <EntityTile key={i} href={zoneHref(m.id, i + 1)} renderLink={nextLink} title={t(z.title)}
                  subtitle={`${index[m.id][i]!.stages.length} stages`}
                  icon={img(z.img) ? <Image src={img(z.img)} alt="" /> : undefined} />
              ) : null)}
            </CardGrid>
          </Section>
        ))}

        {chars && chars.squads.length > 0 && (
          <Section title="Character Stories" n={chars.squads.length}>
            <CardGrid min={220}>
              {chars.squads.map((q) => {
                const n = q.groups.reduce((m, g) => m + (chars.groups[g]?.stories.length ?? 0), 0);
                return (
                  <EntityTile key={q.key} href={squadHref(q.key)} renderLink={nextLink} title={pickText(q.name, lang)}
                    subtitle={`${q.groups.length} characters · ${n} stories`}
                    icon={q.icon ? <Image src={`/images/common/${q.icon}.png`} alt="" /> : undefined} />
                );
              })}
            </CardGrid>
          </Section>
        )}

        {current && (
          <Box maxW="md">
            <BannerCard href={worldHref(current.id)} renderLink={nextLink} highlight badge="Current Event"
              art={banner(current)} title={t(current.title)} />
          </Box>
        )}

        {permanent.length > 0 && (
          <Section title="Permanent Events" n={permanent.length}>
            <SimpleGrid columns={[2, 3, 4, 4]} spacing={4}>
              {permanent.map((w) => (
                <BannerCard key={w.id} href={worldHref(w.id)} renderLink={nextLink} art={banner(w)}
                  title={t(w.title)} />
              ))}
            </SimpleGrid>
          </Section>
        )}

        {past.length > 0 && (
          <Section title="Past Events" n={past.length}>
            <CardGrid min={220}>
              {past.map((w) => (
                <EntityTile key={w.id} href={worldHref(w.id)} renderLink={nextLink} title={t(w.title)}
                  subtitle={count(w.id)} icon={img(w.img) ? <Image src={img(w.img)} alt="" /> : undefined} />
              ))}
            </CardGrid>
          </Section>
        )}
      </VStack>
    </>
  );
}

function ZoneList({ worldId, world, index, images }: {
  worldId: string; world?: World; index: StoryIndex; images: Record<string, string>;
}) {
  const title = world ? t(world.title) : worldId;
  return (
    <>
      <Seo title={`${title} - Story`} description={DESCRIPTION} />
      <VStack align="stretch" spacing={4} py={4}>
        <Breadcrumbs renderLink={nextLink} items={[{ label: 'Story', href: '/story' }, { label: title }]} />
        <PageHeader title={title} actions={<LangToggle />} />
        <CardGrid min={220}>
          {(index[worldId] ?? []).map((z, i) => {
            if (!z) return null;
            const zone = world?.zones[i];
            const subs = z.sub?.reduce((n, g) => n + g.stories.length, 0) ?? 0;
            return (
              <EntityTile key={i} href={zoneHref(worldId, i + 1)} renderLink={nextLink}
                title={zone ? t(zone.title) : `Chapter ${i + 1}`}
                subtitle={[`${z.stages.length} stages`, subs ? `${subs} sub stories` : ''].filter(Boolean).join(' · ')}
                icon={zone && images[zone.img] ? <Image src={images[zone.img]} alt="" /> : undefined} />
            );
          })}
        </CardGrid>
      </VStack>
    </>
  );
}

const AT_LABEL = { start: 'Before battle', mid: 'During battle', end: 'After battle' } as const;

function sceneLabel(s: StoryScene) {
  if (s.at === 'story') return '';
  return s.at === 'mid' && s.wave ? `${AT_LABEL.mid} · wave ${s.wave}` : AT_LABEL[s.at];
}

function Reader({ worldId, world, zoneNum, zone, zones, scene }: {
  worldId: string; world?: World; zoneNum: number; zone: StoryZone; zones: number[]; scene: string | null;
}) {
  const region = useAppSelector(selectRegion);
  const lang = useStoryLang();
  const [text, setText] = useState<StoryZoneText | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    setText(null);
    setFailed(false);
    fetchStoryZone(region, worldId, zoneNum).then((data) => {
      if (!live) return;
      if (data) setText(data); else setFailed(true);
    });
    return () => { live = false; };
  }, [region, worldId, zoneNum]);

  const initial = useMemo(() => {
    const at = scene ? zone.stages.findIndex((s) => s.scenes.some((e) => e.id === scene)) : -1;
    return at >= 0 ? [at] : [];
  }, [zone, scene]);
  const [open, setOpen] = useState<number[]>(initial);
  useEffect(() => setOpen(initial), [initial]);

  const worldTitle = world ? t(world.title) : worldId;
  const zoneTitle = world?.zones[zoneNum - 1] ? t(world.zones[zoneNum - 1].title) : `Chapter ${zoneNum}`;
  const pos = zones.indexOf(zoneNum);
  const prev = pos > 0 ? zones[pos - 1] : null;
  const next = pos >= 0 && pos < zones.length - 1 ? zones[pos + 1] : null;
  const lines = (id: string) => (text ? <StoryLines lines={text.scenes[id] ?? []} names={text.names} lang={lang} />
    : failed ? <Text fontSize="sm" color="red.300">Story text failed to load.</Text> : <Spinner size="sm" />);

  return (
    <>
      <Seo title={`${zoneTitle} - Story`} description={DESCRIPTION} />
      <VStack align="stretch" spacing={4} py={4}>
        <Breadcrumbs renderLink={nextLink} items={[
          { label: 'Story', href: '/story' },
          ...(zones.length > 1 ? [{ label: worldTitle, href: worldHref(worldId) }] : []),
          { label: zoneTitle },
        ]} />
        <PageHeader title={zoneTitle} subtitle={zones.length > 1 ? worldTitle : undefined}
          actions={<HStack spacing={2} wrap="wrap"><LangToggle />
            <CopyLink path={zoneHref(worldId, zoneNum)} /></HStack>} />

        <Accordion allowMultiple index={open} onChange={(i) => setOpen(Array.isArray(i) ? i : [i])}>
          {zone.stages.map((st, i) => (
            <AccordionItem key={st.id} borderColor="whiteAlpha.200">
              <AccordionButton px={2} py={3} _hover={{ bg: 'whiteAlpha.50' }}>
                <HStack flex="1" spacing={3} minW={0} textAlign="left">
                  <Image src={STAGE_ICON_SRC[st.subtype]} alt={st.subtype} boxSize={6} flexShrink={0} />
                  <Box minW={0}>
                    <HStack spacing={2} wrap="wrap">
                      <Text fontWeight="bold" fontSize="sm">{st.title}</Text>
                      {st.subtype !== 'Main' && <Badge fontSize="0.6rem">{st.subtype}</Badge>}
                    </HStack>
                    <Text fontSize="xs" color="gray.400" noOfLines={1}>{t(st.name)}</Text>
                  </Box>
                </HStack>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel px={{ base: 1, md: 4 }} pb={4}>
                {open.includes(i) && (
                  <VStack align="stretch" spacing={4} maxW="48rem" mx="auto">
                    {st.scenes.map((s) => (
                      <VStack key={s.id} align="stretch" spacing={2}>
                        <SceneHeading scene={s} />
                        {lines(s.id)}
                      </VStack>
                    ))}
                  </VStack>
                )}
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>

        {zone.sub && zone.sub.length > 0 && (
          <VStack align="stretch" spacing={3} pt={4}>
            <Heading size="md">Sub Stories</Heading>
            <Divider />
            {zone.sub.map((g, gi) => (
              <SubStoryGroupView key={gi} group={g} lines={lines} lang={lang} scene={scene} />
            ))}
          </VStack>
        )}

        {(prev || next) && (
          <Flex gap={2} wrap="wrap" justify="space-between" pt={2}>
            {prev ? <Button as={NextLink} href={zoneHref(worldId, prev)} size="sm" variant="outline">
              Previous chapter</Button> : <Box />}
            {next ? <Button as={NextLink} href={zoneHref(worldId, next)} size="sm" variant="outline">
              Next chapter</Button> : <Box />}
          </Flex>
        )}
      </VStack>
    </>
  );
}

function SubStoryGroupView({ group, lines, lang, scene }: {
  group: NonNullable<StoryZone['sub']>[number];
  lines: (id: string) => React.ReactNode;
  lang: StoryLang;
  scene: string | null;
}) {
  const initial = useMemo(() => {
    const at = scene ? group.stories.findIndex((s) => s.scene === scene) : -1;
    return at >= 0 ? [at] : [];
  }, [group, scene]);
  const [open, setOpen] = useState<number[]>(initial);
  useEffect(() => setOpen(initial), [initial]);
  return (
    <Box borderWidth="1px" borderColor="whiteAlpha.200" borderRadius="md" p={2}>
      <HStack spacing={3} px={2} py={1}>
        {group.icon && <Image src={`/images/icons/${group.icon}.png`} alt="" boxSize={8} borderRadius="full" />}
        <Text fontWeight="bold">{pickText(group.name, lang)}</Text>
      </HStack>
      <Accordion allowMultiple index={open} onChange={(i) => setOpen(Array.isArray(i) ? i : [i])}>
        {group.stories.map((s, i) => (
          <AccordionItem key={s.scene} borderColor="whiteAlpha.200">
            <AccordionButton px={2} py={2} _hover={{ bg: 'whiteAlpha.50' }}>
              <HStack flex="1" spacing={2} minW={0} textAlign="left">
                {s.icon && <Image src={`/images/icons/${s.icon}.png`} alt="" boxSize={6} borderRadius="full" />}
                <Text fontSize="xs" color="gray.500">{s.no}</Text>
                <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>{pickText(s.name, lang)}</Text>
              </HStack>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel px={{ base: 1, md: 4 }} pb={4}>
              {open.includes(i) && <Box maxW="48rem" mx="auto">{lines(s.scene)}</Box>}
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </Box>
  );
}

function SceneHeading({ scene }: { scene: StoryScene }) {
  const label = sceneLabel(scene);
  return label ? <Text fontSize="xs" fontWeight="semibold" color="accent.300" textTransform="uppercase"
    letterSpacing="wide">{label}</Text> : null;
}

function SquadView({ squad, groups, story }: {
  squad: CharStorySquad; groups: Record<string, CharStoryGroup>; story: string | null;
}) {
  const dispatch = useAppDispatch();
  const region = useAppSelector(selectRegion);
  const lang = useStoryLang();
  const [texts, setTexts] = useState<Record<string, StoryZoneText | null>>({});

  useEffect(() => { dispatch(fetchItemsAsync()); }, [dispatch, region]);
  useEffect(() => {
    let live = true;
    setTexts({});
    for (const g of squad.groups) {
      fetchCharStoryText(region, g).then((data) => { if (live) setTexts((t) => ({ ...t, [g]: data })); });
    }
    return () => { live = false; };
  }, [region, squad]);

  const title = pickText(squad.name, lang);
  return (
    <>
      <Seo title={`${title} - Story`} description={DESCRIPTION} />
      <VStack align="stretch" spacing={4} py={4}>
        <Breadcrumbs renderLink={nextLink} items={[{ label: 'Story', href: '/story' }, { label: title }]} />
        <PageHeader title={title} subtitle={squad.desc ? pickText(squad.desc, lang) : undefined}
          art={squad.icon ? <Image src={`/images/common/${squad.icon}.png`} alt="" boxSize={12} /> : undefined}
          actions={<HStack spacing={2} wrap="wrap"><LangToggle /><CopyLink path={squadHref(squad.key)} /></HStack>} />
        {squad.groups.map((gk) => groups[gk] && (
          <CharGroupView key={gk} group={groups[gk]} text={texts[gk]} loaded={gk in texts}
            lang={lang} story={story} />
        ))}
      </VStack>
    </>
  );
}

function CharGroupView({ group, text, loaded, lang, story }: {
  group: CharStoryGroup; text: StoryZoneText | null | undefined; loaded: boolean;
  lang: StoryLang; story: string | null;
}) {
  const initial = useMemo(() => {
    const at = story ? group.stories.findIndex((s) => s.key === story) : -1;
    return at >= 0 ? [at] : [];
  }, [group, story]);
  const [open, setOpen] = useState<number[]>(initial);
  useEffect(() => setOpen(initial), [initial]);
  const lines = (id: string) => (text ? <StoryLines lines={text.scenes[id] ?? []} names={text.names} lang={lang} />
    : loaded ? <Text fontSize="sm" color="red.300">Story text failed to load.</Text> : <Spinner size="sm" />);
  return (
    <Box borderWidth="1px" borderColor="whiteAlpha.200" borderRadius="md" p={2}>
      <HStack spacing={3} px={2} py={1}>
        {group.icon && <Image src={`/images/icons/${group.icon}.png`} alt="" boxSize={10} borderRadius="full" />}
        <Box minW={0}>
          <HStack spacing={2} wrap="wrap">
            <Text fontWeight="bold">{pickText(group.name, lang)}</Text>
            {group.type === 'squad' && <Badge fontSize="0.6rem">Squad story</Badge>}
          </HStack>
          <Text fontSize="xs" color="gray.400">{pickText(group.unit, lang)}</Text>
        </Box>
      </HStack>
      <Accordion allowMultiple index={open} onChange={(i) => setOpen(Array.isArray(i) ? i : [i])}>
        {group.stories.map((s, i) => (
          <AccordionItem key={s.key} borderColor="whiteAlpha.200">
            <AccordionButton px={2} py={2} _hover={{ bg: 'whiteAlpha.50' }}>
              <HStack flex="1" spacing={2} minW={0} textAlign="left">
                {s.icon && <Image src={`/images/icons/${s.icon}.png`} alt="" boxSize={6} borderRadius="full" />}
                <Text fontSize="xs" color="gray.500">{s.no ?? i + 1}</Text>
                <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>{pickText(s.name, lang)}</Text>
                {s.stage && <Badge fontSize="0.6rem" colorScheme="red" flexShrink={0}>Battle {s.stage.title}</Badge>}
              </HStack>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel px={{ base: 1, md: 4 }} pb={4}>
              {open.includes(i) && (
                <VStack align="stretch" spacing={4} maxW="48rem" mx="auto">
                  {pickText(s.desc, lang) && <Text fontSize="sm" color="gray.400">{pickText(s.desc, lang)}</Text>}
                  {s.unlock && (
                    <Text fontSize="xs" color="gray.500">
                      Unlock: {s.unlock.map((u) => pickText(u, lang)).join(' · ')}
                    </Text>
                  )}
                  {s.stage?.rewards?.reward_f && (
                    <RewardPanel title={`First clear · ${s.stage.title}`} rewards={s.stage.rewards.reward_f}
                      tone="yellow" />
                  )}
                  {s.scenes.map((sc) => (
                    <VStack key={sc.id} align="stretch" spacing={2}>
                      <SceneHeading scene={sc} />
                      {lines(sc.id)}
                    </VStack>
                  ))}
                </VStack>
              )}
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </Box>
  );
}
