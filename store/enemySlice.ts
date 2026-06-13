import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { EnemyData, EnemyFull } from '@/interfaces/enemy';
import { Region } from './regionSlice';
import { fetchEnemyList, fetchEnemy } from '@/lib/fetchData';

// Per-region data bucket. Region switching keeps every region's bucket intact
// (no wipe), so flipping back to an already-loaded region is instant and never
// flashes the loader. A region only ever fetches once.
interface RegionBucket {
  enemy: {[key: string]: EnemyData};
  full: {[key: string]: EnemyFull};
  status: 'idle' | 'loading' | 'failed';
  fullStatus: {[key: string]: 'loading' | 'idle' | 'failed'};
}

function emptyBucket(): RegionBucket {
  return { enemy: {}, full: {}, status: 'loading', fullStatus: {} };
}

export interface EnemyState {
  byRegion: Record<Region, RegionBucket>;
  active: string;
  level: number;
}

const initialState: EnemyState = {
  byRegion: { global: emptyBucket(), kr: emptyBucket() },
  active: "",
  level: 1,
};

export const fetchEnemyAsync = createAsyncThunk<
  { region: Region; data: {[key: string]: EnemyData} }, void, {state: RootState}
>(
  'enemy/fetch',
  async function (_, thunkApi)  {
    const region = thunkApi.getState().region.region;
    const bucket = thunkApi.getState().enemy.byRegion[region];
    if (bucket.status == "failed") return { region, data: {} };
    if (Object.keys(bucket.enemy).length > 0) {
      return { region, data: bucket.enemy };
    }
    try {
      const response = await fetchEnemyList(region);
      return { region, data: response ? response : {} };
    }
    catch {
      return thunkApi.rejectWithValue({ region });
    }
  }
);

export const fetchEnemyFullAsync = createAsyncThunk<
  { region: Region; data: EnemyFull }, string,
  { state: RootState; pendingMeta: { region: Region } }
>(
  'enemy/fetchFull',
  async function (id, thunkApi) {
    const region = thunkApi.getState().region.region;
    const bucket = thunkApi.getState().enemy.byRegion[region];
    if (bucket.full[id]) return { region, data: bucket.full[id] };
    // enemy_list.json now carries full records — promote directly if already loaded.
    const fromList = bucket.enemy[id] as unknown as EnemyFull;
    if (fromList?.HP) return { region, data: { ...fromList, id } };
    // Not yet in store — fetch the full record directly from R2.
    try {
      const data = await fetchEnemy(id, region);
      if (!data) return thunkApi.rejectWithValue({ region, id }) as any;
      return { region, data };
    } catch {
      return thunkApi.rejectWithValue({ region, id }) as any;
    }
  },
  // stamp the active region onto the pending action so its loading flag lands
  // in the correct region bucket.
  { getPendingMeta: (_base, { getState }) => ({ region: (getState() as RootState).region.region }) }
);

export const EnemySlice = createSlice({
  name: 'enemy',
  initialState,
  reducers: {
    setActive: (state, action: PayloadAction<[string, number]>) => {
      state.active = action.payload[0];
      state.level = action.payload[1];
    },
  },
  extraReducers: (builder) => {
    builder
      // pending/fulfilled/rejected resolve the region from the thunk payload
      // (fulfilled/rejected) or the active region (pending — the only region a
      // fetch is ever kicked for).
      .addCase(fetchEnemyAsync.fulfilled, (state, action) => {
        const b = state.byRegion[action.payload.region];
        b.enemy = action.payload.data;
        b.status = 'idle';
      })
      .addCase(fetchEnemyAsync.rejected, (state, action) => {
        const region = (action.payload as { region?: Region } | undefined)?.region;
        if (region) state.byRegion[region].status = 'failed';
      })
      .addCase(fetchEnemyFullAsync.pending, (state, action) => {
        state.byRegion[action.meta.region].fullStatus[action.meta.arg] = 'loading';
      })
      .addCase(fetchEnemyFullAsync.fulfilled, (state, action) => {
        const b = state.byRegion[action.payload.region];
        b.full[action.payload.data.id] = action.payload.data;
        b.fullStatus[action.payload.data.id] = 'idle';
      })
      .addCase(fetchEnemyFullAsync.rejected, (state, action) => {
        const p = action.payload as { region?: Region; id?: string } | undefined;
        if (p?.region && p.id) state.byRegion[p.region].fullStatus[p.id] = 'failed';
      })
  },
});

export const { setActive } = EnemySlice.actions;

const bucketOf = (state: RootState) => state.enemy.byRegion[state.region.region];

export const selectEnemy = (state: RootState) => bucketOf(state).enemy;
export const selectEnemyFull = (state: RootState, id: string) => bucketOf(state).full[id] ?? null;
export const selectEnemyFullStatus = (state: RootState, id: string) => bucketOf(state).fullStatus[id] ?? null;
export const selectEnemyStatus = (state: RootState) => bucketOf(state).status;
export const selectActiveEnemy = (state: RootState) => state.enemy.active;
export const selectActiveLevel = (state: RootState) => state.enemy.level;

export default EnemySlice.reducer;
