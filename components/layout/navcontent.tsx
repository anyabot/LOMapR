import {
  Box, Stack, HStack, Select, Checkbox, Text, VStack,
  Menu, MenuButton, MenuList, MenuItem, Button, Spinner,
} from "@chakra-ui/react";
import NavLink from "./navlink"
import { useAppSelector, useAppDispatch } from "@/hooks";
import { selectRegion, setRegion, Region } from "@/store/regionSlice";
import {
  selectMtl, selectKrMtl, selectCommunity,
  selectMtlLoaded, selectKrMtlLoaded, selectCommunityLoaded,
  setMtl, setKrMtl, setCommunity,
} from "@/store/translationSlice";

const REGION_OPTIONS: [Region, string][] = [
  ["global", "🌐 Global"],
  ["kr",     "🇰🇷 KR"],
];

interface LayerDef {
  key:     "mtl" | "krMtl" | "community";
  label:   string;
  desc:    string;
  warning?: string;
}

const LAYERS: LayerDef[] = [
  {
    key:     "mtl",
    label:   "MTL",
    desc:    "Machine-translated skill text for the global region.",
    warning: "KR region: may contain outdated info if global lags behind KR updates.",
  },
  {
    key:     "krMtl",
    label:   "KR MTL",
    desc:    "Machine-translated KR-exclusive skills not yet in global.",
    warning: "Contains KR updates and new units not available in global.",
  },
  {
    key:     "community",
    label:   "Community",
    desc:    "Fan-translation overlay from the community.",
    warning: "May be outdated — not kept in sync with game updates.",
  },
];

function TranslationMenu() {
  const mtl       = useAppSelector(selectMtl);
  const krMtl     = useAppSelector(selectKrMtl);
  const community = useAppSelector(selectCommunity);

  const mtlLoaded       = useAppSelector(selectMtlLoaded);
  const krMtlLoaded     = useAppSelector(selectKrMtlLoaded);
  const communityLoaded = useAppSelector(selectCommunityLoaded);

  const dispatch = useAppDispatch();

  const values  = { mtl, krMtl, community };
  const loaded  = { mtl: mtlLoaded, krMtl: krMtlLoaded, community: communityLoaded };
  const setters = {
    mtl:       (v: boolean) => dispatch(setMtl(v)),
    krMtl:     (v: boolean) => dispatch(setKrMtl(v)),
    community: (v: boolean) => dispatch(setCommunity(v)),
  };

  const activeCount = [mtl, krMtl, community].filter(Boolean).length;
  const label = activeCount === 0 ? "Translation" : `Translation (${activeCount})`;

  return (
    <Menu closeOnSelect={false}>
      <MenuButton
        as={Button}
        size="sm"
        variant="outline"
        borderColor="whiteAlpha.300"
        _hover={{ borderColor: "whiteAlpha.500" }}
        color={activeCount > 0 ? "yellow.300" : "inherit"}
        fontWeight="normal"
      >
        {label} ▾
      </MenuButton>
      <MenuList
        bg="#21252e"
        borderColor="#2c313c"
        minW="240px"
        py={1}
      >
        {LAYERS.map(({ key, label, desc, warning }) => (
          <MenuItem
            key={key}
            bg="transparent"
            _hover={{ bg: "whiteAlpha.100" }}
            onClick={() => setters[key](!values[key])}
            px={3}
            py={2}
          >
            <HStack align="flex-start" spacing={2} w="100%">
              {loaded[key] ? (
                <Checkbox
                  isChecked={values[key]}
                  colorScheme="yellow"
                  size="sm"
                  onChange={(e) => { e.stopPropagation(); setters[key](e.target.checked); }}
                  pointerEvents="none"
                  mt="2px"
                  flexShrink={0}
                />
              ) : (
                <Spinner size="xs" color="whiteAlpha.400" mt="3px" flexShrink={0} />
              )}
              <VStack align="flex-start" spacing={0}>
                <Text fontSize="sm" fontWeight="medium" lineHeight="short">
                  {label}
                </Text>
                <Text fontSize="xs" color="whiteAlpha.600" lineHeight="short">
                  {desc}
                </Text>
                {warning && (
                  <Text fontSize="xs" color="orange.300" lineHeight="short">
                    ⚠ {warning}
                  </Text>
                )}
              </VStack>
            </HStack>
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  );
}

function NavContent({ isOpen }: { isOpen: boolean }) {
  const region   = useAppSelector(selectRegion);
  const dispatch = useAppDispatch();

  return (
    <Box
      display={{ base: isOpen ? "block" : "none", md: "block" }}
      flexBasis={{ base: "100%", md: "auto" }}
      flex={{ md: 1 }}
      ml={{ md: 6 }}
    >
      <Stack
        spacing={[3, 3, 5]}
        align="center"
        justify={["center", "center", "space-between"]}
        direction={["column", "column", "row"]}
        pt={[3, 3, 0]}
        w="100%"
      >
        <HStack spacing={[3, 3, 4]} flexWrap="wrap" justify={["center", "center", "flex-start"]}>
          <NavLink to="/">Home</NavLink>
          <NavLink to="/units">Units</NavLink>
          <NavLink to="/equipment">Equipment</NavLink>
          <NavLink to="/world">World</NavLink>
          <NavLink to="/sanctum">Sanctum</NavLink>
          <NavLink to="/enemies">Enemies</NavLink>
          <NavLink to="/iw">Infinite War</NavLink>
        </HStack>

        <HStack spacing={2} flexWrap="wrap" justify="center" align="center">
          <Select
            size="sm"
            value={region}
            onChange={(e) => dispatch(setRegion(e.target.value as Region))}
            w="auto"
            borderColor="whiteAlpha.300"
            _hover={{ borderColor: "whiteAlpha.500" }}
            cursor="pointer"
          >
            {REGION_OPTIONS.map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </Select>

          <TranslationMenu />
        </HStack>
      </Stack>
    </Box>
  );
}

export default NavContent
