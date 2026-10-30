import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { HStack, Image, Tooltip, Wrap, WrapItem } from '@altterisk/game-hub/ui';
import {
  ActionButton, ControlRow, ControlSection, OverlaySelect, SegmentedControl, ToggleRow,
} from '@altterisk/game-hub/viewer';
import { canRecordCanvas, startCanvasVideo, type VideoRecording } from '@altterisk/game-hub/spine';

export const SPEED_OPTIONS = [0.25, 0.5, 1, 1.5, 2].map((v) => ({ value: String(v), label: `${v}×` }));

// Session-wide, so switching skins keeps the chosen speed.
let sessionSpeed = 1;
const speedListeners = new Set<() => void>();
export function useViewerSpeed(): [number, (speed: number) => void] {
  const speed = useSyncExternalStore(
    (cb) => { speedListeners.add(cb); return () => { speedListeners.delete(cb); }; },
    () => sessionSpeed,
    () => 1,
  );
  return [speed, (next) => { sessionSpeed = next; speedListeners.forEach((cb) => cb()); }];
}

export type CanvasRecorder = { supported: boolean; recording: boolean; toggle: () => void };

export function useCanvasRecorder(getCanvas: () => HTMLCanvasElement | null | undefined, fileName: string): CanvasRecorder {
  const ref = useRef<VideoRecording | null>(null);
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(false);
  useEffect(() => setSupported(canRecordCanvas()), []);
  useEffect(() => () => {
    ref.current?.cancel();
    ref.current = null;
    setRecording(false);
  }, [fileName]);
  const toggle = () => {
    if (ref.current) { ref.current.stop(); return; }
    const canvas = getCanvas();
    if (!canvas) return;
    const rec = startCanvasVideo({
      canvas, fileName,
      onStop: () => {
        if (ref.current !== rec) return;
        ref.current = null;
        setRecording(false);
      },
    });
    if (!rec) return;
    ref.current = rec;
    setRecording(true);
  };
  return { supported, recording, toggle };
}

export function PlaybackSection({ playing, onTogglePlay, onRestart, speed, onSpeed }: {
  playing?: boolean;
  onTogglePlay?: () => void;
  onRestart?: () => void;
  speed?: number;
  onSpeed?: (speed: number) => void;
}) {
  return (
    <ControlSection title="Playback">
      {(onTogglePlay || onRestart) && (
        <Wrap spacing={1} justify="flex-end">
          {onTogglePlay && (
            <WrapItem>
              <ActionButton icon={playing ? 'pause' : 'play'} label={playing ? 'Pause' : 'Play'} onClick={onTogglePlay} />
            </WrapItem>
          )}
          {onRestart && <WrapItem><ActionButton icon="reload" label="Restart" onClick={onRestart} /></WrapItem>}
        </Wrap>
      )}
      {onSpeed && speed != null && (
        <ControlRow label="Speed">
          <OverlaySelect icon="speed" value={String(speed)} options={SPEED_OPTIONS} minW="0" label="Playback speed"
            onChange={(v) => onSpeed(Number(v))} />
        </ControlRow>
      )}
    </ControlSection>
  );
}

export function CaptureSection({ onSave, saving = false, recorder, theater, onTheater }: {
  onSave: () => void;
  saving?: boolean;
  recorder?: CanvasRecorder;
  theater: boolean;
  onTheater: (on: boolean) => void;
}) {
  return (
    <ControlSection title="Capture">
      <Wrap spacing={1} justify="flex-end">
        <WrapItem><ActionButton icon="save" label="Save PNG" onClick={onSave} busy={saving} /></WrapItem>
        {recorder?.supported && (
          <WrapItem>
            <ActionButton icon="record" label={recorder.recording ? 'Stop recording' : 'Record video'}
              active={recorder.recording} onClick={recorder.toggle} />
          </WrapItem>
        )}
      </Wrap>
      <ToggleRow label="Theatre" value={theater} onChange={onTheater} />
    </ControlSection>
  );
}

export function FaceRow({ value, options, onChange }: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  if (!options.length) return null;
  return (
    <ControlRow label="Face">
      <OverlaySelect icon="face" value={value} options={options} onChange={onChange} minW="0" label="Face expression" />
    </ControlRow>
  );
}

// `base` depends on whether a KR variant exists.
export function variantMeta(key: string, hasKr: boolean): { icon: string; label: string; short: string } {
  const map: Record<string, { icon: string; label: string; short: string }> = {
    base:  { icon: hasKr ? '/images/shop/icon-platform-vfun.png' : '/images/shop/icon-platform-onestore.png', label: 'Uncensored', short: 'Original' },
    kr:    { icon: '/images/shop/icon-platform-onestore.png', label: 'KR (Uncensored)', short: 'KR' },
    sfw:   { icon: '/images/shop/icon-platform-google.png',   label: 'Censored (Google Play)', short: 'Censored' },
    rplus: { icon: '/images/shop/icon-secret-marks.png',      label: 'R+ (Uncensored)', short: 'R+' },
  };
  return map[key] ?? { icon: '/images/shop/icon-platform-onestore.png', label: key, short: key };
}

export function VariantRow({ keys, active, hasKr, onSelect }: {
  keys: string[];
  active: string;
  hasKr: boolean;
  onSelect: (key: string) => void;
}) {
  if (keys.length < 2) return null;
  return (
    <ControlRow label="Version">
      <SegmentedControl value={active} onChange={onSelect} ariaLabel="Skin version"
        options={keys.map((key) => {
          const meta = variantMeta(key, hasKr);
          return { value: key, label: meta.short, title: meta.label, image: meta.icon };
        })} />
    </ControlRow>
  );
}

export const PARTS_META: Record<string, { icon: string; label: string }> = {
  LOBBY_ANIMATION:        { icon: '/images/shop/UI_ShopL2DIcon.png',        label: 'Live 2D lobby animation' },
  VOICE:                  { icon: '/images/shop/UI_ShopVoiceIcon.png',       label: 'Voice' },
  SD_EFFECT:              { icon: '/images/shop/UI_ShopFxIcon.png',          label: 'SD battle effects' },
  SD_ANIMATION:           { icon: '/images/shop/UI_ShopSDAnimIcon.png',      label: 'SD battle animation' },
  PROPS:                  { icon: '/images/shop/UI_ShopObjectIcon.png',      label: 'Props / objects' },
  DAMAGE_IMAGE:           { icon: '/images/shop/UI_ShopDamagedIcon.png',     label: 'Damaged skin image' },
  DAMAGE_LOBBY_ANIMATION: { icon: '/images/shop/UI_ShopDamagedL2DIcon.png', label: 'Damaged Live 2D animation' },
};

export function IncludedSection({ parts }: { parts: string[] }) {
  const known = parts.filter((p) => PARTS_META[p]);
  return (
    <ControlSection title="Skin includes">
      {known.length > 0 && (
        <HStack spacing={1} flexWrap="wrap">
          {known.map((p) => (
            <Tooltip key={p} label={PARTS_META[p].label} fontSize="xs" hasArrow placement="top">
              <Image src={PARTS_META[p].icon} alt={PARTS_META[p].label} boxSize="32px" />
            </Tooltip>
          ))}
        </HStack>
      )}
    </ControlSection>
  );
}
