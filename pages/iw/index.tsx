import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectIW, selectIWStatus, fetchIWAsync } from '@/store/IWSlice';
import { selectImage, fetchImageAsync } from '@/store/imageSlice';
import { useEffect } from 'react';
import { Season } from '@/interfaces/iw';
import {
  SimpleGrid, Heading, Divider, HStack, Badge, Center, VStack, Text,
  AspectRatio, Image,
} from '@altterisk/game-hub/ui';
import { BannerCard } from '@altterisk/game-hub';
import { nextLink } from '@/lib/hubLink';
import { Seo } from '@/components/seo';

const DESCRIPTION = 'Last Origin Infinite War boss seasons and phases.';

// "2025/12/04 02:00:00" -> "Dec 4, 2025"
const fmtDate = (s: string) => {
  const d = new Date(s.replace(/-/g, '/') + ' GMT+9');
  return isNaN(d.getTime())
    ? s
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function Home() {
  const iw = useAppSelector(selectIW);
  const iwStatus = useAppSelector(selectIWStatus);
  const imagelink = useAppSelector(selectImage);
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchIWAsync());
    dispatch(fetchImageAsync());
  }, [dispatch]);

  const getImage = (id: string) => imagelink[id] || undefined;
  const ended = (s: Season) => Date.parse(s.date[1] + ' GMT+9') < Date.now();
  // "Colossus_01" -> "Colossus 01"
  const label = (s: Season) => s.key.replace(/_/g, ' ');

  const current = iw.seasons.filter((s) => !ended(s));
  const old = iw.seasons.filter(ended);

  const Frame = ({ children }: { children: React.ReactNode }) => (
    <>
      <Seo title="Infinite War" description={DESCRIPTION} />
      {children}
    </>
  );

  if (iwStatus == 'failed') {
    return <Frame><Center py={20}><Text color="red.300">Failed to load Infinite War.</Text></Center></Frame>;
  }
  if (iw.seasons.length === 0) {
    return <Frame><></></Frame>;
  }

  const Section = (title: string, items: Season[], highlight: boolean) =>
    items.length === 0 ? null : (
      <VStack align="stretch" spacing={3}>
        <HStack>
          <Heading size="xl">{title}</Heading>
          <Badge colorScheme="accent" borderRadius="full" px={2}>{items.length}</Badge>
        </HStack>
        <Divider />
        <SimpleGrid columns={[1, 2, 2, 3]} spacing={4}>
          {items.map((s) => (
            <BannerCard
              key={s.key}
              href={`/iw/detail?id=${encodeURIComponent(s.key)}`}
              renderLink={nextLink}
              highlight={highlight}
              art={
                // banner art at native 952x560 ratio
                <AspectRatio ratio={952 / 560}>
                  {getImage(s.monster) ? (
                    <Image src={getImage(s.monster)} alt={s.key} objectFit="cover" />
                  ) : (
                    <Center bg="blackAlpha.400" color="gray.500" fontSize="3xl" fontWeight="bold">?</Center>
                  )}
                </AspectRatio>
              }
              title={label(s)}
              window={<>{fmtDate(s.date[0])} &ndash; {fmtDate(s.date[1])}</>}
            />
          ))}
        </SimpleGrid>
      </VStack>
    );

  return (
    <Frame>
      <VStack align="stretch" spacing={8} py={4}>
        {Section('Current Raid Boss', current, true)}
        {Section('Past Raid Bosses', old, false)}
      </VStack>
    </Frame>
  );
}
