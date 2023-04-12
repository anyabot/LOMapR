import NextLink from 'next/link'
import { Link, Text } from "@chakra-ui/react";
import { ReactNode } from "react";

function NavLink ({ children, to = "/", ...rest }: { children : ReactNode, to : string }) {
  return (
    <Link as={NextLink} href={to}>
      <Text display="block" {...rest} my={0} fontWeight="bold">
        {children}
      </Text>
    </Link>
  );
};

export default NavLink