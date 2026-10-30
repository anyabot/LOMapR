import React, { useEffect, useRef, useState } from 'react';
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
} from '@altterisk/game-hub/ui'
import SkillTabList from './skillTabList';
import ApperanceList from './appearanceList';
import CopyLink from '@/components/copyLink';
import { StatRows } from '@altterisk/game-hub';
import StatHeading from '@/components/statHeading';

import { EnemyFull } from '@/interfaces/enemy';
import { t } from '@/lib/strings';
import { useTranslationVersion } from '@/lib/translationVersion';
import { typeIcon, roleIcon, RANK_COLOR } from '@/lib/rank';

import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectEnemy, selectEnemyFull, selectEnemyFullStatus, selectActiveEnemy, selectActiveLevel, setActive, fetchEnemyAsync, fetchEnemyFullAsync } from '@/store/enemySlice';
import { selectImage, fetchImageAsync } from '@/store/imageSlice';
import { fetchEnemySkillsAsync } from '@/store/skillSlice';
import { fetchEnemyAIAsync } from '@/store/aiSlice';

const statIcon = (src: string, alt: string) => <Image src={src} alt={alt} />;

// Enemy rank is a letter; C has no official colour and falls back to the default badge.
const ENEMY_RANK_COLOR: Record<string, string> = {
  B: RANK_COLOR[2], A: RANK_COLOR[3], S: RANK_COLOR[4], SS: RANK_COLOR[5], SSS: RANK_COLOR[6],
};

export default function EnemyModal() {
  useTranslationVersion();
  // Focus the dialog itself, so no control opens with a focus ring and its tooltip.
  const contentRef = useRef<HTMLDivElement>(null);
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
  // Labels a variant by what distinguishes it from its siblings; falls back to the key.
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
      initialFocusRef={contentRef}
      aria-labelledby="contained-modal-title-vcenter">
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(2px)" />
      <ModalContent
        ref={contentRef}
        bg="surface.elevated"
        color="white"
        borderWidth="1px"
        borderColor="surface.border"
        mx={4}
        maxW={["container.sm", "container.sm", "container.md", "container.lg", "container.xl"]}
      >
        <ModalCloseButton />
        {realEnemy && fullStatus === 'idle' && realEnemy.HP ? (
          <>
            <ModalHeader pb={2} pr={12}>
              <HStack spacing={3} align="center">
                <Text fontSize="xl">{t(realEnemy.name)}</Text>
                <CopyLink path={`/enemies?enemy=${encodeURIComponent(activeEnemy)}`} />
              </HStack>
              <Text fontSize="xs" color="gray.500" fontWeight="normal" fontFamily="mono">
                {activeEnemy}
              </Text>
            </ModalHeader>
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
                  <Box mt={3}>
                    <StatHeading>Profile</StatHeading>
                    <StatRows columns={1} rows={[
                      { label: 'Type', value: (
                        <HStack as="span" spacing={1.5} justify="flex-end">
                          {typeIcon(realEnemy.type) ? <Image src={typeIcon(realEnemy.type)!} alt={realEnemy.type} boxSize="16px" /> : null}
                          <span>{realEnemy.type}</span>
                        </HStack>
                      ) },
                      { label: 'Role', value: (
                        <HStack as="span" spacing={1.5} justify="flex-end">
                          {roleIcon(realEnemy.role) ? <Image src={roleIcon(realEnemy.role)!} alt={realEnemy.role} boxSize="16px" /> : null}
                          <span>{realEnemy.role}</span>
                        </HStack>
                      ) },
                      { label: 'Rank', value: (
                        <Badge borderRadius="md" px={1.5}
                          bg={ENEMY_RANK_COLOR[realEnemy.rank] ?? undefined}
                          color={ENEMY_RANK_COLOR[realEnemy.rank] ? 'blackAlpha.800' : undefined}
                          colorScheme={ENEMY_RANK_COLOR[realEnemy.rank] ? undefined : 'yellow'}>
                          {realEnemy.rank}
                        </Badge>
                      ) },
                    ]} />
                  </Box>
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
                  <StatHeading>Stats</StatHeading>
                  <StatRows rows={[
                    { label: 'HP', icon: statIcon('/images/icon_HP.png', 'HP'),
                      value: Math.floor(realEnemy.HP[0] + realEnemy.HP[1] * (realLevel - 1)).toLocaleString() },
                    { label: 'SPD', icon: statIcon('/images/icon_SPD.png', 'SPD'), value: realEnemy.SPD },
                    { label: 'ATK', icon: statIcon('/images/icon_ATK.png', 'ATK'),
                      value: Math.floor(realEnemy.ATK[0] + realEnemy.ATK[1] * (realLevel - 1)).toLocaleString() },
                    { label: 'DEF', icon: statIcon('/images/icon_DEF.png', 'DEF'),
                      value: Math.floor(realEnemy.DEF[0] + realEnemy.DEF[1] * (realLevel - 1)).toLocaleString() },
                    { label: 'ACC', icon: statIcon('/images/icon_ACC.png', 'ACC'), value: `${realEnemy.ACC}%` },
                    { label: 'EVA', icon: statIcon('/images/icon_EVA.png', 'EVA'), value: `${realEnemy.EVA}%` },
                    { label: 'CRIT', icon: statIcon('/images/icon_CRIT.png', 'CRIT'), value: `${realEnemy.CRIT}%` },
                  ]} />

                  <Box mt={3}>
                    <StatHeading>Resist</StatHeading>
                    <StatRows columns={3} rows={[
                      { label: 'Fire', icon: statIcon('/images/fire.png', 'fire resist'), value: `${realEnemy.resist[0]}%` },
                      { label: 'Ice', icon: statIcon('/images/ice.png', 'ice resist'), value: `${realEnemy.resist[1]}%` },
                      { label: 'Electric', icon: statIcon('/images/electric.png', 'electric resist'), value: `${realEnemy.resist[2]}%` },
                    ]} />
                  </Box>
                </Box>
              </SimpleGrid>
              <Divider my={4}/>
              <SkillTabList skills={realEnemy.skills} atk={Math.floor(realEnemy.ATK[0] + realEnemy.ATK[1] * (realLevel - 1))} info={t(realEnemy.info)} rank={realEnemy.rank} enemyId={activeEnemy}/>
              <Divider my={4}/>
              <ApperanceList used={realEnemy.used} usedSanctum={realEnemy.usedSanctum}/>
            </ModalBody>
          </>
        ) : (
          <Center py={20}>
            {fullStatus === 'failed'
              ? <Text color="red.300">Failed to load enemy data.</Text>
              : <Spinner size="xl" color="accent.400" thickness="3px" speed="0.7s" emptyColor="whiteAlpha.200" />
            }
          </Center>
        )}
      </ModalContent>
    </Modal>
  );
}