import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';

export type Region = 'global' | 'kr';

export interface RegionState {
  region: Region;
}

export const STORAGE_KEY = 'lomapr.region';

// Read the persisted region (localStorage). Returns null when unavailable (SSR)
// or unset, so callers can decide. NOT used for initialState — the store must
// start at the same value on server and client to avoid hydration mismatches;
// the persisted value is applied after mount (see RegionSync in _app).
export function loadRegion(): Region | null {
  try {
    const v = typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY);
    return v === 'kr' || v === 'global' ? v : null;
  } catch {
    return null;
  }
}

// Always 'global' initially so SSR and first client render agree.
const initialState: RegionState = {
  region: 'global',
};

export const regionSlice = createSlice({
  name: 'region',
  initialState,
  reducers: {
    setRegion: (state, action: PayloadAction<Region>) => {
      state.region = action.payload;
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, action.payload);
        }
      } catch {
        /* ignore storage errors */
      }
    },
  },
});

export const { setRegion } = regionSlice.actions;
export const selectRegion = (state: RootState) => state.region.region;

export default regionSlice.reducer;
