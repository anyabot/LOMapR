import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import type { Region } from '@/lib/fetchData';
import type { StringChunk } from '@/lib/strings';

interface StringsState {
  // which chunks are loaded per region
  loaded: Record<Region, Partial<Record<StringChunk, boolean>>>;
  // true while the active region's common chunks load; drives the switch overlay
  transitioning: boolean;
}

const initialState: StringsState = {
  loaded: { global: {}, kr: {} },
  transitioning: false,
};

export const stringsSlice = createSlice({
  name: 'strings',
  initialState,
  reducers: {
    markChunkLoaded: (state, action: PayloadAction<{ region: Region; chunk: StringChunk }>) => {
      const { region, chunk } = action.payload;
      state.loaded[region][chunk] = true;
    },
    setTransitioning: (state, action: PayloadAction<boolean>) => {
      state.transitioning = action.payload;
    },
  },
});

export const { markChunkLoaded, setTransitioning } = stringsSlice.actions;

export const selectChunkLoaded = (region: Region, chunk: StringChunk) =>
  (state: RootState) => !!state.strings.loaded[region]?.[chunk];

export const selectTransitioning = (state: RootState) => state.strings.transitioning;

export default stringsSlice.reducer;
