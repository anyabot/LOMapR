import { Html, Head, Main, NextScript } from 'next/document';
import { ColorModeScript } from '@chakra-ui/react';

// Force Chakra into dark mode app-wide so all components (buttons, inputs,
// selects, addons, steppers...) use dark-appropriate defaults instead of the
// light-mode defaults that render as white/black-on-dark.
export default function Document() {
  return (
    // data-theme/color-scheme are baked into the static HTML so the FIRST paint is
    // dark on every host — no storage/system flip, no light flash on F5/deploy.
    <Html lang="en" data-theme="dark" style={{ colorScheme: 'dark' }}>
      <Head />
      <body className="chakra-ui-dark">
        <ColorModeScript initialColorMode="dark" />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
