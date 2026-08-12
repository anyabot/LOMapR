import * as PIXI from 'pixi.js';

import { createEmitters, type EmitterRun } from './skinnedParticles';
import { createRig, type Rig, type SkinnedCollider, type SkinnedDoc } from './skinnedRig';

const PARTICLE_VERTICES = new Float32Array([
  -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5,
]);
const PARTICLE_INDICES = new Uint32Array([0, 1, 2, 0, 2, 3]);

export type SkinnedView = {
  rig: Rig;
  container: PIXI.Container;
  update: (dt: number) => void;
  setParticles: (on: boolean) => void;
  setZones: (on: boolean) => void;
  setVariant: (variant: string) => void;
  setToggle: (key: string, on: boolean) => void;
  setFace: (face: string) => void;
  destroy: () => void;
};

export function mountSkinnedRig(
  doc: SkinnedDoc,
  textures: Record<string, PIXI.Texture>,
  pixelsPerUnit = 100,
): SkinnedView {
  const rig = createRig(doc);
  const container = new PIXI.Container();
  container.scale.set(pixelsPerUnit);
  container.sortableChildren = true;

  const meshes = doc.renderers.map((renderer, index) => {
    const mesh = new PIXI.MeshSimple({
      texture: textures[renderer.tex] ?? PIXI.Texture.WHITE,
      vertices: new Float32Array(rig.buildVertices(index)),
      uvs: new Float32Array(renderer.mesh.uvs),
      indices: new Uint32Array(renderer.mesh.tris),
    });
    mesh.label = renderer.name;
    if (renderer.kind === 'sprite') {
      const [r, g, b] = renderer.color;
      mesh.tint = (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8)
        | Math.round(b * 255);
    }
    container.addChild(mesh);
    return mesh;
  });

  const emitterDefs = doc.particles ?? [];
  const emitters: EmitterRun[] = createEmitters(emitterDefs);
  let particlesOn = emitters.length > 0;
  let showZones = false;
  let activeVariant = 'base';
  let activeFace = '';
  const toggleValues = new Map<string, boolean>((doc.toggles ?? []).map((toggle) =>
    [toggle.key, toggle.default] as const));

  const faceMeshes = (doc.faces ?? []).map((face) => {
    const mesh = new PIXI.MeshSimple({
      texture: textures[face.tex] ?? PIXI.Texture.WHITE,
      vertices: new Float32Array(face.mesh.verts.length),
      uvs: new Float32Array(face.mesh.uvs),
      indices: new Uint32Array(face.mesh.tris),
    });
    const [r, g, b] = face.color;
    mesh.tint = (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8)
      | Math.round(b * 255);
    mesh.alpha = face.color[3];
    mesh.visible = false;
    container.addChild(mesh);
    return { face, mesh };
  });

  const applyNodeOverrides = () => {
    const affected = new Set<number>();
    for (const toggle of doc.toggles ?? []) {
      for (const node of toggle.members ?? []) affected.add(node);
      for (const node of toggle.swapOn ?? []) affected.add(node);
      for (const node of toggle.swapOff ?? []) affected.add(node);
    }
    for (const variant of Object.values(doc.variants ?? {})) {
      for (const entry of variant.active ?? []) affected.add(entry.node);
    }
    for (const node of Array.from(affected)) rig.setNodeOverride(node, null);
    for (const toggle of doc.toggles ?? []) {
      const on = toggleValues.get(toggle.key) ?? toggle.default;
      for (const node of toggle.members ?? []) rig.setNodeOverride(node, on);
      for (const node of toggle.swapOn ?? []) rig.setNodeOverride(node, on);
      for (const node of toggle.swapOff ?? []) rig.setNodeOverride(node, !on);
    }
    for (const entry of doc.variants?.[activeVariant]?.active ?? []) {
      rig.setNodeOverride(entry.node, entry.value);
    }
    rig.refreshWorld();
  };

  const particleLayers = emitterDefs.map((def) => {
    const layer = new PIXI.Container();
    layer.label = def.name;
    layer.zIndex = def.order;
    container.addChild(layer);
    return {
      layer,
      meshes: [] as PIXI.MeshSimple[],
      texture: (def.tex && textures[def.tex]) || PIXI.Texture.WHITE,
    };
  });
  let emitterVisible = emitterDefs.map(() => false);

  const setParticleTexture = (index: number, texture: PIXI.Texture) => {
    const entry = particleLayers[index];
    entry.texture = texture;
    for (const mesh of entry.meshes) mesh.texture = texture;
  };

  const syncParticles = (drawOrder: number[]) => {
    emitterDefs.forEach((def, index) => {
      const entry = particleLayers[index];
      const run = emitters[index];
      if (!particlesOn || def.node < 0) { entry.layer.visible = false; return; }
      entry.layer.visible = rig.visible[def.node] === 1;
      if (!entry.layer.visible) return;

      const m = def.node * 16;
      const w = rig.world;
      const depth = w[m + 11];
      const before = drawOrder.reduce((count, rendererIndex) => {
        const renderer = doc.renderers[rendererIndex];
        if (renderer.order < def.order) return count + 1;
        if (renderer.order > def.order) return count;
        const rendererDepth = w[renderer.node * 16 + 11];
        return count + (rendererDepth >= depth ? 1 : 0);
      }, 0);
      entry.layer.zIndex = before - 0.5;
      // Billboards collapse to screen-aligned quads under an orthographic camera.
      const scale = Math.hypot(w[m], w[m + 4], w[m + 8]);
      const count = Math.min(run.particles.length, 600);
      const cols = Math.max(1, def.tiles[0]);
      const rows = Math.max(1, def.tiles[1]);
      while (entry.meshes.length < count) {
        const mesh = new PIXI.MeshSimple({
          texture: entry.texture,
          vertices: PARTICLE_VERTICES.slice(),
          uvs: new Float32Array(8),
          indices: PARTICLE_INDICES.slice(),
        });
        mesh.blendMode = def.blend === 'add' ? 'add' : 'normal';
        entry.layer.addChild(mesh);
        entry.meshes.push(mesh);
      }

      for (let i = 0; i < count; i += 1) {
        const p = run.particles[i];
        const mesh = entry.meshes[i];
        const cx = w[m] * p.x + w[m + 1] * p.y + w[m + 2] * p.z + w[m + 3];
        const cy = -(w[m + 4] * p.x + w[m + 5] * p.y + w[m + 6] * p.z + w[m + 7]);
        mesh.visible = true;
        mesh.position.set(cx, cy);
        mesh.scale.set(p.size * scale, p.sizeY * scale);
        mesh.rotation = p.angle;
        mesh.tint = (Math.round(p.r * 255) << 16) | (Math.round(p.g * 255) << 8)
          | Math.round(p.b * 255);
        mesh.alpha = p.a;
        const frame = p.frame % (cols * rows);
        const col = frame % cols;
        const row = Math.floor(frame / cols);
        const u0 = col / cols, u1 = (col + 1) / cols;
        const v0 = row / rows, v1 = (row + 1) / rows;
        const uvs = mesh.geometry.getBuffer('aUV').data as Float32Array;
        uvs.set([u0, v1, u1, v1, u1, v0, u0, v0]);
        mesh.geometry.getBuffer('aUV').update();
      }
      for (let i = count; i < entry.meshes.length; i += 1) entry.meshes[i].visible = false;
    });
  };

  const hit = new PIXI.Graphics();
  hit.eventMode = 'static';
  hit.cursor = 'pointer';
  hit.zIndex = 1e6;
  container.addChild(hit);

  const overlay = new PIXI.Graphics();
  overlay.eventMode = 'none';
  overlay.zIndex = 1e6 + 1;
  overlay.visible = false;
  container.addChild(overlay);

  const zoneRect = (zone: SkinnedCollider) => {
    const m = zone.node * 16;
    const w = rig.world;
    const [cx, cy, cz] = zone.center;
    const px = w[m] * cx + w[m + 1] * cy + w[m + 2] * cz + w[m + 3];
    const py = -(w[m + 4] * cx + w[m + 5] * cy + w[m + 6] * cz + w[m + 7]);
    const sx = Math.hypot(w[m], w[m + 4], w[m + 8]);
    const sy = Math.hypot(w[m + 1], w[m + 5], w[m + 9]);
    const width = zone.size[0] * sx;
    const height = zone.size[1] * sy;
    return { x: px - width / 2, y: py - height / 2, width, height };
  };

  const drawHit = () => {
    hit.clear();
    overlay.clear();
    overlay.visible = showZones;
    let span = 0;
    for (const zone of rig.colliders) {
      if (zone.node < 0) continue;
      const r = zoneRect(zone);
      hit.rect(r.x, r.y, r.width, r.height);
      span = Math.max(span, r.width, r.height);
    }
    hit.fill({ color: 0xffffff, alpha: 0.0001 });
    if (!showZones) return;
    for (const zone of rig.colliders) {
      if (zone.node < 0) continue;
      const r = zoneRect(zone);
      overlay.rect(r.x, r.y, r.width, r.height).stroke({
        color: zone.key === 'body' ? 0x4488ff : 0xff4444,
        width: span * 0.01,
        alpha: 0.8,
      });
    }
  };

  hit.on('pointertap', (event: PIXI.FederatedPointerEvent) => {
    const local = container.toLocal(event.global);
    const zone = rig.hitZone(local.x, local.y);
    if (!zone) return;
    rig.trigger(zone.key === 'body' ? 'Tep_1' : 'breast');
  });

  const sync = () => {
    const variant = doc.variants?.[activeVariant];
    const order = rig.drawOrder();
    order.forEach((index, position) => {
      const mesh = meshes[index];
      const shown = rig.isVisible(index);
      mesh.visible = shown;
      if (!shown) return;
      mesh.zIndex = position;
      mesh.alpha = rig.alpha[index];
      const baseTexture = rig.textureName(index);
      mesh.texture = textures[variant?.textures?.[baseTexture] ?? baseTexture]
        ?? PIXI.Texture.WHITE;
      const vertices = rig.buildVertices(index);
      const positionBuffer = mesh.geometry.getBuffer('aPosition');
      if (positionBuffer.data.length !== vertices.length) {
        positionBuffer.data = new Float32Array(vertices);
      } else (positionBuffer.data as Float32Array).set(vertices);
      positionBuffer.update();
    });
    for (const { face, mesh } of faceMeshes) {
      mesh.visible = face.key === activeFace && rig.visible[face.node] === 1;
      if (!mesh.visible) continue;
      const m = face.node * 16;
      const source = face.mesh.verts;
      const target = mesh.geometry.getBuffer('aPosition').data as Float32Array;
      const fx = face.flip[0] ? -1 : 1, fy = face.flip[1] ? -1 : 1;
      for (let i = 0; i < source.length; i += 2) {
        const x = source[i] * fx, y = source[i + 1] * fy;
        target[i] = rig.world[m] * x + rig.world[m + 1] * y + rig.world[m + 3];
        target[i + 1] = -(rig.world[m + 4] * x + rig.world[m + 5] * y + rig.world[m + 7]);
      }
      mesh.zIndex = order.reduce((position, renderer) =>
        position + (doc.renderers[renderer].order <= face.order ? 1 : 0), 0) - 0.5;
      mesh.geometry.getBuffer('aPosition').update();
    }
    syncParticles(order);
    drawHit();
  };

  applyNodeOverrides();
  sync();

  return {
    rig,
    container,
    update(dt: number) {
      rig.advance(dt);
      emitterDefs.forEach((def, index) => {
        const visible = particlesOn && def.playOnAwake && def.node >= 0
          && rig.visible[def.node] === 1;
        if (visible && !emitterVisible[index]) emitters[index].reset();
        if (visible) emitters[index].advance(dt);
        else if (emitterVisible[index]) emitters[index].reset();
        emitterVisible[index] = visible;
      });
      sync();
    },
    setParticles(on: boolean) {
      particlesOn = on;
      if (on) for (const emitter of emitters) emitter.reset();
      emitterVisible = emitterDefs.map(() => false);
      sync();
    },
    setZones(on: boolean) { showZones = on; sync(); },
    setVariant(variant: string) {
      activeVariant = doc.variants?.[variant] ? variant : 'base';
      const replacements = doc.variants?.[activeVariant]?.meshes ?? {};
      doc.renderers.forEach((renderer, index) => {
        const replacement = replacements[String(index)] ?? null;
        rig.setMeshVariant(index, replacement);
        const activeMesh = replacement ?? renderer.mesh;
        const display = meshes[index];
        display.geometry.getBuffer('aUV').data = new Float32Array(activeMesh.uvs);
        display.geometry.getBuffer('aUV').update();
        display.geometry.indexBuffer.data = new Uint32Array(activeMesh.tris);
        display.geometry.indexBuffer.update();
      });
      emitterDefs.forEach((def, index) => {
        const tex = def.tex ? (doc.variants?.[activeVariant]?.textures?.[def.tex] ?? def.tex) : '';
        setParticleTexture(index, textures[tex] ?? PIXI.Texture.WHITE);
      });
      applyNodeOverrides();
      sync();
    },
    setToggle(key: string, on: boolean) {
      toggleValues.set(key, on);
      applyNodeOverrides();
      sync();
    },
    setFace(face: string) { activeFace = face; sync(); },
    destroy() {
      container.destroy({ children: true });
    },
  };
}
