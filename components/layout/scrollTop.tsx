import { useEffect, useState } from 'react';
import { IconButton } from '@chakra-ui/react';
import { ArrowUpIcon } from '@chakra-ui/icons';

// Floating "back to top" button, rendered on every page via Layout. Hidden until
// the page is scrolled down a bit.
export default function ScrollTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!show) return null;
  return (
    <IconButton
      aria-label="Back to top"
      icon={<ArrowUpIcon />}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      position="fixed"
      bottom={{ base: 4, md: 6 }}
      right={{ base: 4, md: 6 }}
      zIndex={1000}
      size="md"
      borderRadius="full"
      colorScheme="yellow"
      opacity={0.75}
      _hover={{ opacity: 1 }}
      boxShadow="lg"
    />
  );
}
