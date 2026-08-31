// Shared overlay chrome: the PixiJS and Unity viewers wear the same UI, fed each
// viewer's own state, so the markup lives in one place.
import { useState } from 'react';
import { Box, Button, CloseButton, Flex, HStack, Image, Input, Select, Spinner, Text, Tooltip } from '@chakra-ui/react';
import { HamburgerIcon, ViewIcon, ViewOffIcon } from '@chakra-ui/icons';

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

// `saving` shows a spinner while an async capture is in flight.
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

// Layer-editor toggle (spine only) — opens the per-slot visibility panel.
export function LayersButton({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <Tooltip label={active ? 'Close layer editor' : 'Layer editor'} fontSize="xs" hasArrow placement="left">
      <Box as="button" onClick={onToggle} boxSize="36px" display="flex" alignItems="center"
        justifyContent="center" opacity={active ? 1 : 0.6} _hover={{ opacity: 1 }} transition="opacity 0.15s">
        <HamburgerIcon boxSize="20px" color={active ? 'yellow.300' : 'gray.200'} />
      </Box>
    </Tooltip>
  );
}

// Rows are front-most first (Spine draws back-to-front), matching an image editor.
// `top` shifts the panel below the face dropdown when that one is present.
export function LayerPanel({ slots, hidden, top = 2, onToggle, onSetAll, onClose }: {
  slots: string[];
  hidden: Set<string>;
  top?: number;
  onToggle: (slot: string) => void;
  onSetAll: (visible: boolean) => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState('');
  const query = filter.trim().toLowerCase();
  const rows = slots.filter((s) => !query || s.toLowerCase().includes(query)).reverse();
  const visibleCount = slots.reduce((n, s) => hidden.has(s) ? n : n + 1, 0);
  return (
    <Flex position="absolute" top={top} left={2} zIndex={2} direction="column"
      w={{ base: '160px', sm: '200px' }} maxW="60%" maxH="75%"
      bg="blackAlpha.800" borderRadius="md" overflow="hidden">
      <Flex align="center" gap={1} pl={2} pr={1} pt={1}>
        <Text fontSize="xs" fontWeight="bold" color="gray.200" flex="1" whiteSpace="nowrap">
          Layers {visibleCount}/{slots.length}
        </Text>
        <Button size="xs" variant="ghost" h="20px" minW={0} px={1} fontSize="10px"
          color="gray.300" onClick={() => onSetAll(true)}>All</Button>
        <Button size="xs" variant="ghost" h="20px" minW={0} px={1} fontSize="10px"
          color="gray.300" onClick={() => onSetAll(false)}>None</Button>
        <CloseButton size="sm" color="gray.300" onClick={onClose} />
      </Flex>
      <Box px={2} py={1}>
        <Input size="xs" borderRadius="sm" placeholder="filter" value={filter}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilter(e.target.value)} />
      </Box>
      <Box flex="1" minH={0} overflowY="auto" px={1} pb={1}>
        {rows.map((s) => {
          const off = hidden.has(s);
          return (
            <Flex as="button" key={s} onClick={() => onToggle(s)} w="100%" align="center" gap={1}
              px={1} py="2px" borderRadius="sm" textAlign="left" _hover={{ bg: 'whiteAlpha.200' }}>
              {off
                ? <ViewOffIcon boxSize="12px" color="gray.500" flexShrink={0} />
                : <ViewIcon boxSize="12px" color="yellow.300" flexShrink={0} />}
              <Text fontSize="xs" color={off ? 'gray.500' : 'gray.100'} isTruncated title={s}>{s}</Text>
            </Flex>
          );
        })}
        {rows.length === 0 && (
          <Text fontSize="xs" color="gray.500" px={1} py={1}>no match</Text>
        )}
      </Box>
    </Flex>
  );
}

// `base` is a function because its icon depends on whether a KR variant exists.
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

