import { useEffect, useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody,
  Box, HStack, VStack, Image, Text, Tag, Button, ButtonGroup, Center, Spinner,
  Wrap, WrapItem, Slider, SliderTrack, SliderFilledTrack, SliderThumb,
  Tabs, TabList, TabPanels, Tab, TabPanel,
} from '@chakra-ui/react';
import Link from 'next/link';
import { useAppSelector, useAppDispatch } from '@/hooks';
import {
  selectActiveEquip, selectEquipFull, selectEquipFullStatus, setActiveEquip, fetchEquipFullAsync,
} from '@/store/equipSlice';
import { selectWorld, fetchWorldAsync } from '@/store/worldSlice';
import { selectUnits, fetchUnitsAsync } from '@/store/unitSlice';
import { EquipRank } from '@/interfaces/equip';
import { t } from '@/lib/strings';
import { rankTag, rankColor, typeIcon, roleIcon, equipIcon, EXCHANGE_META, unitDisplayName } from '@/lib/rank';
import { StatRow, StatSection } from '@/components/statBlock';
import BuffList from '@/components/buffList';
import UnitHoverCard from '@/components/unitHoverCard';
import CopyLink from '@/components/copyLink';

function statText(value: number, pct: boolean): string {
  // sign goes BEFORE the magnitude so negatives read "-27" / "-5%", not "+-27".
  const sign = value < 0 ? '-' : '+';
  if (pct) return `${sign}${Math.abs(Math.round(value * 1000) / 10)}%`;
  return `${sign}${Math.abs(value)}`;
}

// Stat icon per equip attr (same icon set the enemy stat box uses). RES attrs reuse
// the element icons; an attr with no icon here just renders label-only.
const STAT_ICON: Record<string, string> = {
  ATK: '/images/icon_ATK.png', DEF: '/images/icon_DEF.png', HP: '/images/icon_HP.png',
  ACC: '/images/icon_ACC.png', EVA: '/images/icon_EVA.png', CRIT: '/images/icon_CRIT.png',
  SPD: '/images/icon_SPD.png',
  'Fire RES': '/images/fire.png', 'Ice RES': '/images/ice.png',
  'Lightning RES': '/images/electric.png',
};

// Stat-point conversion: how much of each stat one allocation point grants (in the
// stat's STORED units — fractions for the pct stats, e.g. ACC 1.5% -> 0.015). Lets
// players see how much "pure stat" an equip is worth (handy for plain chips with no
// effects). Stats not listed here (SPD, RES) have no point value and are skipped.
const STAT_PER_POINT: Record<string, number> = {
  ATK: 1.5, DEF: 1.25, HP: 8,
  ACC: 0.015, EVA: 0.004, CRIT: 0.004,
};

// A stat's worth in allocation points (value / per-point), or null if not
// convertible. Negative stats yield negative points (they net against the total).
function statPoints(attr: string, value: number): number | null {
  const per = STAT_PER_POINT[attr];
  if (per == null) return null;
  return value / per;
}

// Round points for display (1 dp), trimming a trailing .0.
const fmtPoints = (n: number): string => {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};

