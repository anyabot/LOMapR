import { createContext, useContext } from 'react';

// Components calling t()/tAny()/tKr() must use this, so they re-render in place when
// the resolved text would change. Bumped in _app.tsx.
export const TranslationVersionContext = createContext(0);

export function useTranslationVersion() {
  useContext(TranslationVersionContext);
}
