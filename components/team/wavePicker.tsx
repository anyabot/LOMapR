import { useEffect, useMemo, useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  ModalCloseButton, Button, ButtonGroup, Select, HStack, Text, Center, Spinner,
  Box, IconButton, NumberInput, NumberInputField, NumberInputStepper,
  NumberIncrementStepper, NumberDecrementStepper,
} from '@chakra-ui/react';
import { ArrowLeftIcon, ArrowRightIcon } from '@chakra-ui/icons';
import { useAppSelector, useAppDispatch } from '@/hooks';
import {
  selectWorld, selectWorldStatus, selectWorldStageStatus,
  fetchWorldAsync, fetchWorldStageAsync,
} from '@/store/worldSlice';
import { selectSanctum, selectSanctumStatus, fetchSanctumAsync } from '@/store/sanctumSlice';
import { selectIW, selectIWStatus, fetchIWAsync } from '@/store/IWSlice';
import { EnemyIndex, Stage, World } from '@/interfaces/world';
import { WaveRef } from '@/interfaces/team';
import { t } from '@/lib/strings';
import { isEnemyWaveCell } from '@/lib/simInputs';
import { useTranslationVersion } from '@/lib/translationVersion';
import EnemyGrid from '@/components/enemyGrid';

// Pick an enemy wave to simulate, from one of three sources:
//   World — world → stage → wave;  Sanctum — area → floor → difficulty → wave;
//   Infinite War — boss → stage.  The wave's enemy grid is previewed before
// confirming (clicking a previewed enemy opens the global enemy modal).

type Src = WaveRef['src'];

const DIFF_LABEL = ['EASY', 'NORMAL', 'EXTREME'];

function stageList(world: World | undefined): { stage: Stage; zone: string }[] {
  if (!world) return [];
  const out: { stage: Stage; zone: string }[] = [];
  for (const zone of world.zones ?? []) {
    const groups = zone.subzones ?? [zone.stages];
    for (const stages of groups) {
      for (const s of stages ?? []) if (s.waves?.length) out.push({ stage: s, zone: zone.title });
    }
  }
  return out;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initial: WaveRef | null;
  onPick: (sel: WaveRef) => void;
}

