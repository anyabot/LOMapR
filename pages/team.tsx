import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box, Button, ButtonGroup, Center, Flex, Heading, HStack, VStack, Text, Badge,
  Input, InputGroup, InputRightElement, SimpleGrid, useToast,
  Tabs, Tab, TabList, TabPanels, TabPanel,
} from '@chakra-ui/react';
import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectUnits, selectUnitFull, selectUnitStatus, fetchUnitsAsync, fetchUnitBundleAsync } from '@/store/unitSlice';
import { fetchEquipAsync, fetchEquipFullAsync, selectEquip } from '@/store/equipSlice';
import { selectRegion } from '@/store/regionSlice';
import { Team, TeamSlot } from '@/interfaces/team';
import { UnitData } from '@/interfaces/unit';
import { Skill } from '@/interfaces/skill';
import { useTranslationVersion } from '@/lib/translationVersion';
import { makeSlot, encodeTeam, decodeTeam, allyAffectedTiles, MAX_UNITS } from '@/lib/team';
import FormationGrid from '@/components/team/formationGrid';
import UnitPicker from '@/components/team/unitPicker';
import UnitConfig from '@/components/team/unitConfig';
import SimulatePanel from '@/components/team/simulatePanel';

// /team — team builder on the 3x3 formation map + round-1 battle simulation,
// with share codes (?t=) and localStorage persistence. Multiple team slots are
// kept locally; loading a code (paste or ?t=) lands in its own slot.

const STORAGE_KEY = 'lomapr.team.v1';          // legacy single-team key, migrated once
const STORAGE_KEY_MULTI = 'lomapr.teams.v1';   // { active, teams: string[] } of team codes
const EMPTY_TEAM: Team = Array(9).fill(null);

interface StoredTeams { active: number; teams: string[] }

function readStoredTeams(): StoredTeams | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MULTI);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.teams) && parsed.teams.length > 0 &&
          parsed.teams.every((c: unknown) => typeof c === 'string')) {
        const active = Number.isInteger(parsed.active)
          ? Math.min(Math.max(parsed.active, 0), parsed.teams.length - 1) : 0;
        return { active, teams: parsed.teams };
      }
    }
    const legacy = localStorage.getItem(STORAGE_KEY);
    if (legacy) return { active: 0, teams: [legacy] };
  } catch { /* ignore */ }
  return null;
}

