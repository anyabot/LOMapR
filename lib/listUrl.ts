import { useRouter } from 'next/router';
import { listState, nextRouterAdapter, type FilterMode, type ListState } from '@altterisk/game-hub/filters';

export function useListUrl(): { list: ListState; ready: boolean } {
  const router = useRouter();
  return { list: listState(nextRouterAdapter(router)), ready: router.isReady };
}

export function fillModes<K extends string | number>(keys: readonly K[], modes: Record<string, FilterMode>): Record<K, FilterMode> {
  return Object.fromEntries(keys.map((k) => [k, modes[String(k)] ?? 0])) as Record<K, FilterMode>;
}

export function countActive(...groups: Record<string | number, FilterMode>[]): number {
  return groups.reduce((n, g) => n + Object.values(g).filter((m) => m !== 0).length, 0);
}

export const chipColor = (scheme: string) => `var(--ui-c-${scheme}-400)`;

export { useUrlText } from '@altterisk/game-hub/filters';