export default function WavePicker({ isOpen, onClose, initial, onPick }: Props) {
  useTranslationVersion();
  const dispatch = useAppDispatch();
  const worlds = useAppSelector(selectWorld);
  const worldStatus = useAppSelector(selectWorldStatus);
  const sanctum = useAppSelector(selectSanctum);
  const sanctumStatus = useAppSelector(selectSanctumStatus);
  const iw = useAppSelector(selectIW);
  const iwStatus = useAppSelector(selectIWStatus);

  const [src, setSrc] = useState<Src>('world');
  const [worldId, setWorldId] = useState('');
  const [stageId, setStageId] = useState('');
  const [area, setArea] = useState('');
  const [floorIdx, setFloorIdx] = useState(0);
  const [diff, setDiff] = useState(0);
  const [bossId, setBossId] = useState('');
  const [stageIdx, setStageIdx] = useState(0);
  const [waveIdx, setWaveIdx] = useState(0);
  const worldStageStatus = useAppSelector((s) => selectWorldStageStatus(s, worldId));

  // load the active source's data
  useEffect(() => {
    if (!isOpen) return;
    if (src === 'world') dispatch(fetchWorldAsync());
    else if (src === 'sanctum') dispatch(fetchSanctumAsync());
    else dispatch(fetchIWAsync());
  }, [isOpen, src, dispatch]);
  useEffect(() => {
    if (isOpen && src === 'world' && worldId) dispatch(fetchWorldStageAsync(worldId));
  }, [isOpen, src, worldId, dispatch]);
  // re-anchor on the stored selection whenever the picker opens
  useEffect(() => {
    if (!isOpen) return;
    setSrc(initial?.src ?? 'world');
    setWorldId(initial?.src === 'world' ? initial.world : '');
    setStageId(initial?.src === 'world' ? initial.stage : '');
    setArea(initial?.src === 'sanctum' ? initial.area : '');
    setFloorIdx(initial?.src === 'sanctum' ? initial.floor : 0);
    setDiff(initial?.src === 'sanctum' ? initial.diff : 0);
    setBossId(initial?.src === 'iw' ? initial.boss : '');
    setStageIdx(initial?.src === 'iw' ? initial.stage : 0);
    setWaveIdx(initial?.src === 'world' || initial?.src === 'sanctum' ? initial.wave : 0);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const stages = useMemo(() => stageList(worlds[worldId]), [worlds, worldId]);

  // per-source resolution: wave count + previewed cells + the WaveRef to emit
  const resolved = useMemo<{
    loading: boolean; waveCount: number; cells: (EnemyIndex | null)[] | null; ref: WaveRef | null;
  }>(() => {
    if (src === 'world') {
      const loading = (worldStatus === 'loading' && Object.keys(worlds).length === 0)
        || (!!worldId && worldStageStatus === 'loading');
      const stage = stages.find((s) => s.stage.id === stageId)?.stage ?? null;
      const waveCount = stage?.waves.length ?? 0;
      const wave = Math.min(waveIdx, Math.max(waveCount - 1, 0));
      const cells = stage?.waves[wave]?.enemies ?? null;
      return {
        loading, waveCount, cells,
        ref: stage ? { src: 'world', world: worldId, stage: stage.id, wave } : null,
      };
    }
    if (src === 'sanctum') {
      const loading = sanctumStatus === 'loading' && Object.keys(sanctum).length === 0;
      const variants = sanctum[area]?.[floorIdx];
      const d = Math.min(diff, Math.max((variants?.length ?? 1) - 1, 0));
      const floor = variants?.[d];
      const waveCount = floor?.waves.length ?? 0;
      const wave = Math.min(waveIdx, Math.max(waveCount - 1, 0));
      const cells = floor?.waves[wave]?.[0]?.e ?? null;
      return {
        loading, waveCount, cells,
        ref: floor ? { src: 'sanctum', area, floor: floorIdx, diff: d, wave } : null,
      };
    }
    const loading = iwStatus === 'loading' && iw.seasons.length === 0;
    const bossStages = iw.bosses[bossId];
    const st = Math.min(stageIdx, Math.max((bossStages?.length ?? 1) - 1, 0));
    const stage = bossStages?.[st];
    const cells = stage
      ? stage.monster.group.map((g) => (g ? { id: g, lv: stage.monster.lv } : null))
      : null;
    return {
      loading, waveCount: 0, cells,
      ref: stage ? { src: 'iw', boss: bossId, stage: st } : null,
    };
  }, [src, worlds, worldStatus, worldId, worldStageStatus, stages, stageId, waveIdx,
    sanctum, sanctumStatus, area, floorIdx, diff, iw, iwStatus, bossId, stageIdx]);

  const enemyCount = resolved.cells?.filter(isEnemyWaveCell).length ?? 0;
  const clampedWave = Math.min(waveIdx, Math.max(resolved.waveCount - 1, 0));

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered scrollBehavior="inside" size="2xl">
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(2px)" />
      <ModalContent bg="surface.elevated" color="white" borderWidth="1px"
        borderColor="surface.border" mx={4}>
        <ModalHeader>Pick an enemy wave</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <ButtonGroup isAttached size="xs" mb={3}>
            {([['world', 'World'], ['sanctum', 'Sanctum'], ['iw', 'Infinite War']] as [Src, string][])
              .map(([key, label]) => (
                <Button key={key} colorScheme="yellow" variant={src === key ? 'solid' : 'outline'}
                  onClick={() => { setSrc(key); setWaveIdx(0); }}>
                  {label}
                </Button>
              ))}
          </ButtonGroup>

          {src === 'world' ? (
            <HStack spacing={2} mb={3} flexWrap="wrap">
              <Select size="sm" flex="1" minW="160px" value={worldId}
                placeholder="— world —"
                onChange={(e) => { setWorldId(e.target.value); setStageId(''); setWaveIdx(0); }}>
                {Object.entries(worlds).map(([id, w]) => (
                  <option key={id} value={id}>{t(w.title)}</option>
                ))}
              </Select>
              <Select size="sm" flex="1" minW="160px" value={stageId}
                placeholder={worldStageStatus === 'loading' ? 'loading stages…' : '— stage —'}
                isDisabled={!worldId || worldStageStatus === 'loading'}
                onChange={(e) => { setStageId(e.target.value); setWaveIdx(0); }}>
                {stages.map(({ stage: s, zone }) => (
                  <option key={s.id} value={s.id}>
                    {t(zone)} · {s.title} {t(s.name)}
                  </option>
                ))}
              </Select>
            </HStack>
          ) : src === 'sanctum' ? (
            <HStack spacing={2} mb={3} flexWrap="wrap">
              <Select size="sm" flex="1" minW="120px" value={area} placeholder="— area —"
                onChange={(e) => { setArea(e.target.value); setFloorIdx(0); setDiff(0); setWaveIdx(0); }}>
                {Object.keys(sanctum).map((a) => <option key={a} value={a}>{a}</option>)}
              </Select>
              <Select size="sm" flex="1" minW="120px" value={floorIdx} isDisabled={!area}
                onChange={(e) => { setFloorIdx(parseInt(e.target.value, 10)); setWaveIdx(0); }}>
                {(sanctum[area] ?? []).map((variants, i) => variants?.[0] ? (
                  <option key={i} value={i}>Floor {variants[0].stage}</option>
                ) : null)}
              </Select>
              <ButtonGroup isAttached size="xs">
                {DIFF_LABEL.map((label, d) => (
                  (sanctum[area]?.[floorIdx]?.length ?? 0) > d ? (
                    <Button key={d} colorScheme="teal" variant={diff === d ? 'solid' : 'outline'}
                      onClick={() => { setDiff(d); setWaveIdx(0); }}>
                      {label}
                    </Button>
                  ) : null
                ))}
              </ButtonGroup>
            </HStack>
          ) : (
            <HStack spacing={2} mb={3} flexWrap="wrap">
              <Select size="sm" flex="1" minW="160px" value={bossId} placeholder="— raid boss —"
                onChange={(e) => { setBossId(e.target.value); setStageIdx(0); }}>
                {iw.seasons.filter((s) => iw.bosses[s.key]).map((s) => (
                  <option key={s.key} value={s.key}>{t(s.monster)}</option>
                ))}
              </Select>
              <HStack spacing={1.5}>
                <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">Stage</Text>
                <NumberInput size="sm" w="90px" min={1} max={iw.bosses[bossId]?.length ?? 1}
                  value={stageIdx + 1} isDisabled={!bossId}
                  onChange={(_, n) => setStageIdx(Number.isFinite(n) ? Math.max(n - 1, 0) : 0)}>
                  <NumberInputField borderColor="surface.border" />
                  <NumberInputStepper>
                    <NumberIncrementStepper color="gray.300" borderColor="surface.border" />
                    <NumberDecrementStepper color="gray.300" borderColor="surface.border" />
                  </NumberInputStepper>
                </NumberInput>
                <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">
                  / {iw.bosses[bossId]?.length ?? '—'}
                </Text>
              </HStack>
            </HStack>
          )}

          {resolved.loading ? (
            <Center py={10}><Spinner color="yellow.400" /></Center>
          ) : resolved.cells ? (
            <Box>
              {resolved.waveCount > 1 ? (
                <HStack justify="center" spacing={3} mb={2}>
                  <IconButton aria-label="previous wave" icon={<ArrowLeftIcon />} size="xs"
                    isDisabled={clampedWave === 0}
                    onClick={() => setWaveIdx(Math.max(0, clampedWave - 1))} />
                  <Text fontSize="sm" fontWeight="700">
                    Wave {clampedWave + 1} / {resolved.waveCount}
                  </Text>
                  <IconButton aria-label="next wave" icon={<ArrowRightIcon />} size="xs"
                    isDisabled={clampedWave >= resolved.waveCount - 1}
                    onClick={() => setWaveIdx(Math.min(resolved.waveCount - 1, clampedWave + 1))} />
                </HStack>
              ) : null}
              <Box overflowX="auto">
                <Center minW="max-content"><EnemyGrid wave={resolved.cells} /></Center>
              </Box>
            </Box>
          ) : (
            <Text fontSize="sm" color="gray.500" textAlign="center" py={8}>
              {src === 'world' ? 'Choose a world and a battle stage.'
                : src === 'sanctum' ? 'Choose an area and a floor.'
                : 'Choose a raid boss.'}
            </Text>
          )}
        </ModalBody>
        <ModalFooter gap={2}>
          <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button size="sm" colorScheme="yellow" isDisabled={!resolved.ref || enemyCount === 0}
            onClick={() => { if (resolved.ref) onPick(resolved.ref); }}>
            Use this wave ({enemyCount} {enemyCount === 1 ? 'enemy' : 'enemies'})
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
