import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectIW, selectIWStatus, fetchIWAsync } from '@/store/IWSlice';
import { selectImage, fetchImageAsync } from '@/store/imageSlice';
import { useEffect } from 'react';
import Link from 'next/link'
import SimpleCard from '@/components/simpleCard';
import { SimpleGrid, Heading, Divider } from '@chakra-ui/react';
import Head from 'next/head';

export default function Home() {

  const iw = useAppSelector(selectIW);
  const iwStatus = useAppSelector(selectIWStatus)
  const imagelink = useAppSelector(selectImage)

  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchIWAsync());
    dispatch(fetchImageAsync());
  }, [dispatch]);
  
  function getImage(id:string) {
    return imagelink[id] ? imagelink[id] : undefined
  }
  function getCurrent() {
    return iw.seasons.filter(s => Date.parse(s.date[1] + " GMT+9") >= Date.now()) ;
  }
  function getOld() {
    return iw.seasons.filter(s => Date.parse(s.date[1] + " GMT+9") < Date.now()) ;
  }
  if (iwStatus == "failed"){
    return (<>
      <Head>
        <title>Infinite War List</title>
      </Head>
      <h1>Fetch Failed</h1>
    </>)
  }
  if (iw.seasons.length === 0) {
    return (<>
      <Head>
        <title>Infinite War List</title>
      </Head>
      <h1>Loading</h1>
    </>)
  }
  else {
    return (
      <>
        <Head>
          <title>Infinite War List</title>
        </Head>
        <Heading size="2xl" p={4}>Current Raid Boss</Heading>
        <Divider/>
        <SimpleGrid columns={[1,2,2,3,4]} spacing={4}>
          {getCurrent().map(s => (<Link key={s.key} href={`/iw/${encodeURIComponent(s.key)}`}><SimpleCard img={getImage(s.monster)} alt={s.key}>{s.key}</SimpleCard></Link>))}
        </SimpleGrid>
        <Heading size="2xl" p={4}>Old Raid Bosses</Heading>
        <Divider/>
        <SimpleGrid columns={[1,2,2,3,4]} spacing={4}>
          {getOld().map(s => (<Link key={s.key} href={`/iw/${encodeURIComponent(s.key)}`}><SimpleCard img={getImage(s.monster)} alt={s.key}>{s.key}</SimpleCard></Link>))}
        </SimpleGrid>
      </>
    )
  }
}
