import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import worldReducer from './store/worldSlice';
import enemyReducer from './store/enemySlice';
import skillReducer from './store/skillSlice';
import sanctumReducer from './store/sanctumSlice';
import imageReducer from './store/imageSlice';
import itemReducer from './store/itemSlice';
import IWReducer from './store/IWSlice';
import regionReducer from './store/regionSlice';
import translationReducer from './store/translationSlice';
import aiReducer from './store/aiSlice';
import unitReducer from './store/unitSlice';

export const store = configureStore({
  reducer: {
    ai: aiReducer,
    enemy: enemyReducer,
    image: imageReducer,
    item: itemReducer,
    iw: IWReducer,
    region: regionReducer,
    translation: translationReducer,
    sanctum: sanctumReducer,
    skill: skillReducer,
    unit: unitReducer,
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