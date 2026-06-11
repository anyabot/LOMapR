import { Html, Head, Main, NextScript } from 'next/document';
import { ColorModeScript } from '@chakra-ui/react';

// Force Chakra into dark mode app-wide so all components (buttons, inputs,
// selects, addons, steppers...) use dark-appropriate defaults instead of the
// light-mode defaults that render as white/black-on-dark.
export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <ColorModeScript initialColorMode="dark" />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
