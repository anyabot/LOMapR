import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { World } from '@/interfaces/world';
import { setRegion } from './regionSlice';
import { fetchWorld, fetchWorldStage } from '@/lib/fetchData';

// `value` holds the world CONTAINER (per-world meta + zone titles/imgs, no stages),
// loaded once by fetchWorldAsync. A world's full stage data is loaded LAZILY by
// fetchWorldStageAsync(id) — which replaces that world's entry with the full
// record. `stage` tracks per-world stage-load status so the stage page can show a
// loader / not refetch.
export interface WorldState {
  value: { [key: string]: World };
  status: 'idle' | 'loading' | 'failed';
  stage: { [id: string]: 'idle' | 'loading' | 'failed' };
}

const initialState: WorldState = {
  value: {},
  status: 'loading',
  stage: {},
};

export const fetchWorldAsync = createAsyncThunk<{ [key: string]: World }, void, { state: RootState }>(
  'world/fetch',
  async function (_, thunkApi) {
    if (thunkApi.getState().world.status == 'failed') return {};
    else if (Object.keys(thunkApi.getState().world.value).length > 0) {
      return thunkApi.getState().world.value;
    } else {
      try {
        const response = await fetchWorld(thunkApi.getState().region.region);
        return response ? response : {};
      } catch {
        return thunkApi.rejectWithValue({});
      }
    }
  },
);

// Lazily load one world's full stage data (split/world/<id>.json) and merge it
// into the container entry. Skips if the world already has stages loaded.
export const fetchWorldStageAsync = createAsyncThunk<
  { id: string; world: World }, string, { state: RootState }
>(
  'world/fetchStage',
  async function (id, thunkApi) {
    const region = thunkApi.getState().region.region;
    const cur = thunkApi.getState().world.value[id];
    // already has stages? (a zone with a stages/subzones array) → reuse.
    if (cur?.zones?.some((z) => (z.stages && z.stages.length) || z.subzones)) {
      return { id, world: cur };
    }
    try {
      const data = await fetchWorldStage(id, region);
      if (!data) return thunkApi.rejectWithValue({ id }) as any;
      return { id, world: data };
    } catch {
      return thunkApi.rejectWithValue({ id }) as any;
    }
  },
);

export const worldSlice = createSlice({
  name: 'world',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorldAsync.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchWorldAsync.fulfilled, (state, action) => {
        // merge so any already-loaded full world records aren't clobbered by the
        // lighter container entries.
        state.value = { ...action.payload, ...state.value };
        state.status = 'idle';
      })
      .addCase(fetchWorldAsync.rejected, (state) => {
        state.value = {};
        state.status = 'failed';
      })
      .addCase(fetchWorldStageAsync.pending, (state, action) => {
        state.stage[action.meta.arg] = 'loading';
      })
      .addCase(fetchWorldStageAsync.fulfilled, (state, action) => {
        state.value[action.payload.id] = action.payload.world;
        state.stage[action.payload.id] = 'idle';
      })
      .addCase(fetchWorldStageAsync.rejected, (state, action) => {
        state.stage[action.meta.arg] = 'failed';
      })
      .addCase(setRegion, (state) => {
        state.value = {};
        state.status = 'loading';
        state.stage = {};
      });
  },
});

export const selectWorld = (state: RootState) => state.world.value;
export const selectWorldStatus = (state: RootState) => state.world.status;
export const selectWorldStageStatus = (state: RootState, id: string) =>
  state.world.stage[id] ?? 'idle';

export default worldSlice.reducer;
