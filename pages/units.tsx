import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectUnits, selectUnitStatus, fetchUnitsAsync } from '@/store/unitSlice';
import { useEffect, useState } from 'react';
import { useTranslationVersion } from '@/lib/translationVersion';
import { UnitData } from '@/interfaces/unit';
import {
  VStack, HStack, Center, Text, Heading, Badge, Box, Image, Wrap, WrapItem,
} from '@altterisk/game-hub/ui';
import { useRouter } from 'next/router';
import { ListToolbar, SearchBox, FilterPanel, FilterRow, FilterChip, EmptyState } from '@altterisk/game-hub';
import { rankTag, rankColor, roleRankIcon, typeIcon, roleIcon, bodyIcon, factionIcon, factionKey,
  factionName, filterValueAllowed, unitDisplayName } from '@/lib/rank';
import { chipColor, countActive, fillModes, useListUrl, useUrlText } from '@/lib/listUrl';
import { Seo } from '@/components/seo';

const DESCRIPTION = 'Playable Last Origin units with stats, skills and skins.';

// One table per class type (rows of the page); columns = role; rows = grade.
const TYPES = ['Light', 'Air', 'Heavy'] as const;
const ROLES = ['Attacker', 'Defender', 'Supporter'] as const;
const BODIES = ['Bioroid', 'AGS'] as const;
// No SSS (grade 6) units exist, so the grid stops at SS.
const GRADES = [2, 3, 4, 5] as const;  // B -> SS, top row first is SS below

type TypeKey = (typeof TYPES)[number];
type RoleKey = (typeof ROLES)[number];
type BodyKey = (typeof BODIES)[number];
const FILTER_KEYS = ['type', 'role', 'body', 'grade', 'faction'];

const unitName = unitDisplayName;

