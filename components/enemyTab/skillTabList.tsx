import React, { useEffect, useState } from 'react';
import {
  Tabs,
  Tab,
  TabList,
  TabPanels,
  TabPanel,
  Image
} from '@chakra-ui/react'
import SkillTab from './skillTab';

import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectSkill, selectSkillStatus, fetchSkillAsync } from '@/store/skillSlice';



export default function SkillTabList({skills, atk, info} : {skills: string[], atk:number, info:string}) {

  const skillInfo = useAppSelector(selectSkill);
  const skillstatus = useAppSelector(selectSkillStatus);
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchSkillAsync());
  }, [dispatch])

  function getSkills() {
    let ret = []
    for (let s in skills) {
      if (skills[s] in skillInfo) {
        ret.push(skillInfo[skills[s]])
      }
    }
    return ret
  }

  if (skillstatus == "failed") return (<h2>Fetch Skill Info Failed</h2>)
  return (
      <Tabs variant='enclosed'>
        <TabList>
          {getSkills().map(s => <Tab key={s.title}><Image src={`/images/SkillIcon/${s.img}_${s.type}.png`} boxSize={["30px", "40px", "50px", "64px", "64px"]} alt={`${s.title}`}/></Tab>)}
          <Tab><Image src='/images/info.png' boxSize={["30px", "40px", "50px", "64px", "64px"]} alt="info"/></Tab>
        </TabList>
        <TabPanels>
          {getSkills().map(s => <SkillTab key={s.title} skill={s} atk={atk}/>)}
          <TabPanel>{info}</TabPanel>
        </TabPanels>
      </Tabs>
  );
}