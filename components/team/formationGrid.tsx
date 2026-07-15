import { Box, Flex, Grid, HStack, IconButton, Image, Text, VStack } from '@chakra-ui/react';
import { RepeatIcon, SmallCloseIcon } from '@chakra-ui/icons';
import { Team } from '@/interfaces/team';
import { UnitData } from '@/interfaces/unit';
import { unitDisplayName } from '@/lib/rank';

// The 3x3 formation map in the in-game ten-key layout (789/456/123, front =
// right column, enemy to the right). `highlight` marks skill-AoE tiles.

interface Props {
  team: Team;
  units: Record<string, UnitData>;
  selected: number | null;
  highlight: number[] | null;
  caster: number | null;
  onTileClick: (tile: number) => void;
  onUnitMove: (from: number, to: number) => void;
  onUnitReplace: (tile: number) => void;
  onUnitRemove: (tile: number) => void;
}

// tile index (0..8, row-major from top-left) -> in-game ten-key position label
export const TILE_POSITION = [7, 8, 9, 4, 5, 6, 1, 2, 3] as const;

const COL_LABELS = ['Back', 'Mid', 'Front'];

export default function FormationGrid({
  team, units, selected, highlight, caster,
  onTileClick, onUnitMove, onUnitReplace, onUnitRemove,
}: Props) {
  const hi = new Set(highlight ?? []);
  return (
    <Box maxW="420px" mx="auto">
      {/* depth labels: columns, back → front */}
      <Grid templateColumns="repeat(3, 1fr)" gap={2} mb={1}>
        {COL_LABELS.map((l) => (
          <Text key={l} fontSize="2xs" color="gray.500" textAlign="center"
            textTransform="uppercase" letterSpacing="wider">{l}</Text>
        ))}
      </Grid>
      <Grid templateColumns="repeat(3, 1fr)" gap={2}>
        {Array.from({ length: 9 }, (_, tile) => {
          const slot = team[tile];
          const unit = slot ? units[slot.unitId] : null;
          const isSel = selected === tile;
          const isHi = hi.has(tile);
          const isCaster = caster === tile;
          return (
            <Box
              key={tile}
              position="relative"
              sx={{ aspectRatio: '1' }}
              borderRadius="lg"
              borderWidth="2px"
              borderColor={isSel ? 'yellow.400' : isCaster ? 'teal.300' : isHi ? 'yellow.300' : 'surface.border'}
              bg={isHi ? 'rgba(242,200,60,0.18)' : 'blackAlpha.500'}
              boxShadow={isHi ? '0 0 12px rgba(242,200,60,0.45)' : undefined}
              overflow="hidden"
              transition="border-color .15s, background .15s, box-shadow .15s"
              _hover={{ borderColor: isSel ? 'yellow.400' : 'yellow.200' }}
              draggable={!!slot}
              cursor={slot ? 'grab' : 'pointer'}
              onDragStart={(e) => {
                if (!slot) { e.preventDefault(); return; }
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(tile));
              }}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
              onDrop={(e) => {
                e.preventDefault();
                const from = Number(e.dataTransfer.getData('text/plain'));
                if (Number.isInteger(from) && from >= 0 && from < 9 && from !== tile)
                  onUnitMove(from, tile);
              }}
            >
              <Box as="button" position="absolute" inset={0} w="100%" h="100%"
                onClick={() => onTileClick(tile)} aria-label={unit ? `Configure ${unitDisplayName(unit)}` : 'Add unit'}>
              {/* ten-key position label */}
              <Text position="absolute" top="1px" left="4px" fontSize="xs" fontWeight="700"
                color={unit ? 'whiteAlpha.800' : 'gray.600'} zIndex={1}
                textShadow="0 0 3px rgba(0,0,0,0.9)">
                {TILE_POSITION[tile]}
              </Text>
              {unit ? (
                <>
                  {unit.icon ? (
                    <Image src={`/images/icons/${unit.icon}.png`} alt={unitDisplayName(unit)}
                      objectFit="cover" w="100%" h="100%" />
                  ) : (
                    <Text fontSize="2xs" px={1}>{unitDisplayName(unit)}</Text>
                  )}
                  {slot ? (
                    <Box position="absolute" bottom="0" left="0" right="0"
                      bg="blackAlpha.700" px={1} py="1px">
                      <Text fontSize="2xs" color="gray.200" noOfLines={1}>
                        Lv {slot.level}{slot.links > 0 ? ` · ${slot.links * 100}%` : ''}
                      </Text>
                    </Box>
                  ) : null}
                </>
              ) : (
                <VStack spacing={0} justify="center" h="100%">
                  <Text fontSize="xl" color="gray.600">+</Text>
                </VStack>
              )}
              </Box>
              {unit ? (
                <HStack position="absolute" top="3px" right="3px" spacing="2px" zIndex={3}>
                  <IconButton aria-label="swap unit" title="Swap unit" icon={<RepeatIcon />} size="xs"
                    minW="22px" h="22px" colorScheme="teal" variant="solid"
                    onClick={() => onUnitReplace(tile)} />
                  <IconButton aria-label="remove unit" title="Remove unit" icon={<SmallCloseIcon />} size="xs"
                    minW="22px" h="22px" colorScheme="red" variant="solid"
                    onClick={() => onUnitRemove(tile)} />
                </HStack>
              ) : null}
            </Box>
          );
        })}
      </Grid>
      <Flex justify="flex-end" mt={1}>
        <Text fontSize="2xs" color="gray.600">enemy side →</Text>
      </Flex>
    </Box>
  );
}
