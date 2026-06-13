import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { Region } from './regionSlice';
import { fetchImages } from '@/lib/fetchData';

// Per-region image-link buckets. Region switching keeps each region's bucket
// (no wipe), so flipping back to a loaded region is instant — see enemySlice.
interface RegionBucket {
  imagelink: {[key: string]: string};
  status: 'idle' | 'loading' | 'failed';
}

function emptyBucket(): RegionBucket {
  return { imagelink: {}, status: 'loading' };
}

export interface ImageState {
  byRegion: Record<Region, RegionBucket>;
}

const initialState: ImageState = {
  byRegion: { global: emptyBucket(), kr: emptyBucket() },
};

export const fetchImageAsync = createAsyncThunk<
  { region: Region; data: {[key: string]: string} }, void, {state: RootState}
>(
  'image/fetch',
  async function (_, thunkApi)  {
    const region = thunkApi.getState().region.region;
    const bucket = thunkApi.getState().image.byRegion[region];
    if (Object.keys(bucket.imagelink).length > 0) {
      return { region, data: bucket.imagelink };
    }
    try {
      const response = await fetchImages(region);
      return { region, data: response ? response : {} };
    }
    catch {
      return { region, data: {} };
    }
  }
);

export const ImageSlice = createSlice({
  name: 'image',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchImageAsync.fulfilled, (state, action) => {
        const b = state.byRegion[action.payload.region];
        b.imagelink = action.payload.data;
        b.status = 'idle';
      })
      .addCase(fetchImageAsync.rejected, (state, action) => {
        const region = thunkRegion(action);
        if (region) state.byRegion[region].status = 'failed';
      })
  },
});

// rejected here carries no payload (the catch returns fulfilled-empty), but keep
// a safe extractor for symmetry.
function thunkRegion(action: { payload?: unknown }): Region | undefined {
  const p = action.payload as { region?: Region } | undefined;
  return p?.region;
}

const bucketOf = (state: RootState) => state.image.byRegion[state.region.region];

export const selectImage = (state: RootState) => bucketOf(state).imagelink;
export const selectImageStatus = (state: RootState) => bucketOf(state).status;

export default ImageSlice.reducer;
