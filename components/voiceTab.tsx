import { Badge, Box, Flex, IconButton, SimpleGrid, Spinner, Text, VStack } from '@chakra-ui/react';
import { Panel } from '@altterisk/game-hub';
import { SegmentedControl } from '@altterisk/game-hub/viewer';
import type { FullUnitData } from '@/interfaces/unit';
import type { Dub, UnitVoice, VoiceEntry } from '@/interfaces/voice';
import { t } from '@/lib/strings';
import {
  DUB_OPTIONS, clipId, dubFor, entryDubs, eventLabel, playClip, setPreferredDub, stopVoice,
  useEntryClips, useNowPlaying, usePreferredDub,
} from '@/lib/voice';

type Row = { key: string; tag: string; clip: string; text?: string };

function entryTitle(entry: VoiceEntry, unit: FullUnitData): string {
  if (entry.marriage) return 'Oath';
  const names = entry.skins.map((key) => {
    if (key === '') return 'Default';
    const skin = unit.skins?.find((s) => s.key === key);
    return (skin && t(skin.name || skin.packName || skin.itemName)) || key;
  });
  return names.join(' · ') || 'Voice';
}

function entryRows(entry: VoiceEntry): Row[] {
  const rows: Row[] = [];
  const touch = new Map<string, { text: string; tiers: number[] }>();
  (entry.tiers ?? []).forEach((lines, i) => {
    for (const [text, clip] of lines) {
      const seen = touch.get(clip);
      if (seen) seen.tiers.push(i + 1);
      else touch.set(clip, { text, tiers: [i + 1] });
    }
  });
  const tierCount = entry.tiers?.filter((l) => l.length).length ?? 0;
  touch.forEach(({ text, tiers }, clip) => {
    const tag = tierCount > 1 ? `Touch · tier ${tiers.join(', ')}` : 'Touch';
    rows.push({ key: `touch/${clip}`, tag, clip, text });
  });
  (entry.special ?? []).forEach((lines, i) => {
    for (const [text, clip] of lines) rows.push({ key: `special${i}/${clip}`, tag: 'Special touch', clip, text });
  });
  for (const [text, clip] of entry.oath ?? []) rows.push({ key: `oath/${clip}`, tag: 'Oath lobby', clip, text });
  for (const [name, clip] of entry.events) {
    rows.push({ key: `event/${name}`, tag: eventLabel(name), clip, text: name === 'Join' ? entry.joinText : undefined });
  }
  for (const clip of entry.extra ?? []) {
    const suffix = clip.split('_').slice(3).join(' ') || clip;
    rows.push({ key: `extra/${clip}`, tag: suffix.charAt(0).toUpperCase() + suffix.slice(1), clip });
  }
  return rows;
}

function EntryPanel({ entry, unit, dub }: { entry: VoiceEntry; unit: FullUnitData; dub: Dub | null }) {
  const clips = useEntryClips(entry, dub);
  const nowPlaying = useNowPlaying();
  const rows = entryRows(entry);
  return (
    <Panel title={entryTitle(entry, unit)} note={dub ? dub.toUpperCase() : undefined}>
      {!clips && dub && <Flex justify="center" py={4}><Spinner size="sm" /></Flex>}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={2}>
        {rows.map((row) => {
          const available = !!dub && !!clips?.has(row.clip);
          const active = !!dub && nowPlaying === clipId(dub, row.clip);
          const text = row.text ? t(row.text) : '';
          return (
            <Flex key={row.key} gap={2} align="start" p={2} borderRadius="md"
              bg={active ? 'whiteAlpha.200' : 'whiteAlpha.50'}>
              <IconButton aria-label={active ? 'Stop' : `Play ${row.tag}`} size="xs" variant="outline"
                icon={<Box as="span" aria-hidden>{active ? '■' : '▶'}</Box>} isDisabled={!available}
                onClick={() => { if (active) stopVoice(); else if (dub) void playClip(entry, dub, row.clip); }} />
              <Box minW={0} flex="1">
                <Badge fontSize="0.6rem" textTransform="none" mb={0.5}>{row.tag}</Badge>
                {text && text !== row.text && <Text fontSize="sm" whiteSpace="pre-wrap">{text.replace(/&n/g, '\n')}</Text>}
                {clips && !available && <Text fontSize="xs" color="gray.500">Not voiced in this dub</Text>}
              </Box>
            </Flex>
          );
        })}
      </SimpleGrid>
    </Panel>
  );
}

export default function VoiceTab({ unit, voice }: { unit: FullUnitData; voice: UnitVoice }) {
  const preferred = usePreferredDub();
  const offered = DUB_OPTIONS.filter((o) => voice.entries.some((e) => entryDubs(e).includes(o.value)));
  return (
    <VStack align="stretch" spacing={3}>
      {offered.length > 1 && (
        <Flex wrap="wrap" gap={2} align="center">
          <Text fontSize="sm" color="gray.400">Voice</Text>
          <SegmentedControl value={preferred} options={offered} ariaLabel="Voice language"
            onChange={(d) => { stopVoice(); setPreferredDub(d); }} />
        </Flex>
      )}
      {voice.entries.map((entry) => (
        <EntryPanel key={`${entry.prefab}/${entry.skins.join(',')}/${entry.marriage ? 'm' : ''}`}
          entry={entry} unit={unit} dub={dubFor(entry, preferred)} />
      ))}
    </VStack>
  );
}
