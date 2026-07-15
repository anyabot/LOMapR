import { useMemo, useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody,
  Box, HStack, Image, Input, Text, VStack, Tag, Wrap, WrapItem, Button, ButtonGroup,
} from '@chakra-ui/react';
import { UnitData } from '@/interfaces/unit';
import { EquipData } from '@/interfaces/equip';
import { t } from '@/lib/strings';
import { useTranslationVersion } from '@/lib/translationVersion';
import { rankColor, rankTag, equipIcon, filterActiveProps } from '@/lib/rank';
import { canEquip } from '@/lib/team';

// Equip picker for one unit slot; lists only items the unit can wear.

interface Props {
  isOpen: boolean;
  onClose: () => void;
  equip: Record<string, EquipData>;
  unit: UnitData;
  slotType: string;                 // Chip / OS / Item
  onPick: (e: EquipData) => void;
}

const GRADES = [2, 3, 4, 5, 6];

export default function EquipPicker({ isOpen, onClose, equip, unit, slotType, onPick }: Props) {
  useTranslationVersion();
  const [query, setQuery] = useState('');
  const [grade, setGrade] = useState(0);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.values(equip)
      .filter((e) => canEquip(e, unit, slotType))
      .filter((e) => !grade || e.grade === grade)
      .filter((e) => !q || t(e.name).toLowerCase().includes(q) || e.id.toLowerCase().includes(q))
      .sort((a, b) => (b.grade - a.grade) || t(a.name).localeCompare(t(b.name)));
  }, [equip, unit, slotType, query, grade]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered scrollBehavior="inside" size="2xl">
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(2px)" />
      <ModalContent bg="surface.elevated" color="white" borderWidth="1px" borderColor="surface.border" mx={4}>
        <ModalHeader pb={2}>
          <HStack spacing={2}>
            {equipIcon(slotType) ? <Image src={equipIcon(slotType)!} alt={slotType} boxSize="18px" /> : null}
            <Text fontSize="lg">Pick {slotType}</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={5}>
          <Wrap spacing={2} mb={3} align="center">
            <WrapItem flex="1" minW="180px">
              <Input size="sm" placeholder="Search…" value={query}
                onChange={(e) => setQuery(e.target.value)} autoFocus />
            </WrapItem>
            <WrapItem>
              <ButtonGroup isAttached size="xs" variant="outline" colorScheme="yellow">
                {GRADES.map((g) => (
                  <Button key={g} {...filterActiveProps('yellow', grade === g)}
                    color={grade === g ? rankColor(g) : undefined}
                    onClick={() => setGrade(grade === g ? 0 : g)}>{rankTag(g)}</Button>
                ))}
              </ButtonGroup>
            </WrapItem>
          </Wrap>

          <VStack align="stretch" spacing={1.5}>
            {list.map((e) => (
              <HStack key={e.id} as="button" onClick={() => onPick(e)} spacing={3}
                borderWidth="1px" borderColor="surface.border" borderRadius="md"
                bg="blackAlpha.300" p={2} _hover={{ bg: 'whiteAlpha.100' }} textAlign="left">
                <Box boxSize="40px" borderRadius="md" overflow="hidden" bg="blackAlpha.500"
                  borderWidth="2px" borderColor={rankColor(e.grade)} flexShrink={0} p="2px">
                  {e.icon ? <Image src={`/images/icons/${e.icon}.png`} alt="" objectFit="contain" w="100%" h="100%" loading="lazy" /> : null}
                </Box>
                <Box minW={0} flex="1">
                  <Text fontSize="sm" noOfLines={1}>{t(e.name)}</Text>
                  <HStack spacing={1.5} mt={0.5}>
                    <Tag size="sm" bg={rankColor(e.grade)} color="blackAlpha.800" fontWeight="bold">{rankTag(e.grade)}</Tag>
                    {e.classLimit ? <Tag size="sm" colorScheme="green">{e.classLimit}</Tag> : null}
                    {e.roleLimit ? <Tag size="sm" colorScheme="red">{e.roleLimit}</Tag> : null}
                    {e.pcLimit ? <Tag size="sm" colorScheme="purple">Exclusive</Tag> : null}
                  </HStack>
                </Box>
              </HStack>
            ))}
            {list.length === 0 ? (
              <Text color="gray.500" fontSize="sm" textAlign="center" py={8}>
                No equipment this unit can wear matches.
              </Text>
            ) : null}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
