import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { Floor } from '@/interfaces/sanctum';
import { Region } from './regionSlice';
import { fetchSanctum } from '@/lib/fetchData';

// value: area key -> floors, each floor being an array of its difficulty variants.
type SanctumData = { [area: string]: Floor[][] };

// Per-region sanctum data so switching regions and back doesn't refetch. The active
// area/floor/diff selection is UI nav state and stays shared (flat) — only the data
// is region-specific. floorData is DERIVED (selectFloorData) from the active region's
// data + selection, so a region switch needs no recompute action.
interface RegionBucket {
  value: SanctumData;
  status: 'idle' | 'loading' | 'failed';
}
const emptyBucket = (): RegionBucket => ({ value: {}, status: 'loading' });

export interface SanctumState {
  byRegion: Record<Region, RegionBucket>;
  activeArea: string;
  activeFloor: number;
  activeDiff: number;
}

const initialState: SanctumState = {
  byRegion: { global: emptyBucket(), kr: emptyBucket() },
  activeArea: "EW01",
  activeFloor: 0,
  activeDiff: 0,
};

// Clamp the active indices to what `value` contains and return the matching Floor
// (or undefined if the area/floor/diff isn't present). Pure — does not mutate state.
function clampFloor(value: SanctumData, area: string, floorIdx: number, diffIdx: number): Floor | undefined {
  const floors = value[area];
  if (!floors || floors.length === 0) return undefined;
  const f = Math.min(Math.max(floorIdx, 0), floors.length - 1);
  const diffs = floors[f];
  if (!diffs || diffs.length === 0) return undefined;
  const d = Math.min(Math.max(diffIdx, 0), diffs.length - 1);
  const floor = diffs[d];
  return floor ? { ...floor } : undefined;
}

export const fetchSanctumAsync = createAsyncThunk<
  { region: Region; data: SanctumData }, void,
  { state: RootState; pendingMeta: { region: Region } }
>(
  'sanctum/fetch',
  async function (_, thunkApi) {
    const region = thunkApi.getState().region.region;
    const bucket = thunkApi.getState().sanctum.byRegion[region];
    if (bucket.status === 'failed') return { region, data: {} };
    if (Object.keys(bucket.value).length > 0) return { region, data: bucket.value };
    try {
      const response = await fetchSanctum(region);
      return { region, data: response ?? {} };
    } catch {
      return thunkApi.rejectWithValue({ region }) as any;
    }
  },
  { getPendingMeta: (_base, { getState }) => ({ region: (getState() as RootState).region.region }) }
);

export const sanctumSlice = createSlice({
  name: 'sanctum',
  initialState,
  reducers: {
    setArea: (state, action: PayloadAction<string>) => { state.activeArea = action.payload; },
    setFloor: (state, action: PayloadAction<number>) => { state.activeFloor = action.payload; },
    setDiff: (state, action: PayloadAction<number>) => { state.activeDiff = action.payload; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSanctumAsync.pending, (state, action) => {
        const b = state.byRegion[action.meta.region];
        if (Object.keys(b.value).length === 0) b.status = 'loading';
      })
      .addCase(fetchSanctumAsync.fulfilled, (state, action) => {
        const b = state.byRegion[action.payload.region];
        b.value = action.payload.data;
        b.status = 'idle';
      })
      .addCase(fetchSanctumAsync.rejected, (state, action) => {
        const region = (action.payload as { region?: Region } | undefined)?.region;
        if (region) state.byRegion[region].status = 'failed';
      });
  },
});

export const { setArea, setDiff, setFloor } = sanctumSlice.actions;

const bucketOf = (state: RootState) => state.sanctum.byRegion[state.region.region];

export const selectSanctum = (state: RootState) => bucketOf(state).value;
export const selectSanctumStatus = (state: RootState) => bucketOf(state).status;
// Derived: the active floor for the active region + current selection (clamped).
export const selectFloorData = (state: RootState): Floor | undefined =>
  clampFloor(bucketOf(state).value, state.sanctum.activeArea,
    state.sanctum.activeFloor, state.sanctum.activeDiff);
export const selectActiveArea = (state: RootState) => state.sanctum.activeArea;
export const selectActiveFloor = (state: RootState) => state.sanctum.activeFloor;
export const selectActiveDiff = (state: RootState) => state.sanctum.activeDiff;

export default sanctumSlice.reducer;
