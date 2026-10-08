import { useState } from 'react';
import NextLink from 'next/link';
import { CloseIcon, HamburgerIcon } from '@chakra-ui/icons'
import { Flex, HStack, IconButton } from "@chakra-ui/react";
import { HubBar } from '@altterisk/game-hub';
import NavLink from './navlink';
import { EtcMenu, RegionSelect, TranslationMenu } from './navcontent';

function CommonNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isOpen);
  return (
    <>
      <HubBar
        game="lo"
        renderHomeLink={({ className, children }) => (
          <NextLink href="/" className={className}>{children}</NextLink>
        )}
        nav={
          <>
            <NavLink to="/">Home</NavLink>
            <NavLink to="/units">Units</NavLink>
            <NavLink to="/skins">Skins</NavLink>
            <NavLink to="/equipment">Equipment</NavLink>
            <NavLink to="/world">World</NavLink>
            <NavLink to="/sanctum">Sanctum</NavLink>
            <NavLink to="/enemies">Enemies</NavLink>
            <NavLink to="/iw">Infinite War</NavLink>
            <EtcMenu />
          </>
        }
        actions={
          <>
            <HStack spacing={2} display={{ base: "none", md: "flex" }}>
              <RegionSelect />
              <TranslationMenu />
            </HStack>
            <IconButton
              aria-label="Toggle menu"
              display={{ base: "inline-flex", md: "none" }}
              onClick={toggle}
              variant="ghost"
              size="sm"
              icon={isOpen ? <CloseIcon /> : <HamburgerIcon />}
            />
          </>
        }
      />
      {isOpen && (
        <Flex
          display={{ base: "flex", md: "none" }}
          wrap="wrap"
          gap={2}
          justify="center"
          px={4}
          py={3}
          bg="hub.surface"
          borderBottomWidth="1px"
          borderColor="hub.border"
        >
          <RegionSelect />
          <TranslationMenu />
        </Flex>
      )}
    </>
  )
}

export default CommonNavbar
