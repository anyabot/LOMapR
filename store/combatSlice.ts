import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { Region } from './regionSlice';
import { fetchCombat } from '@/lib/fetchData';

export type CombatVersion = 1 | 2;

export interface CombatState {
  byRegion: Partial<Record<Region, CombatVersion>>;
}

const initialState: CombatState = { byRegion: {} };

export const fetchCombatAsync = createAsyncThunk<
  { region: Region; version: CombatVersion } | null, void, { state: RootState }
>(
  'combat/fetch',
  async function (_, thunkApi) {
    const region = thunkApi.getState().region.region;
    if (thunkApi.getState().combat.byRegion[region]) return null;
    try {
      const data = await fetchCombat(region);
      return { region, version: data?.version === 2 ? 2 : 1 };
    } catch {
      return { region, version: 1 };
    }
  },
);

export const combatSlice = createSlice({
  name: 'combat',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchCombatAsync.fulfilled, (state, action) => {
      if (action.payload) state.byRegion[action.payload.region] = action.payload.version;
    });
  },
});

export const selectCombatVersion = (state: RootState): CombatVersion =>
  state.combat.byRegion[state.region.region] ?? 1;

export default combatSlice.reducer;
