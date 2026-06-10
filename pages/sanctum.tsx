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
import {
  Table, Thead, Tbody, Tr, Th, Td, TableContainer, Tag, Wrap, WrapItem,
} from "@chakra-ui/react";
import { Floor, Wave } from "@/interfaces/sanctum";
import EnemyGrid from "@/components/enemyGrid";
import { t } from "@/lib/strings";
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

  const DIFF_LABEL = ["Easy", "Normal", "Extreme"];

  // Resource gain for the CURRENT floor, one row per difficulty variant, plus a
  // total across the floor's difficulties.
  function gainRows(): { label: string; gain: Floor["gain"] }[] {
    const floor = sanctum[activeArea]?.[activeFloor] || [];
    return floor.map((f, i) => ({ label: DIFF_LABEL[i] ?? `Diff ${i}`, gain: f.gain }));
  }
  function gainTotal() {
    return gainRows().reduce(
      (acc, r) => ({
        mineralCharge: acc.mineralCharge + r.gain.mineralCharge,
        mineralMax: acc.mineralMax + r.gain.mineralMax,
        refinedCharge: acc.refinedCharge + r.gain.refinedCharge,
        refinedMax: acc.refinedMax + r.gain.refinedMax,
      }),
      { mineralCharge: 0, mineralMax: 0, refinedCharge: 0, refinedMax: 0 }
    );
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
                  return e && e[0] ? (
                    <option key={index} value={index}>
                      Floor {e[0].stage}
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
          {/* Wave/enemy grid and the info tables, side by side (wrap on mobile) */}
          <Flex
            w="100%"
            justifyContent="center"
            alignItems="flex-start"
            gap={{ base: 4, lg: 8 }}
            flexDirection={{ base: "column", lg: "row" }}
            flexWrap="wrap"
          >
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

          <VStack align="stretch" flex={1} minW={{ base: "100%", lg: "320px" }} maxW="640px">
          {/* Ban / Suitable groups for the active floor (group member lists TBD) */}
          {floorData ? (
            <Box w="100%">
              <Text as="b" fontSize="xl">Restrictions</Text>
              <TableContainer>
                <Table size="sm" variant="simple">
                  <Tbody>
                    <Tr>
                      <Th color="red.300">Banned Groups</Th>
                      <Td>
                        {floorData.prohibition.length ? (
                          <Wrap>
                            {floorData.prohibition.map((g) => (
                              <WrapItem key={g}>
                                <Tag colorScheme="red">{g}</Tag>
                              </WrapItem>
                            ))}
                          </Wrap>
                        ) : (
                          <Text color="gray.500">None</Text>
                        )}
                      </Td>
                    </Tr>
                    <Tr>
                      <Th color="green.300">Suitable Groups</Th>
                      <Td>
                        {floorData.suitability.length ? (
                          <Wrap>
                            {floorData.suitability.map((g) => (
                              <WrapItem key={g}>
                                <Tag colorScheme="green">{g}</Tag>
                              </WrapItem>
                            ))}
                          </Wrap>
                        ) : (
                          <Text color="gray.500">None</Text>
                        )}
                      </Td>
                    </Tr>
                    {floorData.suitabilityDesc ? (
                      <Tr>
                        <Th>Note</Th>
                        <Td whiteSpace="normal">{t(floorData.suitabilityDesc)}</Td>
                      </Tr>
                    ) : null}
                  </Tbody>
                </Table>
              </TableContainer>
            </Box>
          ) : null}

          {/* Resource gain for the current floor: one row per difficulty + total */}
          <Box w="100%">
            <Text as="b" fontSize="xl">
              Resource Gain (Floor {floorData ? floorData.stage : ""})
            </Text>
            <TableContainer>
              <Table size="sm" variant="striped">
                <Thead>
                  <Tr>
                    <Th>Difficulty</Th>
                    <Th isNumeric>Mineral +Regen</Th>
                    <Th isNumeric>Mineral +Max</Th>
                    <Th isNumeric>Refined +Regen</Th>
                    <Th isNumeric>Refined +Max</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {gainRows().map((r) => (
                    <Tr key={r.label}>
                      <Td>{r.label}</Td>
                      <Td isNumeric>{r.gain.mineralCharge || ""}</Td>
                      <Td isNumeric>{r.gain.mineralMax || ""}</Td>
                      <Td isNumeric>{r.gain.refinedCharge || ""}</Td>
                      <Td isNumeric>{r.gain.refinedMax || ""}</Td>
                    </Tr>
                  ))}
                </Tbody>
                <Thead>
                  <Tr>
                    <Th>Total</Th>
                    <Th isNumeric>{gainTotal().mineralCharge}</Th>
                    <Th isNumeric>{gainTotal().mineralMax}</Th>
                    <Th isNumeric>{gainTotal().refinedCharge}</Th>
                    <Th isNumeric>{gainTotal().refinedMax}</Th>
                  </Tr>
                </Thead>
              </Table>
            </TableContainer>
          </Box>
          </VStack>
          </Flex>
        </VStack>
      </>
    );
  }
}
