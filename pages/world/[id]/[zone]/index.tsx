import type { GetStaticPaths, GetStaticProps } from 'next';
import { zoneKeys, zoneProps } from '@/lib/entityPages';

export { default } from '../../stage';

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: (await zoneKeys()).map((params) => ({ params })),
  fallback: false,
});

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const props = await zoneProps(String(params?.id), String(params?.zone));
  return props ? { props } : { notFound: true };
};
