import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectWorld, fetchWorldAsync } from '@/store/worldSlice';
import { selectImage, fetchImageAsync } from '@/store/imageSlice';
import { useEffect } from 'react';
import { useRouter } from 'next/router'
import Error from 'next/error';
import Link from 'next/link';
import SimpleCard from '@/components/simpleCard';
import { SimpleGrid, Heading, Divider, Button } from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import Head from 'next/head';

export default function Home() {

  const world = useAppSelector(selectWorld);
  const imagelink = useAppSelector(selectImage)
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchWorldAsync());
    dispatch(fetchImageAsync());
  }, [dispatch]);

  const router = useRouter()
  const id = router.query.id as string

  if (Object.keys(world).length === 0 || !id) {
    return (<>
      <Head>
        <title>Zone List</title>
      </Head>
      <h1>Loading</h1>
    </>)
  }
  else if (!(id in world)) {
    return (<>
      <Error statusCode={404}/>
    </>)
  }
  else {
    let w = world[id]

    return (
      <>
        <Head>
          <title>{w.title}</title>
        </Head>
        <Button as={Link} href={`/world/`} leftIcon={<ArrowBackIcon />} colorScheme='blackAlpha' variant='solid'>
          Back
        </Button>
        <Heading size="2xl" p={4}>{w.title}</Heading>
        <Divider/>
        <SimpleGrid columns={[1,2,2,3,4]} spacing={4}>
          {w.zones.map((z,index) => (<Link key={index} href={`/world/${id}/${index+1}`}><SimpleCard img={imagelink[z.img]} alt={`${id}-${index}`}>{z.title}</SimpleCard></Link>))}
        </SimpleGrid>
      </>
    )
  }
}
