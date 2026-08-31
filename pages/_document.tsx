import { Html, Head, Main, NextScript } from 'next/document';
import { ColorModeScript } from '@chakra-ui/react';

// Force Chakra dark app-wide, so components use dark-appropriate defaults.
export default function Document() {
  return (
    // baked into the static HTML so the FIRST paint is dark: no light flash on F5
    <Html lang="en" data-theme="dark" style={{ colorScheme: 'dark' }}>
      <Head>
        <link rel="icon" type="image/png" href="/images/icons/Ev_Consumable_BADKSticker.png" />
      </Head>
      <body className="chakra-ui-dark">
        <ColorModeScript initialColorMode="dark" />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
