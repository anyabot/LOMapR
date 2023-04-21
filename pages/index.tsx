
import { Inter } from 'next/font/google'

import { useAppSelector, useAppDispatch } from '../hooks';
import { selectWorld, selectWorldStatus, fetchWorldAsync } from '@/store/worldSlice';
import { selectImage, fetchImageAsync } from '@/store/imageSlice';
import { useEffect } from 'react';
import { Highlight, Heading, Text, Divider, Center, VStack } from '@chakra-ui/react';
import SimpleCard from '@/components/simpleCard';
import Link from 'next/link';
import HomePageLink from '@/components/hompageLink';
import Head from 'next/head';


const inter = Inter({ subsets: ['latin'] })

export default function Home() {
  const world = useAppSelector(selectWorld);
  const imagelink = useAppSelector(selectImage)
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(fetchWorldAsync());
    dispatch(fetchImageAsync());
  }, [dispatch]);
  const id = Object.keys(world).find(k => world[k].type == "current")
  const current = id ? world[id] : null
  return (
    <>
      <Head>
        <title>Last Origin Map</title>
      </Head>
      {current ? <><Center> <Link href={`/world/${encodeURIComponent(current.id)}`}><SimpleCard img={imagelink[current.img]} key={current.id} alt={current.id} headingSize="lg" direction="row">Current Event:<br/>{current.title}</SimpleCard></Link></Center><Divider/></> : null}
      <Heading textAlign="center" size="2xl">
        <Highlight query={["Last Origin"]} styles={{ px: '1', py: '1', bg: 'orange.100' }}>
        An Enemy Information Site for the Mobile Game Last Origin.
        </Highlight>
      </Heading>

      <Divider />
      <HomePageLink url="https://lastoriginmap.github.io/index.html">Original Korean Last Origin Map</HomePageLink>
      <HomePageLink url="https://lo.swaytwig.com">Original Korean Last Origin Information Site (Swaytwig)</HomePageLink>
      <HomePageLink url="https://arca.live/b/lastorigin">Korean Last Origin Information Forum</HomePageLink>
      <HomePageLink url="https://lastorigin.fandom.com/wiki/Last_Origin_Wiki">English Last Origin Wiki</HomePageLink>
      <HomePageLink url="https://discord.com/invite/3kqR5XAGUk">English Discord Server</HomePageLink>
      <HomePageLink url="https://discord.gg/jPHsNx8">Alternative English Discord Server</HomePageLink>
      <Divider />
      <Text  textAlign="center">
        <Highlight query={["PiG Corporation", "LastOrigin"]} styles={{ px: '1', py: '1', bg: 'blue.100' }}>
          All resources like equipment and unit icon, data values that is used on PiG Corporation&apos;s LastOrigin is the property of PiG Corporation. All rights of the resources belong to PiG Corporation.
        </Highlight>
      </Text>
    </>
  )
}
