import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { ReactNode } from "react";

interface Props {
  children: ReactNode,
  to: string
}

function NavLink({ children, to = "/" }: Props) {
  const { pathname } = useRouter();
  const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
  return (
    <NextLink href={to} aria-current={active ? 'page' : undefined}>
      {children}
    </NextLink>
  );
}

export default NavLink
