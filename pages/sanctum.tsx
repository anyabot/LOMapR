import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectSanctum, selectSanctumStatus, fetchSanctumAsync } from '@/store/sanctumSlice';
import { useEffect, useState } from 'react';
import Link from 'next/link'
import Head from 'next/head'
import { ButtonGroup, Button, Center, Select, Circle, HStack, VStack, Text, Image, Divider } from '@chakra-ui/react';
import { ArrowLeftIcon, ArrowRightIcon } from '@chakra-ui/icons';
import { Floor, Wave } from '@/interfaces/sanctum';
import EnemyGrid from '@/components/enemyGrid';
import styles from "@/styles/custom.module.css"

export default function Home() {

  const sanctum = useAppSelector(selectSanctum);
  const sanctumStatus = useAppSelector(selectSanctumStatus)
  const [active, setActive] = useState("EW01")
  const [floor, setFloor] = useState(1)
  const [actualFloor, setActualFloor] = useState<Floor | null>(null)
  const [wave, setWave] = useState(0)
  const [possibleWaves, setPossibleWaves] = useState<Wave[] | null>(null)
  const [wavenum, setWaveNum] = useState(0)
  const [actualWave, setActualWave] = useState<Wave | null>(null)

  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchSanctumAsync());
  }, [dispatch]);
  useEffect(() => {
    sanctum[active] ? floor >= sanctum[active].length ? setFloor(sanctum[active].length - 1) : null : null
    sanctum[active] ? sanctum[active][floor] ? setActualFloor(sanctum[active][floor]) : null : null
  }, [sanctum, active, floor]);
  useEffect(() => {
    actualFloor?.waves ? wave >= actualFloor.waves.length ? setWave(actualFloor.waves.length - 1) : null : null
    actualFloor?.waves[wave] ? setPossibleWaves(actualFloor.waves[wave]) : null
  }, [sanctum, actualFloor, wave]);
  useEffect(() => {
    possibleWaves ? wavenum >= possibleWaves.length ? setWaveNum(possibleWaves.length - 1) : null : null
    possibleWaves? possibleWaves[wavenum] ? setActualWave(possibleWaves[wavenum]) : null : null
  }, [sanctum, possibleWaves, wavenum]);

  function decreaseWave() {
    wave > 0 ? setWave(wave - 1) : null
  }
  function increaseWave() {
    wave < actualFloor!.waves.length - 1 ? setWave(wave + 1) : null
  }

  if (sanctumStatus == "failed"){
    return (<>
      <Head>
        <title>Sanctum of Alteration</title>
      </Head>
      <h1>Fetch Failed</h1>
    </>)
  }
  if (Object.keys(sanctum).length === 0) {
    return (<>
      <Head>
        <title>Sanctum of Alteration</title>
      </Head>
      <h1>Loading</h1>
    </>)
  }
  else {
    return (
      <>
        <Head>
          <title>Sanctum of Alteration</title>
        </Head>
      
        <VStack as={Center}>
          <Text as="b" fontSize="6xl" textAlign="center">Sanctum of Alteration</Text>
          <ButtonGroup isAttached size={["sm", "sm", "md", "md", "md"]}>
            {Object.keys(sanctum).map((e, index) => (<Button key={e} isActive={active == e} colorScheme="red" onClick={() => setActive(e)}>Sanctum {index + 1}</Button>))}
          </ButtonGroup>
          <Select value={floor} onChange={(e) => setFloor(parseInt(e.target.value))}>
            {sanctum[active].map((e, index) => {return e ? (<option key={index} value={index}>Floor {index}</option>) : null})}
          </Select>
          <Divider/>

          {actualFloor ? <HStack >{actualFloor.waves.map((e, index) => 
            <div onClick={() => setWave(index)} key={index} className={styles["wave-button"]}>
              {index == wave ? (<Image
                src="/images/map-current.png"
                alt="current-wave"
                className={styles["wave-current"]}
              />) : null}
              <Image src="/images/profile/NightChick.png" alt={`wave-${index}`} />
            </div>)}</HStack> : null}
          {possibleWaves ? (<VStack><Select value={wavenum} onChange={(e) => setWaveNum(parseInt(e.target.value))}>
            {possibleWaves.map((e, index) => {return e ? (<option key={index} value={index}>Formation {index + 1}</option>) : null})}
          </Select>
          <Text as="b">Formations for this Wave: {possibleWaves.length}</Text></VStack>) : null}
          {actualWave ? 
            <HStack as={Center}>
            <Circle as={Button} size='40px' bg='red' color='white' isDisabled={wave == 0} onClick={decreaseWave}>
              <ArrowLeftIcon />
            </Circle>
            <EnemyGrid wave={actualWave.e}/>
            <Circle as={Button} size='40px' bg='red' color='white' isDisabled={wave == actualFloor!.waves.length - 1} onClick={increaseWave}>
              <ArrowRightIcon />
            </Circle>
          </HStack > : null }
        </VStack>
      </>
    )
  }
}
