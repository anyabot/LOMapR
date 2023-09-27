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
  HStack, Input, Button
} from "@chakra-ui/react";
import Head from "next/head";
import { useRouter } from "next/router";
import Error from "next/error";
import SkillTabList from "@/components/enemyTab/skillTabList";
import { selectEnemy, fetchEnemyAsync } from "@/store/enemySlice";
import { EnemyData } from "@/interfaces/enemy";
import { useNumberInput } from "@chakra-ui/react";
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
    s >= 1 ? s <= iw.bosses[id].length ? setStage(s - 1)  : setStage(iw.bosses[id].length - 1) : setStage(0) 
  }
  function validPhase(s: number) {
    s <= iw.bosses[id][stage].phase.length - 1 ? setPhase(s)  : setPhase(iw.bosses[id][stage].phase.length - 1) 
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
  } else if (iw.seasons.length === 0) {
    return (
      <>
        <Head>
          <title>Infinite War List</title>
        </Head>
        <h1>Loading</h1>
      </>
    );
  } else if (!(id in iw.bosses)) {
    return (
      <>
        <Error statusCode={404} />
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
          <title>Raid Boss {realEnemy ? ` - ${realEnemy.name}` : null}</title>
        </Head>
        {realEnemy ? (
          <>
            <HStack maxW="450px" margin="auto">
              <Button {...dec}>-</Button>
              <InputGroup as={Center} display="flex">
                <InputLeftAddon>Stage</InputLeftAddon>
                <Input {...input} 
                
                min={1}
                max={boss.length}/>
                <InputRightAddon> {`/ ${boss.length}`}</InputRightAddon>
              </InputGroup>
              <Button {...inc}>+</Button>
            </HStack>
            <Divider/>
            <Center>
              <Flex flexWrap={"wrap"} justifyContent="center" margin="auto" gap={{base: '1', md: '2'}}>
                {boss[stage].phase.map((e, index) => (<Button key={index} isActive={phase == index} colorScheme="red" onClick={() => validPhase(index)}><>Phase {index + 1}{e.damage > 0 ? <><br/> {`${e.damage} DMG`}</> : null }</></Button>))}
              </Flex>
            </Center>
            <Divider/>
            <SimpleGrid columns={[1, 1, 2]}>
              <Box
                display="flex"
                justifyContent="center"
                flexDirection="column"
              >
                <Image
                  src={getImage(realEnemy.img)}
                  fallbackSrc="https://via.placeholder.com/128"
                  margin="auto"
                  maxW="128px"
                  alt={realEnemy.img}
                ></Image>
                <TableContainer bg="darkgray" className={styles["stat-table"]}>
                  <Table variant="simple">
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
                <Text as="b" fontSize="2xl">Lv. {realLevel}</Text>
                <TableContainer bg="darkgray" className={styles["stat-table"]}>
                  <Table variant="simple">
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
              info={realEnemy.info}
            />
          </>
        ) : null}
      </>
    );
  }
}
