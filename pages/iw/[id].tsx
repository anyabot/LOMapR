import type { GetStaticPaths, GetStaticProps } from 'next';
import { iwIds, iwProps } from '@/lib/entityPages';

export { default } from './detail';

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: (await iwIds()).map((id) => ({ params: { id } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const props = await iwProps(String(params?.id));
  return props ? { props } : { notFound: true };
};
