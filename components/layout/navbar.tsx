
import { useState } from 'react';
import NextLink from 'next/link';
import { CloseIcon, HamburgerIcon } from '@chakra-ui/icons'
import { Box, Flex, Heading, Link, IconButton } from "@chakra-ui/react";
import NavContent from './navcontent';

function CommonNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isOpen);
  return (
    <Flex
      as="nav"
      align="center"
      justify="space-between"
      wrap="wrap"
      w="100%"
      mb={6}
      py={3}
      px={[4, 6, 8]}
      bg="surface.elevated"
      borderBottomWidth="1px"
      borderColor="surface.border"
      position="sticky"
      top={0}
      zIndex={10}
    >
      <Link as={NextLink} href="/" _hover={{ textDecoration: 'none' }}>
        <Heading size="md" color="yellow.300" whiteSpace="nowrap">
          LO Map
        </Heading>
      </Link>

      <IconButton
        aria-label="Toggle menu"
        display={{ base: "inline-flex", md: "none" }}
        onClick={toggle}
        variant="ghost"
        size="sm"
        icon={isOpen ? <CloseIcon /> : <HamburgerIcon />}
      />

      <NavContent isOpen={isOpen} />
    </Flex>
  )
}

export default CommonNavbar