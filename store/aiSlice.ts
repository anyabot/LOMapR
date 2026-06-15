import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { AIGraph } from '@/interfaces/ai';
import { Region } from './regionSlice';
import { fetchSplitAI } from '@/lib/fetchData';

// Per-region AI cache so switching regions and back doesn't refetch. Each region
// keeps its own enemy-id -> graph map (graphs are region-specific).
interface RegionBucket {
  value: { [enemyId: string]: AIGraph };
  loaded: { [enemyId: string]: boolean };
}
const emptyBucket = (): RegionBucket => ({ value: {}, loaded: {} });

export interface AIState {
  byRegion: Record<Region, RegionBucket>;
}

const initialState: AIState = {
  byRegion: { global: emptyBucket(), kr: emptyBucket() },
};

export const fetchEnemyAIAsync = createAsyncThunk<
  { region: Region; enemyId: string; graph: AIGraph | null },
  string,
  { state: RootState }
>(
  'ai/fetchForEnemy',
  async (enemyId, thunkApi) => {
    const state = thunkApi.getState();
    const region = state.region.region;
    const bucket = state.ai.byRegion[region];
    if (bucket.loaded[enemyId]) {
      return { region, enemyId, graph: bucket.value[enemyId] ?? null };
    }
    try {
      const rec = state.enemy.byRegion[region].enemy[enemyId];
      const ref = rec?.aiRef ?? enemyId;
      const graph = await fetchSplitAI(ref, region);
      return { region, enemyId, graph };
    } catch {
      return { region, enemyId, graph: null };
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
        const { region, enemyId, graph } = action.payload;
        const b = state.byRegion[region];
        if (graph) b.value[enemyId] = graph;
        b.loaded[enemyId] = true;
      });
  },
});

export const selectAI = (state: RootState) => state.ai.byRegion[state.region.region].value;

export default aiSlice.reducer;