export default function EquipModal() {
  const dispatch = useAppDispatch();
  const id     = useAppSelector(selectActiveEquip);
  const full   = useAppSelector((s) => (id ? selectEquipFull(s, id) : null));
  const status = useAppSelector((s) => (id ? selectEquipFullStatus(s, id) : null));
  const world  = useAppSelector(selectWorld);
  const units  = useAppSelector(selectUnits);

  const [rankIdx, setRankIdx] = useState(0);
  const [level,   setLevel]   = useState(10);

  useEffect(() => { if (id) dispatch(fetchEquipFullAsync(id)); }, [id, dispatch]);
  useEffect(() => { if (id) dispatch(fetchWorldAsync()); }, [id, dispatch]);
  useEffect(() => { if (id) dispatch(fetchUnitsAsync()); }, [id, dispatch]);
  // default to the highest rank whenever a new equip opens
  useEffect(() => { if (full) setRankIdx(full.ranks.length - 1); }, [full?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const hide   = () => dispatch(setActiveEquip(''));
  const isOpen = !!id;

  const safeRankIdx = Math.min(rankIdx, (full?.ranks.length ?? 1) - 1);
  const rank: EquipRank | undefined = full?.ranks[safeRankIdx];
  const lvl = rank?.levels[Math.min(level, (rank?.levels.length ?? 1) - 1)];

  // Drop location for the selected rank; if it has none, fall back to the nearest
  // LOWER rank that does (and flag it so the UI can note the fallback).
  let dropSrc = rank?.source;
  let dropFallbackRank: EquipRank | undefined;
  if (full && rank && (!dropSrc || Object.keys(dropSrc).length === 0)) {
    for (let i = safeRankIdx - 1; i >= 0; i--) {
      const r = full.ranks[i];
      if (r.source && Object.keys(r.source).length) {
        dropSrc = r.source;
        dropFallbackRank = r;
        break;
      }
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={hide} isCentered scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(2px)" />
      <ModalContent
        bg="surface.elevated" color="white"
        borderWidth="1px" borderColor="surface.border"
        mx={4} maxW={['container.sm', 'container.sm', 'container.md']}
      >
        {!full || status === 'loading' ? (
          <Center py={20}><Spinner size="xl" color="yellow.400" thickness="3px" /></Center>
        ) : !rank ? (
          <Center py={20}><Text color="gray.500">No equipment data.</Text></Center>
        ) : (
          <>
            {/* ── header: icon + name ── */}
            <ModalHeader pb={2} pr={12}>
              <HStack spacing={3} align="center">
                <Box
                  boxSize="40px" borderRadius="md" overflow="hidden" bg="blackAlpha.500"
                  borderWidth="1px" borderColor={rankColor(rank.grade)} flexShrink={0}
                >
                  {rank.icon
                    ? <Image src={`/images/icons/${rank.icon}.png`} alt={t(rank.name)} objectFit="contain" w="100%" h="100%" />
                    : null}
                </Box>
                <Box minW={0}>
                  <Text fontSize="lg" noOfLines={1}>{t(rank.name)}</Text>
                  <Text fontSize="xs" color="gray.500" fontFamily="mono">{full.id}</Text>
                </Box>
                <CopyLink path={`/equipment?equip=${encodeURIComponent(full.id)}`} />
              </HStack>
            </ModalHeader>
            <ModalCloseButton />

            <ModalBody pb={6} overflowY="auto" maxH="75vh">

              {/* ── rank switcher ── */}
              {full.ranks.length > 1 ? (
                <ButtonGroup isAttached size="sm" mb={3} flexWrap="wrap">
                  {full.ranks.map((rk, i) => (
                    <Button
                      key={i}
                      variant={i === rankIdx ? 'solid' : 'outline'}
                      bg={i === rankIdx ? rankColor(rk.grade) : undefined}
                      color={i === rankIdx ? 'blackAlpha.800' : rankColor(rk.grade)}
                      borderColor={rankColor(rk.grade)}
                      _hover={{ bg: i === rankIdx ? rankColor(rk.grade) : 'whiteAlpha.100' }}
                      onClick={() => setRankIdx(i)}
                    >
                      {rankTag(rk.grade)}
                    </Button>
                  ))}
                </ButtonGroup>
              ) : null}

              <Tabs variant="soft-rounded" colorScheme="yellow" size="sm" isLazy>
                <TabList mb={3}>
                  <Tab>Stats</Tab>
                  <Tab>Source</Tab>
                </TabList>
                <TabPanels>
                  {/* ───────────── Stats tab ───────────── */}
                  <TabPanel p={0}>

              {/* ── metadata grid (Type / Rank / Limits) ── */}
              <Box
                borderWidth="1px" borderColor="surface.border" borderRadius="md"
                overflow="hidden" mb={3}
              >
                {/* Type row (slot: Chip / OS / Item, from ItemType) */}
                <HStack spacing={0} borderBottomWidth="1px" borderBottomColor="surface.border">
                  <Box w="120px" flexShrink={0} px={3} py={2} bg="blackAlpha.400">
                    <Text fontSize="sm" color="gray.400" fontWeight="semibold">Type</Text>
                  </Box>
                  <Box flex={1} px={3} py={2}>
                    <Tag size="sm" colorScheme="gray" fontWeight="bold" gap={1}>
                      {equipIcon(full.slot) ? <Image src={equipIcon(full.slot)!} alt={full.slot} boxSize="14px" /> : null}
                      {full.slot}
                    </Tag>
                  </Box>
                </HStack>

                {/* Rank row */}
                <HStack spacing={0} borderBottomWidth="1px" borderBottomColor="surface.border">
                  <Box w="120px" flexShrink={0} px={3} py={2} bg="blackAlpha.400">
                    <Text fontSize="sm" color="gray.400" fontWeight="semibold">Rank</Text>
                  </Box>
                  <Box flex={1} px={3} py={2}>
                    <Tag size="sm" bg={rankColor(rank.grade)} color="blackAlpha.800" fontWeight="bold">
                      {rankTag(rank.grade)}
                    </Tag>
                  </Box>
                </HStack>

                {/* Limits row (class / role / specific-unit restriction) */}
                <HStack spacing={0}>
                  <Box w="120px" flexShrink={0} px={3} py={2} bg="blackAlpha.400">
                    <Text fontSize="sm" color="gray.400" fontWeight="semibold">Limits</Text>
                  </Box>
                  <Box flex={1} px={3} py={2}>
                    {!rank.classLimit && !rank.roleLimit && !rank.pcLimit ? (
                      <Text fontSize="sm" color="gray.500">No limits</Text>
                    ) : null}
                    <Wrap spacing={2}>
                      {rank.classLimit ? (
                        <WrapItem>
                          <Tag size="sm" colorScheme="green" gap={1}>
                            {typeIcon(rank.classLimit) ? <Image src={typeIcon(rank.classLimit)!} alt="" boxSize="12px" /> : null}
                            {rank.classLimit} only
                          </Tag>
                        </WrapItem>
                      ) : null}
                      {rank.roleLimit ? (
                        <WrapItem>
                          <Tag size="sm" colorScheme="red" gap={1}>
                            {roleIcon(rank.roleLimit) ? <Image src={roleIcon(rank.roleLimit)!} alt="" boxSize="12px" /> : null}
                            {rank.roleLimit} only
                          </Tag>
                        </WrapItem>
                      ) : null}
                      {rank.pcLimit ? (
                        <WrapItem>
                          <UnitHoverCard unitId={rank.pcLimit} inModal>
                            <Tag as={Link} href={`/units/detail?id=${encodeURIComponent(rank.pcLimit)}`}
                              size="sm" colorScheme="purple" gap={1} _hover={{ bg: 'purple.600' }}>
                              {(() => {
                                const u = units[rank.pcLimit];
                                return u ? unitDisplayName(u) : 'Unit-locked';
                              })()}
                            </Tag>
                          </UnitHoverCard>
                        </WrapItem>
                      ) : null}
                    </Wrap>
                  </Box>
                </HStack>
              </Box>

              {/* ── flavor / detail text ── */}
              {rank.detail ? (
                <Box
                  mb={3} px={3} py={2.5}
                  bg="blackAlpha.500"
                  borderRadius="md"
                  borderWidth="1px" borderColor="surface.border"
                >
                  <Text fontSize="xs" color="gray.300" whiteSpace="pre-wrap" lineHeight="1.7" fontStyle="italic">
                    {t(rank.detail).replace(/&n/g, '\n')}
                  </Text>
                </Box>
              ) : null}

              {/* ── level slider ── */}
              <HStack spacing={3} mb={4}>
                <Text fontSize="xs" color="gray.500" whiteSpace="nowrap" minW="40px">
                  Lv {level}
                </Text>
                <Slider
                  aria-label="equip level" value={level}
                  min={0} max={(rank.levels?.length ?? 11) - 1}
                  flex="1" onChange={setLevel} focusThumbOnChange={false}
                >
                  <SliderTrack bg="whiteAlpha.200">
                    <SliderFilledTrack bg="yellow.400" />
                  </SliderTrack>
                  <SliderThumb boxSize={4} />
                </Slider>
              </HStack>

              {/* ── stats at this level (+ allocation-point worth) ── */}
              {lvl && lvl.stats.length ? (
                <Box mb={3}>
                  <StatSection title="Stats">
                    {lvl.stats.map((st, i) => {
                      const pts = statPoints(st.attr, st.value);
                      return (
                        <StatRow key={i} label={
                          <HStack spacing={1.5}>
                            {STAT_ICON[st.attr] ? <Image alt={st.attr} src={STAT_ICON[st.attr]} boxSize="0.95rem" /> : null}
                            <Text as="span">{st.attr}</Text>
                            <Text as="span" color="gray.100" fontWeight="600" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                              {statText(st.value, st.pct)}
                            </Text>
                          </HStack>
                        } value={
                          pts != null ? (
                            <Text as="span" fontSize="xs" color="gray.500" fontWeight="600">{fmtPoints(pts)} pt</Text>
                          ) : null
                        } />
                      );
                    })}
                    {(() => {
                      const total = lvl.stats.reduce(
                        (s, st) => s + (statPoints(st.attr, st.value) ?? 0), 0);
                      const hasPts = lvl.stats.some((st) => statPoints(st.attr, st.value) != null);
                      if (!hasPts) return null;
                      return (
                        <StatRow label="Stat Points" value={
                          <Text as="span" color="yellow.300" fontWeight="700">{fmtPoints(total)} pt</Text>
                        } />
                      );
                    })()}
                  </StatSection>
                </Box>
              ) : null}

              {/* ── on-equip buff effects (full skill-style rendering) ── */}
              {lvl && lvl.buffs.length ? (
                <Box>
                  <Text
                    fontSize="2xs" letterSpacing="wider" textTransform="uppercase"
                    color="yellow.400" fontWeight="700" mb={2} px={2}
                  >
                    Effects
                  </Text>
                  <BuffList buffs={lvl.buffs} />
                </Box>
              ) : null}

                  </TabPanel>

                  {/* ───────────── Source tab ───────────── */}
                  <TabPanel p={0}>

              {/* ── exchange shop source (Sanctum / Infinite War) ── */}
              {full.exchange ? (
                <Box mb={4} px={3} py={2.5} bg="blackAlpha.400" borderRadius="md"
                  borderWidth="1px" borderColor="surface.border">
                  <Text fontSize="2xs" letterSpacing="wider" textTransform="uppercase"
                    color="yellow.400" fontWeight="700" mb={2}>
                    Exchange Shop
                  </Text>
                  <HStack>
                    <Tag colorScheme={EXCHANGE_META[full.exchange].color} size="sm" fontWeight="bold">
                      {EXCHANGE_META[full.exchange].label}
                    </Tag>
                    <Text fontSize="xs" color="gray.400">
                      Purchasable from the {EXCHANGE_META[full.exchange].label} exchange shop.
                    </Text>
                  </HStack>
                </Box>
              ) : null}

              {/* ── drop location: world stages that grant THIS rank (or a lower one) ── */}
              {dropSrc && Object.keys(dropSrc).length ? (
                <Box>
                  <Text
                    fontSize="2xs" letterSpacing="wider" textTransform="uppercase"
                    color="yellow.400" fontWeight="700" mb={1} px={2}
                  >
                    Drop Location
                  </Text>
                  {dropFallbackRank ? (
                    <Text fontSize="2xs" color="orange.300" px={2} mb={1}>
                      No known drop for {rankTag(rank.grade)}; showing the {rankTag(dropFallbackRank.grade)} rank&apos;s stages instead.
                    </Text>
                  ) : null}
                  <Text fontSize="2xs" color="gray.500" px={2} mb={2}>
                    Repeatable wave drops are farmable; <Tag size="sm" colorScheme="purple">1×</Tag> stages grant it once via clear / mission reward.
                  </Text>
                  <VStack align="stretch" spacing={2}>
                    {Object.entries(dropSrc).map(([wid, stages]) => (
                      <Box key={wid} borderWidth="1px" borderColor="surface.border" borderRadius="md" bg="blackAlpha.300" p={2}>
                        <Text fontWeight="bold" fontSize="xs" mb={1} color="gray.300">
                          {world?.[wid] ? t(world[wid].title) : wid}
                        </Text>
                        <Wrap spacing={1.5}>
                          {stages.map(([zone, stage, farm], i) => (
                            <WrapItem key={i}>
                              <Button as={Link} size="xs"
                                variant={farm ? 'outline' : 'solid'}
                                colorScheme={farm ? 'yellow' : 'purple'}
                                href={`/world/stage?id=${encodeURIComponent(wid)}&zone=${zone}&stage=${encodeURIComponent(stage)}`}>
                                {stage}{farm ? '' : ' ·1×'}
                              </Button>
                            </WrapItem>
                          ))}
                        </Wrap>
                      </Box>
                    ))}
                  </VStack>
                </Box>
              ) : null}

              {!full.exchange && (!dropSrc || !Object.keys(dropSrc).length) ? (
                <Text fontSize="sm" color="gray.500" py={4} textAlign="center">
                  No known acquisition source.
                </Text>
              ) : null}

                  </TabPanel>
                </TabPanels>
              </Tabs>

            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}