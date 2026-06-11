import React from 'react';
import { Text as ChakraText } from '@chakra-ui/react';

// Parses the game's inline color markup into colored spans:
//   [c][RRGGBB]coloured text[-][/c]
// where [c]…[/c] wraps a coloured region, [RRGGBB] sets the hex colour, and
// [-] resets to the default colour. Tolerates missing/loose closers. Unknown
// bracket tags are passed through as literal text.

interface Token {
  text: string;
  color?: string;
}

export function parseGameText(input: string): Token[] {
  if (!input) return [];
  const tokens: Token[] = [];
  let color: string | undefined;
  let buf = '';
  const flush = () => {
    if (buf) tokens.push({ text: buf, color });
    buf = '';
  };

  // split on the markup tokens we understand, keeping delimiters
  const parts = input.split(/(\[c\]|\[\/c\]|\[-\]|\[[0-9a-fA-F]{6}\])/);
  for (const p of parts) {
    if (p === '[c]') {
      // open a colour region (colour comes from a following [RRGGBB])
      continue;
    } else if (p === '[/c]' || p === '[-]') {
      flush();
      color = undefined;
    } else if (/^\[[0-9a-fA-F]{6}\]$/.test(p)) {
      flush();
      color = '#' + p.slice(1, -1);
    } else if (p) {
      buf += p;
    }
  }
  flush();
  return tokens;
}

/**
 * Render a game string with its inline [c][RRGGBB]…[-][/c] colour markup as
 * styled spans. Use for stage notes, skill descriptions, etc.
 */
export default function GameText({ children }: { children: string }) {
  const tokens = parseGameText(children);
  return (
    <>
      {tokens.map((t, i) =>
        t.color ? (
          <ChakraText as="span" key={i} color={t.color} fontWeight="600">
            {t.text}
          </ChakraText>
        ) : (
          <React.Fragment key={i}>{t.text}</React.Fragment>
        )
      )}
    </>
  );
}
