import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { AIGraph } from '@/interfaces/ai';
import { setRegion } from './regionSlice';

export interface AIState {
  value: { [key: string]: AIGraph };
  status: 'idle' | 'loading' | 'failed';
}

const initialState: AIState = { value: {}, status: 'idle' };

export const fetchAIAsync = createAsyncThunk<{ [key: string]: AIGraph }, void, { state: RootState }>(
  'ai/fetch',
  async function (_, thunkApi) {
    if (thunkApi.getState().ai.status == 'failed') return {};
    if (Object.keys(thunkApi.getState().ai.value).length > 0) {
      return thunkApi.getState().ai.value;
    }
    try {
      const region = thunkApi.getState().region.region;
      const response = await fetch(`/api/ai?region=${region}`).then(res => res.json());
      return response ? response : {};
    } catch {
      return thunkApi.rejectWithValue({});
    }
  }
);

export const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAIAsync.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchAIAsync.fulfilled, (state, action) => { state.value = action.payload; })
      .addCase(fetchAIAsync.rejected, (state) => { state.value = {}; state.status = 'failed'; })
      .addCase(setRegion, (state) => { state.value = {}; state.status = 'idle'; });
  },
});

export const selectAI = (state: RootState) => state.ai.value;
export default aiSlice.reducer;
