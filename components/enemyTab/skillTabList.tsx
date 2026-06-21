import React, { useEffect, useState } from 'react';
import {
  Tabs,
  Tab,
  TabList,
  TabPanels,
  TabPanel,
  Image,
  Text,
  Flex,
  Box,
} from '@chakra-ui/react'
import SkillTab from './skillTab';
import AIGraphView from './aiGraph';

import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectEnemySkills, selectEnemySkillStatus, fetchEnemySkillsAsync } from '@/store/skillSlice';
import { selectAI, fetchEnemyAIAsync } from '@/store/aiSlice';
import { selectChunkLoaded } from '@/store/stringsSlice';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';

const BUFF_SHOW_KEY = "skillTab_showBuffs";

export default function SkillTabList({skills, atk, info, rank, enemyId} : {skills: string[], atk:number, info:string, rank:string, enemyId?: string}) {

  const dispatch = useAppDispatch();
  const id = enemyId ?? '';
  const region = useSelector((s: RootState) => s.region.region);
  const skillReady = useSelector(selectChunkLoaded(region, 'skill'));
  const buffReady  = useSelector(selectChunkLoaded(region, 'buff'));

  const skillInfo = useAppSelector(state => selectEnemySkills(state, id));
  const skillStatus = useAppSelector(state => selectEnemySkillStatus(state, id));
  const aiData = useAppSelector(selectAI);

  const [showBuffs, setShowBuffs] = useState<boolean>(() => {
    try { return localStorage.getItem(BUFF_SHOW_KEY) !== "0"; } catch { return true; }
  });
  const toggleBuffs = () => {
    const next = !showBuffs;
    setShowBuffs(next);
    try { localStorage.setItem(BUFF_SHOW_KEY, next ? "1" : "0"); } catch {}
  };

  useEffect(() => {
    if (!id) return;
    dispatch(fetchEnemySkillsAsync(id));
    dispatch(fetchEnemyAIAsync(id));
  }, [dispatch, id]);

  const aiGraph = id ? aiData[id] : undefined;

  function convertRank(rank: string): number {
    switch (rank) {
      case "B": return 2;
      case "A": return 3;
      case "S": return 4;
      case "SS": return 5;
      default: return 6;
    }
  }

  function getSkills() {
    let ret = []
    for (let s in skills) {
      if (skills[s] in skillInfo) {
        if (skillInfo[skills[s]].leastRank ? convertRank(rank) >= skillInfo[skills[s]].leastRank : true) {
          ret.push(skillInfo[skills[s]])
        }
      }
    }
    return ret
  }

  const tabStyle = {
    p: 1.5,
    borderRadius: 'md',
    borderBottomWidth: '3px',
    borderBottomColor: 'transparent',
    opacity: 0.55,
    transition: 'all .12s ease',
    _hover: { opacity: 0.85, bg: 'whiteAlpha.100' },
    _selected: { opacity: 1, borderBottomColor: 'yellow.400', bg: 'whiteAlpha.100' },
  } as const;

  const stringsReady = skillReady && buffReady;

  if (skillStatus === 'failed') return (<h2>Fetch Skill Info Failed</h2>)
  if (!stringsReady) return (
    <Flex align="center" justify="center" py={8} gap={3} color="gray.500">
      <Box
        w="20px" h="20px" borderRadius="full"
        border="2px solid" borderColor="gray.600"
        borderTopColor="yellow.400"
        style={{ animation: 'spin 0.7s linear infinite' }}
      />
      <Text fontSize="sm">Loading skill data…</Text>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Flex>
  );
  return (
      <Tabs variant='unstyled' size="sm">
        <Flex align="center" gap={2}>
          <TabList flexWrap="wrap" gap={1} flex={1}>
            {getSkills().map(s => <Tab key={s.title} {...tabStyle}><Image src={`/images/SkillIcon/${s.img}_${s.type}.png`} boxSize={["32px", "38px", "42px"]} alt={`${s.title}`}/></Tab>)}
            <Tab {...tabStyle}><Image src='/images/info.png' boxSize={["32px", "38px", "42px"]} alt="info"/></Tab>
            {aiGraph ? <Tab {...tabStyle}><Image src='/images/UI_Common_Icon_ItemSlot_Chip.png' boxSize={["32px", "38px", "42px"]} alt="AI"/></Tab> : null}
          </TabList>
          <Box
            as="button"
            onClick={toggleBuffs}
            px={2} py={1}
            borderRadius="4px"
            bg="gray.700"
            color="gray.300"
            fontSize="xs"
            fontWeight="medium"
            flexShrink={0}
            _hover={{ bg: "gray.600" }}
          >
            {showBuffs ? "▾ Effects" : "▸ Effects"}
          </Box>
        </Flex>
        <TabPanels>
          {getSkills().map(s => <SkillTab key={s.title} skill={s} atk={atk} showBuffs={showBuffs}/>)}
          <TabPanel>{info}</TabPanel>
          {aiGraph ? (
            <TabPanel px={0}>
              <Text fontSize="xs" color="gray.500" mb={2}>
                Decision flow each turn — drag to pan, scroll to zoom.
              </Text>
              <AIGraphView graph={aiGraph} />
            </TabPanel>
          ) : null}
        </TabPanels>
      </Tabs>
  );
}
