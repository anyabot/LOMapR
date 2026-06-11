import { Image, Box, Heading, AspectRatio, Center } from '@chakra-ui/react';
import { ReactNode } from 'react';

type HeadingSize =
  | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';

interface Props {
  img: string | undefined,
  alt: string,
  children: ReactNode,
  onClick?: React.MouseEventHandler,
  direction?: 'row' | 'column' | undefined,
  headingSize?: HeadingSize | HeadingSize[],
  // image aspect ratio (w/h). Square icons = 1; set higher for wide art.
  ratio?: number,
}

/**
 * Poster-style card: image fills a fixed-ratio frame with the title rendered as
 * a gradient caption across the bottom. Used across the world / zone / enemy /
 * IW grids for a consistent look.
 */
export default function SimpleCard({
  img, alt, children, onClick, headingSize = ['sm', 'sm', 'md'], ratio = 1,
}: Props) {
  return (
    <Box
      onClick={onClick}
      cursor="pointer"
      position="relative"
      h="100%"
      borderRadius="xl"
      overflow="hidden"
      bg="surface.elevated"
      borderWidth="1px"
      borderColor="surface.border"
      transition="transform .12s ease, border-color .12s ease, box-shadow .12s ease"
      _hover={{
        transform: 'translateY(-4px)',
        borderColor: 'yellow.400',
        boxShadow: '0 8px 20px rgba(0,0,0,.45)',
      }}
      role="group"
    >
      <AspectRatio ratio={ratio}>
        {img ? (
          <Image
            src={img}
            alt={alt}
            objectFit="cover"
            transition="transform .25s ease"
            _groupHover={{ transform: 'scale(1.06)' }}
          />
        ) : (
          <Center bg="blackAlpha.400" color="gray.500" fontSize="3xl" fontWeight="bold">
            ?
          </Center>
        )}
      </AspectRatio>

      <Box
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        px={2}
        py={2}
        bgGradient="linear(to-t, blackAlpha.900 30%, blackAlpha.700 70%, transparent)"
      >
        <Heading
          size={headingSize}
          textAlign="center"
          color="white"
          noOfLines={2}
          lineHeight={1.15}
        >
          {children}
        </Heading>
      </Box>
    </Box>
  );
}
