import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectWorld, selectWorldStatus, fetchWorldAsync } from '@/store/worldSlice';
import { selectImage, fetchImageAsync } from '@/store/imageSlice';
import { useEffect } from 'react';
import Link from 'next/link'
import SimpleCard from '@/components/simpleCard';
import { t } from '@/lib/strings';
import { SimpleGrid, Heading, Divider } from '@chakra-ui/react';
import Head from 'next/head';

export default function Home() {

  const world = useAppSelector(selectWorld);
  const worldStatus = useAppSelector(selectWorldStatus)
  const imagelink = useAppSelector(selectImage)

  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchWorldAsync());
    dispatch(fetchImageAsync());
  }, [dispatch]);
  
  function sortNumeric(a:any, b:any) {
    return a.id.localeCompare(b.id, undefined, {
      numeric: true,
      sensitivity: 'base'
    });
  }
  function getImage(id:string) {
    return imagelink[id] ? imagelink[id] : undefined
  }
  const world2 = Object.keys(world).map((key) => {
    let temp = world[key]
    return temp
  });
  function getCurrent() {
    return world2.filter(w => w.type == "current" || w.type == "story").sort(sortNumeric);
  }
  function getEvents() {
    return world2.filter(w => w.type == "event" || w.type == "permanent" || w.type == "old").sort(sortNumeric);
  }
  function getOthers() {
    return world2.filter(w => w.type == "others" || w.type == "training" || w.type == "sanctum" || w.type == "daily" || w.type == "challenge").sort(sortNumeric);
  }
  if (worldStatus == "failed"){
    return (<>
      <Head>
        <title>World List</title>
      </Head>
      <h1>Fetch Failed</h1>
    </>)
  }
  if (Object.keys(world).length === 0) {
    return (<>
      <Head>
        <title>World List</title>
      </Head>
      <h1>Loading</h1>
    </>)
  }
  else {
    return (
      <>
        <Head>
          <title>World List</title>
        </Head>
        <Heading size="2xl" p={4}>Story</Heading>
        <Divider/>
        <SimpleGrid columns={[1,2,2,3,4]} spacing={4}>
          {getCurrent().map(w => (<Link key={w.id} href={`/world/${encodeURIComponent(w.id)}`}><SimpleCard img={getImage(w.img)} alt={w.id}>{t(w.title)}</SimpleCard></Link>))}
        </SimpleGrid>
        <Heading size="2xl" p={4}>Events</Heading>
        <Divider/>
        <SimpleGrid columns={[1,2,2,3,4]} spacing={4}>
          {getEvents().map(w => (<Link key={w.id} href={`/world/${encodeURIComponent(w.id)}`}><SimpleCard img={getImage(w.img)} alt={w.id}>{t(w.title)}</SimpleCard></Link>))}
        </SimpleGrid>
        <Heading size="2xl" p={4}>Others</Heading>
        <Divider/>
        <SimpleGrid columns={[1,2,2,3,4]} spacing={4}>
          {getOthers().map(w => (<Link key={w.id} href={`/world/${encodeURIComponent(w.id)}`}><SimpleCard img={getImage(w.img)} alt={w.id}>{t(w.title)}</SimpleCard></Link>))}
        </SimpleGrid>
      </>
    )
  }
}
