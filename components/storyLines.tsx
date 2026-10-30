import { StoryLines as HubStoryLines, type StoryLineView } from '@altterisk/game-hub';
import { RichText, replaceTag, type MarkupRule } from '@altterisk/game-hub/text';
import { Avatar, Image } from '@altterisk/game-hub/ui';
import { GAME_TEXT_RULES } from '@/components/gameText';
import type { StoryLine, StoryText } from '@/interfaces/story';

export type StoryLang = 'en' | 'ko';

export function pickText(x: StoryText | undefined, lang: StoryLang): string {
  if (!x) return '';
  return (lang === 'en' ? x.en || x.ko : x.ko || x.en) ?? '';
}

const PLAYER: Record<StoryLang, string> = { en: 'Commander', ko: '사령관' };

function rulesFor(lang: StoryLang): MarkupRule[] {
  return [
    replaceTag(/\[username\]/, (_m, _inner, key) => (
      <span key={key} style={{ color: 'var(--ui-c-accent-300)', fontWeight: 600 }}>{PLAYER[lang]}</span>
    )),
    ...GAME_TEXT_RULES,
  ];
}

function toView(lines: StoryLine[], names: Record<string, StoryText>, lang: StoryLang, rules: MarkupRule[]): StoryLineView[] {
  const text = (x: StoryText | undefined) => <RichText text={pickText(x, lang)} rules={rules} />;
  return lines.map((line): StoryLineView => {
    if (line.k === 'b') return { kind: 'place', text: text(line) };
    if (line.k === 'n') return { kind: 'narration', text: text(line) };
    if (line.k === 'p') return { kind: 'choice', text: text(line) };
    if (line.k === 'c') {
      return { kind: 'options', options: line.o.map((opt) => ({ text: text(opt), lines: toView(opt.l, names, lang, rules) })) };
    }
    const name = line.n ? pickText(names[line.n], lang) : '';
    return {
      kind: 'say',
      name: name || undefined,
      text: text(line),
      avatar: line.a
        ? <Image src={`/images/icons/${line.a}.png`} alt={name} loading="lazy" />
        : <Avatar size="sm" name={name || undefined} boxSize={8} />,
    };
  });
}

export default function StoryLines({ lines, names, lang }: {
  lines: StoryLine[];
  names: Record<string, StoryText>;
  lang: StoryLang;
}) {
  return <HubStoryLines lines={toView(lines, names, lang, rulesFor(lang))} lang={lang} empty="No dialogue in this scene." />;
}
