import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { createPersisted } from '@altterisk/game-hub/persist';
import { RootState } from '../store';

export type Region = 'global' | 'kr';

export interface RegionState {
  region: Region;
}

const regionStore = createPersisted<Region | null>({
  key: 'lomapr.region',
  version: 1,
  empty: () => null,
  sanitize: (raw) => (raw === 'kr' || raw === 'global' ? raw : null),
});

// NOT used for initialState: the store must start identical on server and client, so
// the persisted value is applied after mount (see RegionSync in _app).
export function loadRegion(): Region | null {
  return regionStore.load();
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
      regionStore.save(action.payload);
    },
  },
});

export const { setRegion } = regionSlice.actions;
export const selectRegion = (state: RootState) => state.region.region;

export default regionSlice.reducer;
