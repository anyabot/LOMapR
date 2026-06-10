import { Box, Stack, ButtonGroup, Button } from "@chakra-ui/react";
import NavLink from "./navlink"
import { useAppSelector, useAppDispatch } from "@/hooks";
import { selectRegion, setRegion, Region } from "@/store/regionSlice";

function RegionToggle() {
  const region = useAppSelector(selectRegion);
  const dispatch = useAppDispatch();
  const regions: [Region, string][] = [["global", "Global"], ["kr", "KR"]];
  return (
    <ButtonGroup isAttached size="sm" variant="outline">
      {regions.map(([r, label]) => (
        <Button
          key={r}
          colorScheme={region === r ? "yellow" : "gray"}
          variant={region === r ? "solid" : "outline"}
          onClick={() => region !== r && dispatch(setRegion(r))}
        >
          {label}
        </Button>
      ))}
    </ButtonGroup>
  );
}

function NavContent ({ isOpen }: { isOpen : boolean }) {
  return (
    <Box
      display={{ base: isOpen ? "block" : "none", md: "block" }}
      flexBasis={{ base: "100%", md: "auto" }}
    >
      <Stack
        spacing={8}
        align="center"
        justify={["center", "center", "flex-end", "flex-end"]}
        direction={["column", "column", "row", "row"]}
        pt={[2, 2, 0, 0]}
      >
        <NavLink to="/" fontSize='xl' mx={6}>Home</NavLink>
        <NavLink to="/world">World </NavLink>
        <NavLink to="/sanctum">Sanctum of Alteration </NavLink>
        <NavLink to="/enemies">Enemy List </NavLink>
        <NavLink to="/iw">Infinite War </NavLink>
        <RegionToggle />
      </Stack>
    </Box>
  );
};

export default NavContent