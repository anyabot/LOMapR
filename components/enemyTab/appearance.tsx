import React, { useEffect, useState } from 'react';
import { Box, Tag, TagLabel, Text } from '@chakra-ui/react'
import { LinkIcon } from '@chakra-ui/icons'
import Link from 'next/link';

import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectWorldStatus, fetchWorldAsync } from '@/store/worldSlice';

export default function Apperance({name, ev, used} : {name:string, ev:string, used: [number, string][]}) {

  const worldStatus = useAppSelector(selectWorldStatus);
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(fetchWorldAsync());
  }, [dispatch])
  if (worldStatus == "failed"){
    return <h2>Fetch World Failed</h2>
  }
  return (
    <>
    <Text align="center" as="b" fontSize='lg'>{name}</Text>
    <Box display="flex" flexWrap="wrap" justifyContent="center" gap={2} py={2} w="100%">
      {used.map((e, i) => (
        <Tag
          size="md"
          key={`${e[1]}-${e[0]}-${i}`}
          borderRadius='full'
          variant='solid'
          colorScheme='blue'
          as={Link}
          href={`/world/${ev}/${e[0]}/${encodeURIComponent(e[1])}`}
        >
          <TagLabel>{e[1]}</TagLabel>
          <LinkIcon ml={1} />
        </Tag>
      ))}
    </Box>
    </>
  );
}