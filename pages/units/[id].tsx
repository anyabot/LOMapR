import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import {
  Box, Button, Center, Flex, Heading, HStack, VStack, Text, Tag, Wrap, WrapItem,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer, SimpleGrid, Spinner, Image,
  Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon,
  Tabs, Tab, TabList, TabPanels,
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import { useAppSelector, useAppDispatch } from '@/hooks';
import {
  selectUnit, selectUnitStatus, fetchUnitsAsync,
  selectUnitSkills, selectUnitSkillStatus, fetchUnitSkillsAsync,
} from '@/store/unitSlice';
import { selectWorld } from '@/store/worldSlice';
import { UnitData, UnitReq } from '@/interfaces/unit';
import { RewardEntry } from '@/interfaces/world';
import { Skill } from '@/interfaces/skill';
import { t } from '@/lib/strings';
import RewardList from '@/components/rewardList';
import SkillTab from '@/components/enemyTab/skillTab';
import CopyLink from '@/components/copyLink';
import { rankTag, rankColor } from '@/lib/rank';

// Solid rank chip in the official rank color (dark text for readability).
function RankTag({ grade, prefix = '', size }: { grade: number; prefix?: string; size?: string }) {
  return (
    <Tag size={size} bg={rankColor(grade)} color="blackAlpha.800" fontWeight="bold">
      {prefix}{rankTag(grade)}
    </Tag>
  );
}

// Material requirements reuse the reward chip UI: a UnitReq is just {item, count}.
const asRewards = (req: UnitReq[]): RewardEntry[] => req.map((r) => ({ item: r.id, count: r.count }));

// A labelled key/value line for the profile block.
function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <HStack justify="space-between" fontSize="sm">
      <Text color="gray.400">{label}</Text>
      <Text color="gray.100" fontWeight="medium">{children}</Text>
    </HStack>
  );
}

