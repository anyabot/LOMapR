import { ReactNode, useEffect } from 'react'
import styles from "@/styles/custom.module.css"
import { EnemyIndex } from '@/interfaces/world';
import { useAppSelector, useAppDispatch } from '@/hooks';
import { setActive, fetchEnemyAsync, selectEnemy } from '@/store/enemySlice';
import { selectImage, fetchImageAsync } from '@/store/imageSlice';
import { Image, Text, Tag, Grid, GridItem } from '@chakra-ui/react';

interface Props {
  wave: EnemyIndex[]
}

export default function EnemyGrid({wave}: Props) {
  const imagelink = useAppSelector(selectImage)
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(fetchEnemyAsync());
    dispatch(fetchImageAsync())
  }, [dispatch]);
  const details = useAppSelector(selectEnemy);

  function makeGrid() {
    let ret: ReactNode[] = []
    for (let index = 0; index < 9; index++){ 
      let e = wave[index]
      e ? details[e.id]? ret.push(
      <GridItem key={index} w={["120px", "120px", "160px", "160px", "160px"]} bg='gray.400' className={styles["enemy-card"]} onClick={() => dispatch(setActive([e.id, e.lv]))}>
        <Image src={imagelink[details[e.id].img]} alt={`${details[e.id].img}`} boxSize={["80px", "80px", "100px", "100px", "100px"]}/><br/>
        <Text as="b">{details[e.id]?.name}</Text><br/>
        <Tag variant='solid' colorScheme='blue'>Lv. {e.lv}</Tag>
      </GridItem>) 
      : ret.push(<GridItem key={index} w={["120px", "120px", "160px", "160px", "160px"]}  bg='gray.300' className={styles["enemy-card"]}></GridItem>) 
      : ret.push(<GridItem key={index} w={["120px", "120px", "160px", "160px", "160px"]} bg='gray.300' className={styles["enemy-card"]}></GridItem>)
    }
    return ret
  }
  return (
    <>
      <Grid templateColumns='repeat(3, 1fr)' templateRows='repeat(3, 1fr)'  gap={3}>
        {makeGrid()}
      </Grid >
    </>
  )
}