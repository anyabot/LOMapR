import React, { useEffect, useState } from 'react';
import styles from "@/styles/custom.module.css"
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Spinner,
  Select,
  SimpleGrid,
  Image,
  Box,
  Table,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Divider ,
  Text,
  Stack,
  InputGroup,
  InputLeftAddon,
} from '@chakra-ui/react'
import SkillTabList from './skillTabList';
import ApperanceList from './appearanceList';

import { EnemyData } from '@/interfaces/enemy';
import { t } from '@/lib/strings';

import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectEnemy, selectActiveEnemy, selectActiveLevel, setActive, fetchEnemyAsync } from '@/store/enemySlice';
import { selectImage, fetchImageAsync } from '@/store/imageSlice';



export default function EnemyModal() {

  const activeEnemy = useAppSelector(selectActiveEnemy);
  const initialLevel = useAppSelector(selectActiveLevel);
  const imagelink = useAppSelector(selectImage)
  const enemy = useAppSelector(selectEnemy);
  const dispatch = useAppDispatch();

  const [realEnemy, setRealEnemy] = useState<EnemyData | null>(enemy[activeEnemy])
  const [realLevel, setRealLevel] = useState<number>(initialLevel)

  function doShow() {
    return activeEnemy? true : false
  }
  function hide() {
    dispatch(setActive(["", 1]))
  }
  useEffect(() => {
    dispatch(fetchEnemyAsync());
    dispatch(fetchImageAsync());
  }, [dispatch])
  useEffect(() => {
    setRealEnemy(enemy[activeEnemy])
  }, [activeEnemy, enemy]);
  useEffect(() => {
    setRealLevel(initialLevel)
  }, [initialLevel]);

  function getImage(id:string) {
    return imagelink[id] ? imagelink[id] : undefined
  }
  function duplicate() {
    // variants = enemies sharing the same name loc-id (matches the list's dedup)
    let ret: string[] = []
    enemy? realEnemy? Object.keys(enemy).map(e => enemy[e].name == realEnemy.name ? ret.push(e) : null) : null : null
    return ret
  }
  // Label a variant by the part that distinguishes it from its siblings (the
  // shared base name is dropped). Falls back to the full key.
  function variantLabel(key: string) {
    const sibs = duplicate()
    if (sibs.length < 2) return key
    let prefix = sibs[0]
    for (const s of sibs) {
      let i = 0
      while (i < prefix.length && i < s.length && prefix[i] === s[i]) i++
      prefix = prefix.slice(0, i)
    }
    const label = key.slice(prefix.length).replace(/^_/, '')
    return label || key
  }

  return (
    <Modal isOpen={doShow()} onClose={hide} isCentered scrollBehavior="inside"
      aria-labelledby="contained-modal-title-vcenter">
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(2px)" />
      {realEnemy ? (
        <>
          <ModalContent
            bg="surface.elevated"
            color="white"
            borderWidth="1px"
            borderColor="surface.border"
            mx={4}
            maxW={["container.sm", "container.sm", "container.md", "container.lg", "container.xl"]}
          >
            <ModalHeader pb={2}>
              <Text fontSize="xl">{t(realEnemy.name)}</Text>
              <Text fontSize="xs" color="gray.500" fontWeight="normal" fontFamily="mono">
                {activeEnemy}
              </Text>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              {duplicate().length > 1 ? (
                <Select value={activeEnemy} size="sm" mb={3}
                  onChange={(e) => dispatch(setActive([e.target.value, realLevel]))}>
                  {duplicate().map(e => (
                    <option key={e} value={e}>{variantLabel(e)}</option>
                  ))}
                </Select>
              ) : null}
              <SimpleGrid columns={[1, 1, 2]} spacing={4}>
                <Box display="flex" justifyContent="center" flexDirection="column" alignItems="center">
                  {getImage(realEnemy.img) ? (
                    <Image src={getImage(realEnemy.img)}
                      boxSize="120px" objectFit="cover" borderRadius="lg"
                      borderWidth="1px" borderColor="surface.border" alt={realEnemy.img} />
                  ) : (
                    <Box boxSize="120px" borderRadius="lg" borderWidth="1px" borderColor="surface.border"
                      bg="blackAlpha.400" color="gray.500" fontSize="3xl" fontWeight="bold"
                      display="flex" alignItems="center" justifyContent="center">
                      ?
                    </Box>
                  )}
                  <TableContainer w="100%" className={styles["stat-table"]}>
                    <Table variant='simple' size='sm'>
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
                <Box display="flex" justifyContent="center" flexDirection="column">
                  <InputGroup display="flex" size="sm">
                    <InputLeftAddon bg="surface.border" color="white" borderColor="surface.border">Lv.</InputLeftAddon>
                    <NumberInput value={realLevel} min={1} w="100%" size="sm" onChange={(e) => setRealLevel(Number(e))}>
                      <NumberInputField borderColor="surface.border" />
                      <NumberInputStepper>
                        <NumberIncrementStepper color="gray.300" borderColor="surface.border" _hover={{ bg: 'whiteAlpha.200' }} />
                        <NumberDecrementStepper color="gray.300" borderColor="surface.border" _hover={{ bg: 'whiteAlpha.200' }} />
                      </NumberInputStepper>
                    </NumberInput>
                  </InputGroup>
                  <TableContainer w="100%" className={styles["stat-table"]}>
                    <Table variant='simple' size='sm'>
                      <Tbody>
                        <Tr>
                          <Th><Image alt="HP" src='/images/icon_HP.png' boxSize='1rem' display="inline" mx={1}/>HP</Th>
                          <Td>{Math.floor(realEnemy.HP[0] + realEnemy.HP[1] * (realLevel - 1))}</Td>
                        </Tr>
                        <Tr>
                          <Th><Image alt="ATK" src='/images/icon_ATK.png' boxSize='1rem' display="inline" mx={1}/>ATK</Th>
                          <Td>{Math.floor(realEnemy.ATK[0] + realEnemy.ATK[1] * (realLevel - 1))}</Td>
                          <Th><Image alt="DEF" src='/images/icon_DEF.png' boxSize='1rem' display="inline" mx={1}/>DEF</Th>
                          <Td>{Math.floor(realEnemy.DEF[0] + realEnemy.DEF[1] * (realLevel - 1))}</Td>
                        </Tr>
                        <Tr>
                          <Th><Image alt="ACC" src='/images/icon_ACC.png' boxSize='1rem' display="inline" mx={1}/>ACC</Th>
                          <Td>{realEnemy.ACC}%</Td>
                          <Th><Image alt="EVA" src='/images/icon_EVA.png' boxSize='1rem' display="inline" mx={1}/>EVA</Th>
                          <Td>{realEnemy.EVA}%</Td>
                        </Tr>
                        <Tr>
                          <Th><Image alt="CRIT" src='/images/icon_CRIT.png' boxSize='1rem' display="inline" mx={1}/>CRIT</Th>
                          <Td>{realEnemy.CRIT}%</Td>
                          <Th><Image alt="SPD" src='/images/icon_SPD.png' boxSize='1rem' display="inline" mx={1}/>SPD</Th>
                          <Td>{realEnemy.SPD}</Td>
                        </Tr>
                        <Tr>
                          <Th>Resists</Th>
                          <Td><Image alt="fire resist" src='/images/fire.png' boxSize='1rem' display="inline" mx={1}/>{realEnemy.resist[0]}%</Td>
                          <Td><Image alt="ice resist" src='/images/ice.png' boxSize='1rem' display="inline" mx={1}/>{realEnemy.resist[1]}%</Td>
                          <Td><Image alt="electric resist" src='/images/electric.png' boxSize='1rem' display="inline" mx={1}/>{realEnemy.resist[2]}%</Td>
                        </Tr>
                      </Tbody>
                    </Table>
                  </TableContainer>
                </Box>
              </SimpleGrid>
              <Divider/>
              <SkillTabList skills={realEnemy.skills} atk={Math.floor(realEnemy.ATK[0] + realEnemy.ATK[1] * (realLevel - 1))} info={t(realEnemy.info)} rank={realEnemy.rank} enemyId={activeEnemy}/>
              <Divider/>
              <ApperanceList used={realEnemy.used} usedSanctum={realEnemy.usedSanctum}/>
            </ModalBody>
          </ModalContent>
        </>
      ) :  (<div id={styles["loader"]}><Spinner animation='border'></Spinner></div>)
    }
    </Modal>
  );
}