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
  Center,
  Select,
  SimpleGrid,
  Image,
  Box,
  Flex,
  HStack,
  Divider,
  Text,
  Badge,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  InputGroup,
  InputLeftAddon,
} from '@chakra-ui/react'
import SkillTabList from './skillTabList';
import ApperanceList from './appearanceList';
import CopyLink from '@/components/copyLink';
import { StatRow, StatPair, StatSection } from '@/components/statBlock';

import { EnemyFull } from '@/interfaces/enemy';
import { t } from '@/lib/strings';
import { typeIcon, roleIcon, RANK_COLOR } from '@/lib/rank';

import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectEnemy, selectEnemyFull, selectEnemyFullStatus, selectActiveEnemy, selectActiveLevel, setActive, fetchEnemyAsync, fetchEnemyFullAsync } from '@/store/enemySlice';
import { selectImage, fetchImageAsync } from '@/store/imageSlice';
import { fetchEnemySkillsAsync } from '@/store/skillSlice';
import { fetchEnemyAIAsync } from '@/store/aiSlice';

// Enemy rank is a letter (C/B/A/S/SS/SSS); map to the official rank color (C has
// none — falls back to the default badge). Reuses RANK_COLOR keyed by grade number.
const ENEMY_RANK_COLOR: Record<string, string> = {
  B: RANK_COLOR[2], A: RANK_COLOR[3], S: RANK_COLOR[4], SS: RANK_COLOR[5], SSS: RANK_COLOR[6],
};

