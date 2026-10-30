import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    // baked into the static HTML so the FIRST paint is dark: no light flash on F5
    <Html lang="en" data-theme="dark" data-game="lo" style={{ colorScheme: 'dark' }}>
      <Head>
        <link rel="icon" type="image/png" href="/images/icons/Ev_Consumable_BADKSticker.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+KR:wght@400;500;700;800&display=swap" rel="stylesheet" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
