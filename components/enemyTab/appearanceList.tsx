import React, { useEffect } from 'react';
import { Card, CardHeader, CardBody, Text, Divider, Box, Tag, TagLabel, Heading } from '@chakra-ui/react'
import { LinkIcon } from '@chakra-ui/icons'
import Link from 'next/link';

import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectWorld, selectWorldStatus, fetchWorldAsync } from '@/store/worldSlice';
import Apperance from './appearance';

export default function ApperanceList({used, usedSanctum} : {used: {[key: string]: [number, string][]}, usedSanctum:boolean}) {

  const world = useAppSelector(selectWorld);
  const worldStatus = useAppSelector(selectWorldStatus);
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(fetchWorldAsync());
  }, [dispatch])

  if (worldStatus == "failed"){
    return <h2>Fetch World Failed</h2>
  }
  return (
    <Card align='center'>
      <CardHeader bg="gray.300" w="100%" display="flex" flexDirection="column" alignItems="center"><Heading size='md'>Appeared In</Heading></CardHeader>
      <CardBody w="90%" display="flex" alignItems="center" flexDirection="column">
      {
        used ? Object.keys(used).map((e, index) => (world[e]?.title ? 
        <>
          <Apperance key={e} ev={e} name={world[e].title} used={used[e]} />
          {index != Object.keys(used).length - 1 || usedSanctum ? <Divider/> : null}
        </>
        : null)) : null
      }
      { usedSanctum ? (
        <>
          <Text align="center" as="b" fontSize='lg'>Sanctum of Alteration</Text>
          <Box>
            <Tag
              m={1}
              size="md"
              key="sanctum"
              borderRadius='full'
              variant='solid'
              colorScheme='blue'
              as={Link}
              href={`sanctum`}
            >
              <TagLabel>Sanctum of Alteration</TagLabel>
              <LinkIcon ml={1}/>
            </Tag>
          </Box>
          <Divider/>
        </>) : null
      }
      { !used && !usedSanctum ? "No Appearances": null}
      </CardBody>
    </Card>
  );
}