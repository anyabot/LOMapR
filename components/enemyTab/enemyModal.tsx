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
    let ret: string[] = []
    enemy? realEnemy? Object.keys(enemy).map(e => enemy[e].name == realEnemy.name ? ret.push(e) : null) : null : null
    return ret
  }

  return (
    <Modal isOpen={doShow()} onClose={hide} aria-labelledby="contained-modal-title-vcenter" scrollBehavior="inside">
      <ModalOverlay />
      {realEnemy ? (
        <>
          <ModalContent maxW={["container.sm", "container.sm", "container.md", "container.lg", "container.xl"]}>
            <ModalHeader>{realEnemy.name}</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Select value={activeEnemy}  onChange={(e) => dispatch(setActive([e.target.value, realLevel]))}>
                {duplicate().map(e => (<option key={e} value={e}>{e}</option>))}
              </Select>
              <Divider/>
              <SimpleGrid columns={[1, 1, 2]}>
                <Box display="flex" justifyContent="center" flexDirection="column">
                  <Image src={getImage(realEnemy.img)} fallbackSrc='https://via.placeholder.com/128' margin="auto" maxW="128px" alt={realEnemy.img}></Image>
                  <TableContainer bg="darkgray">
                    <Table variant='simple'>
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
                  <InputGroup display="flex">
                    <InputLeftAddon>Lv.</InputLeftAddon>
                    <NumberInput value={realLevel} min={1} w="100%" onChange={(e) => setRealLevel(Number(e))}>
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </InputGroup>
                  <TableContainer bg="darkgray">
                    <Table variant='simple'>
                      <Tbody>
                        <Tr>
                          <Th width="25%"><Image alt="HP" src='/images/icon_HP.png' boxSize='1rem' display="inline" mx={1}/>HP</Th>
                          <Td width="25%">{Math.floor(realEnemy.HP[0] + realEnemy.HP[1] * (realLevel - 1))}</Td>
                        </Tr>
                        <Tr>
                          <Th width="25%"><Image alt="ATK" src='/images/icon_ATK.png' boxSize='1rem' display="inline" mx={1}/>ATK</Th>
                          <Td width="25%">{Math.floor(realEnemy.ATK[0] + realEnemy.ATK[1] * (realLevel - 1))}</Td>
                          <Th width="25%"><Image alt="DEF" src='/images/icon_DEF.png' boxSize='1rem' display="inline" mx={1}/>DEF</Th>
                          <Td width="25%">{Math.floor(realEnemy.DEF[0] + realEnemy.DEF[1] * (realLevel - 1))}</Td>
                        </Tr>
                        <Tr>
                          <Th width="25%"><Image alt="ACC" src='/images/icon_ACC.png' boxSize='1rem' display="inline" mx={1}/>ACC</Th>
                          <Td width="25%">{realEnemy.ACC}</Td>
                          <Th width="25%"><Image alt="EVA" src='/images/icon_EVA.png' boxSize='1rem' display="inline" mx={1}/>EVA</Th>
                          <Td width="25%">{realEnemy.EVA}</Td>
                        </Tr>
                        <Tr>
                          <Th width="25%"><Image alt="CRIT" src='/images/icon_CRIT.png' boxSize='1rem' display="inline" mx={1}/>CRIT</Th>
                          <Td width="25%">{realEnemy.CRIT}</Td>
                          <Th width="25%"><Image alt="SPD" src='/images/icon_SPD.png' boxSize='1rem' display="inline" mx={1}/>SPD</Th>
                          <Td width="25%">{realEnemy.SPD}</Td>
                        </Tr>
                        <Tr>
                          <Th width="25%">Resists</Th>
                          <Td width="25%"><Image alt="fire resist" src='/images/fire.png' boxSize='1rem' display="inline" mx={1}/>{realEnemy.resist[0]}%</Td>
                          <Td width="25%"><Image alt="ice resist" src='/images/ice.png' boxSize='1rem' display="inline" mx={1}/>{realEnemy.resist[1]}%</Td>
                          <Td width="25%"><Image alt="electric resist" src='/images/electric.png' boxSize='1rem' display="inline" mx={1}/>{realEnemy.resist[2]}%</Td>
                        </Tr>
                      </Tbody>
                    </Table>
                  </TableContainer>
                </Box>
              </SimpleGrid>
              <Divider/>
              <SkillTabList skills={realEnemy.skills} atk={Math.floor(realEnemy.ATK[0] + realEnemy.ATK[1] * (realLevel - 1))} info={realEnemy.info}/>
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