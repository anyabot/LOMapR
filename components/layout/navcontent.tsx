import { Box, Stack } from "@chakra-ui/react";
import NavLink from "./navlink"

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
      </Stack>
    </Box>
  );
};

export default NavContent