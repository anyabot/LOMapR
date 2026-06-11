import { useAppSelector, useAppDispatch } from "@/hooks";
import { selectIW, selectIWStatus, fetchIWAsync } from "@/store/IWSlice";
import { selectImage, fetchImageAsync } from "@/store/imageSlice";
import { useEffect, useState } from "react";
import {
  SimpleGrid,
  Divider,
  Box,
  Image,
  TableContainer,
  Table,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  InputGroup,
  InputLeftAddon,
  InputRightAddon,
  Flex,
  Center,
  HStack, Input, Button, VStack, Heading, Spinner,
} from "@chakra-ui/react";
import { ArrowBackIcon } from "@chakra-ui/icons";
import Link from "next/link";
import Head from "next/head";
import { useRouter } from "next/router";
import SkillTabList from "@/components/enemyTab/skillTabList";
import { selectEnemy, fetchEnemyAsync } from "@/store/enemySlice";
import { EnemyData } from "@/interfaces/enemy";
import { useNumberInput } from "@chakra-ui/react";
import { t } from "@/lib/strings";
import styles from "@/styles/custom.module.css";

export default function Home() {
  const iw = useAppSelector(selectIW);
  const iwStatus = useAppSelector(selectIWStatus);
  const imagelink = useAppSelector(selectImage);
  const enemy = useAppSelector(selectEnemy);

  const [stage, setStage] = useState(0);
  const [phase, setPhase] = useState(0);
  const [activeEnemy, setActiveEnemy] = useState<string>("");
  const [realEnemy, setRealEnemy] = useState<EnemyData | null>(null);
  const [realLevel, setRealLevel] = useState<number>(1);
  const [id, setId] = useState("");

  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;
    setId(router.query.id as string);
  }, [router.isReady, router.query.id]);

  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchIWAsync());
    dispatch(fetchEnemyAsync());
    dispatch(fetchImageAsync());
  }, [dispatch]);

  useEffect(() => {
    setRealEnemy(enemy[activeEnemy]);
  }, [enemy, activeEnemy]);
  // clamp stage when switching to a boss (or region) with fewer stages
  useEffect(() => {
    const b = iw.bosses[id];
    if (b && stage > b.length - 1) setStage(b.length - 1);
  }, [iw, id, stage]);
  useEffect(() => {
    iw.bosses[id]
      ? iw.bosses[id][stage]
        ? setRealLevel(iw.bosses[id][stage].monster.lv)
        : null
      : null;
  }, [stage, iw, iw.bosses, id]);
  useEffect(() => {
    if (iw.bosses[id]) {
      if (iw.bosses[id][stage]) {
        if (phase <= iw.bosses[id][stage].phase.length - 1) {
          setActiveEnemy(iw.bosses[id][stage].phase[phase].id)
        }
        else {
          setPhase(iw.bosses[id][stage].phase.length - 1) 
          setActiveEnemy(iw.bosses[id][stage].phase[iw.bosses[id][stage].phase.length - 1].id)
        }
      }
    }
  }, [iw, stage, phase, id]);

  const { getInputProps, getIncrementButtonProps, getDecrementButtonProps } =
  useNumberInput({
    value:stage + 1,
    onChange: (e) => validStage(Number(e))
  })


  function validStage(s: number) {
    const b = iw.bosses[id];
    if (!b) return;
    if (s < 1) setStage(0);
    else if (s <= b.length) setStage(s - 1);
    else setStage(b.length - 1);
  }
  function validPhase(s: number) {
    const st = iw.bosses[id]?.[stage];
    if (!st) return;
    setPhase(s <= st.phase.length - 1 ? s : st.phase.length - 1);
  }
  function getImage(id: string) {
    return imagelink[id] ? imagelink[id] : undefined;
  }
  if (iwStatus == "failed") {
    return (
      <>
        <Head>
          <title>Infinite War List</title>
        </Head>
        <h1>Fetch Failed</h1>
      </>
    );
  } else if (iw.seasons.length === 0 || !id) {
    return (
      <>
        <Head><title>Infinite War</title></Head>
        <Center py={20}><Spinner size="xl" color="yellow.400" /></Center>
      </>
    );
  } else if (!(id in iw.bosses)) {
    // e.g. switched region to one that doesn't have this boss — don't 404, offer
    // a way back to the list for the active region.
    return (
      <>
        <Head><title>Infinite War</title></Head>
        <Center py={20}>
          <VStack spacing={4}>
            <Text color="gray.400">This raid boss isn&apos;t available in the selected region.</Text>
            <Button as={Link} href="/iw" leftIcon={<ArrowBackIcon />} colorScheme="gray" variant="outline">
              Back to Infinite War
            </Button>
          </VStack>
        </Center>
      </>
    );
  } else {
    const boss = iw.bosses[id];


    const inc = getIncrementButtonProps()
    const dec = getDecrementButtonProps()
    const input = getInputProps()

    return (
      <>
        <Head>
          <title>Raid Boss {realEnemy ? ` - ${t(realEnemy.name)}` : ""}</title>
        </Head>
        {realEnemy ? (
          <VStack align="stretch" spacing={4} py={4}>
            <Button as={Link} href="/iw" leftIcon={<ArrowBackIcon />} colorScheme="gray" variant="outline" size="sm" alignSelf="start">
              Back
            </Button>
            <Heading size="xl" textAlign="center">{t(realEnemy.name)}</Heading>
            <Center>
              <HStack maxW="520px" margin="auto">
                <Button size="sm" variant="outline" colorScheme="gray" onClick={() => setStage(0)} isDisabled={stage === 0}>« Min</Button>
                <Button {...dec}>-</Button>
                <InputGroup as={Center} display="flex">
                  <InputLeftAddon bg="surface.border" color="white" borderColor="surface.border">Stage</InputLeftAddon>
                  <Input {...input} textAlign="center" borderColor="surface.border" min={1} max={boss.length}/>
                  <InputRightAddon bg="surface.border" color="white" borderColor="surface.border">{`/ ${boss.length}`}</InputRightAddon>
                </InputGroup>
                <Button {...inc}>+</Button>
                <Button size="sm" variant="outline" colorScheme="gray" onClick={() => setStage(boss.length - 1)} isDisabled={stage === boss.length - 1}>Max »</Button>
              </HStack>
            </Center>
            <Divider/>
            <Center>
              <Flex flexWrap="wrap" justifyContent="center" margin="auto" gap={2}>
                {boss[stage].phase.map((e, index) => {
                  const active = phase === index;
                  return (
                    <Button
                      key={index}
                      onClick={() => validPhase(index)}
                      size="sm"
                      h="auto"
                      py={2}
                      px={4}
                      minW="110px"
                      flexDirection="column"
                      variant="outline"
                      bg={active ? 'whiteAlpha.100' : 'transparent'}
                      color={active ? 'yellow.300' : 'gray.400'}
                      borderWidth="1px"
                      borderColor={active ? 'yellow.400' : 'surface.border'}
                      _hover={{ bg: 'whiteAlpha.200', borderColor: active ? 'yellow.400' : 'gray.500' }}
                    >
                      <Text fontWeight="bold">Phase {index + 1}</Text>
                      <Text fontSize="xs" opacity={0.85} fontWeight="normal">
                        {e.damage > 0 ? `${e.damage.toLocaleString()} DMG` : 'Final'}
                      </Text>
                    </Button>
                  );
                })}
              </Flex>
            </Center>
            <Divider/>
            <SimpleGrid columns={[1, 1, 2]} spacing={4}>
              <Box
                display="flex"
                justifyContent="center"
                flexDirection="column"
                alignItems="center"
              >
                {getImage(realEnemy.img) ? (
                  <Image
                    src={getImage(realEnemy.img)}
                    boxSize="120px"
                    objectFit="cover"
                    borderRadius="lg"
                    borderWidth="1px"
                    borderColor="surface.border"
                    alt={realEnemy.img}
                  ></Image>
                ) : (
                  <Center
                    boxSize="120px"
                    borderRadius="lg"
                    borderWidth="1px"
                    borderColor="surface.border"
                    bg="blackAlpha.400"
                    color="gray.500"
                    fontSize="3xl"
                    fontWeight="bold"
                  >
                    ?
                  </Center>
                )}
                <TableContainer w="100%" className={styles["stat-table"]}>
                  <Table variant="simple" size="sm">
                    <Tbody>
                      <Tr>
                        <Th>Type</Th>
                        <Td>{realEnemy.type}</Td>
                      </Tr>
                      <Tr>
                        <Th>Role</Th>
                        <Td>{realEnemy.role}</Td>
                      </Tr>
                      <Tr>
                        <Th>Rank</Th>
                        <Td>{realEnemy.rank}</Td>
                      </Tr>
                    </Tbody>
                  </Table>
                </TableContainer>
              </Box>
              <Box
                display="flex"
                justifyContent="center"
                flexDirection="column"
              >
                <Text as="b" fontSize="lg" mb={1}>Lv. {realLevel}</Text>
                <TableContainer w="100%" className={styles["stat-table"]}>
                  <Table variant="simple" size="sm">
                    <Tbody>
                      <Tr>
                        <Th>
                          <Image
                            alt="HP"
                            src="/images/icon_HP.png"
                            boxSize="1rem"
                            display="inline"
                            mx={1}
                          />
                          HP
                        </Th>
                        <Td>
                          {boss[stage].monster.maxHP}
                        </Td>
                      </Tr>
                      <Tr>
                        <Th>
                          <Image
                            alt="ATK"
                            src="/images/icon_ATK.png"
                            boxSize="1rem"
                            display="inline"
                            mx={1}
                          />
                          ATK
                        </Th>
                        <Td>
                          {Math.floor(
                            realEnemy.ATK[0] +
                              realEnemy.ATK[1] * (realLevel - 1)
                          )}
                        </Td>
                        <Th>
                          <Image
                            alt="DEF"
                            src="/images/icon_DEF.png"
                            boxSize="1rem"
                            display="inline"
                            mx={1}
                          />
                          DEF
                        </Th>
                        <Td>
                          {Math.floor(
                            realEnemy.DEF[0] +
                              realEnemy.DEF[1] * (realLevel - 1)
                          )}
                        </Td>
                      </Tr>
                      <Tr>
                        <Th>
                          <Image
                            alt="ACC"
                            src="/images/icon_ACC.png"
                            boxSize="1rem"
                            display="inline"
                            mx={1}
                          />
                          ACC
                        </Th>
                        <Td>{realEnemy.ACC}%</Td>
                        <Th>
                          <Image
                            alt="EVA"
                            src="/images/icon_EVA.png"
                            boxSize="1rem"
                            display="inline"
                            mx={1}
                          />
                          EVA
                        </Th>
                        <Td>{realEnemy.EVA}%</Td>
                      </Tr>
                      <Tr>
                        <Th>
                          <Image
                            alt="CRIT"
                            src="/images/icon_CRIT.png"
                            boxSize="1rem"
                            display="inline"
                            mx={1}
                          />
                          CRIT
                        </Th>
                        <Td>{realEnemy.CRIT}%</Td>
                        <Th>
                          <Image
                            alt="SPD"
                            src="/images/icon_SPD.png"
                            boxSize="1rem"
                            display="inline"
                            mx={1}
                          />
                          SPD
                        </Th>
                        <Td>{realEnemy.SPD}</Td>
                      </Tr>
                      <Tr>
                        <Th>Resists</Th>
                        <Td>
                          <Image
                            alt="fire resist"
                            src="/images/fire.png"
                            boxSize="1rem"
                            display="inline"
                            mx={1}
                          />
                          {realEnemy.resist[0]}%
                        </Td>
                        <Td>
                          <Image
                            alt="ice resist"
                            src="/images/ice.png"
                            boxSize="1rem"
                            display="inline"
                            mx={1}
                          />
                          {realEnemy.resist[1]}%
                        </Td>
                        <Td>
                          <Image
                            alt="electric resist"
                            src="/images/electric.png"
                            boxSize="1rem"
                            display="inline"
                            mx={1}
                          />
                          {realEnemy.resist[2]}%
                        </Td>
                      </Tr>
                    </Tbody>
                  </Table>
                </TableContainer>
              </Box>
            </SimpleGrid>
            <Divider />
            <SkillTabList
              skills={realEnemy.skills}
              atk={Math.floor(
                realEnemy.ATK[0] + realEnemy.ATK[1] * (realLevel - 1)
              )}
              info={t(realEnemy.info)}
              rank={realEnemy.rank}
              enemyId={activeEnemy}
            />
          </VStack>
        ) : null}
      </>
    );
  }
}
