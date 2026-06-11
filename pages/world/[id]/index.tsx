import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectWorld, fetchWorldAsync } from '@/store/worldSlice';
import { selectImage, fetchImageAsync } from '@/store/imageSlice';
import { useEffect } from 'react';
import { useRouter } from 'next/router'
import Error from 'next/error';
import Link from 'next/link';
import SimpleCard from '@/components/simpleCard';
import { t } from '@/lib/strings';
import {
  SimpleGrid, Heading, Divider, Button, HStack, Badge, Spinner, Center, VStack,
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import Head from 'next/head';

export default function Home() {
  const world = useAppSelector(selectWorld);
  const imagelink = useAppSelector(selectImage);
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchWorldAsync());
    dispatch(fetchImageAsync());
  }, [dispatch]);

  const router = useRouter();
  const id = router.query.id as string;

  if (Object.keys(world).length === 0 || !id) {
    return (
      <>
        <Head><title>Zone List</title></Head>
        <Center py={20}><Spinner size="xl" color="yellow.400" /></Center>
      </>
    );
  }
  if (!(id in world)) {
    return <Error statusCode={404} />;
  }

  const w = world[id];

  return (
    <>
      <Head><title>{t(w.title)}</title></Head>
      <VStack align="stretch" spacing={4} py={4}>
        <Button as={Link} href="/world" leftIcon={<ArrowBackIcon />} colorScheme="gray" variant="outline" size="sm" alignSelf="start">
          Back
        </Button>
        <HStack>
          <Heading size="xl">{t(w.title)}</Heading>
          <Badge colorScheme="yellow" borderRadius="full" px={2}>{w.zones.length} zones</Badge>
        </HStack>
        <Divider />
        <SimpleGrid columns={[2, 3, 3, 4, 5]} spacing={4}>
          {w.zones.map((z, index) => (
            <Link key={index} href={`/world/${id}/${index + 1}`}>
              <SimpleCard img={imagelink[z.img]} alt={`${id}-${index}`}>{t(z.title)}</SimpleCard>
            </Link>
          ))}
        </SimpleGrid>
      </VStack>
    </>
  );
}
