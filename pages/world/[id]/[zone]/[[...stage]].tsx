import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectWorld, fetchWorldAsync } from '@/store/worldSlice';
import { Stage, Zone } from '@/interfaces/world';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router'
import EnemyGrid from '@/components/enemyGrid'
import Error from 'next/error';
import Link from 'next/link';
import styles from "@/styles/custom.module.css"
import { Grid, GridItem, Box, Image, VStack, HStack, Center, Tag, Text, Divider, Circle, Button } from '@chakra-ui/react';
import { ArrowLeftIcon, ArrowRightIcon, ArrowBackIcon } from '@chakra-ui/icons';

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
    realZone ? setRealCurrStage(realZone.stages.find(e => e.title.toLowerCase() == currStage.toLowerCase())) : null
  }, [realZone, currStage]);

  const defaultMapType = ["B", "Main", "EX"]
  const defaultFloat: Array<"right"| "left"> = ["right", "left"]
  function makeGrid(a: Array<Array<Stage | null>>, height: number, width: number) {
    let ret = []
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        let cell = a[i][j]
        cell 
        ? ret.push(
          <GridItem onClick={() => setCurrStage(cell!.title)} key={`${i}-${j}`}>
            <Box float={defaultFloat[i % 2]} as={VStack} gap={0}>
              <Image src={`/images/${cell.type ? cell.type : defaultMapType[i]} Stage.png`}/>
              <Text w="100%" p={1} className={cell.title == currStage ? styles["active-stage"] : undefined}>{cell.title}</Text>
            </Box>
          </GridItem>) 
        : ret.push(<GridItem key={`${i}-${j}`}></GridItem>)
      }
    }
    return ret
  }
  function decreaseWave() {
    currWave > 0 ? setCurrWave(currWave - 1) : null
  }
  function increaseWave() {
    currWave < realCurrStage!.wave.length - 1 ? setCurrWave(currWave + 1) : null
  }
  if (Object.keys(world).length === 0) {
    return <h1>Loading</h1>
  }
  else if (!(id in world) || !(real_zone_index in world[id].zones)) {
    return <Error statusCode={404}/>
  }
  else {
    let z = world[id].zones[real_zone_index]
    let [width, height] = z.gridsize
    let grid = [...Array(height)].map(e => Array(width));
    z.stages.forEach(s => {
      let [col, row] = s.grid;
      grid[row][col] = s
    })
    return (
      <>
      <Button as={Link} href={`/world/${id}`} leftIcon={<ArrowBackIcon />} colorScheme='blackAlpha' variant='solid'>
          Back
        </Button>
        <h2>{z.title}</h2>
        <Grid templateRows={`repeat(${height}, 1fr)`} templateColumns={`repeat(${width}, minmax(128px, 1fr))`} p={1} bg="blackAlpha.800" color="yellow.400" w="100%" overflowX="auto">
          {makeGrid(grid, height, width)}
        </Grid>
        <Divider/>
        {realCurrStage ? realCurrStage!.title ? <Tag variant='solid' colorScheme='teal' size="lg" p={4}>{`${realCurrStage.title}: ${realCurrStage.wave ? "Battle Stage" : "Story Stage"}`}</Tag> : null: null}
        <VStack as={Center}>
        {realCurrStage ? realCurrStage.wave ? <HStack >{realCurrStage.wave.map((e, index) => 
          <div onClick={() => setCurrWave(index)} key={index} className={styles["wave-button"]}>
            {index == currWave ? (<Image
              src="/images/map-current.png"
              alt="current-wave"
              className={styles["wave-current"]}
            />) : null}
            <Image src="/images/profile/NightChick.png" alt={`wave-${index}`} />
          </div>)}</HStack> : null : null}
        {realCurrStage ? realCurrStage.wave 
        ?<HStack as={Center} gap={8}>
          <Circle as={Button} size='40px' bg='red' color='white' isDisabled={currWave == 0} onClick={decreaseWave}>
            <ArrowLeftIcon />
          </Circle>
          <EnemyGrid wave={realCurrStage.wave[currWave].enemylist}></EnemyGrid> 
          <Circle as={Button} size='40px' bg='red' color='white' isDisabled={currWave == realCurrStage!.wave.length - 1} onClick={increaseWave}>
            <ArrowRightIcon />
          </Circle>
        </HStack > 
        : null: null}
        </VStack>
      </>
    )
  }
}
