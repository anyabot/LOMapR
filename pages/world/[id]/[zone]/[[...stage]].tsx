import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectWorld, fetchWorldAsync } from '@/store/worldSlice';
import { Stage, Zone } from '@/interfaces/world';
import { t } from '@/lib/strings';
import { useEffect, useState, useLayoutEffect } from 'react';
import { useRouter } from 'next/router'
import EnemyGrid from '@/components/enemyGrid'
import StageGrid from '@/components/stageGrid'
import CopyLink from '@/components/copyLink'
import Error from 'next/error';
import Link from 'next/link';
import styles from "@/styles/custom.module.css"
import { Box, Image, VStack, HStack, Center, Tag, Text, Badge, Heading, Divider, IconButton, Button, ButtonGroup } from '@chakra-ui/react';
import { ArrowLeftIcon, ArrowRightIcon, ArrowBackIcon } from '@chakra-ui/icons';
import Head from 'next/head';

export default function Home() {

  const world = useAppSelector(selectWorld);
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(fetchWorldAsync());
  }, [dispatch]);
  const router = useRouter()
  const id = router.query.id as string
  const zone = router.query.zone as string
  const real_zone_index = parseInt(zone) - 1
  const [realZone, setRealZone] = useState<Zone | undefined | null>(null)
  const stage = router.query.stage ? router.query.stage[0]: ""
  const [currStage, setCurrStage] = useState(stage)
  const [realCurrStage, setRealCurrStage] = useState<Stage | undefined | null>(null)
  const [currWave, setCurrWave] = useState(0)
  const [currSubzone, setCurrSubzone] = useState(0)

  useEffect(() => setCurrStage(stage), [stage])
  useEffect(() => {
    world[id]? world[id].zones ? world[id].zones[real_zone_index]? setRealZone(world[id].zones[real_zone_index]) : null : null : null
  }, [world, id, real_zone_index]);
  useEffect(() => {
    realZone ? setRealCurrStage(findStage()) : null
  }, [realZone, currStage]);
  // when a specific stage is requested (e.g. from an appearance link), switch to
  // the subzone that contains it.
  useEffect(() => {
    if (realZone?.subzones && currStage) {
      const idx = realZone.subzones.findIndex(
        sz => sz.some(s => s.title.toLowerCase() === currStage.toLowerCase())
      )
      if (idx >= 0) setCurrSubzone(idx)
    }
  }, [realZone, currStage]);
  useLayoutEffect(() => {
    if (currWave && realCurrStage) {
      currWave >= 0 ? null : setCurrWave(0)
      currWave <= realCurrStage!.waves.length - 1 ? null : setCurrWave(realCurrStage!.waves.length - 1)
    }
  }, [realCurrStage, currWave])

  // all stages in the zone (flat list or flattened subzones), for lookup
  function allStages(z: Zone): Stage[] {
    return z.subzones ? z.subzones.flat() : z.stages
  }
  function findStage() {
    if (realZone) {
      return allStages(realZone).find(e => e.title.toLowerCase() == currStage.toLowerCase())
    }
    return null
  }
  function decreaseWave() {
    currWave > 0 ? setCurrWave(currWave - 1) : null
  }
  function increaseWave() {
    currWave < realCurrStage!.waves.length - 1 ? setCurrWave(currWave + 1) : null
  }
  if (Object.keys(world).length === 0 || !id || !zone) {
    return (<>
      <Head>
        <title>Stage List</title>
      </Head>
    </>)
  }
  else if (!(id in world) || !(real_zone_index in world[id].zones)) {
    return     (<>
      <Error statusCode={404}/>
    </>)
  }
  else {
    let z = world[id].zones[real_zone_index]
    const subzones: Stage[][] | null = z.subzones ?? null
    const sub = Math.min(currSubzone, (subzones?.length ?? 1) - 1)
    const shownStages: Stage[] = subzones ? subzones[sub] : z.stages

    return (
      <>
      <Head>
        <title>{t(z.title)}</title>
      </Head>
      <VStack align="stretch" spacing={4} py={4}>
        <Button as={Link} href={`/world/${id}`} leftIcon={<ArrowBackIcon />} colorScheme="gray" variant="outline" size="sm" alignSelf="start">
          Back
        </Button>
        <Heading size="xl">{t(z.title)}</Heading>

        {/* subzone switcher (chapters 12/13) — show one sub-map at a time */}
        {subzones && subzones.length > 1 ? (
          <ButtonGroup isAttached size="sm" alignSelf="center" flexWrap="wrap" justifyContent="center">
            {subzones.map((_, i) => (
              <Button
                key={i}
                variant="outline"
                bg={i === sub ? 'whiteAlpha.100' : 'transparent'}
                color={i === sub ? 'yellow.300' : 'gray.400'}
                borderColor={i === sub ? 'yellow.400' : 'surface.border'}
                _hover={{ bg: 'whiteAlpha.200' }}
                onClick={() => setCurrSubzone(i)}
              >
                Part {i + 1}
              </Button>
            ))}
          </ButtonGroup>
        ) : null}

        <Box p={3} bg="surface.elevated" borderRadius="xl" borderWidth="1px" borderColor="surface.border" w="100%" overflowX="auto">
          <StageGrid stages={shownStages} selected={currStage} onSelect={setCurrStage} />
        </Box>

        {realCurrStage ? (
          <>
            <Divider />
            <VStack as={Center} spacing={4}>
              {realCurrStage.title ? (
                (() => {
                  const isBattle = !!realCurrStage.waves.length;
                  const SUBTYPE_ICON: Record<string, string> = {
                    Side: '/images/Side Stage.png',
                    Main: '/images/Main Stage.png',
                    Ex: '/images/EX Stage.png',
                    Story: '/images/Story Stage.png',
                  };
                  const icon = isBattle
                    ? (SUBTYPE_ICON[realCurrStage.subtype] ?? SUBTYPE_ICON.Main)
                    : SUBTYPE_ICON.Story;
                  const hasName = realCurrStage.name && t(realCurrStage.name) !== realCurrStage.title;
                  const shareLink = (
                    <CopyLink
                      path={`/world/${encodeURIComponent(id)}/${zone}/${encodeURIComponent(realCurrStage.title)}`}
                    />
                  );
                  return (
                    <HStack
                      spacing={3}
                      w="100%"
                      maxW="container.md"
                      bg="surface.elevated"
                      borderWidth="1px"
                      borderColor={isBattle ? 'teal.500' : 'surface.border'}
                      borderRadius="2xl"
                      px={4}
                      py={2.5}
                      boxShadow="0 4px 14px rgba(0,0,0,.35)"
                    >
                      <Image src={icon} alt={realCurrStage.subtype} boxSize="40px" objectFit="contain"
                        filter="drop-shadow(0 2px 4px rgba(0,0,0,.5))" />
                      <Box flex={1} minW={0}>
                        <HStack spacing={2} align="center">
                          <Heading size="md" lineHeight={1}>{realCurrStage.title}</Heading>
                          <Badge
                            colorScheme={isBattle ? 'teal' : 'purple'}
                            variant="solid"
                            borderRadius="full"
                            px={2}
                            textTransform="none"
                            fontSize="0.7rem"
                          >
                            {isBattle ? 'Battle' : 'Story'}
                          </Badge>
                          {/* no separate name -> share sits next to the title */}
                          {!hasName ? shareLink : null}
                        </HStack>
                        {hasName ? (
                          <HStack spacing={2} align="center" mt={0.5}>
                            <Text fontSize="sm" color="gray.400" noOfLines={1} flex={1} minW={0}>
                              {t(realCurrStage.name)}
                            </Text>
                            {shareLink}
                          </HStack>
                        ) : null}
                      </Box>
                    </HStack>
                  );
                })()
              ) : null}

              {realCurrStage.waves.length ? (
                <>
                  <HStack spacing={2}>
                    {realCurrStage.waves.map((e, index) => (
                      <div onClick={() => setCurrWave(index)} key={index} className={styles['wave-button']}>
                        {index == currWave ? (
                          <Image src="/images/map-current.png" alt="current-wave" className={styles['wave-current']} />
                        ) : null}
                        <Image src="/images/profile/NightChick.png" alt={`wave-${index}`} />
                      </div>
                    ))}
                  </HStack>
                  <HStack as={Center} gap={[2, 4, 6]}>
                    <IconButton aria-label="Previous wave" icon={<ArrowLeftIcon />}
                      isRound size="md" variant="outline" colorScheme="gray"
                      isDisabled={currWave == 0} onClick={decreaseWave} />
                    {realCurrStage?.waves[currWave]?.enemies && <EnemyGrid wave={realCurrStage.waves[currWave].enemies} />}
                    <IconButton aria-label="Next wave" icon={<ArrowRightIcon />}
                      isRound size="md" variant="outline" colorScheme="gray"
                      isDisabled={currWave == realCurrStage!.waves.length - 1} onClick={increaseWave} />
                  </HStack>
                </>
              ) : null}
            </VStack>
          </>
        ) : null}
      </VStack>
      </>
    )
  }
}
