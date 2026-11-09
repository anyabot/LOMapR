import type { GetStaticPaths, GetStaticProps } from 'next';
import { worldIds, worldProps } from '@/lib/entityPages';

export { default } from '../detail';

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: (await worldIds()).map((id) => ({ params: { id } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const props = await worldProps(String(params?.id));
  return props ? { props } : { notFound: true };
};
