import { Box, Stack, ButtonGroup, Button, HStack, Text } from "@chakra-ui/react";
import NavLink from "./navlink"
import { useAppSelector, useAppDispatch } from "@/hooks";
import { selectRegion, setRegion, Region } from "@/store/regionSlice";
import { selectTranslation, setTranslation, Translation } from "@/store/translationSlice";

// Generic segmented toggle (used for region + translation).
function SegToggle<T extends string>({
  label, value, options, onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <HStack spacing={1.5}>
      <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">
        {label}
      </Text>
      <ButtonGroup isAttached size="sm">
        {options.map(([v, text]) => (
          <Button
            key={v}
            colorScheme={value === v ? "yellow" : "gray"}
            variant={value === v ? "solid" : "outline"}
            onClick={() => value !== v && onChange(v)}
          >
            {text}
          </Button>
        ))}
      </ButtonGroup>
    </HStack>
  );
}

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
          <NavLink to="/world">World</NavLink>
          <NavLink to="/sanctum">Sanctum</NavLink>
          <NavLink to="/units">Units</NavLink>
          <NavLink to="/equipment">Equipment</NavLink>
          <NavLink to="/enemies">Enemies</NavLink>
          <NavLink to="/iw">Infinite War</NavLink>
        </HStack>

        <HStack spacing={4} flexWrap="wrap" justify="center">
          <SegToggle<Region>
            label="Server"
            value={region}
            options={[["global", "Global"], ["kr", "KR"]]}
            onChange={(v) => dispatch(setRegion(v))}
          />
          <SegToggle<Translation>
            label="Text"
            value={translation}
            options={[["community", "Community"], ["official", "Official"]]}
            onChange={(v) => dispatch(setTranslation(v))}
          />
        </HStack>
      </Stack>
    </Box>
  );
}

export default NavContent
