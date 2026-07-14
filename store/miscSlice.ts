import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { MiscBuffEntry, MiscIndex } from '@/interfaces/misc';
import { Region } from './regionSlice';
import { fetchMisc, fetchMiscBuff } from '@/lib/fetchData';

// Per-region misc categorization data (see interfaces/misc.ts). The index is one
// small fetch; per-buff-type entry lists are fetched lazily when a type is
// selected and cached here so reselecting / region round-trips don't refetch.
interface RegionBucket {
  index: MiscIndex | null;
  status: 'idle' | 'loading' | 'failed';
  buffs: Record<number, MiscBuffEntry[]>;
  buffStatus: Record<number, 'idle' | 'loading' | 'failed'>;
}
const emptyBucket = (): RegionBucket => ({ index: null, status: 'loading', buffs: {}, buffStatus: {} });

export interface MiscState {
  byRegion: Record<Region, RegionBucket>;
}

const initialState: MiscState = {
  byRegion: { global: emptyBucket(), kr: emptyBucket() },
};

export const fetchMiscAsync = createAsyncThunk<
  { region: Region; data: MiscIndex | null }, void,
  { state: RootState; pendingMeta: { region: Region } }
>(
  'misc/fetch',
  async function (_, thunkApi) {
    const region = thunkApi.getState().region.region;
    const bucket = thunkApi.getState().misc.byRegion[region];
    if (bucket.index) return { region, data: bucket.index };
    try {
      const response = await fetchMisc(region);
      if (!response) return thunkApi.rejectWithValue({ region }) as any;
      return { region, data: response as MiscIndex };
    } catch {
      return thunkApi.rejectWithValue({ region }) as any;
    }
  },
  { getPendingMeta: (_base, { getState }) => ({ region: (getState() as RootState).region.region }) }
);

export const fetchMiscBuffAsync = createAsyncThunk<
  { region: Region; type: number; data: MiscBuffEntry[] }, number,
  { state: RootState; pendingMeta: { region: Region; type: number } }
>(
  'misc/fetchBuff',
  async function (type, thunkApi) {
    const region = thunkApi.getState().region.region;
    const bucket = thunkApi.getState().misc.byRegion[region];
    if (bucket.buffs[type]) return { region, type, data: bucket.buffs[type] };
    try {
      const response = await fetchMiscBuff(type, region);
      return { region, type, data: (response ?? []) as MiscBuffEntry[] };
    } catch {
      return thunkApi.rejectWithValue({ region, type }) as any;
    }
  },
  { getPendingMeta: (base, { getState }) => ({
      region: (getState() as RootState).region.region, type: base.arg }) }
);

export const miscSlice = createSlice({
  name: 'misc',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMiscAsync.pending, (state, action) => {
        const b = state.byRegion[action.meta.region];
        if (!b.index) b.status = 'loading';
      })
      .addCase(fetchMiscAsync.fulfilled, (state, action) => {
        const b = state.byRegion[action.payload.region];
        b.index = action.payload.data;
        b.status = 'idle';
      })
      .addCase(fetchMiscAsync.rejected, (state, action) => {
        const region = (action.payload as { region?: Region } | undefined)?.region;
        if (region) state.byRegion[region].status = 'failed';
      })
      .addCase(fetchMiscBuffAsync.pending, (state, action) => {
        const b = state.byRegion[action.meta.region];
        if (!b.buffs[action.meta.type]) b.buffStatus[action.meta.type] = 'loading';
      })
      .addCase(fetchMiscBuffAsync.fulfilled, (state, action) => {
        const b = state.byRegion[action.payload.region];
        b.buffs[action.payload.type] = action.payload.data;
        b.buffStatus[action.payload.type] = 'idle';
      })
      .addCase(fetchMiscBuffAsync.rejected, (state, action) => {
        const meta = action.payload as { region?: Region; type?: number } | undefined;
        if (meta?.region != null && meta?.type != null)
          state.byRegion[meta.region].buffStatus[meta.type] = 'failed';
      });
  },
});

const bucketOf = (state: RootState) => state.misc.byRegion[state.region.region];

export const selectMiscIndex = (state: RootState) => bucketOf(state).index;
export const selectMiscStatus = (state: RootState) => bucketOf(state).status;
export const selectMiscBuffs = (state: RootState, type: number) => bucketOf(state).buffs[type];
export const selectMiscBuffStatus = (state: RootState, type: number) =>
  bucketOf(state).buffStatus[type] ?? 'idle';

export default miscSlice.reducer;
