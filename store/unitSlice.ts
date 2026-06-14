import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { UnitData } from '@/interfaces/unit';
import { Skill } from '@/interfaces/skill';
import { Region, setRegion } from './regionSlice';
import { fetchUnitList, fetchSplitUnitSkills } from '@/lib/fetchData';

// Per-region unit list bucket, mirroring enemySlice / itemSlice — a region switch
// keeps each region's data so flipping back is instant.
interface RegionBucket {
  units: { [id: string]: UnitData };
  status: 'idle' | 'loading' | 'failed';
}

const emptyBucket = (): RegionBucket => ({ units: {}, status: 'loading' });

export interface UnitState {
  byRegion: Record<Region, RegionBucket>;
  // per-unit skill bundles (id -> {skillKey: Skill}); wiped on region switch.
  skills: { [id: string]: { [key: string]: Skill } };
  skillStatus: { [id: string]: 'idle' | 'loading' | 'failed' };
}

const initialState: UnitState = {
  byRegion: { global: emptyBucket(), kr: emptyBucket() },
  skills: {},
  skillStatus: {},
};

export const fetchUnitsAsync = createAsyncThunk<
  { region: Region; data: { [id: string]: UnitData } }, void, { state: RootState }
>(
  'unit/fetch',
  async (_, thunkApi) => {
    const region = thunkApi.getState().region.region;
    const bucket = thunkApi.getState().unit.byRegion[region];
    if (bucket.status === 'failed') return { region, data: {} };
    if (Object.keys(bucket.units).length > 0) return { region, data: bucket.units };
    try {
      const data = await fetchUnitList(region);
      return { region, data: data ?? {} };
    } catch {
      return thunkApi.rejectWithValue({ region }) as any;
    }
  },
);

export const fetchUnitSkillsAsync = createAsyncThunk<
  { unitId: string; skills: { [key: string]: Skill } }, string, { state: RootState }
>(
  'unit/fetchSkills',
  async (unitId, thunkApi) => {
    const state = thunkApi.getState();
    if (state.unit.skills[unitId]) return { unitId, skills: state.unit.skills[unitId] };
    try {
      const region = state.region.region;
      const rec = state.unit.byRegion[region].units[unitId];
      // bundle file is named after its owner; ref points at a shared owner, else
      // the unit owns its own file (use its id).
      const ref = rec?.skillsRef ?? unitId;
      const skills = await fetchSplitUnitSkills(ref, region);
      return { unitId, skills: skills || {} };
    } catch {
      return thunkApi.rejectWithValue({ unitId, skills: {} }) as any;
    }
  },
);

export const unitSlice = createSlice({
  name: 'unit',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUnitsAsync.fulfilled, (state, action) => {
        const b = state.byRegion[action.payload.region];
        b.units = action.payload.data;
        b.status = 'idle';
      })
      .addCase(fetchUnitsAsync.rejected, (state, action) => {
        const region = (action.payload as { region?: Region } | undefined)?.region;
        if (region) state.byRegion[region].status = 'failed';
      })
      .addCase(fetchUnitSkillsAsync.pending, (state, action) => {
        state.skillStatus[action.meta.arg] = 'loading';
      })
      .addCase(fetchUnitSkillsAsync.fulfilled, (state, action) => {
        state.skills[action.payload.unitId] = action.payload.skills;
        state.skillStatus[action.payload.unitId] = 'idle';
      })
      .addCase(fetchUnitSkillsAsync.rejected, (state, action) => {
        state.skillStatus[action.meta.arg] = 'failed';
      })
      // skill bundles are region-specific; drop them on region switch.
      .addCase(setRegion, (state) => {
        state.skills = {};
        state.skillStatus = {};
      });
  },
});

const bucketOf = (state: RootState) => state.unit.byRegion[state.region.region];

export const selectUnits = (state: RootState) => bucketOf(state).units;
export const selectUnitStatus = (state: RootState) => bucketOf(state).status;
export const selectUnit = (state: RootState, id: string) => bucketOf(state).units[id] ?? null;
export const selectUnitSkills = (state: RootState, id: string) => state.unit.skills[id] ?? {};
export const selectUnitSkillStatus = (state: RootState, id: string) =>
  state.unit.skillStatus[id] ?? 'idle';

export default unitSlice.reducer;
