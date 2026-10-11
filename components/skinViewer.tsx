import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Center, Spinner, Text } from '@chakra-ui/react';
import { readText, revokeArchiveUrls } from '@altterisk/game-hub/archive';
import {
  attachPanZoom, createPixiApp, loadSpineAtlas, loadTexture, readSkeletonJson, saveStagePng,
  type PixiAppHandle,
} from '@altterisk/game-hub/spine';
import { ControlRow, ControlSection, LayerPanel, SegmentedControl, ToggleRow, ViewerShell } from '@altterisk/game-hub/viewer';
import { loadSkinArchive } from '../lib/skinArchive';
import {
  CaptureSection, FaceRow, IncludedSection, PlaybackSection, VariantRow, useCanvasRecorder, useViewerSpeed,
} from './skinViewer/chrome';
import type { SpriteInfo, SkinNode, FixedFace, Layout } from './skinViewer/types';
import { baseSkinKey, layoutHasVariant, zAngle, meshSourcePixelScale } from './skinViewer/types';

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
  const [theater, setTheater] = useState(false);

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

  // A remount starts a fresh instance; `playing` is deliberately not reset here.
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

  // The PNG comes back through the 'screenshot' message above and downloads there.
  const handleSave = () => {
    if (saving) return;
    setSaving(true);
    send({ type: 'screenshot' });
    // Safety: clear the spinner if Unity never answers (e.g. old build).
    setTimeout(() => setSaving(false), 8000);
  };

  // key forces a full iframe remount on reset so the Unity model reloads.
  const iframeSrc = `${UNITY_VIEWER_BASE}/index.html?model=${encodeURIComponent(baseSkin)}`;

  const variantKeys = ['base', ...availableVariants];
  return (
    <ViewerShell height={height} theater={theater} onTheaterChange={setTheater}
      stage={
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
      }
      panel={<>
        <PlaybackSection playing={playing} onTogglePlay={() => setPlaying((v) => !v)}
          onRestart={() => setResetKey((k) => k + 1)} />
        <CaptureSection onSave={handleSave} saving={saving} theater={theater} onTheater={setTheater} />
        <ControlSection title="Appearance">
          {faceList.length > 0 && (
            <FaceRow value={face} onChange={setFace}
              options={[{ value: '', label: '(none)' },
                ...faceList.map((f) => ({ value: f, label: f.replace(/^face\/.*_/, '') }))]} />
          )}
          {variantKeys.length > 1 && (
            <VariantRow keys={variantKeys} active={variant} hasKr={availableVariants.includes('kr')} onSelect={setVariant} />
          )}
          {hasParts && <ToggleRow label="Parts" value={showParts} onChange={setShowParts} />}
          {hasBg && <ToggleRow label="Background" value={showBg} onChange={setShowBg} />}
          {hasDam && onToggleDam && <ToggleRow label="Damaged" value={!!showDam} onChange={() => onToggleDam()} />}
        </ControlSection>
        <ControlSection title="Display">
          <ToggleRow label="Touch zones" value={showZones} onChange={setShowZones} />
        </ControlSection>
        <IncludedSection parts={parts} />
        <Text fontSize="xs" color="whiteAlpha.400" textAlign="right" px={1}>
          Viewer by{' '}
          <Box as="a" href="https://lo.swaytwig.com" target="_blank" rel="noopener noreferrer"
            color="whiteAlpha.500" textDecoration="underline" _hover={{ color: 'whiteAlpha.700' }}>
            Wolfgang
          </Box>
        </Text>
      </>}
    />
  );
}

type SkinViewerProps = {
  skin: string; height?: string | number; parts?: string[];
  hasDam?: boolean; showDam?: boolean; onToggleDam?: () => void;
  unavailable?: string; viewerKind?: string; hasRplus?: boolean; hasBg?: boolean;
  hasKr?: boolean; viewRegion?: 'global' | 'kr'; onToggleRegion?: () => void;
};

