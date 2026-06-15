import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { EquipData, EquipFull } from '@/interfaces/equip';
import { Region } from './regionSlice';
import { fetchEquipList, fetchEquip } from '@/lib/fetchData';

// Per-region bucket: the light equip LIST + lazily-loaded FULL family records
// (split/equip/<id>.json), mirroring enemySlice. `active` is the family id whose
// modal is open (a global active-equip modal lives in the layout).
interface RegionBucket {
  equip: { [id: string]: EquipData };
  full: { [id: string]: EquipFull };
  status: 'idle' | 'loading' | 'failed';
  fullStatus: { [id: string]: 'loading' | 'idle' | 'failed' };
}

const emptyBucket = (): RegionBucket => ({ equip: {}, full: {}, status: 'loading', fullStatus: {} });

export interface EquipState {
  byRegion: Record<Region, RegionBucket>;
  active: string;   // family id of the open modal ("" = closed)
}

const initialState: EquipState = {
  byRegion: { global: emptyBucket(), kr: emptyBucket() },
  active: '',
};

export const fetchEquipAsync = createAsyncThunk<
  { region: Region; data: { [id: string]: EquipData } }, void, { state: RootState }
>(
  'equip/fetch',
  async (_, thunkApi) => {
    const region = thunkApi.getState().region.region;
    const bucket = thunkApi.getState().equip.byRegion[region];
    if (bucket.status === 'failed') return { region, data: {} };
    if (Object.keys(bucket.equip).length > 0) return { region, data: bucket.equip };
    try {
      const data = await fetchEquipList(region);
      return { region, data: data ?? {} };
    } catch {
      return thunkApi.rejectWithValue({ region }) as any;
    }
  },
);

export const fetchEquipFullAsync = createAsyncThunk<
  { region: Region; data: EquipFull }, string,
  { state: RootState; pendingMeta: { region: Region } }
>(
  'equip/fetchFull',
  async (id, thunkApi) => {
    const region = thunkApi.getState().region.region;
    const bucket = thunkApi.getState().equip.byRegion[region];
    if (bucket.full[id]) return { region, data: bucket.full[id] };
    try {
      const data = await fetchEquip(id, region);
      if (!data) return thunkApi.rejectWithValue({ region, id }) as any;
      return { region, data };
    } catch {
      return thunkApi.rejectWithValue({ region, id }) as any;
    }
  },
  { getPendingMeta: (_b, { getState }) => ({ region: (getState() as RootState).region.region }) },
);

export const equipSlice = createSlice({
  name: 'equip',
  initialState,
  reducers: {
    setActiveEquip: (state, action: PayloadAction<string>) => { state.active = action.payload; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEquipAsync.fulfilled, (state, action) => {
        const b = state.byRegion[action.payload.region];
        b.equip = action.payload.data;
        b.status = 'idle';
      })
      .addCase(fetchEquipAsync.rejected, (state, action) => {
        const region = (action.payload as { region?: Region } | undefined)?.region;
        if (region) state.byRegion[region].status = 'failed';
      })
      .addCase(fetchEquipFullAsync.pending, (state, action) => {
        state.byRegion[action.meta.region].fullStatus[action.meta.arg] = 'loading';
      })
      .addCase(fetchEquipFullAsync.fulfilled, (state, action) => {
        const b = state.byRegion[action.payload.region];
        b.full[action.payload.data.id] = action.payload.data;
        b.fullStatus[action.payload.data.id] = 'idle';
      })
      .addCase(fetchEquipFullAsync.rejected, (state, action) => {
        const p = action.payload as { region?: Region; id?: string } | undefined;
        if (p?.region && p.id) state.byRegion[p.region].fullStatus[p.id] = 'failed';
      });
  },
});

export const { setActiveEquip } = equipSlice.actions;

const bucketOf = (state: RootState) => state.equip.byRegion[state.region.region];

export const selectEquip = (state: RootState) => bucketOf(state).equip;
export const selectEquipStatus = (state: RootState) => bucketOf(state).status;
export const selectEquipFull = (state: RootState, id: string) => bucketOf(state).full[id] ?? null;
export const selectEquipFullStatus = (state: RootState, id: string) =>
  bucketOf(state).fullStatus[id] ?? null;
export const selectActiveEquip = (state: RootState) => state.equip.active;

export default equipSlice.reducer;
