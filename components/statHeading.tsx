import { Text } from '@altterisk/game-hub/ui';

export default function StatHeading({ children }: { children: React.ReactNode }) {
  return (
    <Text fontSize="2xs" letterSpacing="wider" textTransform="uppercase" color="accent.400" fontWeight="700" mb={1}>
      {children}
    </Text>
  );
}
