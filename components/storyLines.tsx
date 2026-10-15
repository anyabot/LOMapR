import { Fragment } from 'react';
import { Avatar, Box, Flex, Image, Text, VStack } from '@chakra-ui/react';
import GameText from '@/components/gameText';
import type { StoryLine, StoryText } from '@/interfaces/story';

export type StoryLang = 'en' | 'ko';

export function pickText(x: StoryText | undefined, lang: StoryLang): string {
  if (!x) return '';
  return (lang === 'en' ? x.en || x.ko : x.ko || x.en) ?? '';
}

const PLAYER: Record<StoryLang, string> = { en: 'Commander', ko: '사령관' };

function LineText({ text, lang }: { text: string; lang: StoryLang }) {
  const parts = text.split('[username]');
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && <Box as="span" color="accent.300" fontWeight="semibold">{PLAYER[lang]}</Box>}
          <GameText>{part}</GameText>
        </Fragment>
      ))}
    </>
  );
}

export default function StoryLines({ lines, names, lang }: {
  lines: StoryLine[];
  names: Record<string, StoryText>;
  lang: StoryLang;
}) {
  if (!lines.length) return <Text fontSize="sm" color="gray.500">No dialogue in this scene.</Text>;
  return (
    <VStack align="stretch" spacing={2} lang={lang} minW={0}>
      {lines.map((line, i) => {
        if (line.k === 'b') {
          return (
            <Text key={i} fontSize="xs" color="gray.500" textAlign="center" letterSpacing="wide" py={1}>
              — <LineText text={pickText(line, lang)} lang={lang} /> —
            </Text>
          );
        }
        if (line.k === 'n') {
          return (
            <Text key={i} fontSize="sm" color="gray.400" fontStyle="italic" whiteSpace="pre-wrap">
              <LineText text={pickText(line, lang)} lang={lang} />
            </Text>
          );
        }
        if (line.k === 'p') {
          return (
            <Box key={i} fontSize="sm" px={3} py={1.5} borderLeftWidth="3px" borderColor="accent.400"
              bg="whiteAlpha.50" whiteSpace="pre-wrap">
              <LineText text={pickText(line, lang)} lang={lang} />
            </Box>
          );
        }
        if (line.k === 'c') {
          return (
            <VStack key={i} align="stretch" spacing={2} p={2} borderWidth="1px" borderColor="whiteAlpha.200"
              borderRadius="md">
              <Text fontSize="xs" color="gray.500" fontWeight="semibold">Choice</Text>
              {line.o.map((opt, j) => (
                <VStack key={j} align="stretch" spacing={2}>
                  <Box fontSize="sm" px={3} py={1.5} borderLeftWidth="3px" borderColor="accent.400"
                    bg="whiteAlpha.50" whiteSpace="pre-wrap">
                    <LineText text={pickText(opt, lang)} lang={lang} />
                  </Box>
                  {opt.l.length > 0 && (
                    <Box pl={{ base: 2, md: 4 }} borderLeftWidth="1px" borderColor="whiteAlpha.200">
                      <StoryLines lines={opt.l} names={names} lang={lang} />
                    </Box>
                  )}
                </VStack>
              ))}
            </VStack>
          );
        }
        const name = line.n ? pickText(names[line.n], lang) : '';
        return (
          <Flex key={i} gap={2} align="start" minW={0}>
            {line.a
              ? <Image src={`/images/icons/${line.a}.png`} alt={name} boxSize={8} borderRadius="full"
                  objectFit="cover" flexShrink={0} mt={0.5} loading="lazy" />
              : <Avatar size="sm" name={name || undefined} boxSize={8} flexShrink={0} mt={0.5} />}
            <Box minW={0} flex="1">
              {name && <Text fontSize="xs" fontWeight="bold" color="gray.300">{name}</Text>}
              <Text fontSize="sm" whiteSpace="pre-wrap" overflowWrap="anywhere">
                <LineText text={pickText(line, lang)} lang={lang} />
              </Text>
            </Box>
          </Flex>
        );
      })}
    </VStack>
  );
}
