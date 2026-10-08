import { HubFooter } from "@altterisk/game-hub";

const LINKS = [
  { label: "Source code", href: "https://github.com/anyabot/LOMapR" },
  { label: "@anyabot", href: "https://github.com/anyabot" },
  { label: "Portfolio", href: "https://altterisk.github.io/portfolio/" },
];

function Footer() {
  return <HubFooter game="lo" links={LINKS} note="Last Origin Information & Resources" />;
}

export default Footer;
