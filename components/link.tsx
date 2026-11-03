import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import NextLink from 'next/link';
import { withSlashUrl } from '@/lib/href';

const Link = forwardRef<HTMLAnchorElement, ComponentPropsWithoutRef<typeof NextLink>>(function Link({ href, ...props }, ref) {
  return <NextLink ref={ref} href={withSlashUrl(href)} {...props} />;
});

export default Link;
