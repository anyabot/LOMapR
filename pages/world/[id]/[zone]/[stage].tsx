import type { GetStaticPaths, GetStaticProps } from 'next';
import { stageKeys, stageProps } from '@/lib/entityPages';

export { default } from '../../stage';

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: (await stageKeys()).map((params) => ({ params })),
  fallback: false,
});

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const props = await stageProps(String(params?.id), String(params?.zone), String(params?.stage));
  return props ? { props } : { notFound: true };
};