export default function Units() {
  useTranslationVersion();
  const units = useAppSelector(selectUnits);
  const status = useAppSelector(selectUnitStatus);
  const dispatch = useAppDispatch();
  const router = useRouter();

  useEffect(() => {
    dispatch(fetchUnitsAsync());
  }, [dispatch]);

  const { list, ready } = useListUrl();
  const [searchTerm, setSearchTerm] = useUrlText(list, ready);
  const types = fillModes(TYPES, list.modes('type'));
  const roles = fillModes(ROLES, list.modes('role'));
  const bodies = fillModes(BODIES, list.modes('body'));
  const grades = fillModes(GRADES, list.modes('grade'));
  const factions = list.modes('faction');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilters = countActive(types, roles, bodies, grades, factions);

  const factionChips = (() => {
    const byKey = new Map<string, { icon: string; names: Map<string, number> }>();
    for (const u of Object.values(units)) {
      if (!u.faction) continue;
      const key = factionKey(u.faction.icon);
      const f = byKey.get(key) ?? { icon: u.faction.icon, names: new Map() };
      const name = factionName(u.faction.name);
      if (name !== u.faction.name && !/^\d+$/.test(name)) f.names.set(name, (f.names.get(name) ?? 0) + 1);
      byKey.set(key, f);
    }
    return Array.from(byKey, ([key, f]) => {
      const best = Array.from(f.names).sort((a, b) => b[1] - a[1])[0];
      return { key, icon: f.icon, label: best ? best[0] : key.replace(/([a-z])([A-Z])/g, '$1 $2') };
    }).sort((a, b) => a.label.localeCompare(b.label));
  })();

  function matches(u: UnitData) {
    if (!filterValueAllowed(u.type as TypeKey, types)) return false;
    if (!filterValueAllowed(u.role as RoleKey, roles)) return false;
    if (!filterValueAllowed(u.body as BodyKey, bodies)) return false;
    if (!filterValueAllowed(u.rarity, grades)) return false;
    if (!filterValueAllowed(u.faction ? factionKey(u.faction.icon) : '', factions)) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!unitName(u).toLowerCase().includes(q) && !(u.id || '').replace(/^Char_[^_]+_/, '').toLowerCase().includes(q)) return false;
    }
    return true;
  }

  if (status === 'failed') {
    return (<><Seo title="Units" description={DESCRIPTION} /><Center py={20}><Text color="red.300">Failed to load units.</Text></Center></>);
  }
  if (Object.keys(units).length === 0) {
    return (<><Seo title="Units" description={DESCRIPTION} /></>);
  }

  const shown = Object.values(units).filter(matches);
  // a filtered-out type/role/grade drops its whole table / column / row
  const activeRoles = ROLES.filter((r) => filterValueAllowed(r, roles));
  const activeGrades = [...GRADES].filter((g) => filterValueAllowed(g, grades)).reverse();  // SS at top

  // cell lookup: type -> role -> grade -> units (name-sorted)
  function cell(type: TypeKey, role: RoleKey, grade: number) {
    return shown
      .filter((u) => u.type === type && u.role === role && u.rarity === grade)
      .sort((a, b) => unitName(a).localeCompare(unitName(b)));
  }

  return (
    <>
      <Seo title="Units" description={DESCRIPTION} />
      <VStack align="stretch" spacing={4} py={4}>
        <Heading size="xl">Units</Heading>

        <Box>
          <ListToolbar
            search={<SearchBox value={searchTerm} onChange={setSearchTerm} placeholder="Search name or code" />}
            count={`${shown.length} units`}
            activeFilters={activeFilters + (searchTerm ? 1 : 0)}
            onClearFilters={() => { setSearchTerm(''); list.clear(FILTER_KEYS); }}
          />
          <FilterPanel open={filtersOpen} onToggle={() => setFiltersOpen((o) => !o)} activeCount={activeFilters}>
            <FilterRow label="Type">
              {TYPES.map((ty) => (
                <FilterChip key={ty} mode={types[ty]} color={chipColor('green')} onClick={() => list.cycleMode('type', ty)}>
                  {typeIcon(ty) ? <Image src={typeIcon(ty)!} alt="" boxSize="16px" /> : null}{ty}
                </FilterChip>
              ))}
            </FilterRow>
            <FilterRow label="Role">
              {ROLES.map((r) => (
                <FilterChip key={r} mode={roles[r]} color={chipColor('red')} onClick={() => list.cycleMode('role', r)}>
                  {roleIcon(r) ? <Image src={roleIcon(r)!} alt="" boxSize="16px" /> : null}{r}
                </FilterChip>
              ))}
            </FilterRow>
            <FilterRow label="Body">
              {BODIES.map((b) => (
                <FilterChip key={b} mode={bodies[b]} color={chipColor('teal')} onClick={() => list.cycleMode('body', b)}>
                  {bodyIcon(b) ? <Image src={bodyIcon(b)!} alt="" boxSize="16px" /> : null}{b}
                </FilterChip>
              ))}
            </FilterRow>
            <FilterRow label="Grade">
              {GRADES.map((g) => (
                <FilterChip key={g} mode={grades[g]} color={rankColor(g)} onClick={() => list.cycleMode('grade', String(g))}>
                  {rankTag(g)}
                </FilterChip>
              ))}
            </FilterRow>
            <FilterRow label="Faction">
              {factionChips.map((f) => (
                <FilterChip key={f.key} mode={factions[f.key] ?? 0} color={chipColor('blue')}
                  onClick={() => list.cycleMode('faction', f.key)}>
                  {factionIcon(f.icon) ? <Image src={factionIcon(f.icon)!} alt="" boxSize="16px" /> : null}{f.label}
                </FilterChip>
              ))}
            </FilterRow>
          </FilterPanel>
        </Box>

        {shown.length === 0 ? (
          <EmptyState title="No units match the current filters." />
        ) : (
          // one table per active class type; columns = active roles, rows = active grades.
          TYPES.filter((ty) => filterValueAllowed(ty, types)).map((type) => (
            <Box key={type} borderWidth="1px" borderColor="surface.border" borderRadius="xl"
              overflow="hidden" bg="surface.elevated">
              <Box px={4} py={2} bg="blackAlpha.300" borderBottomWidth="1px" borderBottomColor="surface.border">
                <HStack spacing={2}>
                  {typeIcon(type) ? <Image src={typeIcon(type)!} alt={type} boxSize="20px" /> : null}
                  <Heading size="sm" color="green.200">{type}</Heading>
                </HStack>
              </Box>
              <Box overflowX="auto">
                <Box as="table" w="100%" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <Box as="thead">
                    <Box as="tr">
                      <Box as="th" w="44px" />
                      {activeRoles.map((role) => (
                        <Box as="th" key={role} px={2} py={1.5}
                          borderBottomWidth="1px" borderColor="surface.border"
                          fontSize="xs" color="red.200" textTransform="uppercase" letterSpacing="wide">
                          <HStack spacing={1.5} justify="center">
                            {roleIcon(role) ? <Image src={roleIcon(role)!} alt={role} boxSize="16px" /> : null}
                            <span>{role}</span>
                          </HStack>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  <Box as="tbody">
                    {activeGrades.map((grade) => (
                      <Box as="tr" key={grade}>
                        <Box as="th" px={2} py={2} textAlign="center" verticalAlign="middle"
                          borderTopWidth="1px" borderColor="surface.border">
                          <Badge fontSize="sm" bg={rankColor(grade)} color="blackAlpha.800">{rankTag(grade)}</Badge>
                        </Box>
                        {activeRoles.map((role) => (
                          <Box as="td" key={role} px={2} py={2} verticalAlign="top"
                            borderTopWidth="1px" borderLeftWidth="1px" borderColor="surface.border">
                            <Wrap spacing={2} justify="center">
                              {cell(type, role, grade).map((u) => (
                                <WrapItem key={u.id}>
                                  <UnitTile unit={u} onClick={() => router.push(`/units/detail?id=${encodeURIComponent(u.id)}`)} />
                                </WrapItem>
                              ))}
                            </Wrap>
                          </Box>
                        ))}
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            </Box>
          ))
        )}
      </VStack>
    </>
  );
}

// Compact unit cell: formation portrait + name, links to the detail page.
function UnitTile({ unit, onClick }: { unit: UnitData; onClick: () => void }) {
  return (
    <Box onClick={onClick} cursor="pointer" w="88px" role="group" textAlign="center">
      <Box position="relative" boxSize="88px" borderRadius="lg" overflow="hidden" bg="blackAlpha.500"
        borderWidth="1px" borderColor="surface.border"
        transition="border-color .12s ease, transform .12s ease"
        _groupHover={{ borderColor: 'accent.400', transform: 'translateY(-2px)' }}>
        {unit.icon ? (
          <Image src={`/images/icons/${unit.icon}.png`} alt={unit.icon} objectFit="cover" w="100%" h="100%"
            _groupHover={{ transform: 'scale(1.05)' }} transition="transform .2s ease" />
        ) : null}
        {/* official role+rank badge, bottom-left corner */}
        {roleRankIcon(unit.role, unit.rarity) ? (
          <Image position="absolute" bottom="1px" left="1px" h="26px" objectFit="contain"
            src={`/images/icons/${roleRankIcon(unit.role, unit.rarity)}.png`}
            alt={`${rankTag(unit.rarity)} ${unit.role}`}
            filter="drop-shadow(0 1px 1px rgba(0,0,0,.8))" />
        ) : null}
      </Box>
      <Text fontSize="xs" color="gray.300" noOfLines={2} mt={1} lineHeight="1.15">
        {unitName(unit)}
      </Text>
    </Box>
  );
}
