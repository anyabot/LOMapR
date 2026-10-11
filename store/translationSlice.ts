import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { browserStorage, createPersisted } from '@altterisk/game-hub/persist';
import { RootState } from '../store';

// Independent toggles over the always-on official layer. Precedence is
// region-dependent - see .ai/knowledge/project.md.
export interface TranslationState {
  mtl:           boolean;   // Global MTL (machine-translated global skills)
  krMtl:         boolean;   // Missing KR MTL (KR-only skills not in global)
  community:     boolean;   // Community fan-translation
  mtlLoaded:     boolean;   // true once mtl_translation.json has been fetched
  krMtlLoaded:   boolean;   // true once kr_mtl_translation.json has been fetched
  communityLoaded: boolean; // true once community_translation.json has been fetched
}

const layerStore = (key: string) => createPersisted<boolean>({
  key,
  version: 1,
  empty: () => false,
  sanitize: (raw) => raw === true || raw === 'true',
});
const mtlStore       = layerStore('lomapr.translation.mtl');
const krMtlStore     = layerStore('lomapr.translation.krMtl');
const communityStore = layerStore('lomapr.translation.community');

export function loadTranslationLayers(): Partial<TranslationState> | null {
  if (!browserStorage()) return null;
  return {
    mtl:       mtlStore.load(),
    krMtl:     krMtlStore.load(),
    community: communityStore.load(),
  };
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
      mtlStore.save(action.payload);
    },
    setKrMtl: (state, action: PayloadAction<boolean>) => {
      state.krMtl = action.payload;
      krMtlStore.save(action.payload);
    },
    setCommunity: (state, action: PayloadAction<boolean>) => {
      state.community = action.payload;
      communityStore.save(action.payload);
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
