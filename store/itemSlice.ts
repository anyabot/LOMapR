import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { Region } from './regionSlice';
import { fetchItems } from '@/lib/fetchData';

// One item / unit reward entry's display info.
export interface ItemInfo {
  name: string;   // loc id (resolve with t())
  icon: string;   // sprite key (UI_Icon_* / InvenIcon_*) — actual PNG sliced later
  grade?: number;
  kind: 'consumable' | 'equip' | 'unit';
  desc?: string;  // loc id; consumables only — what the item grants (pack contents)
}

export type ItemMap = { [id: string]: ItemInfo };

// Per-region buckets, mirroring enemySlice — region switch keeps each region's
// map so flipping back is instant.
interface RegionBucket {
  items: ItemMap;
  status: 'idle' | 'loading' | 'failed';
}

const emptyBucket = (): RegionBucket => ({ items: {}, status: 'loading' });

export interface ItemState {
  byRegion: Record<Region, RegionBucket>;
}

const initialState: ItemState = {
  byRegion: { global: emptyBucket(), kr: emptyBucket() },
};

export const fetchItemsAsync = createAsyncThunk<
  { region: Region; data: ItemMap }, void, { state: RootState }
>(
  'item/fetch',
  async (_, thunkApi) => {
    const region = thunkApi.getState().region.region;
    const bucket = thunkApi.getState().item.byRegion[region];
    if (Object.keys(bucket.items).length > 0) {
      return { region, data: bucket.items };
    }
    try {
      const data = await fetchItems(region);
      return { region, data: data ?? {} };
    } catch {
      return { region, data: {} };
    }
  },
);

export const itemSlice = createSlice({
  name: 'item',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchItemsAsync.fulfilled, (state, action) => {
        const b = state.byRegion[action.payload.region];
        b.items = action.payload.data;
        b.status = 'idle';
      });
  },
});

const bucketOf = (state: RootState) => state.item.byRegion[state.region.region];
export const selectItems = (state: RootState) => bucketOf(state).items;

export default itemSlice.reducer;
