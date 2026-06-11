import React, { useEffect } from 'react';
import {
  Tabs,
  Tab,
  TabList,
  TabPanels,
  TabPanel,
  Image,
  Text,
} from '@chakra-ui/react'
import SkillTab from './skillTab';
import AIGraphView from './aiGraph';

import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectSkill, selectSkillStatus, fetchSkillAsync } from '@/store/skillSlice';
import { selectAI, fetchAIAsync } from '@/store/aiSlice';



export default function SkillTabList({skills, atk, info, rank, enemyId} : {skills: string[], atk:number, info:string, rank:string, enemyId?: string}) {

  const skillInfo = useAppSelector(selectSkill);
  const skillstatus = useAppSelector(selectSkillStatus);
  const aiData = useAppSelector(selectAI);
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchSkillAsync());
    dispatch(fetchAIAsync());
  }, [dispatch])

  const aiGraph = enemyId ? aiData[enemyId] : undefined;

  function convertRank(rank: string): number {
    switch (rank) {
      case "B":
        return 2;
      case "A":
        return 3;
      case "S":
        return 4;
      case "SS":
        return 5;
      default:
        return 6;
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

  // line/underline highlight instead of a filled yellow chip (which looked bad
  // behind the white AI icon)
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

  if (skillstatus == "failed") return (<h2>Fetch Skill Info Failed</h2>)
  return (
      <Tabs variant='unstyled' size="sm">
        <TabList flexWrap="wrap" gap={1}>
          {getSkills().map(s => <Tab key={s.title} {...tabStyle}><Image src={`/images/SkillIcon/${s.img}_${s.type}.png`} boxSize={["32px", "38px", "42px"]} alt={`${s.title}`}/></Tab>)}
          <Tab {...tabStyle}><Image src='/images/info.png' boxSize={["32px", "38px", "42px"]} alt="info"/></Tab>
          {aiGraph ? <Tab {...tabStyle}><Image src='/images/UI_Common_Icon_ItemSlot_Chip.png' boxSize={["32px", "38px", "42px"]} alt="AI"/></Tab> : null}
        </TabList>
        <TabPanels>
          {getSkills().map(s => <SkillTab key={s.title} skill={s} atk={atk}/>)}
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