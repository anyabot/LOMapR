import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import worldReducer from './store/worldSlice';
import enemyReducer from './store/enemySlice';
import skillReducer from './store/skillSlice';
import sanctumReducer from './store/sanctumSlice';

export const store = configureStore({
  reducer: {
    enemy: enemyReducer,
    sanctum: sanctumReducer,
    skill: skillReducer,
    world: worldReducer
  },
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;