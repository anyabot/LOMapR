import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import worldReducer from './store/worldSlice';
import enemyReducer from './store/enemySlice';
import skillReducer from './store/skillSlice';
import sanctumReducer from './store/sanctumSlice';
import imageReducer from './store/imageSlice';
import IWReducer from './store/IWSlice';

export const store = configureStore({
  reducer: {
    enemy: enemyReducer,
    image: imageReducer,
    iw: IWReducer,
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