import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { InfiniteWar } from '@/interfaces/iw';
import { Region } from './regionSlice';
import { fetchIW } from '@/lib/fetchData';

// Per-region Infinite War data so switching regions and back doesn't refetch.
interface RegionBucket {
  value: InfiniteWar;
  status: 'idle' | 'loading' | 'failed';
}
const emptyBucket = (): RegionBucket => ({ value: { seasons: [], bosses: {} }, status: 'loading' });

export interface IWState {
  byRegion: Record<Region, RegionBucket>;
}

const initialState: IWState = {
  byRegion: { global: emptyBucket(), kr: emptyBucket() },
};

const EMPTY: InfiniteWar = { seasons: [], bosses: {} };

export const fetchIWAsync = createAsyncThunk<
  { region: Region; data: InfiniteWar }, void,
  { state: RootState; pendingMeta: { region: Region } }
>(
  'iw/fetch',
  async function (_, thunkApi) {
    const region = thunkApi.getState().region.region;
    const bucket = thunkApi.getState().iw.byRegion[region];
    if (bucket.status === 'failed') return { region, data: EMPTY };
    if (bucket.value.seasons.length > 0) return { region, data: bucket.value };
    try {
      const response = await fetchIW(region);
      return { region, data: response ?? EMPTY };
    } catch {
      return thunkApi.rejectWithValue({ region }) as any;
    }
  },
  { getPendingMeta: (_base, { getState }) => ({ region: (getState() as RootState).region.region }) }
);

export const IWSlice = createSlice({
  name: 'iw',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchIWAsync.pending, (state, action) => {
        const b = state.byRegion[action.meta.region];
        if (b.value.seasons.length === 0) b.status = 'loading';
      })
      .addCase(fetchIWAsync.fulfilled, (state, action) => {
        const b = state.byRegion[action.payload.region];
        b.value = action.payload.data;
        b.status = 'idle';
      })
      .addCase(fetchIWAsync.rejected, (state, action) => {
        const region = (action.payload as { region?: Region } | undefined)?.region;
        if (region) state.byRegion[region].status = 'failed';
      });
  },
});

const bucketOf = (state: RootState) => state.iw.byRegion[state.region.region];

export const selectIW = (state: RootState) => bucketOf(state).value;
export const selectIWStatus = (state: RootState) => bucketOf(state).status;

export default IWSlice.reducer;
