import {
  HStack, Select, Checkbox, Text, VStack,
  Menu, MenuButton, MenuList, MenuItem, Button, Spinner, Portal,
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import NextLink from "next/link";
import { useRouter } from "next/router";
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

const ETC_LINKS = [
  ["/npcs", "NPC Viewer"],
  ["/gacha", "Gacha Simulator"],
  ["/team", "Team Builder"],
  ["/misc", "Misc Categories"],
] as const;

export function EtcMenu() {
  const { pathname } = useRouter();
  const active = ETC_LINKS.some(([href]) => pathname.startsWith(href));

  return (
    <Menu>
      <MenuButton className="hub-navlink" aria-current={active ? "page" : undefined} flexShrink={0}>
        Etc <ChevronDownIcon />
      </MenuButton>
      {/* the bar's nav row scrolls horizontally, which would clip an inline list */}
      <Portal>
        <MenuList zIndex="dropdown" minW="190px" py={1}>
          {ETC_LINKS.map(([href, label]) => {
            const itemActive = pathname.startsWith(href);
            return (
              <MenuItem
                as={NextLink}
                key={href}
                href={href}
                color={itemActive ? "accent.300" : undefined}
                fontWeight={itemActive ? "bold" : "normal"}
              >
                {label}
              </MenuItem>
            );
          })}
        </MenuList>
      </Portal>
    </Menu>
  );
}

export function TranslationMenu() {
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
        color={activeCount > 0 ? "accent.300" : "inherit"}
        fontWeight="normal"
      >
        {label} ▾
      </MenuButton>
      <MenuList minW="240px" py={1}>
        {LAYERS.map(({ key, label, desc, warning }) => (
          <MenuItem
            key={key}
            onClick={() => setters[key](!values[key])}
            px={3}
            py={2}
          >
            <HStack align="flex-start" spacing={2} w="100%">
              {loaded[key] ? (
                <Checkbox
                  isChecked={values[key]}
                  colorScheme="accent"
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

export function RegionSelect() {
  const region   = useAppSelector(selectRegion);
  const dispatch = useAppDispatch();

  return (
    <Select
      size="sm"
      value={region}
      onChange={(e) => dispatch(setRegion(e.target.value as Region))}
      w="auto"
      cursor="pointer"
    >
      {REGION_OPTIONS.map(([v, label]) => (
        <option key={v} value={v}>{label}</option>
      ))}
    </Select>
  );
}
