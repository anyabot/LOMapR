import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import counterReducer from './store/counterSlice';
import worldReducer from './store/worldSlice';

export const store = configureStore({
  reducer: {
    counter: counterReducer,
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