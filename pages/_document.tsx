import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    // baked into the static HTML so the FIRST paint is dark: no light flash on F5
    <Html lang="en" data-theme="dark" data-game="lo" style={{ colorScheme: 'dark' }}>
      <Head>
        <link rel="icon" type="image/png" href="/images/icons/Ev_Consumable_BADKSticker.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
