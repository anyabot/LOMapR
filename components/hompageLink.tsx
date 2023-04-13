import { Text, Tag, TagLabel } from '@chakra-ui/react';
import { LinkIcon } from '@chakra-ui/icons';
import Link from 'next/link';
import { ReactNode } from 'react';

interface Props {
  url: string,
  children: ReactNode,
}

export default function HomePageLink({url, children}: Props) {
  return (
    <Text textAlign="center">
    {children} : 
    <Tag
      m={1}
      size="md"
      borderRadius='full'
      variant='solid'
      colorScheme='blue'
      as={Link}
      href={url}
    >
      <TagLabel>Link</TagLabel>
      <LinkIcon ml={1} />
    </Tag>
  </Text>
  )
}