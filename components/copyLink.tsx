import { Button, Tooltip, Icon, useClipboard } from '@chakra-ui/react';
import { CopyIcon, CheckIcon } from '@chakra-ui/icons';

interface Props {
  // Path relative to the site root, e.g. "/enemies?enemy=NightChick_N".
  path: string;
  // Short label shown on the badge (defaults to "Share link").
  label?: string;
}

/**
 * A compact "share link" badge. The whole badge is a single clickable button
 * that copies the absolute URL (origin + path) to the clipboard, with the icon
 * on the right and a brief checkmark confirmation.
 */
export default function CopyLink({ path, label = 'Share link' }: Props) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const { onCopy, hasCopied } = useClipboard(origin + path);

  return (
    <Tooltip label={hasCopied ? 'Copied!' : 'Copy link'} closeOnClick={false} fontSize="xs">
      <Button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCopy(); }}
        size="xs"
        variant="outline"
        borderColor="surface.border"
        bg="blackAlpha.400"
        color={hasCopied ? 'green.300' : 'gray.300'}
        fontWeight="500"
        fontSize="xs"
        rightIcon={<Icon as={hasCopied ? CheckIcon : CopyIcon} boxSize="0.7rem" />}
        _hover={{ bg: 'whiteAlpha.200', color: hasCopied ? 'green.300' : 'gray.100' }}
        flexShrink={0}
      >
        {hasCopied ? 'Copied!' : label}
      </Button>
    </Tooltip>
  );
}
