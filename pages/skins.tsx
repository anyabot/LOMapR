import { useEffect, useState, useMemo } from 'react';
import { useAppSelector } from '@/hooks';
import { selectRegion } from '@/store/regionSlice';
import {
  Box, Flex, HStack, VStack, Heading, Badge, Text, Image, Wrap, WrapItem,
  Button, InputGroup, Input, InputRightElement, IconButton,
  Tooltip, Center, Spinner,
  Table, Tbody, Tr, Td,
} from '@chakra-ui/react';
import { CloseIcon, SearchIcon } from '@chakra-ui/icons';
import { tKr, t } from '@/lib/strings';
import Head from 'next/head';
import { fetchSkinList, SkinEntry } from '@/lib/fetchData';
import SkinViewer from '@/components/skinViewer';
import UnitHoverCard from '@/components/unitHoverCard';

// ── parts icon metadata (mirrors skinViewer.tsx PARTS_META) ──────────────────
const PARTS_META: Record<string, { icon: string; label: string }> = {
  LOBBY_ANIMATION:        { icon: '/images/shop/UI_ShopL2DIcon.png',        label: 'Live 2D lobby animation' },
  VOICE:                  { icon: '/images/shop/UI_ShopVoiceIcon.png',       label: 'Voice' },
  SD_EFFECT:              { icon: '/images/shop/UI_ShopFxIcon.png',          label: 'SD battle effects' },
  SD_ANIMATION:           { icon: '/images/shop/UI_ShopSDAnimIcon.png',      label: 'SD battle animation' },
  PROPS:                  { icon: '/images/shop/UI_ShopObjectIcon.png',      label: 'Props / objects' },
  DAMAGE_IMAGE:           { icon: '/images/shop/UI_ShopDamagedIcon.png',     label: 'Damaged skin image' },
  DAMAGE_LOBBY_ANIMATION: { icon: '/images/shop/UI_ShopDamagedL2DIcon.png', label: 'Damaged Live 2D animation' },
};

const SKIN_CATEGORIES: Record<string, string> = {
  Skin_Category_Name_ALL: "ALL",
  Skin_Category_Name_None: "None",
  Skin_Category_Name_Premium: "Premium",
  Skin_Category_Name_Lingerie: "Lingerie",
  Skin_Category_Name_Wedding: "Wedding",
  Skin_Category_Name_Maid: "Maid",
  Skin_Category_Name_Costume: "Costume",
  Skin_Category_Name_Everday_Dress: "Everday Dress",
  Skin_Category_Name_Suit_Dress: "Suit Dress",
  Skin_Category_Name_School: "School",
  Skin_Category_Name_Bunny_Girl: "Bunny Girl",
  Skin_Category_Name_AGS: "AGS",
  Skin_Category_Name_Winter_Theme: "Winter Theme",
  Skin_Category_Name_Halloween: "Halloween",
  Skin_Category_Name_SwimSuit_2026: "SwimSuit 2026",
  Skin_Category_Name_SwimSuit_2025: "SwimSuit 2025",
  Skin_Category_Name_SwimSuit_2024: "SwimSuit 2024",
  Skin_Category_Name_SwimSuit_2023: "SwimSuit 2023",
  Skin_Category_Name_SwimSuit_2022: "SwimSuit 2022",
  Skin_Category_Name_SwimSuit_2021: "SwimSuit 2021",
  Skin_Category_Name_SwimSuit_2020: "SwimSuit 2020",
  Skin_Category_Name_SwimSuit_2019: "SwimSuit 2019",
};


const getAllUniqueCategoryKeys = (list: any[]) => {
  const categorySet = new Set<string>();

  for (const s of list) {
    const categories = Array.isArray(s.category) ? s.category : [];
    for (const catKey of categories) {
      if (SKIN_CATEGORIES[catKey]) {
        categorySet.add(catKey);
      }
    }
  }

  return Array.from(categorySet).sort();
};

const ALL_PARTS = Object.keys(PARTS_META);

function skinFaceIcon(faceKey: string) {
  return `/images/icons/${faceKey.replace(/^CharFace_/, 'FormationIcon_')}.png`;
}

