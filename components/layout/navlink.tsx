import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { Link, Text, TextProps } from "@chakra-ui/react";
import { ReactNode } from "react";

interface Props extends TextProps {
  children: ReactNode,
  to: string
}

function NavLink({ children, to = "/", ...rest }: Props) {
  const { pathname } = useRouter();
  const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
  return (
    <Link as={NextLink} href={to} _hover={{ textDecoration: 'none' }}>
      <Text
        display="block"
        my={0}
        fontWeight="bold"
        color={active ? 'yellow.300' : 'gray.300'}
        borderBottomWidth="2px"
        borderColor={active ? 'yellow.400' : 'transparent'}
        pb={0.5}
        transition="color .12s ease, border-color .12s ease"
        _hover={{ color: 'yellow.200' }}
        {...rest}
      >
        {children}
      </Text>
    </Link>
  );
}

export default NavLink
