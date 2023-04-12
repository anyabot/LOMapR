import React, { useEffect, useState } from 'react';
import styles from "@/styles/custom.module.css"
import {
  TabPanel,
  Text,
  Image,
  Badge,
  Box
} from '@chakra-ui/react'
import { Skill } from '@/interfaces/skill';

export default function SkillTab({skill, atk} : {skill: Skill, atk:number}) {

  function renderDescription() {
    let copy = skill.description
    let temp = copy.match(/\$\((\d+\.*\d*)\)/)
    let skillrate = temp ? (temp[1] ? temp[1] : null) : null
    if (skillrate) copy = copy.replace(
      /\$\(\d+\.*\d*\)/g,
      `${Math.floor(atk * parseFloat(skillrate)).toString()} (x${skillrate} ATK)`
    );
    var count = 0
    let r = copy.split(/(<strong>.+?<\/strong>|<br>|<br\/>|<br \/>)/).map(e => {
      if (e.match(/<strong>(.+?)<\/strong>/)) return (<Badge key ={count++}>{e.replace(/<strong>(.+?)<\/strong>/, "$1")}</Badge>)
      else if (e.match(/<br>|<br\/>|<br \/>/)) return (<br key ={count++}/>)
      else return e
    })
    return r
  }

  function checkstyle(loc:number) {
    var bg_color = "rgb(45, 45, 45)";
    var cen_color = "rgb(22, 155, 155)";
    let cur_color;
    if (loc == skill.center) {
      cur_color = cen_color;
    } else {
      cur_color = bg_color;
    }
    let color;
    if (skill.area[loc - 1] == 0) {
      color = "rgba(0, 0, 0, 0)";
    } else {
      color =
        "rgb(200, " +
        Math.round(
          ((200 - 128) / 0.5) * (skill.area[loc - 1] - 0.5) + 128
        ) +
        ", 0)";
    }
    return {
      backgroundImage: `linear-gradient(to right, ${color}, ${color}), linear-gradient(to right, ${cur_color}, ${cur_color})`
    }
  }

  return (
    <TabPanel key={skill.title}>
      <Box display="flex" justifyContent="center" float="right" p={4}>
        <Box p={4}>
          <Text as="b">Range: {skill.range}</Text>
          <br/>
          <Text as="b">AP Cost: {skill.AP}</Text>
        </Box>
        <table className={styles["skill-area"]}>
          <tbody>
            <tr>
              <td style={checkstyle(7)}></td>
              <td style={checkstyle(8)}></td>
              <td style={checkstyle(9)}></td>
            </tr>
            <tr>
              <td style={checkstyle(4)}></td>
              <td style={checkstyle(5)}></td>
              <td style={checkstyle(6)}></td>
            </tr>
            <tr>
              <td style={checkstyle(1)}></td>
              <td style={checkstyle(2)}></td>
              <td style={checkstyle(3)}></td>
            </tr>
          </tbody>
        </table>
      </Box>
      <Text fontSize='2xl'><Image src={`/images/${skill.attr ? skill.attr : "normal"}.png`} boxSize='20px' display="inline" m={2}/>{skill.name}</Text>
      {<Text fontSize='lg'>{renderDescription()}</Text>}
      
  </TabPanel>
  );
}