import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { Skill } from '@/interfaces/skill';
import { Region } from './regionSlice';
import { fetchSplitSkills } from '@/lib/fetchData';

// Per-region enemy-skill cache so switching regions and back doesn't refetch.
interface RegionBucket {
  byEnemy: { [enemyId: string]: { [key: string]: Skill } };
  status: { [enemyId: string]: 'idle' | 'loading' | 'failed' };
}
const emptyBucket = (): RegionBucket => ({ byEnemy: {}, status: {} });

export interface SkillState {
  byRegion: Record<Region, RegionBucket>;
}

const initialState: SkillState = {
  byRegion: { global: emptyBucket(), kr: emptyBucket() },
};

export const fetchEnemySkillsAsync = createAsyncThunk<
  { region: Region; enemyId: string; skills: { [key: string]: Skill } },
  string,
  { state: RootState; pendingMeta: { region: Region } }
>(
  'skill/fetchForEnemy',
  async (enemyId, thunkApi) => {
    const state = thunkApi.getState();
    const region = state.region.region;
    const bucket = state.skill.byRegion[region];
    if (bucket.byEnemy[enemyId]) {
      return { region, enemyId, skills: bucket.byEnemy[enemyId] };
    }
    try {
      const rec = state.enemy.byRegion[region].enemy[enemyId];
      // bundle file is named after its owner; ref points at a shared owner, else
      // the enemy owns its own file (use its id).
      const ref = rec?.skillsRef ?? enemyId;
      const skills = await fetchSplitSkills(ref, region);
      return { region, enemyId, skills: skills || {} };
    } catch {
      return thunkApi.rejectWithValue({ region, enemyId, skills: {} }) as any;
    }
  },
  { getPendingMeta: (_base, { getState }) => ({ region: (getState() as RootState).region.region }) }
);

export const skillSlice = createSlice({
  name: 'skill',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEnemySkillsAsync.pending, (state, action) => {
        state.byRegion[action.meta.region].status[action.meta.arg] = 'loading';
      })
      .addCase(fetchEnemySkillsAsync.fulfilled, (state, action) => {
        const b = state.byRegion[action.payload.region];
        b.byEnemy[action.payload.enemyId] = action.payload.skills;
        b.status[action.payload.enemyId] = 'idle';
      })
      .addCase(fetchEnemySkillsAsync.rejected, (state, action) => {
        const region = (action.payload as { region?: Region } | undefined)?.region;
        if (region) state.byRegion[region].status[action.meta.arg] = 'failed';
      });
  },
});

const bucketOf = (state: RootState) => state.skill.byRegion[state.region.region];

export const selectEnemySkills = (state: RootState, enemyId: string) =>
  bucketOf(state).byEnemy[enemyId] ?? {};
export const selectEnemySkillStatus = (state: RootState, enemyId: string) =>
  bucketOf(state).status[enemyId] ?? 'idle';

export default skillSlice.reducer;
