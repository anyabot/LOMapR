import { useRef } from 'react';

// Returns the previous array while its items are unchanged, so a memoized list skips re-rendering.
export function useStableList<T>(list: T[]): T[] {
  const ref = useRef(list);
  const prev = ref.current;
  if (prev !== list && (prev.length !== list.length || list.some((item, i) => item !== prev[i]))) ref.current = list;
  return ref.current;
}
