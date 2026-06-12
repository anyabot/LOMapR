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

import { EnemyFull } from '@/interfaces/enemy';
import { t } from '@/lib/strings';

import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectEnemy, selectEnemyFull, selectEnemyFullStatus, selectActiveEnemy, selectActiveLevel, setActive, fetchEnemyAsync, fetchEnemyFullAsync } from '@/store/enemySlice';
import { selectImage, fetchImageAsync } from '@/store/imageSlice';
import { fetchEnemySkillsAsync } from '@/store/skillSlice';
import { fetchEnemyAIAsync } from '@/store/aiSlice';

// One icon + label + value row inside a stat section.
function StatRow({ icon, label, value }: { icon?: string; label: string; value: React.ReactNode }) {
  return (
    <Flex align="center" justify="space-between" py={1} px={2} borderRadius="md"
      _odd={{ bg: 'whiteAlpha.50' }}>
      <HStack spacing={1.5} color="gray.400" minW={0}>
        {icon ? <Image alt={label} src={icon} boxSize="0.95rem" /> : null}
        <Text fontSize="sm" fontWeight="600">{label}</Text>
      </HStack>
      <Text fontSize="sm" fontWeight="600" sx={{ fontVariantNumeric: 'tabular-nums' }} color="gray.100">
        {value}
      </Text>
    </Flex>
  );
}

// Two icon+label+value cells on a single row (the game's paired stat layout).
function StatPair({ left, right }: {
  left: { icon?: string; label: string; value: React.ReactNode };
  right?: { icon?: string; label: string; value: React.ReactNode };
}) {
  const Cell = ({ icon, label, value }: { icon?: string; label: string; value: React.ReactNode }) => (
    <Flex align="center" justify="space-between" flex={1} minW={0}>
      <HStack spacing={1.5} color="gray.400" minW={0}>
        {icon ? <Image alt={label} src={icon} boxSize="0.95rem" /> : null}
        <Text fontSize="sm" fontWeight="600">{label}</Text>
      </HStack>
      <Text fontSize="sm" fontWeight="600" sx={{ fontVariantNumeric: 'tabular-nums' }} color="gray.100">
        {value}
      </Text>
    </Flex>
  );
  return (
    <HStack spacing={4} py={1} px={2} borderRadius="md" _odd={{ bg: 'whiteAlpha.50' }}
      divider={<Box w="1px" alignSelf="stretch" bg="whiteAlpha.200" />}>
      <Cell {...left} />
      {right ? <Cell {...right} /> : <Box flex={1} />}
    </HStack>
  );
}

// A titled group of stat rows.
function StatSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box>
      <Text fontSize="2xs" letterSpacing="wider" textTransform="uppercase"
        color="yellow.400" fontWeight="700" mb={1} px={2}>
        {title}
      </Text>
      <Box bg="blackAlpha.300" borderRadius="lg" borderWidth="1px" borderColor="surface.border" py={0.5}>
        {children}
      </Box>
    </Box>
  );
}

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
                    <StatRow label="Type" value={realEnemy.type} />
                    <StatRow label="Role" value={realEnemy.role} />
                    <StatRow label="Rank" value={
                      <Badge colorScheme="yellow" borderRadius="md" px={1.5}>{realEnemy.rank}</Badge>
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