import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Center, HStack, Image, Spinner, Text, Tooltip, VStack } from '@chakra-ui/react';
import { loadSkinArchive, revokeSkinUrls, readText, loadTexture, urlFor } from '../lib/skinArchive';
import {
  IconBtn, FaceSelect, SaveButton, ReloadButton, PlayPauseButton, ZonesButton, variantMeta, VariantStrip,
  LayersButton, LayerPanel,
} from './skinViewer/chrome';
import type { SpriteInfo, SkinNode, FixedFace, Layout } from './skinViewer/types';
import {
  baseSkinKey, layoutHasVariant, zAngle, attachPanZoom,
  mappedSourcePixelScale, meshSourcePixelScale,
} from './skinViewer/types';

// Used when a skinned Pixi archive has not been published yet.
const UNITY_VIEWER_BASE = (
  typeof process !== 'undefined'
    ? process.env.NEXT_PUBLIC_UNITY_VIEWER_URL ?? '/unity-viewer/'
    : '/unity-viewer/'
).replace(/\/$/, '');

function UnityViewer({ skin, height, parts, hasRplus, hasKr, hasBg, hasDam, showDam, onToggleDam }: {
  skin: string; height: string | number; parts: string[]; hasRplus?: boolean; hasKr?: boolean; hasBg?: boolean;
  hasDam?: boolean; showDam?: boolean; onToggleDam?: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [faceList, setFaceList] = useState<string[]>([]);
  const [hasParts, setHasParts] = useState(false);
  const [face, setFace] = useState('');
  const [showParts, setShowParts] = useState(true);
  const [showBg, setShowBg] = useState(true);
  const [showZones, setShowZones] = useState(false);
  const [variant, setVariant] = useState<string>('base');
  const [availableVariants, setAvailableVariants] = useState<string[]>([]);
  const [playing, setPlaying] = useState(true);
  const [saving, setSaving] = useState(false);
  // bumping this remounts the iframe, reloading the model from scratch (reset).
  const [resetKey, setResetKey] = useState(0);

  // base skin name without region suffix
  const baseSkin = skin.replace(/__kr$/, '');

  const send = (msg: object) => {
    iframeRef.current?.contentWindow?.postMessage(msg, '*');
  };

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return;
      switch (e.data.type) {
        case 'facelist':
          setFaceList(e.data.data ?? []);
          setFace(''); // default: no face applied (its own option)
          break;
        case 'part': setHasParts(!!e.data.data); break;
        case 'variants': setAvailableVariants(e.data.data ?? []); break;
        case 'screenshot': {
          setSaving(false);
          const b64 = e.data.data as string;
          if (!b64) return; // capture failed Unity-side
          const a = document.createElement('a');
          a.href = `data:image/png;base64,${b64}`;
          a.download = `${skin}.png`;
          a.click();
          break;
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [skin]);

  // A remounted iframe (skin change or reset) starts fresh: reset per-model UI
  // state so it matches the new instance. `playing` is deliberately preserved —
  // a reload while paused stays paused (the pause postMessage effect re-sends the
  // current state to the new iframe). Matches the spine viewer's reload behavior.
  useEffect(() => {
    setFaceList([]); setHasParts(false); setAvailableVariants([]);
    setFace(''); setShowParts(true); setShowBg(true); setShowZones(false); setVariant('base');
  }, [skin, resetKey]);

  useEffect(() => { send({ type: 'bg', active: showBg }); }, [skin, showBg]);
  useEffect(() => { send({ type: 'face', face }); }, [face]);
  useEffect(() => { send({ type: 'part', active: showParts }); }, [showParts]);
  useEffect(() => { send({ type: 'collider', active: showZones }); }, [showZones]);
  // re-send on skin/reset too so a remounted iframe inherits the pause state.
  useEffect(() => { send({ type: 'pause', active: !playing }); }, [skin, resetKey, playing]);
  useEffect(() => {
    send({ type: 'variant', variant: variant === 'base' ? '' : variant });
  }, [variant]);

  // Ask Unity to render + crop the current model; the PNG comes back via the
  // 'screenshot' message above and downloads there. Guard against double-clicks.
  const handleSave = () => {
    if (saving) return;
    setSaving(true);
    send({ type: 'screenshot' });
    // Safety: clear the spinner if Unity never answers (e.g. old build).
    setTimeout(() => setSaving(false), 8000);
  };

  // key forces a full iframe remount on reset so the Unity model reloads.
  const iframeSrc = `${UNITY_VIEWER_BASE}/index.html?model=${encodeURIComponent(baseSkin)}`;

  return (
    <Box>
      <Box h={height} bg="gray.800" borderRadius="md" overflow="hidden" position="relative"
        border="1px solid" borderColor="whiteAlpha.200">
        <Box
          as="iframe"
          key={resetKey}
          ref={iframeRef}
          src={iframeSrc}
          position="absolute" inset={0} w="100%" h="100%"
          border="none"
          allow="autoplay"
          sx={{ colorScheme: 'none' }}
        />

        {/* Top-right: play/pause + zones + reload + save */}
        <VStack position="absolute" top={2} right={2} spacing={1} align="flex-end"
          bg="blackAlpha.500" borderRadius="md" px={1} py={1}>
          <PlayPauseButton playing={playing} onToggle={() => setPlaying((v) => !v)} />
          <ZonesButton shown={showZones} onToggle={() => setShowZones((v) => !v)} />
          <ReloadButton onClick={() => setResetKey((k) => k + 1)} />
          <SaveButton onClick={handleSave} saving={saving} />
        </VStack>

        {/* Bottom-left: PARTS_META info icons */}
        {parts.length > 0 && (
          <HStack position="absolute" bottom={2} left={2} spacing={1} pointerEvents="none"
            bg="blackAlpha.500" borderRadius="md" px={1} py={1}>
            {parts.map((p) => {
              const meta = PARTS_META[p];
              if (!meta) return null;
              return (
                <Tooltip key={p} label={meta.label} fontSize="xs" hasArrow placement="top">
                  <Image src={meta.icon} alt={meta.label} boxSize="32px" pointerEvents="auto" />
                </Tooltip>
              );
            })}
          </HStack>
        )}

        {/* Top-left: face selector */}
        {faceList.length > 0 && (
          <FaceSelect value={face} onChange={setFace}
            options={[{ value: '', label: '(none)' },
              ...faceList.map((f) => ({ value: f, label: f.replace(/^face\/.*_/, '') }))]} />
        )}

        {/* Bottom-right: props/bg group + variant radio group + dam toggle */}
        <HStack position="absolute" bottom={2} right={2} spacing={1} align="flex-end">
          {/* Variant radio: base / kr / sfw / kr_sfw / rplus */}
          <VariantStrip active={variant} onSelect={setVariant}
            variants={(['base', ...availableVariants]).map((v) => {
              const meta = variantMeta(v, availableVariants.includes('kr'));
              return { key: v, icon: meta.icon, label: meta.label };
            })} />
          {/* Props/bg/dam group */}
          {(hasParts || hasBg || hasDam) && (
            <VStack bg="blackAlpha.500" borderRadius="md" px={1} py={1} spacing={1}>
              {hasParts && (
                <IconBtn src="/images/shop/UI_SkinProp_Parts_N.png" alt="Parts"
                  label={showParts ? 'Hide parts' : 'Show parts'} active={showParts}
                  onClick={() => setShowParts((v) => !v)} />
              )}
              {hasBg && (
                <IconBtn src="/images/UI_Lobby_Icon_Props_1.png" alt="BG"
                  label={showBg ? 'Hide BG' : 'Show BG'} active={showBg}
                  onClick={() => setShowBg((v) => !v)} />
              )}
              {hasDam && onToggleDam && (
                <IconBtn src="/images/shop/UI_Icon_ClothBroken.png" alt="Damaged"
                  label={showDam ? 'Damaged — click for normal' : 'Normal — click for damaged'} active={!!showDam}
                  onClick={onToggleDam} />
              )}
            </VStack>
          )}
        </HStack>
      </Box>

      {/* Credit below canvas (controls are in the top-right overlay group) */}
      <HStack mt={2} spacing={3} px={1} justify="flex-end">
        <Text fontSize="xs" color="whiteAlpha.400">
          Viewer by{' '}
          <Box as="a" href="https://lo.swaytwig.com" target="_blank" rel="noopener noreferrer"
            color="whiteAlpha.500" textDecoration="underline" _hover={{ color: 'whiteAlpha.700' }}>
            Wolfgang
          </Box>
        </Text>
      </HStack>
    </Box>
  );
}

// height defaults to a tall fill (standalone page usage); pass a smaller fixed
// height for compact embeds (e.g. the unit-detail Skin tab).
const PARTS_META: Record<string, { icon: string; label: string }> = {
  LOBBY_ANIMATION:        { icon: '/images/shop/UI_ShopL2DIcon.png',        label: 'Live 2D lobby animation' },
  VOICE:                  { icon: '/images/shop/UI_ShopVoiceIcon.png',       label: 'Voice' },
  SD_EFFECT:              { icon: '/images/shop/UI_ShopFxIcon.png',          label: 'SD battle effects' },
  SD_ANIMATION:           { icon: '/images/shop/UI_ShopSDAnimIcon.png',      label: 'SD battle animation' },
  PROPS:                  { icon: '/images/shop/UI_ShopObjectIcon.png',      label: 'Props / objects' },
  DAMAGE_IMAGE:           { icon: '/images/shop/UI_ShopDamagedIcon.png',     label: 'Damaged skin image' },
  DAMAGE_LOBBY_ANIMATION: { icon: '/images/shop/UI_ShopDamagedL2DIcon.png', label: 'Damaged Live 2D animation' },
};

type SkinViewerProps = {
  skin: string; height?: string | number; parts?: string[];
  hasDam?: boolean; showDam?: boolean; onToggleDam?: () => void;
  unavailable?: string; viewerKind?: string; hasRplus?: boolean; hasBg?: boolean;
  hasKr?: boolean; viewRegion?: 'global' | 'kr'; onToggleRegion?: () => void;
};

function SkinnedPixiViewer(props: SkinViewerProps) {
  const { skin, height = '70vh', parts = [], hasDam, showDam, onToggleDam } = props;
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<any>(null);
  const viewRef = useRef<import('./skinViewer/skinnedPixi').SkinnedView | null>(null);
  const [doc, setDoc] = useState<import('./skinViewer/skinnedRig').SkinnedDoc | null>(null);
  const [baseDoc, setBaseDoc] = useState<import('./skinViewer/skinnedRig').SkinnedDoc | null>(null);
  const [loadState, setLoadState] = useState<'fetching' | 'unpacking' | 'ready' | 'fallback'>('fetching');
  const [resetKey, setResetKey] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [zones, setZones] = useState(false);
  const [variant, setVariant] = useState('base');
  const [face, setFace] = useState('');
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const archiveSuffix = baseDoc?.variants?.[variant]?.archive ?? '';
  const archiveSkin = `${skin}${archiveSuffix}`;
  const fullVariant = archiveSuffix !== '';
  const variantRef = useRef(variant);
  const fullVariantRef = useRef(fullVariant);
  variantRef.current = variant;
  fullVariantRef.current = fullVariant;

  useEffect(() => {
    let destroyed = false;
    let app: any = null;
    let detachPanZoom = () => {};
    setLoadState('fetching');
    setFace('');
    (async () => {
      const filesPromise = loadSkinArchive(archiveSkin);
      setLoadState('unpacking');
      const [files, PIXI, module] = await Promise.all([
        filesPromise,
        import('pixi.js'),
        import('./skinViewer/skinnedPixi'),
      ]);
      const manifest = JSON.parse(await readText(files, 'skinned.json')) as import('./skinViewer/skinnedRig').SkinnedDoc;
      const textures: Record<string, any> = {};
      await Promise.all(manifest.textures.map(async (name) => {
        const filename = `${name}.png`;
        if (files.has(filename)) textures[name] = await loadTexture(PIXI, archiveSkin, files, filename);
      }));
      if (destroyed || !hostRef.current) return;

      app = new PIXI.Application();
      await app.init({ backgroundAlpha: 0, antialias: true, resizeTo: hostRef.current });
      if (destroyed) { app.destroy(true); return; }
      appRef.current = app;
      hostRef.current.replaceChildren(app.canvas);

      const view = module.mountSkinnedRig(manifest, textures, 1);
      viewRef.current = view;
      app.stage.addChild(view.container);
      const initialToggles = Object.fromEntries((manifest.toggles ?? []).map((toggle) =>
        [toggle.key, toggle.default]));
      setToggles(initialToggles);
      setDoc(manifest);
      if (archiveSkin === skin) setBaseDoc(manifest);
      view.setVariant(fullVariantRef.current ? 'base' : variantRef.current);

      const fit = () => {
        const bounds = view.container.getLocalBounds();
        if (!bounds.width || !bounds.height) return;
        const padding = 40;
        const scale = Math.min(
          (app.screen.width - padding) / bounds.width,
          (app.screen.height - padding) / bounds.height,
        );
        view.container.scale.set(scale);
        view.container.position.set(
          app.screen.width / 2 - (bounds.x + bounds.width / 2) * scale,
          app.screen.height / 2 - (bounds.y + bounds.height / 2) * scale,
        );
      };
      fit();
      app.renderer.on('resize', fit);
      detachPanZoom = attachPanZoom(app.canvas as HTMLCanvasElement, view.container);
      app.ticker.add((ticker: any) => {
        if (playingRef.current) view.update(Math.min(ticker.deltaMS / 1000, 1 / 20));
      });
      setLoadState('ready');
    })().catch(() => {
      if (!destroyed) setLoadState('fallback');
    });
    return () => {
      destroyed = true;
      detachPanZoom();
      viewRef.current?.destroy();
      viewRef.current = null;
      appRef.current = null;
      if (app) app.destroy(true);
      revokeSkinUrls(archiveSkin);
    };
  }, [skin, resetKey, archiveSkin]);

  useEffect(() => { viewRef.current?.setZones(zones); }, [zones]);
  useEffect(() => { viewRef.current?.setVariant(fullVariant ? 'base' : variant); }, [variant, fullVariant]);
  useEffect(() => { viewRef.current?.setFace(face); }, [face]);
  useEffect(() => {
    for (const [key, value] of Object.entries(toggles)) viewRef.current?.setToggle(key, value);
  }, [toggles]);

  if (loadState === 'fallback') {
    return <UnityViewer skin={skin} height={height} parts={parts}
      hasRplus={props.hasRplus} hasKr={props.hasKr} hasBg={props.hasBg}
      hasDam={hasDam} showDam={showDam} onToggleDam={onToggleDam} />;
  }

  const variants = ['base', ...Object.keys(baseDoc?.variants ?? doc?.variants ?? {})];
  const hasPartsToggle = (doc?.toggles ?? []).some((toggle) => toggle.key === 'parts');
  const hasBgToggle = (doc?.toggles ?? []).some((toggle) => toggle.key === 'bg');
  const handleSave = () => {
    const app = appRef.current, view = viewRef.current;
    if (!app || !view) return;
    view.setZones(false);
    const canvas = app.renderer.extract.canvas({ target: view.container, resolution: 2 }) as HTMLCanvasElement;
    view.setZones(zones);
    const anchor = document.createElement('a');
    anchor.href = canvas.toDataURL('image/png');
    anchor.download = `${skin}.png`;
    anchor.click();
  };

  return (
    <Box>
      <Box h={height} bg="gray.800" borderRadius="md" overflow="hidden" position="relative"
        border="1px solid" borderColor="whiteAlpha.200">
        <Box ref={hostRef} position="absolute" inset={0} opacity={loadState === 'ready' ? 1 : 0} />
        {loadState !== 'ready' && (
          <Center position="absolute" inset={0} color="gray.500" pointerEvents="none"
            flexDirection="column" gap={2}>
            <Spinner />
            <Text fontSize="sm">{loadState === 'unpacking' ? 'unpacking…' : 'fetching…'}</Text>
          </Center>
        )}

        {doc && doc.faces && doc.faces.length > 0 && (
          <FaceSelect value={face} onChange={setFace}
            options={[{ value: '', label: '(none)' },
              ...doc.faces.map((item) => ({ value: item.key, label: item.key }))]} />
        )}

        <VStack position="absolute" top={2} right={2} spacing={1} align="flex-end"
          bg="blackAlpha.500" borderRadius="md" px={1} py={1}>
          <PlayPauseButton playing={playing} onToggle={() => setPlaying((value) => !value)} />
          {(doc?.colliders?.length ?? 0) > 0 && (
            <ZonesButton shown={zones} onToggle={() => setZones((value) => !value)} />
          )}
          <ReloadButton onClick={() => { setVariant('base'); setResetKey((value) => value + 1); }} />
          <SaveButton onClick={handleSave} />
        </VStack>

        {parts.length > 0 && (
          <HStack position="absolute" bottom={2} left={2} spacing={1} pointerEvents="none"
            bg="blackAlpha.500" borderRadius="md" px={1} py={1}>
            {parts.map((part) => {
              const meta = PARTS_META[part];
              return meta ? (
                <Tooltip key={part} label={meta.label} fontSize="xs" hasArrow placement="top">
                  <Image src={meta.icon} alt={meta.label} boxSize="32px" pointerEvents="auto" />
                </Tooltip>
              ) : null;
            })}
          </HStack>
        )}

        <HStack position="absolute" bottom={2} right={2} spacing={1} align="flex-end">
          {variants.length > 1 && (
            <VariantStrip active={variant} onSelect={setVariant}
              variants={variants.map((key) => ({ key, ...variantMeta(key, variants.includes('kr')) }))} />
          )}
          {(hasPartsToggle || hasBgToggle || hasDam) && (
            <VStack bg="blackAlpha.500" borderRadius="md" px={1} py={1} spacing={1}>
              {hasPartsToggle && (
                <IconBtn src="/images/shop/UI_SkinProp_Parts_N.png" alt="Parts"
                  label={toggles.parts ? 'Hide parts' : 'Show parts'} active={toggles.parts ?? true}
                  onClick={() => setToggles((value) => ({ ...value, parts: !(value.parts ?? true) }))} />
              )}
              {hasBgToggle && (
                <IconBtn src="/images/UI_Lobby_Icon_Props_1.png" alt="BG"
                  label={toggles.bg ? 'Hide BG' : 'Show BG'} active={toggles.bg ?? true}
                  onClick={() => setToggles((value) => ({ ...value, bg: !(value.bg ?? true) }))} />
              )}
              {hasDam && onToggleDam && (
                <IconBtn src="/images/shop/UI_Icon_ClothBroken.png" alt="Damaged"
                  label={showDam ? 'Damaged — click for normal' : 'Normal — click for damaged'} active={!!showDam}
                  onClick={onToggleDam} />
              )}
            </VStack>
          )}
        </HStack>
      </Box>
    </Box>
  );
}

export default function SkinViewer(props: SkinViewerProps) {
  if (props.viewerKind === 'skinned') {
    return <SkinnedPixiViewer {...props} />;
  }
  return <PixiSkinViewer {...props} />;
}

function PixiSkinViewer({ skin, height = '70vh', parts = [], hasDam = false, showDam = false, onToggleDam, unavailable, viewerKind, hasRplus, hasBg, hasKr, viewRegion, onToggleRegion }: SkinViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<any>(null);
  const rootRef = useRef<any>(null);
  const pixiRef = useRef<any>(null);
  const u2pxRef = useRef<number>(1);
  const [variant, setVariant] = useState<'base' | 'kr' | 'sfw' | 'rplus'>('base');
  const [error, setError] = useState<string | null>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [spineAnim, setSpineAnim] = useState<string>('');
  const [spineFace, setSpineFace] = useState<string>('');
  const [fixedFace, setFixedFace] = useState<string>(''); // '' = no face (default)
  const [spineParts, setSpineParts] = useState<Record<string, boolean>>({});
  const [spineBreast, setSpineBreast] = useState<string[]>([]);
  const [spineAvailableSkins, setSpineAvailableSkins] = useState<Set<string> | null>(null);
  // Spine layer editor: every slot the current composition can draw (skeleton
  // draw order, back to front) and the subset the user has switched off.
  const [spineSlots, setSpineSlots] = useState<string[]>([]);
  const [hiddenSlots, setHiddenSlots] = useState<string[]>([]);
  const [showLayers, setShowLayers] = useState(false);
  const showBg = toggles['bg'] ?? true;
  const [showZones, setShowZones] = useState(false);
  const zoneOverlayRef = useRef<any>(null);

  const [playing, setPlaying] = useState(true);
  const [loadState, setLoadState] = useState<'fetching' | 'unpacking' | 'ready' | 'error'>('fetching');
  const [resetKey, setResetKey] = useState(0);
  const filesRef = useRef<Map<string, Blob> | null>(null);

  useEffect(() => {
    if (unavailable && !showDam) return; // unsupported variant — don't fetch
    let cancelled = false;
    setError(null);
    setLayout(null);
    filesRef.current = null;
    setLoadState('fetching');
    (async () => {
      const files = await loadSkinArchive(skin);
      if (cancelled) throw new Error('cancelled');
      setLoadState('unpacking');
      filesRef.current = files;
      for (const file of ['spine.json', 'layout.json']) {
        if (files.has(file)) return JSON.parse(await readText(files, file)) as Layout;
      }
      throw new Error('no spine/layout json in archive');
    })()
      .then((l: Layout) => {
        if (cancelled) return;
        setLayout(l);
        setLoadState('ready');
        setVariant('base');
        setToggles(Object.fromEntries((l.toggles ?? []).map((t) => [t.key, t.default])));
        setSpineSlots([]); setHiddenSlots([]); setShowLayers(false);
        setFixedFace(''); // fixed faces default to none
        if (l.kind === 'spine') {
          setSpineAnim((l.animations ?? []).includes('Idle_1') ? 'Idle_1' : (l.animations?.[0] ?? ''));
          setSpineFace(l.skinGroups?.defaultFace ?? '');
          const parts = l.skinGroups?.parts ?? [];
          setSpineParts(Object.fromEntries(parts.filter((p) => !p.startsWith('breast/')).map((p) => [p, p === 'default' || p.startsWith('decorations/')])));
          const breastOptions = parts.filter((p) => p.startsWith('breast/'));
          const defaultBreast = breastOptions.find((p) => p === 'breast/Unedited') ?? breastOptions[0] ?? '';
          setSpineBreast(defaultBreast ? [defaultBreast] : []);
          setSpineAvailableSkins(null);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setError(String(e));
        setLoadState('error');
      });
    return () => {
      cancelled = true;
      revokeSkinUrls(skin);
    };
  }, [skin, resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const nodesByIdRef = useRef<Record<string, any>>({});
  // mirror of `playing` so the async spine build can apply the current pause
  // state to a freshly built spine (e.g. after a reload while paused) — the
  // [playing]-only pause effect won't re-fire when only resetKey changed.
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const fixedFaceRef = useRef<string>('');
  fixedFaceRef.current = fixedFace;
  const setFixedFaceRef = useRef<((key: string | null) => void) | null>(null);
  // fixed-kind leaf meshes, flattened out of the transform tree for global
  // draw-order sorting (see the comment above `flatMeshes` in the build
  // effect) — toggle visibility must therefore drive mesh.renderable
  // directly instead of the (now-empty) anchor container's `visible`.
  const flatMeshesRef = useRef<{ mesh: any; wrapper: any; order: number; chain: string[]; sprite: SpriteInfo }[]>([]);
  const texturesRef = useRef<Record<string, any>>({});
  const togglesRef = useRef<Record<string, boolean>>({});
  togglesRef.current = toggles;
  useEffect(() => {
    if (!layout || layout.kind === 'spine' || layout.skin !== baseSkinKey(skin)) return;
    let destroyed = false;
    let app: any = null;
    let appReady = false;

    (async () => {
      const PIXI = await import('pixi.js');
      pixiRef.current = PIXI;
      const files = filesRef.current;
      if (!files) return;

      const texNames = new Set<string>();
      const collect = (n: SkinNode) => {
        if (n.sprite) {
          texNames.add(n.sprite.tex);
          if (n.sprite.rplus) texNames.add(n.sprite.rplus.tex);
          if (n.sprite.kr) texNames.add(n.sprite.kr.tex);
          if (n.sprite.sfw) texNames.add(n.sprite.sfw.tex);
        }
        n.children.forEach(collect);
      };
      (layout.nodes ?? []).forEach(collect);
      (layout.faces ?? []).forEach((f) => texNames.add(f.tex));

      const textures: Record<string, any> = {};
      await Promise.all(
        Array.from(texNames).map(async (tex) => {
          textures[tex] = await loadTexture(PIXI, skin, files, tex);
        }),
      );
      texturesRef.current = textures;
      if (destroyed) return;

      app = new PIXI.Application();
      await app.init({ backgroundAlpha: 0, antialias: true, resizeTo: hostRef.current! });
      appReady = true;
      if (destroyed) {
        app.destroy(true);
        return;
      }
      appRef.current = app;
      hostRef.current!.replaceChildren(app.canvas);

      const ppu = layout.ppu || 100;
      const byId: Record<string, any> = {};
      // Unity's SortingOrder is compared scene-wide across every sprite, not
      // just among direct siblings — PixiJS zIndex only sorts within one
      // parent's children, so two sprites at different nesting depths (e.g.
      // "BG/Part1" vs "Parts/Part1") can never be ordered correctly via
      // container nesting alone. Build the transform tree as normal (so
      // position/scale/rotation compose, and toggle visibility still works
      // via each node's own container), but draw every leaf mesh through a
      // flat, globally-sorted layer instead of leaving it parented in place.
      // Each flat entry carries: the mesh itself (with flipX/Y already on it),
      // the wrapper container that will be added to root (holding the composed
      // world matrix so the mesh renders in the right place/scale/rotation),
      // the sort order, and the ancestor chain for visibility recompute.
      const flatMeshes: { mesh: any; wrapper: any; order: number; chain: string[]; sprite: SpriteInfo; pixelScale: number; isBody: boolean }[] = [];
      // Captured during build: the empty face node's world matrix + ancestor chain,
      // so we can overlay the chosen face-expression mesh at that exact spot.
      let faceAnchorMat: any = null;
      let faceAnchorChain: string[] = [];
      let faceAnchorOrder = 0;

      // Build a container tree for visibility/toggle tracking, and compute each
      // node's world matrix explicitly (parentMat × nodeLocalMat) so we don't
      // depend on PixiJS's lazy worldTransform (only valid after a render pass).
      const build = (n: SkinNode, ancestorChain: string[], parentMat: any): any => {
        const node = new PIXI.Container();
        node.label = n.name;
        node.position.set(n.pos[0] * ppu, -n.pos[1] * ppu);
        node.scale.set(n.scale[0], n.scale[1]);
        node.rotation = -zAngle(n.rot);
        node.visible = n.active;
        byId[n.id] = node;
        const chain = [...ancestorChain, n.id];

        // Compose this node's local matrix with the parent's world matrix.
        node.updateLocalTransform();
        const worldMat = parentMat.clone().append(node.localTransform);

        if (n.sprite) {
          const mesh = new PIXI.MeshSimple({
            texture: textures[n.sprite.tex],
            vertices: new Float32Array(n.sprite.verts),
            uvs: new Float32Array(n.sprite.uvs),
            indices: new Uint32Array(n.sprite.indices),
          });
          if (n.sprite.flipX) mesh.scale.x = -1;
          if (n.sprite.flipY) mesh.scale.y = -1;
          if (n.sprite.color) {
            const [r, g, b, a] = n.sprite.color;
            console.log('[color]', n.name, n.sprite.color);
            mesh.tint = (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
            mesh.alpha = a;
          }
          if (n.sprite.shader === 'multiply') { mesh.blendMode = 'multiply'; console.log('[shader]', n.name, 'multiply'); }
          else if (n.sprite.shader === 'add') { mesh.blendMode = 'add'; console.log('[shader]', n.name, 'add'); }
          else if (n.sprite.shader === 'screen') { mesh.blendMode = 'screen'; console.log('[shader]', n.name, 'screen'); }
          else if (n.sprite.shader === 'mask') { console.log('[shader]', n.name, 'mask (unhandled)'); }
          // 'mask' (Smile_Mark stencil) — no PixiJS equivalent; rendered normally
          // Wrapper placed under root; its local matrix = the node's world
          // matrix so the mesh (a child of wrapper) renders at the right
          // world-space position/scale/rotation. The mesh keeps its own flip
          // since setFromMatrix on the wrapper (not the mesh) is never called.
          const wrapper = new PIXI.Container();
          wrapper.setFromMatrix(worldMat);
          wrapper.addChild(mesh);
          const source = textures[n.sprite.tex]?.source;
          const pixelScale = source
            ? meshSourcePixelScale(n.sprite, source.width, source.height, worldMat)
            : 0;
          flatMeshes.push({
            mesh, wrapper, order: n.sprite.order, chain, sprite: n.sprite, pixelScale,
            isBody: n.name.toLowerCase() === 'body',
          });
        }
        if (n.faceAnchor) {
          faceAnchorMat = worldMat.clone();
          faceAnchorChain = chain;
          faceAnchorOrder = n.faceOrder ?? n.sprite?.order ?? 0;
        }
        n.children.forEach((c) => node.addChild(build(c, chain, worldMat)));
        return node;
      };

      const root = new PIXI.Container();
      const identity = new PIXI.Matrix();
      (layout.nodes ?? []).forEach((n) => root.addChild(build(n, [], identity)));
      app.stage.addChild(root);
      rootRef.current = root;
      // Measure the canonical body sprite's complete UV-pixel -> root-local
      // mapping. Effects and letterbox sprites are intentionally enlarged and
      // must not determine the figure's export resolution. Older/nonstandard
      // layouts without a `body` sprite retain the established `_root` fallback.
      const rootNode = Object.values(byId).find((c: any) => c.label?.endsWith('_root')) as any;
      const bodyPixelScale = flatMeshes.reduce(
        (max, { pixelScale, isBody }) => isBody ? Math.max(max, pixelScale) : max,
        0,
      );
      u2pxRef.current = bodyPixelScale > 0
        ? 1 / bodyPixelScale
        : rootNode ? 1 / Math.max(Math.abs(rootNode.scale.x), Math.abs(rootNode.scale.y)) : 1;
      nodesByIdRef.current = byId;
      flatMeshesRef.current = flatMeshes;

      // Add every wrapper (holding a leaf mesh at its correct world-space
      // transform) directly under root, sorted by Unity's scene-wide order.
      // Apply the current toggle state now so initial visibility is correct
      // even though the toggle useEffect fired before this async build finished.
      if (flatMeshes.length) {
        root.sortableChildren = true;
        // Recompute byId visibility with the current toggle state.
        const curToggles = togglesRef.current;
        const initHidden = new Set<string>();
        const initForced = new Set<string>();
        for (const t of layout.toggles ?? []) {
          const on = curToggles[t.key] ?? t.default;
          if (t.kind === 'swap') {
            (on ? t.swapOff : t.swapOn).forEach((id) => initHidden.add(id));
            (on ? t.swapOn : t.swapOff).forEach((id) => initForced.add(id));
          } else {
            if (on) t.members.forEach((id) => initForced.add(id));
            else t.members.forEach((id) => initHidden.add(id));
          }
        }
        const applyInit = (n: SkinNode) => {
          const node = byId[n.id];
          if (node) node.visible = (initForced.has(n.id) || n.active) && !initHidden.has(n.id);
          n.children.forEach(applyInit);
        };
        (layout.nodes ?? []).forEach(applyInit);
        for (const { wrapper, order, chain } of flatMeshes) {
          wrapper.zIndex = order;
          wrapper.renderable = chain.every((id) => byId[id].visible);
          root.addChild(wrapper);
        }
        root.sortChildren();
      }

      // Fixed-model face overlay: render the chosen face-expression mesh at the
      // empty face node. Default = none. applyFace(null) clears it.
      if (faceAnchorMat && (layout.faces?.length ?? 0) > 0) {
        const faceByKey: Record<string, FixedFace> = {};
        for (const f of layout.faces!) faceByKey[f.key] = f;
        let faceWrapper: any = null;
        const applyFace = (key: string | null) => {
          if (faceWrapper) { faceWrapper.destroy({ children: true }); faceWrapper = null; }
          if (!key) return;
          const f = faceByKey[key];
          if (!f || !textures[f.tex]) return;
          const mesh = new PIXI.MeshSimple({
            texture: textures[f.tex],
            vertices: new Float32Array(f.verts),
            uvs: new Float32Array(f.uvs),
            indices: new Uint32Array(f.indices),
          });
          const wrapper = new PIXI.Container();
          wrapper.setFromMatrix(faceAnchorMat);
          wrapper.zIndex = faceAnchorOrder;
          wrapper.renderable = faceAnchorChain.every((id) => byId[id]?.visible ?? true);
          wrapper.addChild(mesh);
          root.addChild(wrapper);
          root.sortChildren();
          faceWrapper = wrapper;
        };
        setFixedFaceRef.current = applyFace;
        applyFace(fixedFaceRef.current || null);
      }

      const fit = () => {
        const b = root.getLocalBounds();
        if (!b.width || !b.height) return;
        const pad = 40;
        const s = Math.min((app.screen.width - pad) / b.width, (app.screen.height - pad) / b.height);
        root.scale.set(s);
        root.position.set(
          app.screen.width / 2 - (b.x + b.width / 2) * s,
          app.screen.height / 2 - (b.y + b.height / 2) * s,
        );
      };
      fit();
      app.renderer.on('resize', fit);

      attachPanZoom(app.canvas as HTMLCanvasElement, root);
    })().catch((e) => !destroyed && setError(String(e)));

    return () => {
      destroyed = true;
      nodesByIdRef.current = {};
      flatMeshesRef.current = [];
      texturesRef.current = {};
      appRef.current = null;
      if (app && appReady) app.destroy(true);
    };
  }, [layout, skin, resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Swap textures on existing fixed-skin meshes when variant changes — no rebuild needed.
  useEffect(() => {
    if (!layout || layout.kind === 'spine') return;
    if (variant !== 'base' && !layoutHasVariant(layout, variant as 'rplus' | 'kr' | 'sfw')) { setVariant('base'); return; }
    const textures = texturesRef.current;
    for (const { mesh, sprite } of flatMeshesRef.current) {
      const vkey = (variant === 'rplus' && sprite.rplus) ? sprite.rplus
                 : (variant === 'kr'    && sprite.kr)    ? sprite.kr
                 : (variant === 'sfw'   && sprite.sfw)   ? sprite.sfw
                 : null;
      mesh.texture = textures[(vkey ?? sprite).tex] ?? textures[sprite.tex];
    }
  }, [layout, variant]);

  const spineRef = useRef<any>(null);
  const spineSfwRef = useRef<any>(null); // second Spine object for skel-differs case
  const spineActorsRef = useRef<Map<string, { base: any; sfw?: any; meta: NonNullable<Layout['actors']>[number] }>>(new Map());
  const bgSpriteRef = useRef<any>(null);
  const bgSpriteSfwRef = useRef<any>(null); // second BG sprite for skel-differs case
  // Per atlas page: base and sfw SpineTexture objects for texture-swap case
  const spinePageTexRef = useRef<{ page: any; base: any; sfw: any }[]>([]);
  const spineBgTexRef = useRef<{ base: any; sfw: any } | null>(null);
  const spinePixelScaleRef = useRef<() => number>(() => 1);
  const composeSkinRef = useRef<((face: string, breast: string[], parts: Record<string, boolean>) => void) | null>(null);
  const spineStateRef = useRef<number>(0);
  const reactThenRef = useRef<((trigger: 'breast' | 'Tep_1') => void) | null>(null);
  const spineFaceRef = useRef(spineFace);
  spineFaceRef.current = spineFace;
  const spineBreastRef = useRef(spineBreast);
  spineBreastRef.current = spineBreast;
  const spinePartsRef = useRef(spineParts);
  spinePartsRef.current = spineParts;
  // Read every frame by the per-actor afterUpdateWorldTransforms hook.
  const hiddenSlotSet = useMemo(() => new Set(hiddenSlots), [hiddenSlots]);
  const hiddenSlotsRef = useRef(hiddenSlotSet);
  hiddenSlotsRef.current = hiddenSlotSet;
  // Recomputes the layer list against the currently active skeleton.
  const refreshLayersRef = useRef<(() => void) | null>(null);
  const variantRef = useRef(variant);
  variantRef.current = variant;
  useEffect(() => {
    if (!layout || layout.kind !== 'spine' || layout.skin !== baseSkinKey(skin)) return;
    let destroyed = false;
    let app: any = null;
    let appReady = false;
    // Clear refs immediately so the swap effect can't act on stale objects from a prior skin
    spineRef.current = null;
    spineSfwRef.current = null;
    spineActorsRef.current.clear();
    spinePageTexRef.current = [];
    spineBgTexRef.current = null;
    spinePixelScaleRef.current = () => 1;
    refreshLayersRef.current = null;

    (async () => {
      const PIXI = await import('pixi.js');
      pixiRef.current = PIXI;
      const {
        Spine, SkeletonJson, AtlasAttachmentLoader, Skin, Physics, TextureAtlas, SpineTexture,
        RegionAttachment, MeshAttachment,
      } =
        await import('@esotericsoftware/spine-pixi-v8') as any;
      const files = filesRef.current;
      if (!files) return;

      if (!layout.atlas || !layout.skel) return;
      const sfwMeta = layout.sfw ?? null;
      const sfwHasSkel = !!(sfwMeta?.skel);

      // Helper: load a TextureAtlas with base textures, and optionally pre-load sfw textures
      const loadAtlas = async (atlasName: string, texOverrides: Record<string, string> = {}) => {
        const atlasText = await readText(files, atlasName);
        const ta = new TextureAtlas(atlasText);
        await Promise.all(ta.pages.map(async (page: any) => {
          const overrideName = texOverrides[page.name];
          const blobUrl = urlFor(skin, files, overrideName ?? page.name);
          const texture = await PIXI.Assets.load({
            src: blobUrl,
            loadParser: 'loadTextures',
            data: { alphaMode: page.pma ? 'premultiplied-alpha' : 'premultiply-alpha-on-upload' },
          });
          page.setTexture(SpineTexture.from(texture.source));
        }));
        return ta;
      };

      // Always load base atlas/skel
      const baseAtlas = await loadAtlas(layout.atlas);
      if (destroyed) return;

      // If sfw textures differ but skel is same, pre-load sfw textures for instant swap
      // If sfw skel differs, load a full separate atlas for it
      let sfwAtlas: any = null;
      if (sfwMeta) {
        if (sfwMeta.atlas) {
          // sfw atlas already has correct page names baked in — no overrides needed
          sfwAtlas = await loadAtlas(sfwMeta.atlas);
        } else {
          // same atlas structure, just different texture files
          sfwAtlas = await loadAtlas(layout.atlas, sfwMeta.textures ?? {});
        }
        if (destroyed) return;
      }

      // Build page texture swap table (texture-only sfw case)
      if (!sfwHasSkel && sfwMeta) {
        spinePageTexRef.current = baseAtlas.pages.map((page: any, i: number) => ({
          page,
          base: page.texture, // SpineTexture set above
          sfw: sfwAtlas?.pages[i]?.texture ?? page.texture,
        }));
      } else {
        spinePageTexRef.current = [];
      }

      const baseSkelJson = JSON.parse(await readText(files, layout.skel));
      if (destroyed) return;
      const sjson = new SkeletonJson(new AtlasAttachmentLoader(baseAtlas));
      const skeletonData = sjson.readSkeletonData(baseSkelJson);

      // A few Unity prefabs contain multiple SkeletonMecanim GameObjects and
      // swap between them. Load every secondary actor as its own Spine object;
      // the normal top-level fields remain actor zero for old archives.
      const extraActorData = await Promise.all((layout.actors ?? []).slice(1).map(async (actor) => {
        const atlas = await loadAtlas(actor.atlas);
        const skelJson = JSON.parse(await readText(files, actor.skel));
        const parser = new SkeletonJson(new AtlasAttachmentLoader(atlas));
        return { actor, atlas, skeletonData: parser.readSkeletonData(skelJson) };
      }));
      if (destroyed) return;

      // If sfw has a different skeleton, build it too
      let sfwSkeletonData: any = null;
      if (sfwHasSkel && sfwMeta?.skel && sfwAtlas) {
        const sfwSkelJson = JSON.parse(await readText(files, sfwMeta.skel));
        if (destroyed) return;
        const sfwSjson = new SkeletonJson(new AtlasAttachmentLoader(sfwAtlas));
        sfwSkeletonData = sfwSjson.readSkeletonData(sfwSkelJson);
      }

      app = new PIXI.Application();
      await app.init({ backgroundAlpha: 0, antialias: true, resizeTo: hostRef.current! });
      appReady = true;
      if (destroyed) { app.destroy(true); return; }
      appRef.current = app;
      hostRef.current!.replaceChildren(app.canvas);

      const W = layout.world ?? {};

      // Load BG textures (base + sfw if different)
      let bgTexBase: any = null;
      let bgTexSfw: any = null;
      if (W.bg) {
        bgTexBase = await loadTexture(PIXI, skin, files, W.bg.tex);
        const sfwBgName = sfwMeta?.textures?.[W.bg.tex];
        bgTexSfw = sfwBgName ? await loadTexture(PIXI, skin, files, sfwBgName) : null;
      }
      if (destroyed) { if (appReady) app?.destroy(true); return; }

      spineBgTexRef.current = bgTexBase ? { base: bgTexBase, sfw: bgTexSfw ?? bgTexBase } : null;

      const isSfw = variantRef.current === 'sfw';

      // Layer editor: user-hidden layers are cleared per frame, after the
      // animation state has been applied and before the mesh batch is rebuilt,
      // because every skin recomposition re-attaches the slots.
      // `AnimationState.apply()` only re-attaches slots that carry an attachment
      // timeline, so switching a layer back on has to restore the attachment
      // explicitly — otherwise a slot cleared once stays empty forever. Each
      // skeleton tracks the slots this hook cleared, and un-hiding one resolves
      // its setup-pose attachment against the currently composed skin.
      // Slots are matched by name so one list covers base, sfw and extra actors.
      const suppressed = new WeakMap<any, Set<number>>();
      const applyHiddenSlots = (sp: any) => {
        const hidden = hiddenSlotsRef.current;
        let cleared = suppressed.get(sp);
        if (!cleared) { cleared = new Set<number>(); suppressed.set(sp, cleared); }
        if (!hidden.size && !cleared.size) return;
        for (const slot of sp.skeleton.slots) {
          const index = slot.data.index;
          if (hidden.has(slot.data.name)) {
            slot.setAttachment(null);
            cleared.add(index);
          } else if (cleared.delete(index) && !slot.getAttachment()) {
            const setupName = slot.data.attachmentName;
            slot.setAttachment(setupName ? sp.skeleton.getAttachment(index, setupName) : null);
          }
        }
      };

      const spine = new Spine({ skeletonData });
      spine.afterUpdateWorldTransforms = applyHiddenSlots;
      spineRef.current = spine;
      const startAnim = (layout.animations ?? []).includes('Idle_1')
        ? 'Idle_1' : layout.animations?.[0];
      if (startAnim) spine.state.setAnimation(0, startAnim, true);
      spine.visible = !sfwHasSkel || !isSfw;

      // sfw spine (only when skeleton differs)
      let spineSfw: any = null;
      if (sfwSkeletonData) {
        spineSfw = new Spine({ skeletonData: sfwSkeletonData });
        spineSfw.afterUpdateWorldTransforms = applyHiddenSlots;
        spineSfwRef.current = spineSfw;
        if (startAnim) spineSfw.state.setAnimation(0, startAnim, true);
        spineSfw.visible = isSfw;
      } else {
        spineSfwRef.current = null;
      }

      const actorInstances: { actor: NonNullable<Layout['actors']>[number]; base: any; sfw?: any; skeletonData: any }[] = [];
      if (layout.actors?.[0]) {
        actorInstances.push({ actor: layout.actors[0], base: spine, sfw: spineSfw ?? undefined, skeletonData });
      }
      for (const item of extraActorData) {
        const extra = new Spine({ skeletonData: item.skeletonData });
        extra.afterUpdateWorldTransforms = applyHiddenSlots;
        const extraStart = item.actor.animations?.includes('Idle_1')
          ? 'Idle_1' : item.actor.animations?.[0];
        if (extraStart) extra.state.setAnimation(0, extraStart, true);
        extra.visible = item.actor.active;
        actorInstances.push({ actor: item.actor, base: extra, skeletonData: item.skeletonData });
      }
      spineActorsRef.current = new Map(actorInstances.map((a) => [
        a.actor.id, { base: a.base, sfw: a.sfw, meta: a.actor },
      ]));

      // Honor the current pause state on the freshly built spine(s) — a reload
      // while paused must stay paused (the [playing]-only effect won't re-fire).
      if (!playingRef.current) {
        spine.state.timeScale = 0;
        if (spineSfw) spineSfw.state.timeScale = 0;
        for (const a of actorInstances.slice(1)) a.base.state.timeScale = 0;
      }

      // Apply texture swap immediately if already in sfw mode (texture-only case)
      if (!sfwHasSkel && isSfw) {
        for (const { page, sfw } of spinePageTexRef.current) page.setTexture(sfw);
      }

      const makeCompose = (skel: any, sp: any, groups = layout.skinGroups) =>
        (face: string, breast: string[], parts: Record<string, boolean>) => {
          const names = [
            groups?.base,
            face,
            ...breast,
            ...Object.entries(parts).filter(([, on]) => on).map(([n]) => n),
          ].filter(Boolean) as string[];
          const result = new Skin('viewer-skin');
          for (const n of names) {
            const s = skel.findSkin(n);
            if (s) result.addSkin(s);
          }
          const wasRunning = app.ticker.started;
          if (wasRunning) app.ticker.stop();
          sp.skeleton.setSkin(result);
          sp.skeleton.setToSetupPose();
          sp.skeleton.setSlotsToSetupPose();
          sp.skeleton.updateWorldTransform(Physics.update);
          sp.update(0);
          if (wasRunning) app.ticker.start();
        };

      const composeBase = makeCompose(skeletonData, spine);
      const composeSfw  = spineSfw ? makeCompose(sfwSkeletonData, spineSfw) : null;
      const composeExtras = actorInstances.slice(1).map((a) =>
        makeCompose(a.skeletonData, a.base, a.actor.skinGroups));

      // composeSkinRef always targets the active skeleton
      const activeSkeletonData = () =>
        variantRef.current === 'sfw' && sfwSkeletonData ? sfwSkeletonData : skeletonData;

      // Slots a skeleton can draw under the given composition, in draw order.
      // Read from the composed skin (plus the skeleton's own default skin)
      // rather than the live slots, whose attachments the layer editor clears.
      const drawableSlots = (
        skelData: any, groups: Layout['skinGroups'],
        face: string, breast: string[], parts: Record<string, boolean>,
      ): string[] => {
        const names = [
          groups?.base,
          face,
          ...breast,
          ...Object.entries(parts).filter(([, on]) => on).map(([n]) => n),
        ].filter(Boolean) as string[];
        const used = new Set<number>();
        const collect = (sk: any) => {
          for (const entry of sk.getAttachments()) used.add(entry.slotIndex);
        };
        if (skelData.defaultSkin) collect(skelData.defaultSkin);
        for (const n of names) {
          const sk = skelData.findSkin(n);
          if (sk) collect(sk);
        }
        return (skelData.slots as any[])
          .filter((slot) => used.has(slot.index))
          .map((slot) => slot.name as string);
      };

      // One list across the visible skeleton and any extra actors; duplicate
      // names collapse into a single row because hiding matches by name.
      const layerNames = (face: string, breast: string[], parts: Record<string, boolean>) => {
        const seen = new Set<string>();
        const out: string[] = [];
        const add = (skelData: any, groups: Layout['skinGroups']) => {
          for (const name of drawableSlots(skelData, groups, face, breast, parts)) {
            if (seen.has(name)) continue;
            seen.add(name);
            out.push(name);
          }
        };
        add(activeSkeletonData(), layout.skinGroups);
        for (const a of actorInstances.slice(1)) add(a.skeletonData, a.actor.skinGroups);
        return out;
      };

      composeSkinRef.current = (face, breast, parts) => {
        composeBase(face, breast, parts);
        composeSfw?.(face, breast, parts);
        for (const compose of composeExtras) compose(face, breast, parts);
        setSpineSlots(layerNames(face, breast, parts));
      };
      refreshLayersRef.current = () => {
        setSpineSlots(layerNames(spineFaceRef.current, spineBreastRef.current, spinePartsRef.current));
      };

      // Expose available skins from the active skeleton for UI filtering
      const availSkins = new Set<string>(
        (activeSkeletonData().skins as any[]).map((s: any) => s.name as string)
      );
      setSpineAvailableSkins(availSkins);
      // sfw skeleton may not have all breast groups — drop unavailable selections
      let activeBreast = spineBreastRef.current.filter((b) => availSkins.has(b));
      if (activeBreast.length !== spineBreastRef.current.length) setSpineBreast(activeBreast);
      // sfw skeleton may not have all prop parts — turn off missing ones
      const currentParts = spinePartsRef.current;
      const fixedParts: Record<string, boolean> = {};
      let partsChanged = false;
      for (const [k, v] of Object.entries(currentParts)) {
        if (v && !availSkins.has(k)) { fixedParts[k] = false; partsChanged = true; }
        else fixedParts[k] = v;
      }
      if (partsChanged) setSpineParts(fixedParts);
      composeSkinRef.current(spineFaceRef.current, activeBreast, partsChanged ? fixedParts : spinePartsRef.current);

      const root = new PIXI.Container();
      root.sortableChildren = true;

      const sk = W.skeleton ?? { x: 0, y: 0, scale: 1, dataScale: 1 };
      const u2px = 1 / ((sk.scale || 1) * (sk.dataScale ?? 1));
      u2pxRef.current = u2px;

      if (W.bg) {
        const activeBgTex = isSfw ? (bgTexSfw ?? bgTexBase) : bgTexBase;
        const bg = new PIXI.Sprite(activeBgTex);
        bg.anchor.set(0.5);
        bg.position.set(W.bg.x * u2px, -W.bg.y * u2px);
        bg.width = W.bg.w * u2px;
        bg.height = W.bg.h * u2px;
        bg.zIndex = -10;
        bg.visible = togglesRef.current['bg'] ?? true;
        root.addChild(bg);
        bgSpriteRef.current = bg;
      }

      spine.scale.set(1);
      spine.position.set(sk.x * u2px, -sk.y * u2px);
      spine.zIndex = 0;
      root.addChild(spine);

      if (spineSfw) {
        spineSfw.scale.set(1);
        spineSfw.position.set(sk.x * u2px, -sk.y * u2px);
        spineSfw.zIndex = 0;
        root.addChild(spineSfw);
      }
      for (const a of actorInstances.slice(1)) {
        const ask = a.actor.world;
        a.base.scale.set(1);
        a.base.position.set(ask.x * u2px, -ask.y * u2px);
        a.base.zIndex = 0;
        root.addChild(a.base);
      }
      app.stage.addChild(root);
      rootRef.current = root;

      const animSet = new Set(layout.animations ?? []);
      const animator = layout.animator;
      const states = animator?.states ?? {};
      const triggers = animator?.triggers ?? {};
      if (animator) spineStateRef.current = animator.default;
      const idleFor = (): string => {
        const st = states[String(spineStateRef.current)];
        return (st?.clip && animSet.has(st.clip)) ? st.clip : (layout.animations?.[0] ?? '');
      };
      const reactThen = (trigger: 'breast' | 'Tep_1') => {
        const fromIdx = spineStateRef.current;
        const destIdx = triggers[String(fromIdx)]?.[trigger];
        if (destIdx == null) return;
        const destState = states[String(destIdx)];
        const reaction = destState?.clip;
        if (!reaction || !animSet.has(reaction)) return;
        spineStateRef.current = destState.exit ?? destIdx;
        // Target the currently visible spine (base or sfw)
        const activeSpine = Array.from(spineActorsRef.current.values())
          .flatMap((a) => [a.base, a.sfw].filter(Boolean))
          .find((s: any) => s.visible) ?? (spineSfwRef.current?.visible ? spineSfwRef.current : spine);
        const entry = activeSpine.state.setAnimation(0, reaction, false);
        entry.mixDuration = 0.2;
        activeSpine.state.addAnimation(0, idleFor(), true, 0);
      };
      reactThenRef.current = reactThen;

      const zones = W.zones ?? [];
      let zoneLayer: any = null;
      if (zones.length || Object.keys(triggers).length) {
        zoneLayer = new PIXI.Container();
        const hit = new PIXI.Graphics();
        hit.eventMode = 'static';
        hit.cursor = 'pointer';
        zoneLayer.addChild(hit);
        hit.on('pointertap', (e: any) => {
          const p = zoneLayer.toLocal(e.global);
          // Find which zone the tap landed in. Body is the large zone; special
          // zones are smaller and sit inside it. Pick the smallest hit zone so
          // that tapping the special area doesn't also count as body. Only fire
          // if the tap actually lands inside a zone (no reaction outside all zones).
          let best: typeof zones[number] | null = null;
          for (const z of zones) {
            const halfW = (z.w * u2px) / 2, halfH = (z.h * u2px) / 2;
            const zx = z.x * u2px, zy = -z.y * u2px;
            const rot = -(z.rot ?? 0) * Math.PI / 180;
            const cos = Math.cos(-rot), sin = Math.sin(-rot);
            const dx = p.x - zx, dy = p.y - zy;
            const lx = dx * cos - dy * sin, ly = dx * sin + dy * cos;
            if (Math.abs(lx) <= halfW && Math.abs(ly) <= halfH) {
              if (!best || z.w * z.h < best.w * best.h) best = z;
            }
          }
          if (!best) return; // outside all zones — no reaction
          reactThen(best.key === 'body' ? 'Tep_1' : 'breast');
        });
        if (zones.length) {
          const overlay = new PIXI.Graphics();
          overlay.visible = false;
          for (const z of zones) {
            const isSpecial = z.key !== 'body';
            const zx = z.x * u2px, zy = -z.y * u2px;
            const hw = (z.w * u2px) / 2, hh = (z.h * u2px) / 2;
            const rot = -(z.rot ?? 0) * Math.PI / 180;
            const cos = Math.cos(rot), sin = Math.sin(rot);
            const corners = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(
              ([dx, dy]) => [zx + dx * cos - dy * sin, zy + dx * sin + dy * cos]
            );
            overlay.poly(corners.flat()).stroke({ color: isSpecial ? 0xff4444 : 0x4488ff, width: 20, alpha: 0.8 });
          }
          zoneLayer.addChild(overlay);
          zoneOverlayRef.current = overlay;
        }
        app.stage.addChild(zoneLayer);
      }

      const fit = () => {
        const b = root.getLocalBounds();
        if (!b.width || !b.height) return;
        const pad = 40;
        const s = Math.min((app.screen.width - pad) / b.width, (app.screen.height - pad) / b.height);
        root.scale.set(s);
        root.position.set(
          app.screen.width / 2 - (b.x + b.width / 2) * s,
          app.screen.height / 2 - (b.y + b.height / 2) * s,
        );
        if (zoneLayer) {
          zoneLayer.scale.set(s);
          zoneLayer.position.copyFrom(root.position);
          // Rebuild hit areas as individual zone rects (not full figure bounds)
          // so cursor/events only fire when the pointer is actually over a zone.
          const g = zoneLayer.children[0] as any;
          g.clear();
          for (const z of zones) {
            const hw = (z.w * u2px) / 2, hh = (z.h * u2px) / 2;
            const zx = z.x * u2px, zy = -z.y * u2px;
            const rot = -(z.rot ?? 0) * Math.PI / 180;
            const cos = Math.cos(rot), sin = Math.sin(rot);
            const corners = [[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]].map(
              ([dx,dy]) => [zx + dx*cos - dy*sin, zy + dx*sin + dy*cos]
            );
            g.poly(corners.flat()).fill({ color: 0xffffff, alpha: 0.0001 });
          }
        }
      };
      spine.update(0);
      fit();

      // Measure source-atlas pixels in the current composed pose. Unlike the
      // old atlas-width heuristic, this works for packed parts, mesh
      // attachments, bone scaling, multiple actors, and optional backgrounds.
      const attachmentScale = (sp: any): number => {
        if (!sp?.visible) return 0;
        let max = 0;
        for (const slot of sp.skeleton.slots) {
          const attachment = slot.getAttachment();
          const region = attachment?.region;
          const page = region?.page;
          if (!attachment || !page?.width || !page?.height) continue;
          let vertices: Float32Array;
          let indices: ArrayLike<number>;
          if (attachment instanceof RegionAttachment) {
            vertices = new Float32Array(8);
            attachment.computeWorldVertices(slot, vertices, 0, 2);
            indices = [0, 1, 2, 0, 2, 3];
          } else if (attachment instanceof MeshAttachment) {
            vertices = new Float32Array(attachment.worldVerticesLength);
            attachment.computeWorldVertices(
              slot, 0, attachment.worldVerticesLength, vertices, 0, 2,
            );
            indices = attachment.triangles;
          } else {
            continue;
          }
          max = Math.max(max, mappedSourcePixelScale(
            vertices, attachment.uvs, indices, page.width, page.height,
            { a: sp.scale.x, b: 0, c: 0, d: sp.scale.y },
          ));
        }
        return max;
      };
      spinePixelScaleRef.current = () => {
        let max = 0;
        const actors = actorInstances.length
          ? actorInstances.flatMap((a) => [a.base, a.sfw].filter(Boolean))
          : [spine, spineSfw].filter(Boolean);
        for (const actor of actors) max = Math.max(max, attachmentScale(actor));
        const bg = bgSpriteRef.current;
        const bgSource = bg?.texture?.source;
        if (bg?.visible && bgSource?.width && bgSource?.height) {
          max = Math.max(
            max,
            Math.abs(bg.width) / bgSource.width,
            Math.abs(bg.height) / bgSource.height,
          );
        }
        return max || 1;
      };
      app.renderer.on('resize', fit);

      attachPanZoom(app.canvas as HTMLCanvasElement, root, zoneLayer);
    })().catch((e) => !destroyed && setError(String(e)));

    return () => {
      destroyed = true;
      spineRef.current = null;
      spineSfwRef.current = null;
      spineActorsRef.current.clear();
      spinePageTexRef.current = [];
      spineBgTexRef.current = null;
      spinePixelScaleRef.current = () => 1;
      composeSkinRef.current = null;
      refreshLayersRef.current = null;
      reactThenRef.current = null;
      spineStateRef.current = 0;
      zoneOverlayRef.current = null;
      appRef.current = null;
      if (app && appReady) app.destroy(true);
    };
  }, [layout, skin]);

  useEffect(() => {
    const spine = spineRef.current;
    // Spine-pixi v8 auto-updates via its own ticker listener; pause by setting timeScale.
    if (spine) {
      if (spineActorsRef.current.size) {
        for (const a of Array.from(spineActorsRef.current.values())) {
          a.base.state.timeScale = playing ? 1 : 0;
          if (a.sfw) a.sfw.state.timeScale = playing ? 1 : 0;
        }
      } else {
        spine.state.timeScale = playing ? 1 : 0;
        if (spineSfwRef.current) spineSfwRef.current.state.timeScale = playing ? 1 : 0;
      }
    }
  }, [playing]);

  useEffect(() => {
    const spine = spineRef.current;
    if (!spine || !spineAnim) return;
    const states = layout?.animator?.states;
    if (states) {
      const idx = Object.keys(states).find((k) => states[k].loop && states[k].clip === spineAnim);
      if (idx != null) spineStateRef.current = Number(idx);
    }
    if (spineActorsRef.current.size) {
      for (const a of Array.from(spineActorsRef.current.values())) {
        if (a.meta.animations?.includes(spineAnim)) a.base.state.setAnimation(0, spineAnim, true);
        if (a.sfw && a.meta.animations?.includes(spineAnim)) a.sfw.state.setAnimation(0, spineAnim, true);
      }
    } else {
      spine.state.setAnimation(0, spineAnim, true);
      spineSfwRef.current?.state.setAnimation(0, spineAnim, true);
    }
  }, [spineAnim, layout]);

  useEffect(() => {
    composeSkinRef.current?.(spineFace, spineBreast, spineParts);
  }, [spineFace, spineBreast, spineParts]);

  // Fixed-model face overlay swap (instant — no rebuild). '' = no face.
  useEffect(() => {
    setFixedFaceRef.current?.(fixedFace || null);
  }, [fixedFace]);

  // Instant sfw/base swap for spine — no rebuild
  useEffect(() => {
    if (!layout || layout.kind !== 'spine') return;
    const isSfw = variant === 'sfw';
    const spine = spineRef.current;
    const spineSfw = spineSfwRef.current;
    if (spineSfw) {
      // Skel differs: just toggle visibility + mirror animation
      if (spine) spine.visible = !isSfw;
      spineSfw.visible = isSfw;
      // Sync animation state to the now-visible spine
      const active = isSfw ? spineSfw : spine;
      const hidden  = isSfw ? spine : spineSfw;
      if (active && hidden) {
        const track = hidden.state.getCurrent(0);
        if (track) {
          const entry = active.state.setAnimation(0, track.animation.name, track.loop);
          entry.trackTime = track.trackTime;
        }
      }
    } else if (spinePageTexRef.current.length > 0) {
      // Texture-only: swap page textures in-place
      for (const { page, base, sfw } of spinePageTexRef.current) {
        page.setTexture(isSfw ? sfw : base);
      }
    }
    // BG sprite texture swap
    const bg = bgSpriteRef.current;
    const bgTex = spineBgTexRef.current;
    if (bg && bgTex) bg.texture = isSfw ? bgTex.sfw : bgTex.base;
    // Update available skins for UI (sfw skel may have different groups)
    const activeSkelData = isSfw && spineSfw
      ? (spineSfw as any).skeleton?.data
      : spine ? (spine as any).skeleton?.data : null;
    if (activeSkelData?.skins) {
      setSpineAvailableSkins(new Set<string>(
        (activeSkelData.skins as any[]).map((s: any) => s.name as string)
      ));
    }
    refreshLayersRef.current?.();
  }, [layout, variant]);


  useEffect(() => {
    if (zoneOverlayRef.current) zoneOverlayRef.current.visible = showZones;
  }, [showZones]);

  useEffect(() => {
    if (!layout) return;
    const byId = nodesByIdRef.current;

    const hidden = new Set<string>();
    // swap-toggle "active" side: force visible even if n.active=false in scene.
    // plain toggle ON also forces members visible (they may have active=false in scene).
    const forced = new Set<string>();
    for (const t of layout.toggles ?? []) {
      const on = toggles[t.key] ?? t.default;
      if (t.kind === 'swap') {
        (on ? t.swapOff : t.swapOn).forEach((id) => hidden.add(id));
        (on ? t.swapOn : t.swapOff).forEach((id) => forced.add(id));
      } else {
        if (on) t.members.forEach((id) => forced.add(id));
        else t.members.forEach((id) => hidden.add(id));
      }
    }

    const apply = (n: SkinNode) => {
      const node = byId[n.id];
      if (node) node.visible = (forced.has(n.id) || n.active) && !hidden.has(n.id);
      n.children.forEach(apply);
    };
    (layout.nodes ?? []).forEach(apply);
    // leaf meshes were flattened out of the transform tree for global
    // draw-order sorting (see the build effect) — their anchor's `visible`
    // no longer cascades to them since they're no longer its child, so
    // recompute renderable directly from each ancestor's visibility
    // (just set above by `apply`, which already folds in n.active + hidden).
    for (const { wrapper, chain } of flatMeshesRef.current) {
      wrapper.renderable = chain.every((id) => byId[id]?.visible);
    }
    if (bgSpriteRef.current) {
      bgSpriteRef.current.visible = toggles['bg'] ?? true;
    }
    // The same Unity GameObject IDs can identify whole SkeletonMecanim actors.
    // Apply normal/swap toggles to those Spine containers too.
    for (const [id, actor] of Array.from(spineActorsRef.current.entries())) {
      let visible = actor.meta.active;
      for (const t of layout.toggles ?? []) {
        const on = toggles[t.key] ?? t.default;
        if (t.kind === 'swap') {
          if (t.swapOn.includes(id)) visible = on;
          if (t.swapOff.includes(id)) visible = !on;
        } else if (t.members.includes(id)) {
          visible = on;
        }
      }
      actor.base.visible = visible && (!actor.sfw || variant !== 'sfw');
      if (actor.sfw) actor.sfw.visible = visible && variant === 'sfw';
    }
  }, [layout, toggles, variant]);

  // Save at full skeleton-native resolution (tight-crop, transparent BG).
  const handleSave = () => {
    try {
      const app = appRef.current;
      const root = rootRef.current;
      if (!app || !root) return;
      const PIXI = pixiRef.current;
      if (!PIXI) return;

      // Hide zone overlay temporarily.
      const overlayWasVisible = zoneOverlayRef.current?.visible ?? false;
      if (zoneOverlayRef.current) zoneOverlayRef.current.visible = false;

      // fitScale: how many screen-px per skeleton unit (set by fit()).
      // u2px: how many atlas-pixels per skeleton unit.
      // exportScale = u2px / fitScale scales the screen render up to atlas resolution.
      const fitScale = root.scale.x;
      const u2px = layout?.kind === 'spine'
        ? 1 / spinePixelScaleRef.current()
        : u2pxRef.current;
      const exportScale = u2px / fitScale;
      const screenBounds = root.getBounds(); // screen-pixel bounding box of content
      const natW = Math.ceil(screenBounds.width * exportScale);
      const natH = Math.ceil(screenBounds.height * exportScale);
      console.log('[save] fitScale', fitScale, 'u2px', u2px, 'exportScale', exportScale, 'size', natW, natH, 'screenBounds', screenBounds.x, screenBounds.y, screenBounds.width, screenBounds.height);
      if (!natW || !natH || natW > 16384 || natH > 16384) { console.warn('[save] bad size', natW, natH); return; }

      // Render stage into a RenderTexture at atlas resolution.
      const rt = PIXI.RenderTexture.create({ width: natW, height: natH });
      const matrix = new PIXI.Matrix(exportScale, 0, 0, exportScale, -screenBounds.x * exportScale, -screenBounds.y * exportScale);
      app.renderer.render({ container: app.stage, target: rt, transform: matrix, clear: true });

      if (zoneOverlayRef.current) zoneOverlayRef.current.visible = overlayWasVisible;

      // canvas() is synchronous in PixiJS v8.
      const src = app.renderer.extract.canvas({ target: rt }) as HTMLCanvasElement;
      rt.destroy(true);

      const w = src.width, h = src.height;
      const ctx = src.getContext('2d')!;
      const px = ctx.getImageData(0, 0, w, h).data;
      let minX = w, minY = h, maxX = 0, maxY = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (px[(y * w + x) * 4 + 3] > 0) {
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX < minX || maxY < minY) return;
      const cw = maxX - minX + 1, ch = maxY - minY + 1;
      const out = document.createElement('canvas');
      out.width = cw; out.height = ch;
      out.getContext('2d')!.drawImage(src, minX, minY, cw, ch, 0, 0, cw, ch);
      const a = document.createElement('a');
      a.href = out.toDataURL('image/png');
      a.download = `${skin}.png`;
      a.click();
      console.log('[save] done', cw, ch);
    } catch (e) {
      console.error('[save] error', e);
    }
  };

  return (
    <Box>
      {error && <Text color="red.400" fontSize="sm" mb={1}>{error}</Text>}
      <Box h={height} bg="gray.800" borderRadius="md" overflow="hidden" position="relative" border="1px solid" borderColor="whiteAlpha.200">
        <Box ref={hostRef} position="absolute" inset={0} opacity={loadState === 'ready' ? 1 : 0} />
        {loadState !== 'ready' && !error && (
          <Center position="absolute" inset={0} color="gray.500" pointerEvents="none" flexDirection="column" gap={2}>
            <Spinner />
            <Text fontSize="sm">{loadState === 'unpacking' ? 'unpacking…' : 'fetching…'}</Text>
          </Center>
        )}

        {/* Bottom-left: PARTS_META info icons (VOICE, SD_EFFECT, etc.) */}
        {parts.length > 0 && (
          <HStack position="absolute" bottom={2} left={2} spacing={1} pointerEvents="none"
            bg="blackAlpha.500" borderRadius="md" px={1} py={1}>
            {parts.map((p) => {
              const meta = PARTS_META[p];
              if (!meta) return null;
              return (
                <Tooltip key={p} label={meta.label} fontSize="xs" hasArrow placement="top">
                  <Image src={meta.icon} alt={meta.label} boxSize="32px" pointerEvents="auto" />
                </Tooltip>
              );
            })}
          </HStack>
        )}

        {/* Top-left: face selector (spine only) — always a face, no (none) */}
        {layout?.kind === 'spine' && (layout.skinGroups?.faces?.length ?? 0) > 0 && (
          <FaceSelect value={spineFace} onChange={setSpineFace}
            options={layout.skinGroups!.faces!.map((f) => ({ value: f, label: f.replace(/^face\/.*_/, '') }))} />
        )}

        {/* Top-left: face selector (fixed only) — default "(none)", its own entry */}
        {layout?.kind === 'fixed' && (layout.faces?.length ?? 0) > 0 && (
          <FaceSelect value={fixedFace} onChange={setFixedFace}
            options={[{ value: '', label: '(none)' },
              ...layout.faces!.map((f) => ({ value: f.key, label: f.key }))]} />
        )}

        {/* Top-left: spine layer editor — stacked under the face dropdown */}
        {layout?.kind === 'spine' && showLayers && spineSlots.length > 0 && (
          <LayerPanel
            slots={spineSlots}
            hidden={hiddenSlotSet}
            top={(layout.skinGroups?.faces?.length ?? 0) > 0 ? 12 : 2}
            onToggle={(slot) => setHiddenSlots((prev) => (
              prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
            ))}
            onSetAll={(visible) => setHiddenSlots(visible ? [] : [...spineSlots])}
            onClose={() => setShowLayers(false)} />
        )}

        {/* Top-right: breast variants (spine only) + save button */}
        {(() => {
          const isSpine = layout?.kind === 'spine';
          const spineParts_ = layout?.skinGroups?.parts ?? [];
          const skinAvail = (k: string) => !spineAvailableSkins || spineAvailableSkins.has(k);
          const hasCensored = isSpine && spineParts_.includes('breast/Censorship') && skinAvail('breast/Censorship');
          const hasUnedited = isSpine && spineParts_.includes('breast/Unedited') && skinAvail('breast/Unedited');
          const rplusKey = spineParts_.find((p) => p.toLowerCase() === 'breast/rplus') ?? null;
          const hasRplusBreast = isSpine && !!rplusKey && skinAvail(rplusKey);
          const breastVariants = [
            hasCensored && { key: 'breast/Censorship', icon: '/images/shop/icon-platform-google.png', label: 'Censored' },
            hasUnedited && { key: 'breast/Unedited', icon: hasKr ? '/images/shop/icon-platform-vfun.png' : '/images/shop/icon-platform-onestore.png', label: 'Unedited' },
            hasRplusBreast && { key: rplusKey!, icon: '/images/shop/icon-secret-marks.png', label: 'R+' },
          ].filter(Boolean) as { key: string; icon: string; label: string }[];
          const hasZones = isSpine && (layout?.world?.zones?.length ?? 0) > 0;
          return (
            <VStack position="absolute" top={2} right={2} spacing={1} align="flex-end"
              bg="blackAlpha.500" borderRadius="md" px={1} py={1}>
              {breastVariants.map((v) => (
                <IconBtn key={v.key} src={v.icon} alt={v.label} label={v.label}
                  active={spineBreast.includes(v.key)} placement="left"
                  onClick={() => setSpineBreast((prev) => prev.includes(v.key) ? prev.filter((k) => k !== v.key) : [...prev, v.key])} />
              ))}
              {/* spine animates (play/pause) and may have touch zones */}
              {isSpine && <PlayPauseButton playing={playing} onToggle={() => setPlaying((v) => !v)} />}
              {hasZones && <ZonesButton shown={showZones} onToggle={() => setShowZones((v) => !v)} />}
              {isSpine && spineSlots.length > 0 && (
                <LayersButton active={showLayers} onToggle={() => setShowLayers((v) => !v)} />
              )}
              {isSpine && <ReloadButton onClick={() => setResetKey((k) => k + 1)} />}
              <SaveButton onClick={handleSave} />
            </VStack>
          );
        })()}

        {/* Bottom-right: platform variant toggle + parts toggles + damaged/broken toggle */}
        {(() => {
          const fixedToggles = layout?.toggles ?? [];
          const isSpine = layout?.kind === 'spine';
          const isFixed = layout?.kind === 'fixed';
          const spinePropParts = isSpine
            ? (layout!.skinGroups?.parts ?? []).filter(
                (p) => p !== 'default' && !p.startsWith('breast/')
                && (!spineAvailableSkins || spineAvailableSkins.has(p))
              )
            : [];

          // Platform/sfw variant keys only (breast handled top-right for spine).
          const hasSpineSfw = isSpine && !!layout?.sfw;
          const fixedHasKr    = isFixed && layout ? layoutHasVariant(layout, 'kr') : false;
          const fixedHasSfw   = isFixed && layout ? layoutHasVariant(layout, 'sfw') : false;
          const fixedHasRplus = isFixed && layout ? layoutHasVariant(layout, 'rplus') : false;
          const variantKeys = isSpine
            ? (hasSpineSfw ? ['base', 'sfw'] : [])
            : (fixedHasKr || fixedHasSfw || fixedHasRplus)
              ? ['base', fixedHasKr && 'kr', fixedHasSfw && 'sfw', fixedHasRplus && 'rplus'].filter(Boolean) as string[]
              : [];
          // `base` icon depends on whether a KR build exists: spine reads the hasKr
          // prop; fixed reads its own kr-variant presence.
          const baseHasKr = isSpine ? !!hasKr : fixedHasKr;
          const variants = variantKeys.map((k) => {
            const meta = variantMeta(k, baseHasKr);
            return { key: k, icon: meta.icon, label: meta.label };
          });

          const hasProps = fixedToggles.length > 0 || spinePropParts.length > 0 || hasDam || hasKr;
          const showRightPanel = variants.length > 0 || hasProps;
          if (!showRightPanel) return null;
          const multiFixed = fixedToggles.length > 1;
          const multiSpine = spinePropParts.length > 1;
          return (
            <HStack position="absolute" bottom={2} right={2} spacing={1} align="flex-end">
              <VariantStrip variants={variants} active={variant}
                onSelect={(k) => setVariant(k as 'base' | 'kr' | 'sfw' | 'rplus')} />
              {hasProps && (
              <VStack bg="blackAlpha.500" borderRadius="md" px={1} py={1} spacing={1}>
              {fixedToggles.map((t, i) => {
                const on = toggles[t.key] ?? t.default;
                const KEY_ICONS: Record<string, string> = {
                  bg: '/images/UI_Lobby_Icon_Props_1.png',
                };
                const icon = KEY_ICONS[t.key] ?? (multiFixed ? `/images/shop/UI_SkinProp_Parts_${i + 1}.png` : '/images/shop/UI_SkinProp_Parts_N.png');
                return (
                  <IconBtn key={t.key} src={icon} alt={t.key}
                    label={on ? `Hide ${t.key}` : `Show ${t.key}`} active={on}
                    onClick={() => setToggles((s) => ({ ...s, [t.key]: !on }))} />
                );
              })}
              {spinePropParts.map((p, i) => {
                const on = spineParts[p] ?? false;
                const icon = multiSpine ? `/images/shop/UI_SkinProp_Parts_${i + 1}.png` : '/images/shop/UI_SkinProp_Parts_N.png';
                const label = p.replace(/^.*\//, '');
                return (
                  <IconBtn key={p} src={icon} alt={label}
                    label={on ? `Hide ${label}` : `Show ${label}`} active={on}
                    onClick={() => setSpineParts((s) => ({ ...s, [p]: !on }))} />
                );
              })}
              {hasDam && onToggleDam && (
                <IconBtn src="/images/shop/UI_Icon_ClothBroken.png" alt="Damaged"
                  label={showDam ? 'Damaged — click for normal' : 'Normal — click for damaged'} active={showDam}
                  onClick={onToggleDam} />
              )}
              {hasKr && onToggleRegion && (
                <Box as="button" onClick={onToggleRegion}
                  px={2} py={1} borderRadius="md" fontSize="xs" fontWeight="bold"
                  bg={viewRegion === 'kr' ? 'yellow.500' : 'whiteAlpha.200'}
                  color={viewRegion === 'kr' ? 'gray.900' : 'gray.300'}
                  _hover={{ bg: viewRegion === 'kr' ? 'yellow.400' : 'whiteAlpha.300' }}
                  transition="background 0.15s" lineHeight="1">
                  {viewRegion === 'kr' ? 'KR' : 'GL'}
                </Box>
              )}
              </VStack>
              )}
            </HStack>
          );
        })()}

        {unavailable && (
          <Box position="absolute" bottom={2} left="50%" transform="translateX(-50%)"
            bg="blackAlpha.700" borderRadius="md" px={3} py={1} pointerEvents="none" maxW="80%" textAlign="center">
            <Text fontSize="xs" color="gray.400">{unavailable}</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
