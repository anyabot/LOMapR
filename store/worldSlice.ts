import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { World } from '@/interfaces/world';
import { Region } from './regionSlice';
import { fetchWorld, fetchWorldStage } from '@/lib/fetchData';

// `value` holds the light container (per-world meta + zone titles/imgs, no stages);
// fetchWorldStageAsync(id) replaces one entry with the full record.
interface RegionBucket {
  value: { [key: string]: World };
  status: 'idle' | 'loading' | 'failed';
  stage: { [id: string]: 'idle' | 'loading' | 'failed' };
}
const emptyBucket = (): RegionBucket => ({ value: {}, status: 'loading', stage: {} });

export interface WorldState {
  byRegion: Record<Region, RegionBucket>;
}

const initialState: WorldState = {
  byRegion: { global: emptyBucket(), kr: emptyBucket() },
};

export const fetchWorldAsync = createAsyncThunk<
  { region: Region; data: { [key: string]: World } }, void,
  { state: RootState; pendingMeta: { region: Region } }
>(
  'world/fetch',
  async function (_, thunkApi) {
    const region = thunkApi.getState().region.region;
    const bucket = thunkApi.getState().world.byRegion[region];
    if (bucket.status === 'failed') return { region, data: {} };
    if (Object.keys(bucket.value).length > 0) return { region, data: bucket.value };
    try {
      const response = await fetchWorld(region);
      return { region, data: response ?? {} };
    } catch {
      return thunkApi.rejectWithValue({ region }) as any;
    }
  },
  { getPendingMeta: (_base, { getState }) => ({ region: (getState() as RootState).region.region }) }
);

// Merged into the container entry; skips a world whose stages are already loaded.
export const fetchWorldStageAsync = createAsyncThunk<
  { region: Region; id: string; world: World }, string,
  { state: RootState; pendingMeta: { region: Region } }
>(
  'world/fetchStage',
  async function (id, thunkApi) {
    const region = thunkApi.getState().region.region;
    const cur = thunkApi.getState().world.byRegion[region].value[id];
    // already has stages? (a zone with a stages/subzones array) → reuse.
    if (cur?.zones?.some((z) => (z.stages && z.stages.length) || z.subzones)) {
      return { region, id, world: cur };
    }
    try {
      const data = await fetchWorldStage(id, region);
      if (!data) return thunkApi.rejectWithValue({ region, id }) as any;
      return { region, id, world: data };
    } catch {
      return thunkApi.rejectWithValue({ region, id }) as any;
    }
  },
  { getPendingMeta: (_base, { getState }) => ({ region: (getState() as RootState).region.region }) }
);

export const worldSlice = createSlice({
  name: 'world',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorldAsync.pending, (state, action) => {
        const b = state.byRegion[action.meta.region];
        if (Object.keys(b.value).length === 0) b.status = 'loading';
      })
      .addCase(fetchWorldAsync.fulfilled, (state, action) => {
        const b = state.byRegion[action.payload.region];
        // merge so already-loaded full worlds aren't clobbered by container entries
        b.value = { ...action.payload.data, ...b.value };
        b.status = 'idle';
      })
      .addCase(fetchWorldAsync.rejected, (state, action) => {
        const region = (action.payload as { region?: Region } | undefined)?.region;
        if (region) state.byRegion[region].status = 'failed';
      })
      .addCase(fetchWorldStageAsync.pending, (state, action) => {
        state.byRegion[action.meta.region].stage[action.meta.arg] = 'loading';
      })
      .addCase(fetchWorldStageAsync.fulfilled, (state, action) => {
        const b = state.byRegion[action.payload.region];
        b.value[action.payload.id] = action.payload.world;
        b.stage[action.payload.id] = 'idle';
      })
      .addCase(fetchWorldStageAsync.rejected, (state, action) => {
        const p = action.payload as { region?: Region; id?: string } | undefined;
        if (p?.region && p.id) state.byRegion[p.region].stage[p.id] = 'failed';
      });
  },
});

const bucketOf = (state: RootState) => state.world.byRegion[state.region.region];

export const selectWorld = (state: RootState) => bucketOf(state).value;
export const selectWorldStatus = (state: RootState) => bucketOf(state).status;
export const selectWorldStageStatus = (state: RootState, id: string) =>
  bucketOf(state).stage[id] ?? 'idle';

export default worldSlice.reducer;
