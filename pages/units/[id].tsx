import type { GetStaticPaths, GetStaticProps } from 'next';
import { unitIds, unitProps } from '@/lib/entityPages';

export { default } from './detail';

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: (await unitIds()).map((id) => ({ params: { id } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const props = await unitProps(String(params?.id));
  return props ? { props } : { notFound: true };
};
