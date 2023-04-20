import { createAsyncThunk, createSlice, isRejectedWithValue, PayloadAction } from '@reduxjs/toolkit';
import { RootState, AppThunk } from '../store';
import { InfiniteWar } from '@/interfaces/iw';

export interface IWState {
  value: InfiniteWar;
  status: 'idle' | 'loading' | 'failed';
}

const initialState: IWState = {
  value: {seasons:[], bosses: {}},
  status: 'idle',
};

export const fetchIWAsync = createAsyncThunk<InfiniteWar, void, {state: RootState}>(
  'iw/fetch',
  async function (_, thunkApi)  {
    if (thunkApi.getState().iw.status == "failed") return {seasons:[], bosses: {}}
    else if (Object.keys(thunkApi.getState().iw.value.seasons).length > 0) {
      return thunkApi.getState().iw.value
    }
    else {
      try {
        const response = await fetch("/api/iw").then(res => res.json())
        return response ? response : {seasons:[], bosses: {}}
      }
      catch {
        return thunkApi.rejectWithValue({seasons:[], bosses: {}})
      }
    }
  }
);

export const IWSlice = createSlice({
  name: 'iw',
  initialState,
  // The `reducers` field lets us define reducers and generate associated actions
  reducers: {

  },
  // The `extraReducers` field lets the slice handle actions defined elsewhere,
  // including actions generated by createAsyncThunk or in other slices.
  extraReducers: (builder) => {
    builder
      .addCase(fetchIWAsync.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchIWAsync.fulfilled, (state, action) => {
        state.value = action.payload;
      })
      .addCase(fetchIWAsync.rejected, (state, action) => {
        state.value = {seasons:[], bosses: {}};
        state.status = 'failed';
      })
  },
});

export const selectIW = (state: RootState) => state.iw.value;
export const selectIWStatus = (state: RootState) => state.iw.status;

export default IWSlice.reducer;