import { createAsyncThunk, createSlice, isRejectedWithValue, PayloadAction } from '@reduxjs/toolkit';
import { RootState, AppThunk } from '../store';
import { Floor } from '@/interfaces/sanctum';

export interface WorldState {
  value: {[key: string]: Floor[][]};
  imagelink: {[key: string]: string};
  status: 'idle' | 'loading' | 'failed';
  floorData?: Floor;
  activeArea: string;
  activeFloor: number;
  activeDiff: number;
}

const initialState: WorldState = {
  value: {},
  imagelink: {},
  status: 'idle',
  activeArea: "EW01",
  activeFloor: 1,
  activeDiff: 0,
};

export const fetchSanctumAsync = createAsyncThunk<{[key: string]: Floor[][]}, void, {state: RootState}>(
  'sanctum/fetch',
  async function (_, thunkApi)  {
    if (thunkApi.getState().sanctum.status == "failed") return {}
    else if (Object.keys(thunkApi.getState().sanctum.value).length > 0) {
      return thunkApi.getState().sanctum.value
    }
    else {
      try {
        const response = await fetch("/api/sanctum").then(res => res.json())
        return response ? response : {}
      }
      catch {
        return thunkApi.rejectWithValue({})
      }
    }
  }
);

export const sanctumSlice = createSlice({
  name: 'world',
  initialState,
  // The `reducers` field lets us define reducers and generate associated actions
  reducers: {
    setArea: (state, action: PayloadAction<string>) => {
      state.activeArea = action.payload;
      if (state.activeFloor >= state.value[state.activeArea].length) {
        state.activeFloor = state.value[state.activeArea].length - 1
      }
      if (state.activeDiff >= state.value[state.activeArea][state.activeFloor].length) {
        state.activeDiff = state.value[state.activeArea][state.activeFloor].length - 1
      }
      state.floorData = {...state.value[state.activeArea][state.activeFloor][state.activeDiff]}
    },
    setFloor: (state, action: PayloadAction<number>) => {
      state.activeFloor = action.payload;
      if (state.activeFloor > state.value[state.activeArea].length) {
        state.activeFloor = state.value[state.activeArea].length
      }
      if (state.activeDiff >= state.value[state.activeArea][state.activeFloor].length) {
        state.activeDiff = state.value[state.activeArea][state.activeFloor].length - 1
      }
      state.floorData = {...state.value[state.activeArea][state.activeFloor][state.activeDiff]}
    },
    setDiff: (state, action: PayloadAction<number>) => {
      state.activeDiff = action.payload;
      if (state.activeDiff > state.value[state.activeArea][state.activeFloor].length) {
        state.activeDiff = state.value[state.activeArea][state.activeFloor].length
      }
      state.floorData = {...state.value[state.activeArea][state.activeFloor][state.activeDiff]}
    },
  },
  // The `extraReducers` field lets the slice handle actions defined elsewhere,
  // including actions generated by createAsyncThunk or in other slices.
  extraReducers: (builder) => {
    builder
      .addCase(fetchSanctumAsync.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchSanctumAsync.fulfilled, (state, action) => {
        state.value = action.payload;
        state.floorData = {...state.value[state.activeArea][state.activeFloor][state.activeDiff]}
      })
      .addCase(fetchSanctumAsync.rejected, (state, action) => {
        state.value = {};
        state.status = 'failed';
      })
  },
});

export const { setArea, setDiff, setFloor } = sanctumSlice.actions;

export const selectSanctum = (state: RootState) => state.sanctum.value;
export const selectSanctumStatus = (state: RootState) => state.sanctum.status;
export const selectFloorData = (state: RootState) => state.sanctum.floorData;
export const selectActiveArea = (state: RootState) => state.sanctum.activeArea;
export const selectActiveFloor = (state: RootState) => state.sanctum.activeFloor;
export const selectActiveDiff = (state: RootState) => state.sanctum.activeDiff;

export default sanctumSlice.reducer;