export default function UnitDetail() {
  const router = useRouter();
  const id = router.query.id as string;
  const dispatch = useAppDispatch();

  const unit = useAppSelector((s) => (id ? selectUnit(s, id) : null));
  const status = useAppSelector(selectUnitStatus);
  const world = useAppSelector(selectWorld);
  const skills = useAppSelector((s) => (id ? selectUnitSkills(s, id) : {}));
  const skillStatus = useAppSelector((s) => (id ? selectUnitSkillStatus(s, id) : 'idle'));

  useEffect(() => { dispatch(fetchUnitsAsync()); }, [dispatch]);
  useEffect(() => { if (id && unit) dispatch(fetchUnitSkillsAsync(id)); }, [id, unit, dispatch]);

  if (!unit) {
    if (status === 'loading' || !router.isReady) return null;  // GlobalLoader covers loading
    return (
      <Center py={20}>
        <VStack>
          <Text color="gray.400">Unit not found.</Text>
          <Button as={Link} href="/units" leftIcon={<ArrowBackIcon />} size="sm" variant="outline">Back to units</Button>
        </VStack>
      </Center>
    );
  }

  const name = t(unit.name);
  // ordered skill records for this unit (active first, then passive — by skills[] order)
  const skillRecords: Skill[] = (unit.skills || []).map((k) => skills[k]).filter(Boolean) as Skill[];
  // top-grade stat block used for the header ATK passed to SkillTab (rate -> damage).
  const topStat = unit.stat[unit.stat.length - 1];
  const headerAtk = topStat ? topStat.ATK[1] : 0;

  return (
    <>
      <Head><title>{name} — Unit</title></Head>
      <VStack align="stretch" spacing={5} py={4}>
        <Button as={Link} href="/units" leftIcon={<ArrowBackIcon />} colorScheme="gray" variant="outline" size="sm" alignSelf="start">
          Units
        </Button>

        {/* Header: portrait + identity */}
        <Flex gap={4} align="center" wrap="wrap"
          bg="surface.elevated" borderWidth="1px" borderColor="surface.border" borderRadius="xl" p={4}>
          <Box boxSize="96px" borderRadius="lg" overflow="hidden" bg="blackAlpha.500" flexShrink={0}>
            {unit.icon ? (
              <Image src={`/images/icons/${unit.icon}.png`} alt={unit.icon} objectFit="cover" w="100%" h="100%" />
            ) : null}
          </Box>
          <VStack align="start" spacing={2} minW={0}>
            <HStack>
              <Heading size="lg">{name}</Heading>
              <CopyLink path={`/units/${encodeURIComponent(unit.id)}`} />
            </HStack>
            <Wrap spacing={2}>
              <WrapItem><RankTag grade={unit.rarity} /></WrapItem>
              <WrapItem><Tag colorScheme="green">{unit.type}</Tag></WrapItem>
              <WrapItem><Tag colorScheme="red">{unit.role}</Tag></WrapItem>
              {unit.body ? <WrapItem><Tag colorScheme="gray">{unit.body}</Tag></WrapItem> : null}
            </Wrap>
            <Text fontSize="xs" color="gray.500">{unit.id}</Text>
          </VStack>
        </Flex>

        {/* Stats per grade */}
        {unit.stat.length > 0 ? (
          <Box borderWidth="1px" borderColor="surface.border" borderRadius="xl" overflow="hidden" bg="surface.elevated">
            <Box px={4} py={2} bg="blackAlpha.300" fontWeight="bold" fontSize="sm" color="gray.200">
              Stats <Text as="span" color="gray.500" fontWeight="normal">— Lv1 / Lv100 per grade</Text>
            </Box>
            <TableContainer>
              <Table size="sm" variant="simple">
                <Thead>
                  <Tr>
                    <Th>Grade</Th><Th isNumeric>HP</Th><Th isNumeric>ATK</Th><Th isNumeric>DEF</Th>
                    <Th isNumeric>SPD</Th><Th isNumeric>CRIT</Th><Th isNumeric>ACC</Th><Th isNumeric>EVA</Th>
                    <Th isNumeric>Resist (F/I/L)</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {unit.stat.map((st, i) => {
                    const grade = unit.rarity + i;
                    return (
                      <Tr key={grade}>
                        <Td><RankTag grade={grade} size="sm" /></Td>
                        <Td isNumeric>{st.HP[0]} / {st.HP[1]}</Td>
                        <Td isNumeric>{st.ATK[0]} / {st.ATK[1]}</Td>
                        <Td isNumeric>{st.DEF[0]} / {st.DEF[1]}</Td>
                        <Td isNumeric>{st.SPD}</Td>
                        <Td isNumeric>{st.CRI}%</Td>
                        <Td isNumeric>{st.ACC}</Td>
                        <Td isNumeric>{st.EVA}</Td>
                        <Td isNumeric>{st.resist.fire}/{st.resist.ice}/{st.resist.lightning}</Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </TableContainer>
          </Box>
        ) : null}

        {/* Profile: favor ratios + craft */}
        <SimpleGrid columns={[1, 2]} spacing={4}>
          <Box borderWidth="1px" borderColor="surface.border" borderRadius="xl" bg="surface.elevated" p={4}>
            <Heading size="sm" mb={3}>Favor Gain</Heading>
            <VStack align="stretch" spacing={1.5}>
              <Stat label="Battle clear">×{unit.favor.clear}</Stat>
              <Stat label="On death">×{unit.favor.death}</Stat>
              <Stat label="Assistant (login)">×{unit.favor.assistant}</Stat>
              <Stat label="Gift">×{unit.favor.present}</Stat>
            </VStack>
          </Box>
          <Box borderWidth="1px" borderColor="surface.border" borderRadius="xl" bg="surface.elevated" p={4}>
            <Heading size="sm" mb={3}>Manufacturing</Heading>
            <VStack align="stretch" spacing={1.5}>
              <Stat label="Craft time">{unit.craft ? fmtTime(unit.craft) : '—'}</Stat>
              <Stat label="Max grade">{rankTag(unit.maxGrade)}</Stat>
            </VStack>
          </Box>
        </SimpleGrid>

        {/* Skills */}
        {unit.skills.length > 0 ? (
          <Box>
            <Heading size="md" mb={3}>Skills</Heading>
            {skillStatus === 'loading' && skillRecords.length === 0 ? (
              <Center py={8}><Spinner color="yellow.400" /></Center>
            ) : skillRecords.length === 0 ? (
              <Text color="gray.500" fontSize="sm">No skill data.</Text>
            ) : (
              // SkillTab renders a <TabPanel>, so it MUST live inside <Tabs>/<TabPanels>
              // (one tab per skill), mirroring the enemy skillTabList layout.
              <Tabs variant="unstyled" size="sm">
                <TabList flexWrap="wrap" gap={1}>
                  {skillRecords.map((s) => (
                    <Tab key={s.title} p={1.5} borderRadius="md" borderBottomWidth="3px"
                      borderBottomColor="transparent" opacity={0.55}
                      _hover={{ opacity: 0.85, bg: 'whiteAlpha.100' }}
                      _selected={{ opacity: 1, borderBottomColor: 'yellow.400', bg: 'whiteAlpha.100' }}>
                      <Image src={`/images/SkillIcon/${s.img}_${s.type}.png`}
                        boxSize={['32px', '38px', '42px']} alt={s.title} />
                    </Tab>
                  ))}
                </TabList>
                <TabPanels>
                  {skillRecords.map((s) => <SkillTab key={s.title} skill={s} atk={headerAtk} showBuffs={true} />)}
                </TabPanels>
              </Tabs>
            )}
          </Box>
        ) : null}

        {/* Promotions */}
        {unit.promotions.length > 0 ? (
          <Box>
            <Heading size="md" mb={3}>Promotions</Heading>
            <Accordion allowMultiple>
              {unit.promotions.map((p) => (
                <AccordionItem key={p.to} border="1px solid" borderColor="surface.border" borderRadius="lg" mb={2} bg="surface.elevated">
                  <AccordionButton>
                    <HStack flex="1" spacing={3} textAlign="left">
                      <RankTag grade={p.to} prefix="→ " />
                      <Text fontSize="sm" color="gray.400">Lv {p.level}</Text>
                      <Text fontSize="sm" color="gray.400">Favor {p.favor}</Text>
                    </HStack>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel pb={4}>
                    <RewardList rewards={asRewards(p.req)} columns={[1, 2, 3]} />
                  </AccordionPanel>
                </AccordionItem>
              ))}
            </Accordion>
          </Box>
        ) : null}

        {/* Level-cap unlocks */}
        {unit.lvLimits.length > 0 ? (
          <Box>
            <Heading size="md" mb={3}>Level Cap Unlocks</Heading>
            <Accordion allowToggle>
              {unit.lvLimits.map((l) => (
                <AccordionItem key={l.level} border="1px solid" borderColor="surface.border" borderRadius="lg" mb={2} bg="surface.elevated">
                  <AccordionButton>
                    <Text flex="1" textAlign="left" fontSize="sm" color="gray.300">Lv {l.level}</Text>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel pb={4}>
                    <RewardList rewards={asRewards(l.items)} columns={[1, 2, 3]} />
                  </AccordionPanel>
                </AccordionItem>
              ))}
            </Accordion>
          </Box>
        ) : null}

        {/* Source: stages that award/drop this unit */}
        {Object.keys(unit.source || {}).length > 0 ? (
          <Box>
            <Heading size="md" mb={3}>Obtainable From</Heading>
            <VStack align="stretch" spacing={3}>
              {Object.entries(unit.source).map(([wid, stages]) => {
                const w = world?.[wid];
                return (
                  <Box key={wid} borderWidth="1px" borderColor="surface.border" borderRadius="lg" bg="surface.elevated" p={3}>
                    <Text fontWeight="bold" fontSize="sm" mb={2} color="gray.200">
                      {w ? t(w.title) : wid}
                    </Text>
                    <Wrap spacing={2}>
                      {stages.map(([zone, stage], i) => (
                        <WrapItem key={i}>
                          <Button as={Link} size="xs" variant="outline" colorScheme="yellow"
                            href={`/world/stage?id=${encodeURIComponent(wid)}&zone=${zone}&stage=${encodeURIComponent(stage)}`}>
                            {stage}
                          </Button>
                        </WrapItem>
                      ))}
                    </Wrap>
                  </Box>
                );
              })}
            </VStack>
          </Box>
        ) : null}
      </VStack>
    </>
  );
}

// seconds -> "1h 2m" / "57m" / "45s"
function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h ? `${h}h` : '', m ? `${m}m` : '', !h && s ? `${s}s` : ''].filter(Boolean).join(' ') || '0s';
}