// getLocalBounds counts hidden children, which would shrink the model.
function visibleBounds(container: any) {
  const scale = container.scale.x;
  const px = container.position.x;
  const py = container.position.y;
  container.scale.set(1);
  container.position.set(0, 0);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const child of container.children) {
    if (!child.visible || typeof child.getBounds !== 'function') continue;
    const b = child.getBounds();
    if (!isFinite(b.minX) || !b.width || !b.height) continue;
    minX = Math.min(minX, b.minX); maxX = Math.max(maxX, b.maxX);
    minY = Math.min(minY, b.minY); maxY = Math.max(maxY, b.maxY);
  }
  container.scale.set(scale);
  container.position.set(px, py);
  if (!isFinite(minX)) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

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
  const [theater, setTheater] = useState(false);
  const [speed, setSpeed] = useViewerSpeed();
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const recorder = useCanvasRecorder(() => appRef.current?.canvas, skin);
  const archiveSuffix = baseDoc?.variants?.[variant]?.archive ?? '';
  const archiveSkin = `${skin}${archiveSuffix}`;
  const fullVariant = archiveSuffix !== '';
  const variantRef = useRef(variant);
  const fullVariantRef = useRef(fullVariant);
  variantRef.current = variant;
  fullVariantRef.current = fullVariant;

  useEffect(() => {
    let destroyed = false;
    let pixi: PixiAppHandle | null = null;
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

      pixi = await createPixiApp({ PIXI, host: hostRef.current, cancelled: () => destroyed, fixBlend: true });
      if (!pixi) return;
      const app = pixi.app;
      appRef.current = app;

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
        const bounds = visibleBounds(view.container);
        if (!bounds || !bounds.width || !bounds.height) return;
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
        if (playingRef.current) view.update(Math.min(ticker.deltaMS / 1000, 1 / 20) * speedRef.current);
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
      pixi?.dispose();
      revokeArchiveUrls(archiveSkin);
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
    // extract renders the container in local (world-unit) space, ignoring its fit scale.
    const bounds = visibleBounds(view.container);
    const span = bounds ? Math.max(bounds.width, bounds.height) : 0;
    const density = view.texelDensity() || 2;
    const resolution = span > 0 ? Math.min(density, 8192 / span) : density;
    const canvas = app.renderer.extract.canvas({ target: view.container, resolution }) as HTMLCanvasElement;
    view.setZones(zones);
    const anchor = document.createElement('a');
    anchor.href = canvas.toDataURL('image/png');
    anchor.download = `${skin}.png`;
    anchor.click();
  };

  return (
    <ViewerShell height={height} theater={theater} onTheaterChange={setTheater}
      stage={<>
        <Box ref={hostRef} position="absolute" inset={0} opacity={loadState === 'ready' ? 1 : 0} />
        {loadState !== 'ready' && (
          <Center position="absolute" inset={0} color="gray.500" pointerEvents="none"
            flexDirection="column" gap={2}>
            <Spinner />
            <Text fontSize="sm">{loadState === 'unpacking' ? 'unpacking…' : 'fetching…'}</Text>
          </Center>
        )}
      </>}
      panel={<>
        <PlaybackSection playing={playing} onTogglePlay={() => setPlaying((value) => !value)}
          onRestart={() => { setVariant('base'); setResetKey((value) => value + 1); }}
          speed={speed} onSpeed={setSpeed} />
        <CaptureSection onSave={handleSave} recorder={recorder} theater={theater} onTheater={setTheater} />
        <ControlSection title="Appearance">
          {doc && doc.faces && doc.faces.length > 0 && (
            <FaceRow value={face} onChange={setFace}
              options={[{ value: '', label: '(none)' },
                ...doc.faces.map((item) => ({ value: item.key, label: item.key }))]} />
          )}
          {variants.length > 1 && (
            <VariantRow keys={variants} active={variant} hasKr={variants.includes('kr')} onSelect={setVariant} />
          )}
          {hasPartsToggle && (
            <ToggleRow label="Parts" value={toggles.parts ?? true}
              onChange={(on) => setToggles((value) => ({ ...value, parts: on }))} />
          )}
          {hasBgToggle && (
            <ToggleRow label="Background" value={toggles.bg ?? true}
              onChange={(on) => setToggles((value) => ({ ...value, bg: on }))} />
          )}
          {hasDam && onToggleDam && <ToggleRow label="Damaged" value={!!showDam} onChange={() => onToggleDam()} />}
        </ControlSection>
        <ControlSection title="Display">
          {(doc?.colliders?.length ?? 0) > 0 && <ToggleRow label="Touch zones" value={zones} onChange={setZones} />}
        </ControlSection>
        <IncludedSection parts={parts} />
      </>}
    />
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
  // Every slot the composition can draw (skeleton draw order), and those hidden.
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
  const [theater, setTheater] = useState(false);
  const [speed, setSpeed] = useViewerSpeed();
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const recorder = useCanvasRecorder(() => appRef.current?.canvas, skin);

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
      revokeArchiveUrls(skin);
    };
  }, [skin, resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const nodesByIdRef = useRef<Record<string, any>>({});
  // The [playing]-only pause effect won't re-fire when only resetKey changed.
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const fixedFaceRef = useRef<string>('');
  fixedFaceRef.current = fixedFace;
  const setFixedFaceRef = useRef<((key: string | null) => void) | null>(null);
  // Flattened out of the transform tree, so toggles must drive `renderable`.
  const flatMeshesRef = useRef<{ mesh: any; wrapper: any; order: number; chain: string[]; sprite: SpriteInfo }[]>([]);
  const texturesRef = useRef<Record<string, any>>({});
  const togglesRef = useRef<Record<string, boolean>>({});
  togglesRef.current = toggles;
  useEffect(() => {
    if (!layout || layout.kind === 'spine' || layout.skin !== baseSkinKey(skin)) return;
    let destroyed = false;
    let pixi: PixiAppHandle | null = null;

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

      if (!hostRef.current) return;
      pixi = await createPixiApp({ PIXI, host: hostRef.current, cancelled: () => destroyed, fixBlend: true });
      if (!pixi) return;
      const app = pixi.app;
      appRef.current = app;

      const ppu = layout.ppu || 100;
      const byId: Record<string, any> = {};
      // Unity sorts scene-wide but zIndex sorts per parent, so leaves draw flat.
      const flatMeshes: { mesh: any; wrapper: any; order: number; chain: string[]; sprite: SpriteInfo; pixelScale: number; isBody: boolean }[] = [];
      // The empty face node, to overlay the chosen expression mesh at that spot.
      let faceAnchorMat: any = null;
      let faceAnchorChain: string[] = [];
      let faceAnchorOrder = 0;

      // World matrices are explicit: PixiJS worldTransform is only valid post-render.
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
          // The wrapper carries the world matrix; the mesh keeps its own flip.
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
      // Only `body` sets export resolution; effect/letterbox sprites are oversized.
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

      // Toggles are applied here: their effect fired before this async build ended.
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

      // Face overlay at the empty face node; applyFace(null) clears it.
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
      pixi?.dispose();
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
    let pixi: PixiAppHandle | null = null;
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
      const spineModule = await import('@esotericsoftware/spine-pixi-v8') as any;
      const { Spine, Skin, Physics } = spineModule;
      const files = filesRef.current;
      if (!files) return;

      if (!layout.atlas || !layout.skel) return;
      const sfwMeta = layout.sfw ?? null;
      const sfwHasSkel = !!(sfwMeta?.skel);

      const loadAtlas = (atlasName: string, overrides: Record<string, string> = {}) =>
        loadSpineAtlas({ PIXI, spine: spineModule, name: skin, files, atlasName, overrides });

      // Always load base atlas/skel
      const baseAtlas = await loadAtlas(layout.atlas);
      if (destroyed) return;

      // A differing sfw skeleton needs its own atlas; differing textures only preload.
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

      const baseSkelJson = await readText(files, layout.skel);
      if (destroyed) return;
      const skeletonData = readSkeletonJson({ spine: spineModule, atlas: baseAtlas }, baseSkelJson);

      // Some prefabs hold several SkeletonMecanim objects; actor zero stays top-level.
      const extraActorData = await Promise.all((layout.actors ?? []).slice(1).map(async (actor) => {
        const atlas = await loadAtlas(actor.atlas);
        const skeletonData = readSkeletonJson({ spine: spineModule, atlas }, await readText(files, actor.skel));
        return { actor, atlas, skeletonData };
      }));
      if (destroyed) return;

      // If sfw has a different skeleton, build it too
      let sfwSkeletonData: any = null;
      if (sfwHasSkel && sfwMeta?.skel && sfwAtlas) {
        const sfwSkelJson = await readText(files, sfwMeta.skel);
        if (destroyed) return;
        sfwSkeletonData = readSkeletonJson({ spine: spineModule, atlas: sfwAtlas }, sfwSkelJson);
      }

      if (!hostRef.current) return;
      pixi = await createPixiApp({ PIXI, host: hostRef.current, cancelled: () => destroyed, fixBlend: true });
      if (!pixi) return;
      const app = pixi.app;
      appRef.current = app;

      const W = layout.world ?? {};

      // Load BG textures (base + sfw if different)
      let bgTexBase: any = null;
      let bgTexSfw: any = null;
      if (W.bg) {
        bgTexBase = await loadTexture(PIXI, skin, files, W.bg.tex);
        const sfwBgName = sfwMeta?.textures?.[W.bg.tex];
        bgTexSfw = sfwBgName ? await loadTexture(PIXI, skin, files, sfwBgName) : null;
      }
      if (destroyed) { pixi?.dispose(); return; }

      spineBgTexRef.current = bgTexBase ? { base: bgTexBase, sfw: bgTexSfw ?? bgTexBase } : null;

      const isSfw = variantRef.current === 'sfw';

      // Clearing a slot is not self-reversible; track what to restore on un-hide.
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

      // The play/speed effect won't re-fire for a build triggered by resetKey.
      const timeScale = playingRef.current ? speedRef.current : 0;
      spine.state.timeScale = timeScale;
      if (spineSfw) spineSfw.state.timeScale = timeScale;
      for (const a of actorInstances.slice(1)) a.base.state.timeScale = timeScale;

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

      // Read from the composed skin: the layer editor clears the live slots.
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

      // Duplicate names collapse into one row, because hiding matches by name.
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
          // Special zones sit inside the body zone, so the smallest hit wins.
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
          // Per-zone rects, not figure bounds, so events fire only over a zone.
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

      const nativePixelScale = Math.max(1, ...[
        baseAtlas, sfwAtlas, ...extraActorData.map((item) => item.atlas),
      ].filter(Boolean).flatMap((atlas: any) => atlas.pages.map((page: any) => {
        const source = page.texture?.texture?.source;
        if (!source?.width || !source?.height) return 1;
        return Math.max(page.width / source.width, page.height / source.height);
      })));
      spinePixelScaleRef.current = () => nativePixelScale;
      app.renderer.on('resize', fit);

      attachPanZoom(app.canvas as HTMLCanvasElement, root, zoneLayer ? {
        onTransform: (r) => {
          zoneLayer.scale.set(r.scale.x);
          zoneLayer.position.set(r.position.x, r.position.y);
        },
      } : {});
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
      pixi?.dispose();
    };
  }, [layout, skin]);

  useEffect(() => {
    const spine = spineRef.current;
    // Spine-pixi v8 auto-updates via its own ticker listener; pause by setting timeScale.
    const timeScale = playing ? speed : 0;
    if (spine) {
      if (spineActorsRef.current.size) {
        for (const a of Array.from(spineActorsRef.current.values())) {
          a.base.state.timeScale = timeScale;
          if (a.sfw) a.sfw.state.timeScale = timeScale;
        }
      } else {
        spine.state.timeScale = timeScale;
        if (spineSfwRef.current) spineSfwRef.current.state.timeScale = timeScale;
      }
    }
  }, [playing, speed]);

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
    // A toggle that is on forces its members visible, overriding scene n.active.
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
    // Flattened leaves get no `visible` cascade; recompute from the ancestor chain.
    for (const { wrapper, chain } of flatMeshesRef.current) {
      wrapper.renderable = chain.every((id) => byId[id]?.visible);
    }
    if (bgSpriteRef.current) {
      bgSpriteRef.current.visible = toggles['bg'] ?? true;
    }
    // A Unity GameObject id can also name a whole SkeletonMecanim actor.
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
    const app = appRef.current, root = rootRef.current, PIXI = pixiRef.current;
    if (!app || !root || !PIXI) return;
    const overlay = zoneOverlayRef.current;
    const overlayWasVisible = overlay?.visible ?? false;
    if (overlay) overlay.visible = false;
    const pixelScale = layout?.kind === 'spine' ? spinePixelScaleRef.current() : 1 / u2pxRef.current;
    try {
      // The stage is rendered synchronously inside the call, so the overlay can be restored right after.
      void saveStagePng({ PIXI, app, root, pixelScale, oversize: 'refuse', fileName: `${skin}.png` });
    } finally {
      if (overlay) overlay.visible = overlayWasVisible;
    }
  };

  const isSpine = layout?.kind === 'spine';
  const isFixed = layout?.kind === 'fixed';
  const spinePartNames = layout?.skinGroups?.parts ?? [];
  const skinAvail = (k: string) => !spineAvailableSkins || spineAvailableSkins.has(k);
  const rplusKey = spinePartNames.find((p) => p.toLowerCase() === 'breast/rplus') ?? null;
  const breastVariants = isSpine ? [
    spinePartNames.includes('breast/Censorship') && skinAvail('breast/Censorship') && { key: 'breast/Censorship', label: 'Censored' },
    spinePartNames.includes('breast/Unedited') && skinAvail('breast/Unedited') && { key: 'breast/Unedited', label: 'Unedited' },
    rplusKey && skinAvail(rplusKey) && { key: rplusKey, label: 'R+' },
  ].filter(Boolean) as { key: string; label: string }[] : [];
  const hasZones = isSpine && (layout?.world?.zones?.length ?? 0) > 0;
  const spinePropParts = isSpine
    ? spinePartNames.filter((p) => p !== 'default' && !p.startsWith('breast/') && skinAvail(p))
    : [];
  const variantKeys = isSpine
    ? (layout?.sfw ? ['base', 'sfw'] : [])
    : isFixed && layout
      ? ['base', ...(['kr', 'sfw', 'rplus'] as const).filter((k) => layoutHasVariant(layout, k))]
      : [];
  // Spine learns of a KR build from the prop; fixed from its own variants.
  const baseHasKr = isSpine ? !!hasKr : variantKeys.includes('kr');
  const faceOptions = isSpine
    ? (layout?.skinGroups?.faces ?? []).map((f) => ({ value: f, label: f.replace(/^face\/.*_/, '') }))
    : isFixed && (layout?.faces?.length ?? 0) > 0
      ? [{ value: '', label: '(none)' }, ...layout!.faces!.map((f) => ({ value: f.key, label: f.key }))]
      : [];
  const toggleLabel = (key: string) => (key === 'bg' ? 'Background' : key === 'parts' ? 'Parts' : key);
  const layerItems = useMemo(
    () => [...spineSlots].reverse().map((slot) => ({ slot, attachment: slot, group: 'Front to back' })),
    [spineSlots],
  );

  return (
    <Box>
      {error && <Text color="red.400" fontSize="sm" mb={1}>{error}</Text>}
      <ViewerShell height={height} theater={theater} onTheaterChange={setTheater}
        stage={<>
          <Box ref={hostRef} position="absolute" inset={0} opacity={loadState === 'ready' ? 1 : 0} />
          {loadState !== 'ready' && !error && (
            <Center position="absolute" inset={0} color="gray.500" pointerEvents="none" flexDirection="column" gap={2}>
              <Spinner />
              <Text fontSize="sm">{loadState === 'unpacking' ? 'unpacking…' : 'fetching…'}</Text>
            </Center>
          )}
          {unavailable && (
            <Box position="absolute" bottom={2} left="50%" transform="translateX(-50%)"
              bg="blackAlpha.700" borderRadius="md" px={3} py={1} pointerEvents="none" maxW="80%" textAlign="center">
              <Text fontSize="xs" color="gray.400">{unavailable}</Text>
            </Box>
          )}
        </>}
        panel={<>
          {isSpine && (
            <PlaybackSection playing={playing} onTogglePlay={() => setPlaying((v) => !v)}
              onRestart={() => setResetKey((k) => k + 1)} speed={speed} onSpeed={setSpeed} />
          )}
          <CaptureSection onSave={handleSave} recorder={recorder} theater={theater} onTheater={setTheater} />
          <ControlSection title="Appearance">
            {faceOptions.length > 0 && (
              <FaceRow value={isSpine ? spineFace : fixedFace} options={faceOptions}
                onChange={isSpine ? setSpineFace : setFixedFace} />
            )}
            {variantKeys.length > 1 && (
              <VariantRow keys={variantKeys} active={variant} hasKr={baseHasKr}
                onSelect={(k) => setVariant(k as 'base' | 'kr' | 'sfw' | 'rplus')} />
            )}
            {breastVariants.map((v) => (
              <ToggleRow key={v.key} label={v.label} value={spineBreast.includes(v.key)}
                onChange={(on) => setSpineBreast((prev) => (on ? [...prev, v.key] : prev.filter((k) => k !== v.key)))} />
            ))}
            {(layout?.toggles ?? []).map((t) => (
              <ToggleRow key={t.key} label={toggleLabel(t.key)} value={toggles[t.key] ?? t.default}
                onChange={(on) => setToggles((prev) => ({ ...prev, [t.key]: on }))} />
            ))}
            {spinePropParts.map((p) => (
              <ToggleRow key={p} label={p.replace(/^.*\//, '')} value={spineParts[p] ?? false}
                onChange={(on) => setSpineParts((prev) => ({ ...prev, [p]: on }))} />
            ))}
            {hasDam && onToggleDam && <ToggleRow label="Damaged" value={showDam} onChange={() => onToggleDam()} />}
            {hasKr && onToggleRegion && (
              <ControlRow label="Region">
                <SegmentedControl value={viewRegion === 'kr' ? 'kr' : 'global'} ariaLabel="Skin region"
                  onChange={() => onToggleRegion()}
                  options={[{ value: 'global', label: 'GL' }, { value: 'kr', label: 'KR' }]} />
              </ControlRow>
            )}
          </ControlSection>
          <ControlSection title="Display">
            {hasZones && <ToggleRow label="Touch zones" value={showZones} onChange={setShowZones} />}
            {isSpine && spineSlots.length > 0 && <ToggleRow label="Layers" value={showLayers} onChange={setShowLayers} />}
          </ControlSection>
          {isSpine && showLayers && spineSlots.length > 0 && (
            <LayerPanel items={layerItems} hidden={hiddenSlotSet}
              onSet={(slots, hide) => setHiddenSlots((prev) => (hide
                ? Array.from(new Set([...prev, ...slots]))
                : prev.filter((s) => !slots.includes(s))))}
              onReset={() => setHiddenSlots([])}
              onClose={() => setShowLayers(false)} />
          )}
          <IncludedSection parts={parts} />
        </>}
      />
    </Box>
  );
}
