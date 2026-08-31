import { useState, useEffect } from 'react';
import { Box, Image, Center } from '@chakra-ui/react';

interface Props {
  src?: string;
  alt: string;
  // 'contain' letterboxes and never crops; 'cover' fills the frame
  fit?: 'contain' | 'cover';
  borderRadius?: string;
}

// Fills its parent, so wrap it in an AspectRatio or fixed box to size it. The
// until-loaded placeholder is rendered locally, with no external URL.
export default function EventImage({ src, alt, fit = 'contain', borderRadius }: Props) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  // reset when the source changes (e.g. region/translation switch)
  useEffect(() => { setStatus(src ? 'loading' : 'error'); }, [src]);

  const placeholder = (
    <Center w="100%" h="100%" bg="blackAlpha.500" color="gray.500"
      fontSize="3xl" fontWeight="bold" borderRadius={borderRadius}>
      ?
    </Center>
  );

  return (
    <Box position="relative" w="100%" h="100%">
      {status !== 'ok' ? placeholder : null}
      {src ? (
        <Image
          src={src}
          alt={alt}
          objectFit={fit}
          w="100%"
          h="100%"
          borderRadius={borderRadius}
          position="absolute"
          top={0}
          left={0}
          opacity={status === 'ok' ? 1 : 0}
          transition="opacity .2s ease"
          onLoad={() => setStatus('ok')}
          onError={() => setStatus('error')}
        />
      ) : null}
    </Box>
  );
}
