import { Box, Stack, HStack, Select } from "@chakra-ui/react";
import NavLink from "./navlink"
import { useAppSelector, useAppDispatch } from "@/hooks";
import { selectRegion, setRegion, Region } from "@/store/regionSlice";
import { selectTranslation, setTranslation, Translation } from "@/store/translationSlice";

const REGION_OPTIONS: [Region, string][] = [
  ["global", "🌐 Global"],
  ["kr",     "🇰🇷 KR"],
];

const TRANSLATION_OPTIONS: [Translation, string][] = [
  ["community", "Community"],
  ["official",  "Official"],
];

function NavContent({ isOpen }: { isOpen: boolean }) {
  const region = useAppSelector(selectRegion);
  const translation = useAppSelector(selectTranslation);
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

        <HStack spacing={2} flexWrap="wrap" justify="center">
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
          <Select
            size="sm"
            value={translation}
            onChange={(e) => dispatch(setTranslation(e.target.value as Translation))}
            w="auto"
            borderColor="whiteAlpha.300"
            _hover={{ borderColor: "whiteAlpha.500" }}
            cursor="pointer"
          >
            {TRANSLATION_OPTIONS.map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </Select>
        </HStack>
      </Stack>
    </Box>
  );
}

export default NavContent
