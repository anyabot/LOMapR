import { RichText, colorTag, ignoreTag, resetTag, type MarkupRule } from '@altterisk/game-hub/text';

// The game's colour markup: [c][RRGGBB]text[-][/c]; [-] and [/c] reset, unknown bracket tags pass through.
export const GAME_TEXT_RULES: MarkupRule[] = [
  ignoreTag(/\[c\]/),
  resetTag(/\[\/c\]|\[-\]/),
  colorTag(/\[([0-9a-fA-F]{6})\]/),
];

export default function GameText({ children }: { children: string }) {
  return <RichText text={children} rules={GAME_TEXT_RULES} />;
}
