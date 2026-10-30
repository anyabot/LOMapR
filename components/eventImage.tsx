import { FallbackImage } from '@altterisk/game-hub';
import { Box, Center, resolveValue } from '@altterisk/game-hub/ui';

interface Props {
  src?: string;
  alt: string;
  // 'contain' letterboxes and never crops; 'cover' fills the frame
  fit?: 'contain' | 'cover';
  borderRadius?: string;
}

// Fills its parent, so wrap it in an AspectRatio or fixed box to size it.
export default function EventImage({ src, alt, fit = 'contain', borderRadius }: Props) {
  const placeholder = (
    <Center w="100%" h="100%" bg="blackAlpha.500" color="gray.500"
      fontSize="3xl" fontWeight="bold" borderRadius={borderRadius}>
      ?
    </Center>
  );
  return (
    <Box position="relative" w="100%" h="100%">
      <FallbackImage
        srcs={[src]}
        alt={alt}
        missing={placeholder}
        style={{ width: '100%', height: '100%', objectFit: fit, borderRadius: resolveValue(borderRadius, 'radii') as string | undefined, display: 'block' }}
      />
    </Box>
  );
}