function skinDisplayName(s: SkinEntry) {
  return tKr(s.name) || tKr(s.packName) || tKr(s.itemName) || s.key;
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function Skins() {
  const region = useAppSelector(selectRegion);

  const [skins, setSkins] = useState<SkinEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [allCategories, setAllCategories] = useState<string[]>([]);

  const [activeCats, setActiveCats] = useState<Set<string>>(new Set());
  const [activeParts, setActiveParts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const [selected, setSelected] = useState<SkinEntry | null>(null);

  useEffect(() => {
    setLoading(true);
    setSelected(null);
    fetchSkinList(region).then((list) => {
      setSkins(list.reverse());

      // Usage
      const cats = getAllUniqueCategoryKeys(list);
      setAllCategories(cats);
      setLoading(false);
    });
  }, [region]);

  function toggleCat(cat: string) {
    setActiveCats((prev) => { const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n; });
  }
  function togglePart(part: string) {
    setActiveParts((prev) => { const n = new Set(prev); n.has(part) ? n.delete(part) : n.add(part); return n; });
  }

  const shown = useMemo(() => skins.filter((s) => {
    // Category filter - now using raw keys
    if (activeCats.size > 0) {
      const skinCategories = Array.isArray(s.category) ? s.category : [];
      if (!skinCategories.some((c) => activeCats.has(c))) return false;
    }

    // Parts filter
    if (activeParts.size > 0) {
      const skinParts = Array.isArray(s.parts) ? s.parts : [];
      if (!skinParts.some((p) => activeParts.has(p))) return false;
    }

    // Search
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const name = skinDisplayName(s).toLowerCase();
      const unit = (s.unitEngName || t(s.unitName) || '').toLowerCase();
      if (!name.includes(q) && !unit.includes(q)) return false;
    }

    return true;
  }), [skins, activeCats, activeParts, searchTerm]);

  return (
    <>
      <Head><title>Skins</title></Head>
      <VStack align="stretch" spacing={4} py={4}>
        <HStack>
          <Heading size="xl">Skins</Heading>
          {!loading && (
            <Badge colorScheme="yellow" borderRadius="full" px={2}>{shown.length}</Badge>
          )}
        </HStack>

        {/* Filters */}
        <Box bg="surface.elevated" borderWidth="1px" borderColor="surface.border"
          borderRadius="xl" p={3}>
          <VStack align="stretch" spacing={3}>
            <Box>
              <Text fontSize="xs" color="gray.400" mb={1.5} textTransform="uppercase" letterSpacing="wide">
                Category
              </Text>
              <Wrap spacing={1.5}>
                {allCategories.map((catKey) => (
                  <WrapItem key={catKey}>
                    <Button size="xs"
                      colorScheme={activeCats.has(catKey) ? 'yellow' : 'gray'}
                      variant={activeCats.has(catKey) ? 'solid' : 'outline'}
                      onClick={() => toggleCat(catKey)}>
                      {SKIN_CATEGORIES[catKey]}   {/* Display nice name */}
                    </Button>
                  </WrapItem>
                ))}
                {activeCats.size > 0 && (
                  <WrapItem>
                    <Button size="xs" variant="ghost" color="gray.400"
                      onClick={() => setActiveCats(new Set())}>Clear</Button>
                  </WrapItem>
                )}
              </Wrap>
            </Box>

            <Box>
              <Text fontSize="xs" color="gray.400" mb={1.5} textTransform="uppercase" letterSpacing="wide">
                Features
              </Text>
              <Wrap spacing={1.5}>
                {ALL_PARTS.map((part) => {
                  const meta = PARTS_META[part];
                  return (
                    <WrapItem key={part}>
                      <Tooltip label={meta.label} placement="top" openDelay={300}>
                        <Button size="xs"
                          variant={activeParts.has(part) ? 'solid' : 'outline'}
                          colorScheme={activeParts.has(part) ? 'yellow' : 'gray'}
                          leftIcon={<Image src={meta.icon} alt="" boxSize="14px" />}
                          onClick={() => togglePart(part)}>
                          {meta.label}
                        </Button>
                      </Tooltip>
                    </WrapItem>
                  );
                })}
                {activeParts.size > 0 && (
                  <WrapItem>
                    <Button size="xs" variant="ghost" color="gray.400"
                      onClick={() => setActiveParts(new Set())}>Clear</Button>
                  </WrapItem>
                )}
              </Wrap>
            </Box>

            <HStack>
              <InputGroup size="sm" maxW="300px">
                <Input placeholder="Search skin or unit name" value={searchTerm}
                  borderColor="surface.border"
                  onChange={(e) => setSearchTerm(e.target.value)} />
                <InputRightElement>
                  {searchTerm ? (
                    <IconButton aria-label="Clear" icon={<CloseIcon boxSize={2.5} />}
                      size="xs" variant="ghost" onClick={() => setSearchTerm('')} />
                  ) : (
                    <SearchIcon color="gray.500" boxSize={3} />
                  )}
                </InputRightElement>
              </InputGroup>
            </HStack>
          </VStack>
        </Box>

        {loading ? (
          <Center py={20}><Spinner color="yellow.300" /></Center>
        ) : shown.length === 0 ? (
          <Center py={16}><Text color="gray.500">No skins match the current filters.</Text></Center>
        ) : (
          <>
            {/* Horizontal scrollable skin row */}
            <Box overflowX="auto" pb={2}>
              <HStack spacing={3} align="stretch" minW="max-content">
                {shown.map((s) => (
                  <SkinCard key={s.key} skin={s}
                    selected={selected?.key === s.key}
                    onClick={() => setSelected((prev) => prev?.key === s.key ? null : s)} />
                ))}
              </HStack>
            </Box>

            {/* Viewer panel */}
            {selected && (
              <SkinPanel skin={selected} key={selected.key + region} />
            )}
          </>
        )}
      </VStack>
    </>
  );
}

// ── skin card (same style as unit detail picker) ──────────────────────────────

function SkinCard({ skin, selected, onClick }: {
  skin: SkinEntry; selected: boolean; onClick: () => void;
}) {
  const iconSrc = skin.faceKey ? skinFaceIcon(skin.faceKey) : null;
  const name = skinDisplayName(skin);
  return (
    <Box as="button" onClick={onClick}
      borderWidth={2}
      borderColor={selected ? 'yellow.400' : 'gray.600'}
      borderRadius="md"
      bg={selected ? 'whiteAlpha.100' : 'transparent'}
      p={2} textAlign="center" minW="100px" maxW="120px"
      cursor="pointer" _hover={{ borderColor: 'yellow.300' }}
      transition="border-color 0.15s">
      {iconSrc && (
        <Image src={iconSrc} alt={name} boxSize="80px" objectFit="contain"
          mx="auto" mb={1} borderRadius="sm" />
      )}
      <Text fontSize="xs" fontWeight={selected ? 'bold' : 'normal'} noOfLines={2} lineHeight="1.3">
        {name}
      </Text>
      <Text fontSize="10px" color="gray.500" noOfLines={1} mt={0.5}>{skin.unitEngName}</Text>
      <Box mt={1}>
        {skin.price != null ? (
          <HStack spacing={1} justify="center">
            <Image src="/images/icons/UI_Icon_Currency_Tuna.png" boxSize="14px" alt="tuna" />
            <Text fontSize="xs" color="yellow.300" fontWeight="bold">{skin.price}</Text>
          </HStack>
        ) : (
          <Badge colorScheme="red" fontSize="2xs">Not For Sale</Badge>
        )}
      </Box>
    </Box>
  );
}

// ── viewer panel (mirrors SkinTab body from unit detail) ──────────────────────

function SkinPanel({ skin }: { skin: SkinEntry }) {
  const region = useAppSelector(selectRegion);
  const [showDam, setShowDam] = useState(false);
  const [viewRegion, setViewRegion] = useState<'global' | 'kr'>('global');

  const hasDam = !!skin.modelDam;
  const baseAsset = skin.model;
  const damAsset = skin.modelDam;
  const asset = showDam && hasDam ? damAsset : baseAsset;
  const isDiverged = showDam && hasDam ? !!skin.modelDamDiverged : !!skin.modelDiverged;
  const isSkinnedBase = skin.viewerKind === 'skinned' && !(showDam && hasDam);
  const hasKr = isDiverged || isSkinnedBase;
  const archiveKey = asset && isDiverged ? `${asset}__${viewRegion}` : asset;
  const skinnedModel = isSkinnedBase && asset
    ? (viewRegion === 'kr' && hasKr ? `${asset}__kr` : asset)
    : undefined;
  const effectiveViewerKind = isSkinnedBase
    ? 'skinned'
    : skin.viewerKind === 'skinned' ? undefined : skin.viewerKind;

  return (
    <VStack align="stretch" spacing={4}
      bg="surface.elevated" borderWidth="1px" borderColor="surface.border"
      borderRadius="xl" p={4}>
      {/* Info table */}
      <Box borderWidth={1} borderColor="whiteAlpha.200" borderRadius="md" overflow="hidden" fontSize="sm">
        <Table size="sm" variant="simple">
          <Tbody>
            <Tr>
              <Td fontWeight="semibold" color="gray.400" w="90px" whiteSpace="nowrap">Name</Td>
              <Td>{tKr(skin.name) || tKr(skin.packName) || skin.key}</Td>
            </Tr>
            {skin.packName && tKr(skin.packName) !== (tKr(skin.itemName) || tKr(skin.name)) && (
              <Tr>
                <Td fontWeight="semibold" color="gray.400" whiteSpace="nowrap">Item</Td>
                <Td>{tKr(skin.itemName)}</Td>
              </Tr>
            )}
            <Tr>
              <Td fontWeight="semibold" color="gray.400" whiteSpace="nowrap">Unit</Td>
              <Td>
              <UnitHoverCard unitId={skin.unitId} inline>
                <Box as="span" color="yellow.100" fontWeight="semibold" cursor="pointer"
                  textDecoration='underline'>{skin.unitEngName}</Box>
              </UnitHoverCard>
              </Td>
            </Tr>
            {skin.category.length > 0 && (
              <Tr>
                <Td fontWeight="semibold" color="gray.400" whiteSpace="nowrap">Category</Td>
                <Td>
                  <Wrap spacing={1}>
                    {skin.category.map((c) => (
                      <WrapItem key={c}><Badge colorScheme="yellow" variant="subtle">{SKIN_CATEGORIES[c] || c}</Badge></WrapItem>
                    ))}
                  </Wrap>
                </Td>
              </Tr>
            )}
            {skin.parts.filter((p) => p !== 'NONE').length > 0 && (
              <Tr>
                <Td fontWeight="semibold" color="gray.400" whiteSpace="nowrap">Features</Td>
                <Td>
                  <HStack spacing={2}>
                    {skin.parts.filter((p) => p !== 'NONE').map((p) => {
                      const meta = PARTS_META[p];
                      if (!meta) return null;
                      return (
                        <Tooltip key={p} label={meta.label} placement="top">
                          <Image src={meta.icon} alt={meta.label} boxSize="24px" />
                        </Tooltip>
                      );
                    })}
                  </HStack>
                </Td>
              </Tr>
            )}
            {tKr(skin.desc) && (
              <Tr>
                <Td fontWeight="semibold" color="gray.400" verticalAlign="top">Description</Td>
                <Td whiteSpace="pre-wrap">{tKr(skin.desc)}</Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Box>

      {/* Viewer */}
      {!asset ? (
        <Text color="gray.500" fontSize="sm">No model data.</Text>
      ) : !skin.viewerKind ? (
        <Text color="gray.500" fontSize="sm">Not processed yet.</Text>
      ) : (
        <SkinViewer
          key={archiveKey + viewRegion}
          skin={skinnedModel ?? archiveKey}
          height="60vh"
          parts={skin.parts}
          hasDam={hasDam}
          showDam={showDam}
          onToggleDam={() => { setShowDam((v) => !v); setViewRegion('global'); }}
          viewerKind={effectiveViewerKind}
          hasBg={skin.bgUse}
          hasKr={hasKr}
          viewRegion={viewRegion}
          onToggleRegion={() => setViewRegion((r) => r === 'global' ? 'kr' : 'global')}
        />
      )}
    </VStack>
  );
}
