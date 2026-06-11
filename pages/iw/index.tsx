import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectIW, selectIWStatus, fetchIWAsync } from '@/store/IWSlice';
import { selectImage, fetchImageAsync } from '@/store/imageSlice';
import { useEffect } from 'react';
import Link from 'next/link'
import { Season } from '@/interfaces/iw';
import {
  SimpleGrid, Heading, Divider, HStack, Badge, Center, VStack, Text,
  Box, AspectRatio, Image,
} from '@chakra-ui/react';
import Head from 'next/head';

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
      <Head><title>Infinite War</title></Head>
      {children}
    </>
  );

  if (iwStatus == 'failed') {
    return <Frame><Center py={20}><Text color="red.300">Failed to load Infinite War.</Text></Center></Frame>;
  }
  if (iw.seasons.length === 0) {
    return <Frame><></></Frame>;
  }

  const Section = (title: string, items: Season[]) =>
    items.length === 0 ? null : (
      <VStack align="stretch" spacing={3}>
        <HStack>
          <Heading size="xl">{title}</Heading>
          <Badge colorScheme="yellow" borderRadius="full" px={2}>{items.length}</Badge>
        </HStack>
        <Divider />
        <SimpleGrid columns={[1, 2, 2, 3]} spacing={4}>
          {items.map((s) => (
            <Link key={s.key} href={`/iw/${encodeURIComponent(s.key)}`}>
              <Box
                position="relative"
                h="100%"
                borderRadius="xl"
                overflow="hidden"
                bg="surface.elevated"
                borderWidth="1px"
                borderColor="surface.border"
                transition="transform .12s ease, border-color .12s ease, box-shadow .12s ease"
                _hover={{
                  transform: 'translateY(-4px)',
                  borderColor: 'yellow.400',
                  boxShadow: '0 8px 20px rgba(0,0,0,.45)',
                }}
                role="group"
              >
                {/* banner art at native 952x560 ratio */}
                <AspectRatio ratio={952 / 560}>
                  {getImage(s.monster) ? (
                    <Image
                      src={getImage(s.monster)}
                      alt={s.key}
                      objectFit="cover"
                      transition="transform .25s ease"
                      _groupHover={{ transform: 'scale(1.04)' }}
                    />
                  ) : (
                    <Center bg="blackAlpha.400" color="gray.500" fontSize="3xl" fontWeight="bold">
                      ?
                    </Center>
                  )}
                </AspectRatio>

                <Box
                  position="absolute"
                  bottom={0}
                  left={0}
                  right={0}
                  px={3}
                  pt={6}
                  pb={2}
                  bgGradient="linear(to-t, blackAlpha.900 30%, blackAlpha.700 70%, transparent)"
                >
                  <Heading size={['sm', 'sm', 'md']} color="white" noOfLines={1} lineHeight={1.2}>
                    {label(s)}
                  </Heading>
                  <Text fontSize="xs" color="gray.300" mt={0.5}>
                    {fmtDate(s.date[0])} &ndash; {fmtDate(s.date[1])}
                  </Text>
                </Box>
              </Box>
            </Link>
          ))}
        </SimpleGrid>
      </VStack>
    );

  return (
    <Frame>
      <VStack align="stretch" spacing={8} py={4}>
        {Section('Current Raid Boss', current)}
        {Section('Past Raid Bosses', old)}
      </VStack>
    </Frame>
  );
}