export default function EnemyModal() {

  const activeEnemy = useAppSelector(selectActiveEnemy);
  const initialLevel = useAppSelector(selectActiveLevel);
  const imagelink = useAppSelector(selectImage);
  const enemy = useAppSelector(selectEnemy);
  const realEnemy = useAppSelector(state => selectEnemyFull(state, activeEnemy));
  const fullStatus = useAppSelector(state => selectEnemyFullStatus(state, activeEnemy));
  const dispatch = useAppDispatch();

  const [realLevel, setRealLevel] = useState<number>(initialLevel);

  function doShow() {
    return activeEnemy ? true : false;
  }
  function hide() {
    dispatch(setActive(["", 1]));
  }
  useEffect(() => {
    dispatch(fetchEnemyAsync());
    dispatch(fetchImageAsync());
  }, [dispatch]);
  useEffect(() => {
    if (activeEnemy) {
      dispatch(fetchEnemyFullAsync(activeEnemy));
      dispatch(fetchEnemySkillsAsync(activeEnemy));
      dispatch(fetchEnemyAIAsync(activeEnemy));
    }
  }, [activeEnemy, dispatch]);
  useEffect(() => {
    setRealLevel(initialLevel);
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
      {realEnemy && fullStatus === 'idle' && realEnemy.HP ? (
        <>
          <ModalContent
            bg="surface.elevated"
            color="white"
            borderWidth="1px"
            borderColor="surface.border"
            mx={4}
            maxW={["container.sm", "container.sm", "container.md", "container.lg", "container.xl"]}
          >
            <ModalHeader pb={2} pr={12}>
              <HStack spacing={3} align="center">
                <Text fontSize="xl">{t(realEnemy.name)}</Text>
                <CopyLink path={`/enemies?enemy=${encodeURIComponent(activeEnemy)}`} />
              </HStack>
              <Text fontSize="xs" color="gray.500" fontWeight="normal" fontFamily="mono">
                {activeEnemy}
              </Text>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6} overflowY="auto" maxH="75vh">
              {duplicate().length > 1 ? (
                <Select value={activeEnemy} size="sm" mb={3}
                  onChange={(e) => dispatch(setActive([e.target.value, realLevel]))}>
                  {duplicate().map(e => (
                    <option key={e} value={e}>{variantLabel(e)}</option>
                  ))}
                </Select>
              ) : null}
              <SimpleGrid columns={[1, 1, 2]} spacing={4} alignItems="start">
                {/* left column: portrait + profile chips */}
                <Box>
                  {getImage(realEnemy.img) ? (
                    <Image src={getImage(realEnemy.img)} mx="auto"
                      boxSize={["140px", "150px"]} objectFit="cover" borderRadius="xl"
                      borderWidth="1px" borderColor="surface.border" alt={realEnemy.img} />
                  ) : (
                    <Box boxSize={["140px", "150px"]} mx="auto" borderRadius="xl"
                      borderWidth="1px" borderColor="surface.border"
                      bg="blackAlpha.400" color="gray.500" fontSize="4xl" fontWeight="bold"
                      display="flex" alignItems="center" justifyContent="center">
                      ?
                    </Box>
                  )}
                  <StatSection title="Profile">
                    <StatRow label="Type" value={
                      <HStack spacing={1.5} justify="flex-end">
                        {typeIcon(realEnemy.type) ? <Image src={typeIcon(realEnemy.type)!} alt={realEnemy.type} boxSize="16px" /> : null}
                        <span>{realEnemy.type}</span>
                      </HStack>
                    } />
                    <StatRow label="Role" value={
                      <HStack spacing={1.5} justify="flex-end">
                        {roleIcon(realEnemy.role) ? <Image src={roleIcon(realEnemy.role)!} alt={realEnemy.role} boxSize="16px" /> : null}
                        <span>{realEnemy.role}</span>
                      </HStack>
                    } />
                    <StatRow label="Rank" value={
                      <Badge borderRadius="md" px={1.5}
                        bg={ENEMY_RANK_COLOR[realEnemy.rank] ?? undefined}
                        color={ENEMY_RANK_COLOR[realEnemy.rank] ? 'blackAlpha.800' : undefined}
                        colorScheme={ENEMY_RANK_COLOR[realEnemy.rank] ? undefined : 'yellow'}>
                        {realEnemy.rank}
                      </Badge>
                    } />
                  </StatSection>
                </Box>

                {/* right column: level control + grouped stats */}
                <Box>
                  <InputGroup size="sm" mb={3}>
                    <InputLeftAddon bg="surface.border" color="white" borderColor="surface.border" fontWeight="700">Lv.</InputLeftAddon>
                    <NumberInput value={realLevel} min={1} w="100%" size="sm" onChange={(e) => setRealLevel(Number(e))}>
                      <NumberInputField borderColor="surface.border" />
                      <NumberInputStepper>
                        <NumberIncrementStepper color="gray.300" borderColor="surface.border" _hover={{ bg: 'whiteAlpha.200' }} />
                        <NumberDecrementStepper color="gray.300" borderColor="surface.border" _hover={{ bg: 'whiteAlpha.200' }} />
                      </NumberInputStepper>
                    </NumberInput>
                  </InputGroup>

                  {/* stats in the game's own grouping/order */}
                  <StatSection title="Stats">
                    <StatRow icon="/images/icon_HP.png" label="HP"
                      value={Math.floor(realEnemy.HP[0] + realEnemy.HP[1] * (realLevel - 1)).toLocaleString()} />
                    <StatPair
                      left={{ icon: '/images/icon_ATK.png', label: 'ATK', value: Math.floor(realEnemy.ATK[0] + realEnemy.ATK[1] * (realLevel - 1)).toLocaleString() }}
                      right={{ icon: '/images/icon_DEF.png', label: 'DEF', value: Math.floor(realEnemy.DEF[0] + realEnemy.DEF[1] * (realLevel - 1)).toLocaleString() }}
                    />
                    <StatPair
                      left={{ icon: '/images/icon_ACC.png', label: 'ACC', value: `${realEnemy.ACC}%` }}
                      right={{ icon: '/images/icon_EVA.png', label: 'EVA', value: `${realEnemy.EVA}%` }}
                    />
                    <StatPair
                      left={{ icon: '/images/icon_CRIT.png', label: 'CRIT', value: `${realEnemy.CRIT}%` }}
                      right={{ icon: '/images/icon_SPD.png', label: 'SPD', value: realEnemy.SPD }}
                    />
                  </StatSection>

                  <Box mt={3}>
                    <StatSection title="Resist">
                      <HStack justify="space-around" py={1.5} px={2}>
                        <HStack spacing={1}>
                          <Image alt="fire resist" src="/images/fire.png" boxSize="1rem" />
                          <Text fontSize="sm" fontWeight="600">{realEnemy.resist[0]}%</Text>
                        </HStack>
                        <HStack spacing={1}>
                          <Image alt="ice resist" src="/images/ice.png" boxSize="1rem" />
                          <Text fontSize="sm" fontWeight="600">{realEnemy.resist[1]}%</Text>
                        </HStack>
                        <HStack spacing={1}>
                          <Image alt="electric resist" src="/images/electric.png" boxSize="1rem" />
                          <Text fontSize="sm" fontWeight="600">{realEnemy.resist[2]}%</Text>
                        </HStack>
                      </HStack>
                    </StatSection>
                  </Box>
                </Box>
              </SimpleGrid>
              <Divider my={4}/>
              <SkillTabList skills={realEnemy.skills} atk={Math.floor(realEnemy.ATK[0] + realEnemy.ATK[1] * (realLevel - 1))} info={t(realEnemy.info)} rank={realEnemy.rank} enemyId={activeEnemy}/>
              <Divider my={4}/>
              <ApperanceList used={realEnemy.used} usedSanctum={realEnemy.usedSanctum}/>
            </ModalBody>
          </ModalContent>
        </>
      ) : (
        <ModalContent bg="surface.elevated" color="white" borderWidth="1px" borderColor="surface.border" mx={4}>
          <ModalCloseButton />
          <Center py={20}>
            {fullStatus === 'failed'
              ? <Text color="red.300">Failed to load enemy data.</Text>
              : <Spinner size="xl" color="yellow.400" thickness="3px" speed="0.7s" emptyColor="whiteAlpha.200" />
            }
          </Center>
        </ModalContent>
      )
    }
    </Modal>
  );
}