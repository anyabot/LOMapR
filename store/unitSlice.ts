import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { UnitData } from '@/interfaces/unit';
import { Skill } from '@/interfaces/skill';
import { Region } from './regionSlice';
import { fetchUnitList, fetchUnitBundle } from '@/lib/fetchData';

// The heavy detail half of a unit bundle; merged with the list record by selectUnitFull.
type UnitDetail = Partial<UnitData>;

// Per-region bucket: the light list plus the per-unit bundles (skills + heavy detail).
// A region switch keeps every region's data, so flipping back needs no refetch.
interface RegionBucket {
  units: { [id: string]: UnitData };
  status: 'idle' | 'loading' | 'failed';
  skills: { [id: string]: { [key: string]: Skill } };
  details: { [id: string]: UnitDetail };
  skillStatus: { [id: string]: 'idle' | 'loading' | 'failed' };
}

const emptyBucket = (): RegionBucket => ({
  units: {}, status: 'loading', skills: {}, details: {}, skillStatus: {},
});

export interface UnitState {
  byRegion: Record<Region, RegionBucket>;
}

const initialState: UnitState = {
  byRegion: { global: emptyBucket(), kr: emptyBucket() },
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

export const fetchUnitBundleAsync = createAsyncThunk<
  { region: Region; unitId: string; skills: { [key: string]: Skill }; detail: UnitDetail },
  string, { state: RootState; pendingMeta: { region: Region } }
>(
  'unit/fetchBundle',
  async (unitId, thunkApi) => {
    const state = thunkApi.getState();
    const region = state.region.region;
    const bucket = state.unit.byRegion[region];
    if (bucket.skills[unitId]) {
      return { region, unitId, skills: bucket.skills[unitId], detail: bucket.details[unitId] ?? {} };
    }
    try {
      // one bundle per unit, carrying both forms' skills plus the heavy detail
      const bundle = await fetchUnitBundle(unitId, region);
      return { region, unitId, skills: bundle?.skills || {}, detail: bundle?.detail || {} };
    } catch {
      return thunkApi.rejectWithValue({ region, unitId, skills: {}, detail: {} }) as any;
    }
  },
  // stamp the active region so the pending loading flag lands in the right bucket
  { getPendingMeta: (_base, { getState }) => ({ region: (getState() as RootState).region.region }) }
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
      .addCase(fetchUnitBundleAsync.pending, (state, action) => {
        state.byRegion[action.meta.region].skillStatus[action.meta.arg] = 'loading';
      })
      .addCase(fetchUnitBundleAsync.fulfilled, (state, action) => {
        const b = state.byRegion[action.payload.region];
        b.skills[action.payload.unitId] = action.payload.skills;
        b.details[action.payload.unitId] = action.payload.detail;
        b.skillStatus[action.payload.unitId] = 'idle';
      })
      .addCase(fetchUnitBundleAsync.rejected, (state, action) => {
        const region = (action.payload as { region?: Region } | undefined)?.region;
        if (region) state.byRegion[region].skillStatus[action.meta.arg] = 'failed';
      });
  },
});

const bucketOf = (state: RootState) => state.unit.byRegion[state.region.region];

export const selectUnits = (state: RootState) => bucketOf(state).units;
export const selectUnitStatus = (state: RootState) => bucketOf(state).status;
// Light list record (grid/hover). Use selectUnitFull on the detail page.
export const selectUnit = (state: RootState, id: string) => bucketOf(state).units[id] ?? null;

// Shared empty map so a not-yet-loaded id returns a stable reference.
export const EMPTY_SKILLS: { [key: string]: Skill } = {};

// Falls back to the light record until the bundle loads.
export const selectUnitFull: (state: RootState, id: string) => UnitData | null = createSelector(
  [
    (state: RootState, id: string) => bucketOf(state).units[id],
    (state: RootState, id: string) => bucketOf(state).details[id],
  ],
  (base, detail): UnitData | null => {
    if (!base) return null;
    return detail ? ({ ...base, ...detail } as UnitData) : base;
  },
  { memoizeOptions: { maxSize: 12 } },
);

export const selectUnitSkills = (state: RootState, id: string) =>
  bucketOf(state).skills[id] ?? EMPTY_SKILLS;
export const selectUnitSkillStatus = (state: RootState, id: string) =>
  bucketOf(state).skillStatus[id] ?? 'idle';

export default unitSlice.reducer;
