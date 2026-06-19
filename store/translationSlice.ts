import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';

// Translation layers — each is an independent toggle.
// official is always on (base layer, can't be disabled).
// Precedence (highest wins): community > krMtl > mtl > official.
export interface TranslationState {
  mtl:           boolean;   // Global MTL (machine-translated global skills)
  krMtl:         boolean;   // Missing KR MTL (KR-only skills not in global)
  community:     boolean;   // Community fan-translation
  mtlLoaded:     boolean;   // true once mtl_translation.json has been fetched
  krMtlLoaded:   boolean;   // true once kr_mtl_translation.json has been fetched
  communityLoaded: boolean; // true once community_translation.json has been fetched
}

const STORAGE_KEY_MTL       = 'lomapr.translation.mtl';
const STORAGE_KEY_KR_MTL    = 'lomapr.translation.krMtl';
const STORAGE_KEY_COMMUNITY = 'lomapr.translation.community';

function readBool(key: string, fallback: boolean): boolean {
  try {
    const v = typeof window !== 'undefined' && window.localStorage.getItem(key);
    return v === 'true' ? true : v === 'false' ? false : fallback;
  } catch {
    return fallback;
  }
}

export function loadTranslationLayers(): Partial<TranslationState> | null {
  try {
    if (typeof window === 'undefined') return null;
    return {
      mtl:       readBool(STORAGE_KEY_MTL,       false),
      krMtl:     readBool(STORAGE_KEY_KR_MTL,    false),
      community: readBool(STORAGE_KEY_COMMUNITY, false),
    };
  } catch {
    return null;
  }
}

const initialState: TranslationState = {
  mtl:             false,
  krMtl:           false,
  community:       false,
  mtlLoaded:       false,
  krMtlLoaded:     false,
  communityLoaded: false,
};

export const translationSlice = createSlice({
  name: 'translation',
  initialState,
  reducers: {
    setMtl: (state, action: PayloadAction<boolean>) => {
      state.mtl = action.payload;
      try {
        if (typeof window !== 'undefined')
          window.localStorage.setItem(STORAGE_KEY_MTL, String(action.payload));
      } catch { /* ignore */ }
    },
    setKrMtl: (state, action: PayloadAction<boolean>) => {
      state.krMtl = action.payload;
      try {
        if (typeof window !== 'undefined')
          window.localStorage.setItem(STORAGE_KEY_KR_MTL, String(action.payload));
      } catch { /* ignore */ }
    },
    setCommunity: (state, action: PayloadAction<boolean>) => {
      state.community = action.payload;
      try {
        if (typeof window !== 'undefined')
          window.localStorage.setItem(STORAGE_KEY_COMMUNITY, String(action.payload));
      } catch { /* ignore */ }
    },
    setMtlLoaded:       (state) => { state.mtlLoaded       = true; },
    setKrMtlLoaded:     (state) => { state.krMtlLoaded     = true; },
    setCommunityLoaded: (state) => { state.communityLoaded = true; },
  },
});

export const { setMtl, setKrMtl, setCommunity,
               setMtlLoaded, setKrMtlLoaded, setCommunityLoaded } = translationSlice.actions;
export const selectMtl             = (state: RootState) => state.translation.mtl;
export const selectKrMtl           = (state: RootState) => state.translation.krMtl;
export const selectCommunity       = (state: RootState) => state.translation.community;
export const selectMtlLoaded       = (state: RootState) => state.translation.mtlLoaded;
export const selectKrMtlLoaded     = (state: RootState) => state.translation.krMtlLoaded;
export const selectCommunityLoaded = (state: RootState) => state.translation.communityLoaded;

export default translationSlice.reducer;
