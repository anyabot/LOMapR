import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { EnemyData, EnemyFull } from '@/interfaces/enemy';
import { setRegion } from './regionSlice';
import { fetchEnemyList, fetchEnemy } from '@/lib/fetchData';


export interface EnemyState {
  enemy: {[key: string]: EnemyData};
  full: {[key: string]: EnemyFull};
  active: string;
  level: number;
  status: 'idle' | 'loading' | 'failed';
  fullStatus: {[key: string]: 'loading' | 'idle' | 'failed'};
}

const initialState: EnemyState = {
  enemy: {},
  full: {},
  active: "",
  level: 1,
  status: 'loading',
  fullStatus: {},
};

export const fetchEnemyAsync = createAsyncThunk<{[key: string]: EnemyData}, void, {state: RootState}>(
  'enemy/fetch',
  async function (_, thunkApi)  {
    if (thunkApi.getState().enemy.status == "failed") return {}
    if (Object.keys(thunkApi.getState().enemy.enemy).length > 0) {
      return thunkApi.getState().enemy.enemy
    }
    else {
      try {
        const region = thunkApi.getState().region.region;
        const response = await fetchEnemyList(region)
        return response ? response : {}
      }
      catch {
        return thunkApi.rejectWithValue({})
      }
    }
  }
);

export const fetchEnemyFullAsync = createAsyncThunk<EnemyFull, string, {state: RootState}>(
  'enemy/fetchFull',
  async function (id, thunkApi) {
    const state = thunkApi.getState().enemy;
    if (state.full[id]) return state.full[id];
    // enemy_list.json now carries full records — promote directly if already loaded.
    const fromList = state.enemy[id] as unknown as EnemyFull;
    if (fromList?.HP) return { ...fromList, id };
    // Not yet in store — fetch the full record directly from R2.
    try {
      const region = thunkApi.getState().region.region;
      const data = await fetchEnemy(id, region);
      if (!data) return thunkApi.rejectWithValue(id) as any;
      return data;
    } catch {
      return thunkApi.rejectWithValue(id) as any;
    }
  }
);

export const EnemySlice = createSlice({
  name: 'enemy',
  initialState,
  reducers: {
    setActive: (state, action: PayloadAction<[string, number]>) => {
      state.active = action.payload[0];
      state.level = action.payload[1];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEnemyAsync.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchEnemyAsync.fulfilled, (state, action) => {
        state.enemy = action.payload
        state.status = 'idle';
      })
      .addCase(fetchEnemyAsync.rejected, (state) => {
        state.status = 'failed';
      })
      .addCase(fetchEnemyFullAsync.pending, (state, action) => {
        state.fullStatus[action.meta.arg] = 'loading';
      })
      .addCase(fetchEnemyFullAsync.fulfilled, (state, action) => {
        state.full[action.payload.id] = action.payload;
        state.fullStatus[action.payload.id] = 'idle';
      })
      .addCase(fetchEnemyFullAsync.rejected, (state, action) => {
        state.fullStatus[action.meta.arg] = 'failed';
      })
      // switching region invalidates cached data so it refetches for the new region
      .addCase(setRegion, (state) => {
        state.enemy = {};
        state.full = {};
        state.fullStatus = {};
        state.status = 'loading';
      })
  },
});

export const { setActive } = EnemySlice.actions;
export const selectEnemy = (state: RootState) => state.enemy.enemy;
export const selectEnemyFull = (state: RootState, id: string) => state.enemy.full[id] ?? null;
export const selectEnemyFullStatus = (state: RootState, id: string) => state.enemy.fullStatus[id] ?? null;
export const selectEnemyStatus = (state: RootState) => state.enemy.status;
export const selectActiveEnemy = (state: RootState) => state.enemy.active;
export const selectActiveLevel = (state: RootState) => state.enemy.level;

export default EnemySlice.reducer;
