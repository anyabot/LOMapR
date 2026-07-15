import { useMemo, useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody,
  Box, Image, Input, SimpleGrid, Text, Wrap, WrapItem, Button, ButtonGroup,
} from '@chakra-ui/react';
import { UnitData } from '@/interfaces/unit';
import { unitDisplayName, rankColor, filterActiveProps } from '@/lib/rank';
import { useTranslationVersion } from '@/lib/translationVersion';

// Unit picker modal for a formation tile (search + filters, no duplicates).

interface Props {
  isOpen: boolean;
  onClose: () => void;
  units: Record<string, UnitData>;
  usedIds: Set<string>;
  onPick: (unit: UnitData) => void;
}

const ROLES = ['Attacker', 'Defender', 'Supporter'];
const TYPES = ['Light', 'Heavy', 'Air'];

export default function UnitPicker({ isOpen, onClose, units, usedIds, onPick }: Props) {
  useTranslationVersion();
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [type, setType] = useState('');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.values(units)
      .filter((u) => !usedIds.has(u.id))
      .filter((u) => (!role || u.role === role) && (!type || u.type === type))
      .filter((u) => !q || unitDisplayName(u).toLowerCase().includes(q) || u.id.toLowerCase().includes(q))
      .sort((a, b) => (b.rarity - a.rarity) || unitDisplayName(a).localeCompare(unitDisplayName(b)));
  }, [units, usedIds, query, role, type]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered scrollBehavior="inside" size="4xl">
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(2px)" />
      <ModalContent bg="surface.elevated" color="white" borderWidth="1px" borderColor="surface.border" mx={4}>
        <ModalHeader pb={2}>Pick a unit</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={5}>
          <Wrap spacing={2} mb={3} align="center">
            <WrapItem flex="1" minW="180px">
              <Input size="sm" placeholder="Search name…" value={query}
                onChange={(e) => setQuery(e.target.value)} autoFocus />
            </WrapItem>
            <WrapItem>
              <ButtonGroup isAttached size="xs" variant="outline" colorScheme="red">
                {ROLES.map((r) => (
                  <Button key={r} {...filterActiveProps('red', role === r)}
                    onClick={() => setRole(role === r ? '' : r)}>{r}</Button>
                ))}
              </ButtonGroup>
            </WrapItem>
            <WrapItem>
              <ButtonGroup isAttached size="xs" variant="outline" colorScheme="green">
                {TYPES.map((tp) => (
                  <Button key={tp} {...filterActiveProps('green', type === tp)}
                    onClick={() => setType(type === tp ? '' : tp)}>{tp}</Button>
                ))}
              </ButtonGroup>
            </WrapItem>
          </Wrap>

          <SimpleGrid columns={[3, 4, 6]} spacing={2}>
            {list.map((u) => (
              <Box key={u.id} as="button" onClick={() => onPick(u)}
                borderWidth="2px" borderColor={rankColor(u.rarity)} borderRadius="md"
                overflow="hidden" bg="blackAlpha.400" _hover={{ bg: 'whiteAlpha.100' }}
                textAlign="center" pb={1}>
                <Box sx={{ aspectRatio: '1' }} overflow="hidden">
                  {u.icon ? (
                    <Image src={`/images/icons/${u.icon}.png`} alt={unitDisplayName(u)}
                      objectFit="cover" w="100%" h="100%" loading="lazy" />
                  ) : null}
                </Box>
                <Text fontSize="2xs" noOfLines={1} px={1}>{unitDisplayName(u)}</Text>
              </Box>
            ))}
          </SimpleGrid>
          {list.length === 0 ? (
            <Text color="gray.500" fontSize="sm" textAlign="center" py={8}>No units match.</Text>
          ) : null}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
