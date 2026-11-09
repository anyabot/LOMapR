import { Center, Heading, Text, VStack } from '@altterisk/game-hub/ui';
import { Seo } from '@/components/seo';

// Stands in for next/error: OpenNext maps its hashed `next` external to the bare `next` entry, which the Worker bundle cannot resolve.
export default function NotFound() {
  return (
    <>
      <Seo title="Page not found" noindex />
      <Center py={20}>
        <VStack spacing={2}>
          <Heading as="h1" size="xl">404</Heading>
          <Text color="gray.400">This page could not be found.</Text>
        </VStack>
      </Center>
    </>
  );
}
