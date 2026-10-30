import { Flex, Spinner, Text, VStack } from '@altterisk/game-hub/ui';
import { Panel, VoiceLineList } from '@altterisk/game-hub';
import { SegmentedControl } from '@altterisk/game-hub/viewer';
import type { FullUnitData } from '@/interfaces/unit';
import type { Dub, UnitVoice, VoiceEntry } from '@/interfaces/voice';
import { t } from '@/lib/strings';
import {
  AFFECTION_TIERS, DUB_OPTIONS, clipId, dubFor, entryDubs, eventLabel, playClip, setPreferredDub, stopVoice,
  useEntryClips, useNowPlaying, usePreferredDub,
} from '@/lib/voice';

type Row = { key: string; tag: string; clip: string; text?: string };

function skinNames(keys: string[], unit: FullUnitData): string {
  return keys.map((key) => {
    if (key === '') return 'Default';
    const skin = unit.skins?.find((s) => s.key === key);
    return (skin && t(skin.name || skin.packName || skin.itemName)) || key;
  }).join(' · ');
}

function entryTitle(entry: VoiceEntry, unit: FullUnitData): string {
  if (entry.marriage) return `Oath${entry.oathFor?.length ? ` — ${skinNames(entry.oathFor, unit)}` : ''}`;
  return skinNames(entry.skins, unit) || 'Voice';
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
  const band = (tier: number) => AFFECTION_TIERS[tier - 1]?.label ?? String(tier);
  touch.forEach(({ text, tiers }, clip) => {
    const tag = entry.marriage ? 'Touch' : `Touch · affection ${tiers.map(band).join(', ')}`;
    rows.push({ key: `touch/${clip}`, tag, clip, text });
  });
  (entry.special ?? []).forEach((lines, i) => {
    const tag = entry.marriage ? 'Special touch' : `Special touch · affection ${i === 0 ? '<100' : '100+'}`;
    for (const [text, clip] of lines) rows.push({ key: `special${i}/${clip}`, tag, clip, text });
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
      <VoiceLineList
        items={rows.map((row) => {
          const available = !!dub && !!clips?.has(row.clip);
          const text = row.text ? t(row.text) : '';
          return {
            id: row.key,
            tag: row.tag,
            text: text && text !== row.text ? text.replace(/&n/g, '\n') : undefined,
            available,
            note: clips && !available ? 'Not voiced in this dub' : undefined,
          };
        })}
        playing={dub ? rows.find((row) => nowPlaying === clipId(dub, row.clip))?.key ?? null : null}
        onPlay={(key) => {
          const row = rows.find((r) => r.key === key);
          if (row && dub) void playClip(entry, dub, row.clip);
        }}
        onStop={stopVoice}
      />
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
