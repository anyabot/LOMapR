
import { useState } from 'react';
import { CloseIcon, HamburgerIcon } from '@chakra-ui/icons'
import { Box, Flex } from "@chakra-ui/react";
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
      mb={4}
      py={4}
      px={8}
      bg="blackAlpha.900"
      color="gray"
    >
      <Box display={{ base: "block", md: "none" }} onClick={toggle}>
        {isOpen ? <CloseIcon /> : <HamburgerIcon />}
      </Box>
      <NavContent isOpen={isOpen} />
    </Flex>
  )
}

export default CommonNavbar