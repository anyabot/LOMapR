import { ReactNode, useEffect } from 'react'
import styles from "@/styles/custom.module.css"
import { EnemyIndex } from '@/interfaces/world';
import { useAppSelector, useAppDispatch } from '@/hooks';
import { setActive, fetchEnemyAsync, selectEnemy } from '@/store/enemySlice';
import { selectImage, fetchImageAsync } from '@/store/imageSlice';
import { Image, Text, Tag, Grid, GridItem } from '@chakra-ui/react';
import { t } from '@/lib/strings';

interface Props {
  wave: (EnemyIndex | null)[]
}

export default function EnemyGrid({wave}: Props) {
  const imagelink = useAppSelector(selectImage)
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(fetchEnemyAsync());
    dispatch(fetchImageAsync())
  }, [dispatch]);
  const details = useAppSelector(selectEnemy);

  // fixed cell + image sizes so cells never reflow when an image loads late or a
  // name is 1 vs 2 lines.
  const cellW = ["84px", "104px", "128px", "140px", "150px"]
  const cellH = ["112px", "132px", "156px", "168px", "178px"]
  const imgSize = ["52px", "64px", "80px"]
  // reserve exactly 2 lines for the name
  const nameH = ["1.8em", "2.0em", "2.2em"]

  function makeGrid() {
    let ret: ReactNode[] = []
    for (let index = 0; index < 9; index++){
      const e = wave[index]
      if (e && e.id && details[e.id]) {
        ret.push(
          <GridItem
            key={index}
            w={cellW}
            h={cellH}
            p={2}
            className={styles["enemy-card"]}
            onClick={() => dispatch(setActive([e.id, e.lv]))}
          >
            <Image
              src={imagelink[details[e.id].img]}
              alt={`${details[e.id].img}`}
              boxSize={imgSize}
              minH={imgSize}
              objectFit="cover"
              borderRadius="md"
              bg="blackAlpha.400"
              flexShrink={0}
            />
            <Text as="b" fontSize={["2xs", "xs", "sm"]} noOfLines={2} lineHeight={1.1}
              w="100%" h={nameH} display="flex" alignItems="center" justifyContent="center">
              {t(details[e.id]?.name)}
            </Text>
            <Tag size="sm" variant="subtle" colorScheme="yellow" fontSize="xs">Lv. {e.lv}</Tag>
          </GridItem>
        )
      } else {
        // empty slot: subtle dark placeholder, same fixed footprint
        ret.push(
          <GridItem
            key={index}
            w={cellW}
            h={cellH}
            borderRadius="10px"
            borderWidth="1px"
            borderStyle="dashed"
            borderColor="whiteAlpha.200"
            bg="blackAlpha.300"
          />
        )
      }
    }
    return ret
  }
  return (
    <Grid templateColumns='repeat(3, 1fr)' templateRows='repeat(3, 1fr)' gap={{base: 1.5, md: 2.5}}>
      {makeGrid()}
    </Grid>
  )
}