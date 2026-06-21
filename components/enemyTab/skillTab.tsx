import { TabPanel, Text, Image, Box, Flex, VStack, HStack, Tag, Wrap, WrapItem } from "@chakra-ui/react";
import { Skill } from "@/interfaces/skill";
import { t } from "@/lib/strings";
import { useTranslationVersion } from "@/lib/translationVersion";
import SkillArea from "./skillArea";
import BuffList from "@/components/buffList";
import React from "react";

export default function SkillTab({
  skill,
  atk,
  showBuffs,
}: {
  skill: Skill;
  atk: number;
  showBuffs: boolean;
}) {
  useTranslationVersion();
  const splitTag = (str: string) => {
    // The game's source text uses `&n` for an in-line newline; normalize it (and any
    // literal "\n") to a <br> tag so the tokenizer below turns it into a real break.
    str = str.replace(/&n|\\n/g, "<br>");
    var count = 0;
    let r = str
      .split(/(<li>.+?<\/li>|<[^<]+?>|\[[^\]]+?\]|<br>|<br\/>|<br \/>)/)
      .map((e) => {
        if (e.match(/<li>(.+?)<\/li>/)) {
          let liContent = e.replace(/<li>(.+?)<\/li>/, "$1")
          return <li key={count++}>{splitTag(liContent)}</li>;
        }

        else if (e.match(/<br>|<br\/>|<br \/>/)) return <br key={count++} />;
        else if (e.match(/^<[^<]+?>$/)) {
          // <keyword> -> plain emphasised text (chip/icon highlight removed)
          return <b key={count++}>{e.replace(/<([^<]+?)>/, "$1")}</b>;
        }
        else if (e.match(/^\[[^\]]+?\]$/)) {
          // [skill / effect reference] -> highlighted in the accent color
          return <Text as="b" color="yellow.300" key={count++}>{e}</Text>;
        }

        else return e;
      });
    return r;
  }

  // Render a damage value for a given multiplier: "<atk*rate> (xrate ATK)".
  function dmg(rate: number) {
    return `${Math.floor(atk * rate).toString()} (x${rate} ATK)`;
  }

  function renderDescription() {
    let copy = t(skill.description);
    // Hand-translated text embeds the multiplier inline as $(1.5).
    const inline = copy.match(/\$\((\d+\.*\d*)\)/);
    if (inline && inline[1]) {
      copy = copy.replace(/\$\(\d+\.*\d*\)/g, dmg(parseFloat(inline[1])));
    }
    // Official table text uses a positional {0} placeholder; fill it with the
    // skill's SkillAttackRate.
    if (skill.rate) {
      copy = copy.replace(/\{0\}/g, dmg(skill.rate));
    }
    return splitTag(copy);
  }

  const hasArea = skill.area.some((v) => v > 0);

  return (
    <TabPanel key={skill.title} px={0} py={3}>
      <Flex
        gap={4}
        align="flex-start"
        minH="180px"
        direction={{ base: "column", md: "row" }}
      >
        {/* left: name + description */}
        <Box flex={1} minW={0}>
          <Text as="b" fontSize={["lg", "lg", "xl"]}>
            <Image
              alt={skill.attr ? skill.attr : "normal"}
              src={`/images/${skill.attr ? skill.attr : "normal"}.png`}
              boxSize={{ base: "16px", md: "18px" }}
              display="inline"
              mr={2}
            />
            {t(skill.name)}
          </Text>

          {/* property badges */}
          {skill.accuracy || skill.guardPierce || (skill.center === 0 && hasArea) ? (
            <Wrap mt={2} spacing={2}>
              {skill.accuracy ? (
                <WrapItem>
                  <Tag size="sm" colorScheme="green" variant="solid" borderRadius="full">
                    ACC Correction {skill.accuracy > 0 ? '+' : ''}{skill.accuracy}%
                  </Tag>
                </WrapItem>
              ) : null}
              {skill.guardPierce ? (
                <WrapItem>
                  <Tag size="sm" colorScheme="red" variant="solid" borderRadius="full">Ignore Protect</Tag>
                </WrapItem>
              ) : null}
              {skill.center === 0 && hasArea ? (
                <WrapItem>
                  <Tag size="sm" colorScheme="purple" variant="solid" borderRadius="full">Fixed Grid</Tag>
                </WrapItem>
              ) : null}
            </Wrap>
          ) : null}

          <Text fontSize={["sm", "md"]} mt={2} color="gray.300">
            {renderDescription()}
          </Text>
        </Box>

        {/* right: AoE grid + stats */}
        {hasArea || skill.range || skill.AP ? (
          <VStack
            spacing={2}
            flexShrink={0}
            align="center"
            alignSelf={{ base: "center", md: "flex-start" }}
          >
            {hasArea ? <SkillArea area={skill.area} center={skill.center} /> : null}
            {skill.range || skill.AP ? (
              <HStack spacing={2}>
                <Tag size="sm" colorScheme="teal" variant="subtle" borderRadius="full">Range {skill.range}</Tag>
                <Tag size="sm" colorScheme="blue" variant="subtle" borderRadius="full">AP {skill.AP}</Tag>
              </HStack>
            ) : null}
          </VStack>
        ) : null}
      </Flex>

      {skill.buffs?.length && showBuffs ? (
        <Box mt={3}>
          <BuffList buffs={skill.buffs} />
        </Box>
      ) : null}
    </TabPanel>
  );
}
