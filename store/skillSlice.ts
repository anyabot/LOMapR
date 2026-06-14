import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { Skill } from '@/interfaces/skill';
import { setRegion } from './regionSlice';
import { fetchSplitSkills } from '@/lib/fetchData';

export interface SkillState {
  byEnemy: { [enemyId: string]: { [key: string]: Skill } };
  status: { [enemyId: string]: 'idle' | 'loading' | 'failed' };
}

const initialState: SkillState = { byEnemy: {}, status: {} };

export const fetchEnemySkillsAsync = createAsyncThunk<
  { enemyId: string; skills: { [key: string]: Skill } },
  string,
  { state: RootState }
>(
  'skill/fetchForEnemy',
  async (enemyId, thunkApi) => {
    const state = thunkApi.getState();
    if (state.skill.byEnemy[enemyId]) {
      return { enemyId, skills: state.skill.byEnemy[enemyId] };
    }
    try {
      const region = state.region.region;
      const rec = state.enemy.byRegion[region].enemy[enemyId];
      // bundle file is named after its owner; ref points at a shared owner, else
      // the enemy owns its own file (use its id).
      const ref = rec?.skillsRef ?? enemyId;
      const skills = await fetchSplitSkills(ref, region);
      return { enemyId, skills: skills || {} };
    } catch {
      return thunkApi.rejectWithValue({ enemyId, skills: {} }) as any;
    }
  }
);

export const skillSlice = createSlice({
  name: 'skill',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEnemySkillsAsync.pending, (state, action) => {
        state.status[action.meta.arg] = 'loading';
      })
      .addCase(fetchEnemySkillsAsync.fulfilled, (state, action) => {
        const { enemyId, skills } = action.payload;
        state.byEnemy[enemyId] = skills;
        state.status[enemyId] = 'idle';
      })
      .addCase(fetchEnemySkillsAsync.rejected, (state, action) => {
        state.status[action.meta.arg] = 'failed';
      })
      .addCase(setRegion, (state) => {
        state.byEnemy = {};
        state.status = {};
      });
  },
});

export const selectEnemySkills = (state: RootState, enemyId: string) =>
  state.skill.byEnemy[enemyId] ?? {};
export const selectEnemySkillStatus = (state: RootState, enemyId: string) =>
  state.skill.status[enemyId] ?? 'idle';

export default skillSlice.reducer;
