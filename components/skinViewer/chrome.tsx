// Shared overlay chrome for the skin viewers. The fixed/spine (PixiJS) and
// skinned (Unity iframe) viewers host different engines but wear the same UI:
// a face dropdown, save/reload buttons, a variant radio strip, and a control
// bar. These presentational components are fed each viewer's own state so the
// markup lives in one place.
import { Box, HStack, Image, Select, Spinner, Text, Tooltip } from '@chakra-ui/react';

// Icon-button used in the canvas overlay panel (top-right / bottom-right).
// `active` = highlighted/full-opacity; `inactive` = dimmed with slash.
export function IconBtn({ src, alt, label, active, onClick, placement = 'left' }: {
  src: string; alt: string; label: string; active: boolean;
  onClick: () => void; placement?: 'left' | 'top';
}) {
  return (
    <Tooltip label={label} fontSize="xs" hasArrow placement={placement}>
      <Box as="button" onClick={onClick} position="relative" boxSize="36px"
        opacity={active ? 1 : 0.4} transition="opacity 0.15s"
        _hover={{ opacity: active ? 0.8 : 0.65 }}>
        <Image src={src} alt={alt} boxSize="36px" objectFit="contain" />
        {!active && (
          <Box position="absolute" inset={0} display="flex" alignItems="center" justifyContent="center" pointerEvents="none">
            <Box w="80%" h="2px" bg="red.400" transform="rotate(-45deg)" borderRadius="full" />
          </Box>
        )}
      </Box>
    </Tooltip>
  );
}

// Top-left face-expression dropdown. options carry the raw value + display label.
export function FaceSelect({ value, options, onChange }: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <Box position="absolute" top={2} left={2} bg="blackAlpha.700" borderRadius="md" display="inline-flex">
      <Box position="relative" display="inline-flex" alignItems="center" px={2} py={1} minW="120px">
        <Image src="/images/shop/UI_ICON_EditFace.png" alt="Face"
          boxSize="22px" objectFit="contain" flexShrink={0} pointerEvents="none" mr={1} />
        <Text fontSize="xs" color="gray.200" whiteSpace="nowrap" pointerEvents="none">
          {options.find((o) => o.value === value)?.label || '(none)'}
        </Text>
        <Select position="absolute" inset={0} w="100%" h="100%"
          opacity={0} cursor="pointer" size="xs"
          value={value}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
          sx={{ appearance: 'none', WebkitAppearance: 'none' }}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </Box>
    </Box>
  );
}

// Save-current-view-as-PNG icon button (optionally shows a spinner while a
// capture is in flight — used by the async Unity capture path).
export function SaveButton({ onClick, saving = false }: { onClick: () => void; saving?: boolean }) {
  return (
    <Tooltip label="Save visible area as PNG" fontSize="xs" hasArrow placement="left">
      <Box as="button" onClick={onClick} boxSize="36px" display="flex" alignItems="center"
        justifyContent="center" opacity={saving ? 0.5 : 0.8} _hover={{ opacity: 1 }} transition="opacity 0.15s">
        {saving
          ? <Spinner size="sm" />
          : <Image src="/images/shop/UI_Common_Icon_Save_1.png" alt="Save" boxSize="24px" objectFit="contain" />}
      </Box>
    </Tooltip>
  );
}

// Plain 36px icon button used in the top-right overlay control group.
// `dim` lightly fades it (e.g. inactive zones toggle).
function OverlayIconButton({ src, alt, label, onClick, dim = false }: {
  src: string; alt: string; label: string; onClick: () => void; dim?: boolean;
}) {
  return (
    <Tooltip label={label} fontSize="xs" hasArrow placement="left">
      <Box as="button" onClick={onClick} boxSize="36px" display="flex" alignItems="center"
        justifyContent="center" opacity={dim ? 0.4 : 0.8} _hover={{ opacity: 1 }} transition="opacity 0.15s">
        <Image src={src} alt={alt} boxSize="24px" objectFit="contain" />
      </Box>
    </Tooltip>
  );
}

// Reload-skin (rotate) icon button.
export function ReloadButton({ onClick }: { onClick: () => void }) {
  return (
    <OverlayIconButton src="/images/shop/UI_Icon_Rotate_2.png" alt="Reload"
      label="Reload skin" onClick={onClick} />
  );
}

// Play/pause toggle icon button.
export function PlayPauseButton({ playing, onToggle }: { playing: boolean; onToggle: () => void }) {
  return (
    <OverlayIconButton
      src={playing ? '/images/shop/UI_Common_Icon_Pause.png' : '/images/shop/UI_Common_Icon_Play.png'}
      alt={playing ? 'Pause' : 'Play'}
      label={playing ? 'Pause' : 'Play'}
      onClick={onToggle} />
  );
}

// Zones (eye) toggle icon button — dimmed when off.
export function ZonesButton({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <OverlayIconButton src="/images/shop/UI_Icon_Eye.png" alt="Zones"
      label={shown ? 'Hide zones' : 'Show zones'} onClick={onToggle} dim={!shown} />
  );
}

// Icon + tooltip per platform variant key. `base` depends on whether a KR
// variant also exists (vfun vs onestore icon), so it's a function.
export function variantMeta(key: string, hasKr: boolean): { icon: string; label: string } {
  const map: Record<string, { icon: string; label: string }> = {
    base:  { icon: hasKr ? '/images/shop/icon-platform-vfun.png' : '/images/shop/icon-platform-onestore.png', label: 'Uncensored' },
    kr:    { icon: '/images/shop/icon-platform-onestore.png', label: 'KR (Uncensored)' },
    sfw:   { icon: '/images/shop/icon-platform-google.png',   label: 'Censored (Google Play)' },
    rplus: { icon: '/images/shop/icon-secret-marks.png',      label: 'R+ (Uncensored)' },
  };
  return map[key] ?? { icon: '/images/shop/icon-platform-onestore.png', label: key };
}

// Bottom-right platform/variant radio strip (base / kr / sfw / rplus, etc).
export function VariantStrip({ variants, active, onSelect }: {
  variants: { key: string; icon: string; label: string }[];
  active: string;
  onSelect: (key: string) => void;
}) {
  if (variants.length === 0) return null;
  return (
    <HStack bg="blackAlpha.500" borderRadius="md" px={1} py={1} spacing={1}>
      {variants.map((v) => {
        const isActive = active === v.key;
        return (
          <Tooltip key={v.key} label={v.label} fontSize="xs" hasArrow placement="top">
            <Box as="button" onClick={() => { if (!isActive) onSelect(v.key); }}
              position="relative" boxSize="36px"
              opacity={isActive ? 1 : 0.4} transition="opacity 0.15s"
              _hover={{ opacity: isActive ? 0.8 : 0.65 }}
              outline={isActive ? '2px solid' : 'none'}
              outlineColor="yellow.400"
              borderRadius="sm">
              <Image src={v.icon} alt={v.label} boxSize="36px" objectFit="contain" />
            </Box>
          </Tooltip>
        );
      })}
    </HStack>
  );
}

