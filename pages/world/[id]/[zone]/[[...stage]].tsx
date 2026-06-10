import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectWorld, fetchWorldAsync } from '@/store/worldSlice';
import { Stage, Zone } from '@/interfaces/world';
import { t } from '@/lib/strings';
import { useEffect, useState, useLayoutEffect } from 'react';
import { useRouter } from 'next/router'
import EnemyGrid from '@/components/enemyGrid'
import StageGrid from '@/components/stageGrid'
import Error from 'next/error';
import Link from 'next/link';
import styles from "@/styles/custom.module.css"
import { Box, Image, VStack, HStack, Center, Tag, Text, Divider, Circle, Button } from '@chakra-ui/react';
import { ArrowLeftIcon, ArrowRightIcon, ArrowBackIcon } from '@chakra-ui/icons';
import Head from 'next/head';

export default function Home() {

  const world = useAppSelector(selectWorld);
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(fetchWorldAsync());
  }, [dispatch]);
  const router = useRouter()
  const id = router.query.id as string
  const zone = router.query.zone as string
  const real_zone_index = parseInt(zone) - 1
  const [realZone, setRealZone] = useState<Zone | undefined | null>(null)
  const stage = router.query.stage ? router.query.stage[0]: ""
  const [currStage, setCurrStage] = useState(stage)
  const [realCurrStage, setRealCurrStage] = useState<Stage | undefined | null>(null)
  const [currWave, setCurrWave] = useState(0)

  useEffect(() => setCurrStage(stage), [stage])
  useEffect(() => {
    world[id]? world[id].zones ? world[id].zones[real_zone_index]? setRealZone(world[id].zones[real_zone_index]) : null : null : null
  }, [world, id, real_zone_index]);
  useEffect(() => {
    realZone ? setRealCurrStage(findStage()) : null
  }, [realZone, currStage]);
  useLayoutEffect(() => {
    if (currWave && realCurrStage) {
      currWave >= 0 ? null : setCurrWave(0)
      currWave <= realCurrStage!.waves.length - 1 ? null : setCurrWave(realCurrStage!.waves.length - 1)
    }
  }, [realCurrStage, currWave])

  // all stages in the zone (flat list or flattened subzones), for lookup
  function allStages(z: Zone): Stage[] {
    return z.subzones ? z.subzones.flat() : z.stages
  }
  function findStage() {
    if (realZone) {
      return allStages(realZone).find(e => e.title.toLowerCase() == currStage.toLowerCase())
    }
    return null
  }
  function decreaseWave() {
    currWave > 0 ? setCurrWave(currWave - 1) : null
  }
  function increaseWave() {
    currWave < realCurrStage!.waves.length - 1 ? setCurrWave(currWave + 1) : null
  }
  if (Object.keys(world).length === 0 || !id || !zone) {
    return (<>
      <Head>
        <title>Stage List</title>
      </Head>
      <h1>Loading</h1>
    </>)
  }
  else if (!(id in world) || !(real_zone_index in world[id].zones)) {
    return     (<>
      <Error statusCode={404}/>
    </>)
  }
  else {
    let z = world[id].zones[real_zone_index]
    const maps: Stage[][] = z.subzones ? z.subzones : [z.stages]

    return (
      <>
      <Head>
        <title>{t(z.title)}</title>
      </Head>
      <Button as={Link} href={`/world/${id}`} leftIcon={<ArrowBackIcon />} colorScheme='blackAlpha' variant='solid'>
          Back
        </Button>
        <h2>{t(z.title)}</h2>
        {maps.map((stages, i) => (
          <Box key={i} mb={3} p={2} bg="blackAlpha.800" w="100%" overflowX="auto">
            <StageGrid stages={stages} selected={currStage} onSelect={setCurrStage} />
          </Box>
        ))}
        <Divider/>
        {realCurrStage ? realCurrStage!.title ? <Tag variant='solid' colorScheme='teal' size="lg" p={4}>{`${realCurrStage.title}: ${realCurrStage.waves.length ? "Battle Stage" : "Story Stage"}`}</Tag> : null: null}
        <VStack as={Center}>
        {realCurrStage ? realCurrStage.waves.length ? <HStack >{realCurrStage.waves.map((e, index) =>
          <div onClick={() => setCurrWave(index)} key={index} className={styles["wave-button"]}>
            {index == currWave ? (<Image
              src="/images/map-current.png"
              alt="current-wave"
              className={styles["wave-current"]}
            />) : null}
            <Image src="/images/profile/NightChick.png" alt={`wave-${index}`} />
          </div>)}</HStack> : null : null}
        {realCurrStage ? realCurrStage.waves.length
        ?<HStack as={Center} gap={8}>
          <Circle as={Button} size='40px' bg='red' color='white' isDisabled={currWave == 0} onClick={decreaseWave}>
            <ArrowLeftIcon />
          </Circle>
          {realCurrStage?.waves[currWave]?.enemies && <EnemyGrid wave={realCurrStage.waves[currWave].enemies}></EnemyGrid>}
          <Circle as={Button} size='40px' bg='red' color='white' isDisabled={currWave == realCurrStage!.waves.length - 1} onClick={increaseWave}>
            <ArrowRightIcon />
          </Circle>
        </HStack >
        : null: null}
        </VStack>
      </>
    )
  }
}
