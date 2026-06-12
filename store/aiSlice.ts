import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { AIGraph } from '@/interfaces/ai';
import { setRegion } from './regionSlice';

export interface AIState {
  value: { [enemyId: string]: AIGraph };
  loaded: { [enemyId: string]: boolean };
}

const initialState: AIState = { value: {}, loaded: {} };

export const fetchEnemyAIAsync = createAsyncThunk<
  { enemyId: string; graph: AIGraph | null },
  string,
  { state: RootState }
>(
  'ai/fetchForEnemy',
  async (enemyId, thunkApi) => {
    const state = thunkApi.getState();
    if (state.ai.loaded[enemyId]) {
      return { enemyId, graph: state.ai.value[enemyId] ?? null };
    }
    try {
      const region = state.region.region;
      const res = await fetch(`/api/split/ai/${encodeURIComponent(enemyId)}?region=${region}`);
      const graph = res.ok ? await res.json() : null;
      return { enemyId, graph };
    } catch {
      return { enemyId, graph: null };
    }
  }
);

export const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEnemyAIAsync.fulfilled, (state, action) => {
        const { enemyId, graph } = action.payload;
        if (graph) state.value[enemyId] = graph;
        state.loaded[enemyId] = true;
      })
      .addCase(setRegion, (state) => {
        state.value = {};
        state.loaded = {};
      });
  },
});

export const selectAI = (state: RootState) => state.ai.value;

export default aiSlice.reducer;
