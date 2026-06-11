import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';

// 'community' = prefer the OLD hand/fan translation overlay (default);
// 'official'  = use only the official in-game English.
export type Translation = 'community' | 'official';

export interface TranslationState {
  translation: Translation;
}

const STORAGE_KEY = 'lomapr.translation';

export function loadTranslation(): Translation | null {
  try {
    const v = typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY);
    return v === 'official' || v === 'community' ? v : null;
  } catch {
    return null;
  }
}

// Default 'community' (OLD overlay preferred); same on server and client so no
// hydration mismatch — the persisted value is applied after mount.
const initialState: TranslationState = {
  translation: 'community',
};

export const translationSlice = createSlice({
  name: 'translation',
  initialState,
  reducers: {
    setTranslation: (state, action: PayloadAction<Translation>) => {
      state.translation = action.payload;
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, action.payload);
        }
      } catch {
        /* ignore storage errors */
      }
    },
  },
});

export const { setTranslation } = translationSlice.actions;
export const selectTranslation = (state: RootState) => state.translation.translation;

export default translationSlice.reducer;
