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
import { useRouter } from "next/router";
import {
  Flex,
  Button,
  Center,
  Select,
  IconButton,
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
import GameText from "@/components/gameText";
import CopyLink from "@/components/copyLink";
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
  const router = useRouter();

  useEffect(() => {
    dispatch(fetchSanctumAsync());
  }, [dispatch]);

  // Deep link: ?area=EW01&floor=<idx>&diff=<0-2> selects that floor once data is
  // loaded. floor/diff are array indices (clamped by the slice reducers).
  useEffect(() => {
    if (!router.isReady || Object.keys(sanctum).length === 0) return;
    const { area, floor, diff } = router.query;
    if (typeof area === "string" && sanctum[area]) dispatch(setArea(area));
    if (typeof floor === "string") dispatch(setFloor(parseInt(floor, 10) || 0));
    if (typeof diff === "string") dispatch(setDiff(parseInt(diff, 10) || 0));
    // run once data is present / query resolves
  }, [router.isReady, router.query, sanctum, dispatch]);
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

  // shared style for segmented toggle buttons (area / difficulty): subtle yellow
  // when active, plain gray outline otherwise — matches the rest of the UI.
  const toggleProps = (active: boolean) => ({
    size: 'sm' as const,
    variant: 'outline' as const,
    bg: active ? 'whiteAlpha.100' : 'transparent',
    color: active ? 'yellow.300' : 'gray.400',
    borderColor: active ? 'yellow.400' : 'surface.border',
    _hover: { bg: 'whiteAlpha.200' },
  });

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
        <Center py={20}><Text color="red.300">Failed to load Sanctum.</Text></Center>
      </>
    );
  }
  if (Object.keys(sanctum).length === 0) {
    return (
      <>
        <Head>
          <title>Sanctum of Alteration</title>
        </Head>
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
                key={e}
                {...toggleProps(activeArea == e)}
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
              <Button {...toggleProps(activeDiff == 0)} onClick={() => dispatch(setDiff(0))}>
                EASY
              </Button>
              {sanctum[activeArea][activeFloor]?.length >= 2 ? (
                <Button {...toggleProps(activeDiff == 1)} onClick={() => dispatch(setDiff(1))}>
                  NORMAL
                </Button>
              ) : null}
              {sanctum[activeArea][activeFloor]?.length >= 3 ? (
                <Button {...toggleProps(activeDiff == 2)} onClick={() => dispatch(setDiff(2))}>
                  EXTREME
                </Button>
              ) : null}
            </Flex>
          </Flex>

          <CopyLink
            path={`/sanctum?area=${encodeURIComponent(activeArea)}&floor=${activeFloor}&diff=${activeDiff}`}
            label={`Share — ${activeArea} Floor ${floorData?.stage ?? activeFloor + 1} (${DIFF_LABEL[activeDiff] ?? activeDiff})`}
          />

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
                    src="/images/tbaricon/TbarIcon_MP_NightChick_N.png"
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
            <HStack as={Center} gap={[2, 4]}>
              <IconButton aria-label="Previous wave" icon={<ArrowLeftIcon />}
                isRound size="md" variant="outline" colorScheme="gray"
                isDisabled={wave == 0} onClick={decreaseWave} />
              <EnemyGrid wave={waveData.e} />
              <IconButton aria-label="Next wave" icon={<ArrowRightIcon />}
                isRound size="md" variant="outline" colorScheme="gray"
                isDisabled={wave == floorData!.waves.length - 1} onClick={increaseWave} />
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
                        {floorData.prohibition?.length ? (
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
                        {floorData.suitability?.length ? (
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
                        <Td whiteSpace="normal"><GameText>{t(floorData.suitabilityDesc)}</GameText></Td>
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
