import { Box, Center, Link, Text } from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";

function Footer() {
  return (
    <Box
      as="footer"
      w="100%"
      py={4}
      px={[4, 6, 8]}
      bg="surface.elevated"
      borderTopWidth="1px"
      borderColor="surface.border"
    >
      <Center>
        <Text fontSize="sm" color="whiteAlpha.600" textAlign="center">
          LOMapR — Last Origin Information &amp; Resources ·{" "}
          <Link
            href="https://github.com/anyabot/LOMapR"
            isExternal
            color="yellow.300"
            whiteSpace="nowrap"
          >
            Source code <ExternalLinkIcon mx="1px" boxSize={3} />
          </Link>{" "}
          ·{" "}
          <Link
            href="https://github.com/anyabot"
            isExternal
            color="yellow.300"
            whiteSpace="nowrap"
          >
            @anyabot <ExternalLinkIcon mx="1px" boxSize={3} />
          </Link>{" "}
          ·{" "}
          <Link
            href="https://altterisk.github.io/portfolio/"
            isExternal
            color="yellow.300"
            whiteSpace="nowrap"
          >
            Portfolio <ExternalLinkIcon mx="1px" boxSize={3} />
          </Link>
        </Text>
      </Center>
    </Box>
  );
}

export default Footer;
