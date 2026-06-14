import { useEffect } from 'react';
import NextLink from 'next/link';
import {
  Popover, PopoverTrigger, PopoverContent, PopoverBody, Portal,
  Box, HStack, VStack, Image, Text, Tag, Wrap, WrapItem,
} from '@chakra-ui/react';
import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectUnit, fetchUnitsAsync } from '@/store/unitSlice';
import { t } from '@/lib/strings';
import { rankTag, rankColor, roleRankIcon, typeIcon, roleIcon, factionIcon } from '@/lib/rank';

/**
 * Reusable unit hover-card. Wrap any trigger (a reward chip, a name, an icon) and
 * pass the unit's id (`Char_*`). On hover it shows a popover with the unit's
 * portrait, name, rank+role badge, type/role/faction. If the id isn't a known
 * playable unit (e.g. a filtered-out char), it renders the children unchanged with
 * no popover. The card links to the unit detail page.
 *
 *   <UnitHoverCard unitId={entry.char}><MyChip/></UnitHoverCard>
 */
export default function UnitHoverCard({
  unitId, children,
}: {
  unitId: string | undefined;
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const unit = useAppSelector((s) => (unitId ? selectUnit(s, unitId) : null));

  // make sure the unit list is loaded so the card can resolve (self-skips if so).
  useEffect(() => { if (unitId) dispatch(fetchUnitsAsync()); }, [unitId, dispatch]);

  if (!unitId || !unit) return <>{children}</>;

  const name = unit.profile?.engName || t(unit.name);
  const rankRole = roleRankIcon(unit.role, unit.rarity);

  return (
    <Popover trigger="hover" openDelay={150} closeDelay={80} isLazy placement="top">
      <PopoverTrigger>
        {/* span wrapper so any child (even text) is a valid single trigger element */}
        <Box as="span" display="inline-block" w="100%">{children}</Box>
      </PopoverTrigger>
      <Portal>
        <PopoverContent bg="surface.elevated" borderColor="surface.border" w="260px" boxShadow="dark-lg">
          <PopoverBody>
            <HStack as={NextLink} href={`/units/detail?id=${encodeURIComponent(unit.id)}`}
              spacing={3} align="start" role="group">
              <Box boxSize="64px" borderRadius="md" overflow="hidden" bg="blackAlpha.500" flexShrink={0}
                borderWidth="1px" borderColor={rankColor(unit.rarity)}>
                {unit.icon ? (
                  <Image src={`/images/icons/${unit.icon}.png`} alt={name} objectFit="cover" w="100%" h="100%"
                    _groupHover={{ transform: 'scale(1.05)' }} transition="transform .15s ease" />
                ) : null}
              </Box>
              <VStack align="start" spacing={1.5} minW={0}>
                <Text fontSize="sm" fontWeight="bold" color="gray.100" noOfLines={2} _groupHover={{ color: 'yellow.300' }}>
                  {name}
                </Text>
                <HStack spacing={2}>
                  {rankRole ? (
                    <Image src={`/images/icons/${rankRole}.png`} alt={`${rankTag(unit.rarity)} ${unit.role}`}
                      h="22px" objectFit="contain" />
                  ) : (
                    <Tag size="sm" bg={rankColor(unit.rarity)} color="blackAlpha.800" fontWeight="bold">
                      {rankTag(unit.rarity)}
                    </Tag>
                  )}
                </HStack>
                <Wrap spacing={1}>
                  <WrapItem>
                    <Tag size="sm" colorScheme="red" gap={1}>
                      {roleIcon(unit.role) ? <Image src={roleIcon(unit.role)!} alt={unit.role} boxSize="12px" /> : null}
                      {unit.role}
                    </Tag>
                  </WrapItem>
                  <WrapItem>
                    <Tag size="sm" colorScheme="green" gap={1}>
                      {typeIcon(unit.type) ? <Image src={typeIcon(unit.type)!} alt={unit.type} boxSize="12px" /> : null}
                      {unit.type}
                    </Tag>
                  </WrapItem>
                  {unit.body ? <WrapItem><Tag size="sm" colorScheme="gray">{unit.body}</Tag></WrapItem> : null}
                </Wrap>
                {unit.faction ? (
                  <HStack spacing={1}>
                    {factionIcon(unit.faction.icon) ? (
                      <Image src={factionIcon(unit.faction.icon)!} alt={t(unit.faction.name)} boxSize="14px" />
                    ) : null}
                    <Text fontSize="xs" color="gray.400" noOfLines={1}>{t(unit.faction.name)}</Text>
                  </HStack>
                ) : null}
              </VStack>
            </HStack>
          </PopoverBody>
        </PopoverContent>
      </Portal>
    </Popover>
  );
}
