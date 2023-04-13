import NextLink from 'next/link'
import { Link, Text, TextProps } from "@chakra-ui/react";
import { ReactNode } from "react";

interface Props extends TextProps {
  children : ReactNode, 
  to : string
}

function NavLink ({ children, to = "/", ...rest }: Props) {
  return (
    <Link as={NextLink} href={to}>
      <Text display="block" {...rest} my={0} fontWeight="bold">
        {children}
      </Text>
    </Link>
  );
};

export default NavLink