export default function TeamBuilder() {
  useTranslationVersion();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const units = useAppSelector(selectUnits);
  const unitStatus = useAppSelector(selectUnitStatus);
  const equip = useAppSelector(selectEquip);
  const region = useAppSelector(selectRegion);

  const [team, setTeam] = useState<Team>(EMPTY_TEAM);
  const [slotIdx, setSlotIdx] = useState(0);
  const [slotCodes, setSlotCodes] = useState<string[]>(['']);
  const [selTile, setSelTile] = useState<number | null>(null);
  const [pickerTile, setPickerTile] = useState<number | null>(null);
  const [moveArm, setMoveArm] = useState(false);
  const [aoe, setAoe] = useState<{ caster: number; key: string; tiles: number[] } | null>(null);
  const [loadCode, setLoadCode] = useState('');
  const restored = useRef(false);

  useEffect(() => { dispatch(fetchUnitsAsync()); dispatch(fetchEquipAsync()); }, [dispatch]);

  // fetch bundles / equip records only when the SET of ids changes (not on
  // every slot tweak — the pending actions would re-render the whole page)
  const teamUnitIds = team.filter((s): s is TeamSlot => !!s && !!units[s.unitId])
    .map((s) => s.unitId).sort().join('|');
  const teamEquipIds = team
    .flatMap((s) => (s && units[s.unitId]
      ? s.equips.filter((e) => e && equip[e.id]).map((e) => e!.id)
      : []))
    .sort().join('|');
  useEffect(() => {
    for (const id of teamUnitIds.split('|')) if (id) dispatch(fetchUnitBundleAsync(id));
  }, [teamUnitIds, region, dispatch]);
  useEffect(() => {
    for (const id of teamEquipIds.split('|')) if (id) dispatch(fetchEquipFullAsync(id));
  }, [teamEquipIds, region, dispatch]);

  // one-time restore. A ?t= code lands in its own slot (or re-activates the
  // slot that already holds the same team) instead of overwriting anything.
  useEffect(() => {
    if (restored.current || !router.isReady) return;
    restored.current = true;
    const stored = readStoredTeams() ?? { active: 0, teams: [''] };
    const fromUrl = typeof router.query.t === 'string' ? decodeTeam(router.query.t) : null;
    if (fromUrl) {
      const code = encodeTeam(fromUrl);
      const existing = stored.teams.indexOf(code);
      const teams = existing >= 0 ? stored.teams : [...stored.teams, code];
      setSlotCodes(teams);
      setSlotIdx(existing >= 0 ? existing : teams.length - 1);
      setTeam(fromUrl);
      return;
    }
    setSlotCodes(stored.teams);
    setSlotIdx(stored.active);
    const dec = decodeTeam(stored.teams[stored.active] ?? '');
    if (dec) setTeam(dec);
  }, [router.isReady, router.query.t]);

  // keep the active slot's code in sync with the working team…
  useEffect(() => {
    if (!restored.current) return;
    const code = encodeTeam(team);
    setSlotCodes((codes) => {
      if (codes[slotIdx] === code) return codes;
      const next = [...codes];
      next[slotIdx] = code;
      return next;
    });
  }, [team, slotIdx]);

  // …and persist all slots
  useEffect(() => {
    if (!restored.current) return;
    try {
      localStorage.setItem(STORAGE_KEY_MULTI, JSON.stringify({ active: slotIdx, teams: slotCodes }));
    } catch { /* ignore */ }
  }, [slotCodes, slotIdx]);

  const usedIds = useMemo(
    () => new Set(team
      .filter((s, tile): s is TeamSlot => !!s && tile !== pickerTile)
      .map((s) => s.unitId)),
    [team, pickerTile],
  );

  const patchSlot = (tile: number, patch: Partial<TeamSlot>) =>
    setTeam((tm) => tm.map((s, i) => (i === tile && s ? { ...s, ...patch } : s)));

  // team-slot management (the working team is already saved continuously)
  const activateSlot = (i: number, codes: string[]) => {
    setSlotIdx(i);
    setTeam(decodeTeam(codes[i] ?? '') ?? EMPTY_TEAM);
    setSelTile(null);
    setAoe(null);
    setMoveArm(false);
  };
  const switchSlot = (i: number) => { if (i !== slotIdx) activateSlot(i, slotCodes); };
  const addSlot = () => {
    const next = [...slotCodes, ''];
    setSlotCodes(next);
    activateSlot(next.length - 1, next);
  };
  const deleteSlot = () => {
    if (!window.confirm(`Delete team ${slotIdx + 1}? This cannot be undone.`)) return;
    const next = slotCodes.filter((_, i) => i !== slotIdx);
    if (next.length === 0) next.push('');
    setSlotCodes(next);
    activateSlot(Math.min(slotIdx, next.length - 1), next);
  };

  const onTileClick = (tile: number) => {
    setAoe(null);
    if (moveArm && selTile != null && selTile !== tile) {
      // move / swap the selected unit onto the clicked tile
      setTeam((tm) => {
        const next = [...tm];
        const a = next[selTile], b = next[tile];
        next[tile] = a; next[selTile] = b;
        return next;
      });
      setSelTile(tile);
      setMoveArm(false);
      return;
    }
    setMoveArm(false);
    if (team[tile]) { setSelTile(tile); return; }
    if (team.filter((s) => s).length >= MAX_UNITS) {
      toast({ status: 'warning', duration: 2500, title: `A squad fields at most ${MAX_UNITS} units.` });
      return;
    }
    setPickerTile(tile);
  };

  const moveUnit = (from: number, to: number) => {
    setTeam((tm) => {
      const next = [...tm];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
    setSelTile(to);
    setMoveArm(false);
    setAoe(null);
  };

  const onPick = (unit: UnitData) => {
    if (pickerTile == null) return;
    const slot = makeSlot(unit);
    setTeam((tm) => tm.map((s, i) => (i === pickerTile ? slot : s)));
    setSelTile(pickerTile);
    setPickerTile(null);
    dispatch(fetchUnitBundleAsync(unit.id));
  };

  const onRemove = (tile: number) => {
    setTeam((tm) => tm.map((s, i) => (i === tile ? null : s)));
    setSelTile((selected) => selected === tile ? null : selected);
    setAoe(null);
  };

  const onSkillClick = (tile: number) => (key: string, skill: Skill) => {
    if (aoe && aoe.key === key && aoe.caster === tile) { setAoe(null); return; }
    const tiles = allyAffectedTiles(skill, tile);
    if (!tiles) {
      toast({ status: 'info', duration: 2500, isClosable: true,
        title: 'This skill has no ally-side effect to highlight.' });
      setAoe(null);
      return;
    }
    setAoe({ caster: tile, key, tiles });
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ status: 'success', duration: 2000, title: `${label} copied.` });
    } catch {
      toast({ status: 'error', duration: 3000, title: 'Copy failed — code shown below.', description: text });
    }
  };

  const shareCode = () => copy(encodeTeam(team), 'Team code');
  const shareLink = () =>
    copy(`${window.location.origin}/team?t=${encodeURIComponent(encodeTeam(team))}`, 'Team link');

  // a loaded code goes into its own slot; if it's already saved, switch there
  const applyCode = () => {
    const dec = decodeTeam(loadCode);
    if (!dec) {
      toast({ status: 'error', duration: 3000, title: 'Invalid team code.' });
      return;
    }
    const code = encodeTeam(dec);
    const existing = slotCodes.indexOf(code);
    setLoadCode('');
    if (existing >= 0) {
      activateSlot(existing, slotCodes);
      toast({ status: 'success', duration: 2000, title: `Already saved — switched to team ${existing + 1}.` });
      return;
    }
    const next = [...slotCodes, code];
    setSlotCodes(next);
    activateSlot(next.length - 1, next);
    toast({ status: 'success', duration: 2000, title: `Team loaded into slot ${next.length}.` });
  };

  const selSlot = selTile != null ? team[selTile] : null;
  const selUnit = useAppSelector((s) => (selSlot ? selectUnitFull(s, selSlot.unitId) : null));

  return (
    <>
      <Head><title>Team Builder — LOMapR</title></Head>
      <VStack align="stretch" spacing={4} py={4}>
        <Flex align="center" gap={3} wrap="wrap">
          <Heading size="lg">Team Builder</Heading>
          <Badge colorScheme="yellow" fontSize="2xs">round-1 simulator included</Badge>
        </Flex>

        <Tabs colorScheme="yellow" variant="enclosed" isLazy>
          <TabList flexWrap="wrap">
            <Tab>Builder</Tab>
            <Tab>Simulate (Round 1)</Tab>
          </TabList>
          <TabPanels>
            <TabPanel px={0}>
              <SimpleGrid columns={[1, 1, 2]} spacing={4} alignItems="start">
                {/* left: map + share */}
                <VStack align="stretch" spacing={4}>
                  <Box borderWidth="1px" borderColor="surface.border" borderRadius="xl" bg="surface.elevated" p={3}>
                    <Flex align="center" gap={2} wrap="wrap">
                      <Text fontSize="xs" color="gray.500" fontWeight="700">Teams</Text>
                      <ButtonGroup isAttached size="xs">
                        {slotCodes.map((_, i) => (
                          <Button key={i} colorScheme="yellow"
                            variant={i === slotIdx ? 'solid' : 'outline'}
                            onClick={() => switchSlot(i)}>
                            {i + 1}
                          </Button>
                        ))}
                      </ButtonGroup>
                      <Button size="xs" variant="outline" colorScheme="teal" onClick={addSlot}>+ New</Button>
                      <Button size="xs" variant="outline" colorScheme="red" onClick={deleteSlot}
                        isDisabled={slotCodes.length <= 1 && !team.some((s) => s)}>
                        Delete
                      </Button>
                    </Flex>
                    <Text fontSize="2xs" color="gray.500" mt={1}>
                      Saved in this browser. Loading a team code adds a new slot.
                    </Text>
                  </Box>

                  <Box borderWidth="1px" borderColor="surface.border" borderRadius="xl" bg="surface.elevated" p={4}>
                    <FormationGrid
                      team={team} units={units} selected={selTile}
                      loadingUnits={unitStatus === 'loading'}
                      highlight={aoe?.tiles ?? null} caster={aoe?.caster ?? null}
                      onTileClick={onTileClick}
                      onUnitMove={moveUnit}
                      onUnitReplace={setPickerTile}
                      onUnitRemove={onRemove}
                    />
                    <Center mt={2} gap={2} flexWrap="wrap">
                      {selSlot ? (
                        <Button size="xs" variant={moveArm ? 'solid' : 'outline'} colorScheme="teal"
                          onClick={() => setMoveArm((v) => !v)}>
                          {moveArm ? 'Click a tile to move/swap…' : 'Move / Swap'}
                        </Button>
                      ) : null}
                      {team.some((s) => s) ? (
                        <Button size="xs" variant="outline" colorScheme="red"
                          onClick={() => { setTeam(EMPTY_TEAM); setSelTile(null); setAoe(null); }}>
                          Clear team
                        </Button>
                      ) : null}
                    </Center>
                    {aoe ? (
                      <Text fontSize="2xs" color="yellow.300" textAlign="center" mt={1}>
                        Highlighted: tiles the clicked skill reaches. Click the skill again to clear.
                      </Text>
                    ) : null}
                  </Box>

                  <Box borderWidth="1px" borderColor="surface.border" borderRadius="xl" bg="surface.elevated" p={4}>
                    <Heading size="xs" mb={2}>Share / Restore</Heading>
                    <HStack spacing={2} mb={2} flexWrap="wrap">
                      <Button size="xs" colorScheme="yellow" variant="outline" onClick={shareCode}
                        isDisabled={!team.some((s) => s)}>Copy team code</Button>
                      <Button size="xs" colorScheme="yellow" variant="outline" onClick={shareLink}
                        isDisabled={!team.some((s) => s)}>Copy link</Button>
                    </HStack>
                    <InputGroup size="sm">
                      <Input placeholder="Paste a team code…" value={loadCode}
                        onChange={(e) => setLoadCode(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') applyCode(); }} />
                      <InputRightElement w="3.6rem">
                        <Button size="xs" colorScheme="yellow" onClick={applyCode}
                          isDisabled={!loadCode.trim()}>Load</Button>
                      </InputRightElement>
                    </InputGroup>
                  </Box>
                </VStack>

                {/* right: selected unit config */}
                <Box>
                  {selSlot && selUnit ? (
                    <UnitConfig
                      key={`${selTile}-${selSlot.unitId}`}
                      tile={selTile!}
                      slot={selSlot}
                      unit={selUnit}
                      team={team}
                      onChange={(patch) => patchSlot(selTile!, patch)}
                      onRemove={() => onRemove(selTile!)}
                      onReplace={() => setPickerTile(selTile!)}
                      onSkillClick={onSkillClick(selTile!)}
                      aoeSkillKey={aoe && aoe.caster === selTile ? aoe.key : null}
                    />
                  ) : selSlot ? (
                    <Center borderWidth="1px" borderColor="red.700" borderRadius="xl"
                      bg="surface.elevated" py={12} px={6} flexDirection="column" gap={3}>
                      <Text color="red.300" fontSize="sm" textAlign="center">
                        {unitStatus === 'loading'
                          ? `Loading ${selSlot.unitId}…`
                          : `${selSlot.unitId} is unavailable on the ${region === 'kr' ? 'KR' : 'Global'} server.`}
                      </Text>
                      {unitStatus !== 'loading' ? (
                        <HStack>
                          <Button size="xs" colorScheme="teal" onClick={() => setPickerTile(selTile!)}>Swap unit</Button>
                          <Button size="xs" colorScheme="red" variant="outline" onClick={() => onRemove(selTile!)}>Remove</Button>
                        </HStack>
                      ) : null}
                    </Center>
                  ) : (
                    <Center borderWidth="1px" borderColor="surface.border" borderRadius="xl"
                      bg="surface.elevated" py={16} px={6}>
                      <Text color="gray.500" fontSize="sm" textAlign="center">
                        Click an empty tile to add a unit, or a filled tile to configure it —
                        level, links, stat points, equipment and skill levels.
                      </Text>
                    </Center>
                  )}
                </Box>
              </SimpleGrid>
            </TabPanel>

            <TabPanel px={0}>
              <SimulatePanel team={team} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>

      <UnitPicker
        isOpen={pickerTile != null}
        onClose={() => setPickerTile(null)}
        units={units}
        usedIds={usedIds}
        onPick={onPick}
      />
    </>
  );
}
