import { useAppSelector, useAppDispatch } from "@/hooks";
import {
  selectSanctum,
  selectSanctumStatus,
  fetchSanctumAsync,
  setArea,
  setDiff,
  setFloor,
  selectActiveArea,
  selectActiveDiff,
  selectActiveFloor,
  selectFloorData,
} from "@/store/sanctumSlice";
import { useEffect, useState } from "react";
import Link from "next/link";
import Head from "next/head";
import {
  Flex,
  Button,
  Center,
  Select,
  Circle,
  HStack,
  VStack,
  Text,
  Image,
  Divider,
  Box,
} from "@chakra-ui/react";
import { ArrowLeftIcon, ArrowRightIcon } from "@chakra-ui/icons";
import { Floor, Wave } from "@/interfaces/sanctum";
import EnemyGrid from "@/components/enemyGrid";
import styles from "@/styles/custom.module.css";

export default function Home() {
  const sanctum = useAppSelector(selectSanctum);
  const sanctumStatus = useAppSelector(selectSanctumStatus);
  const activeFloor = useAppSelector(selectActiveFloor);
  const activeDiff = useAppSelector(selectActiveDiff);
  const activeArea = useAppSelector(selectActiveArea);
  const floorData = useAppSelector(selectFloorData);
  const [wave, setWave] = useState(0);
  const [waveData, setWaveData] = useState<Wave | null>(null);

  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchSanctumAsync());
  }, [dispatch]);
  useEffect(() => {
    if (floorData?.waves) {
      if (wave >= floorData.waves.length) {
        setWave(floorData.waves.length - 1);
        setWaveData(floorData.waves[floorData.waves.length - 1][0]);
      } else {
        setWaveData(floorData.waves[wave][0])
      }
    }
  }, [sanctum, floorData, wave]);

  function decreaseWave() {
    wave > 0 ? setWave(wave - 1) : null;
  }
  function increaseWave() {
    if (floorData) {
      wave < floorData!.waves.length - 1 ? setWave(wave + 1) : null;
    }
  }

  if (sanctumStatus == "failed") {
    return (
      <>
        <Head>
          <title>Sanctum of Alteration</title>
        </Head>
        <h1>Fetch Failed</h1>
      </>
    );
  }
  if (Object.keys(sanctum).length === 0) {
    return (
      <>
        <Head>
          <title>Sanctum of Alteration</title>
        </Head>
        <h1>Loading</h1>
      </>
    );
  } else {
    return (
      <>
        <Head>
          <title>Sanctum of Alteration</title>
        </Head>

        <VStack as={Center}>
          <Text as="b" fontSize="6xl" textAlign="center">
            Sanctum of Alteration
          </Text>
          <Flex
            flexWrap={"wrap"}
            justifyContent="center"
            margin="auto"
            gap={{ base: "1", md: "2" }}
          >
            {Object.keys(sanctum).map((e, index) => (
              <Button
                size="md"
                key={e}
                isActive={activeArea == e}
                colorScheme="red"
                onClick={() => dispatch(setArea(e))}
              >
                Sanctum {index + 1}
              </Button>
            ))}
          </Flex>
          <Flex
            flexWrap={"wrap"}
            width="100%"
            justifyContent="center"
            gap={{ base: "1", md: "2" }}
            flexDirection={{ base: "column", md: "row" }}
          >
            <Box flex={1}>
              <Select
                value={activeFloor}
                onChange={(e) => dispatch(setFloor(parseInt(e.target.value)))}
                width="100%"
              >
                {sanctum[activeArea].map((e, index) => {
                  return e ? (
                    <option key={index} value={index}>
                      Floor {index}
                    </option>
                  ) : null;
                })}
              </Select>
            </Box>
            <Flex
              flex={1}
              flexWrap={"wrap"}
              justifyContent="space-evenly"
              margin="auto"
            >
              <Button
                size="md"
                isActive={activeDiff == 0}
                colorScheme="blue"
                onClick={() => dispatch(setDiff(0))}
              >
                EASY
              </Button>
              {sanctum[activeArea][activeFloor]?.length >= 2 ? (
                <Button
                  size="md"
                  isActive={activeDiff == 1}
                  disabled={sanctum[activeArea][activeFloor]?.length < 2}
                  colorScheme="blue"
                  onClick={() => dispatch(setDiff(1))}
                >
                  NORMAL
                </Button>
              ) : null}
              {sanctum[activeArea][activeFloor]?.length >= 3 ? (
                <Button
                  size="md"
                  isActive={activeDiff == 2}
                  disabled={sanctum[activeArea][activeFloor]?.length < 3}
                  colorScheme="blue"
                  onClick={() => dispatch(setDiff(2))}
                >
                  EXTREME
                </Button>
              ) : null}
            </Flex>
          </Flex>

          <Divider />

          {floorData ? (
            <HStack>
              {floorData.waves.map((e, index) => (
                <div
                  onClick={() => setWave(index)}
                  key={index}
                  className={styles["wave-button"]}
                >
                  {index == wave ? (
                    <Image
                      src="/images/map-current.png"
                      alt="current-wave"
                      className={styles["wave-current"]}
                    />
                  ) : null}
                  <Image
                    src="/images/profile/NightChick.png"
                    alt={`wave-${index}`}
                  />
                </div>
              ))}
            </HStack>
          ) : null}
          {waveData ? (
            <HStack as={Center}>
              <Circle
                as={Button}
                size="40px"
                bg="red"
                color="white"
                isDisabled={wave == 0}
                onClick={decreaseWave}
              >
                <ArrowLeftIcon />
              </Circle>
              <EnemyGrid wave={waveData.e} />
              <Circle
                as={Button}
                size="40px"
                bg="red"
                color="white"
                isDisabled={wave == floorData!.waves.length - 1}
                onClick={increaseWave}
              >
                <ArrowRightIcon />
              </Circle>
            </HStack>
          ) : null}
        </VStack>
      </>
    );
  }
}
