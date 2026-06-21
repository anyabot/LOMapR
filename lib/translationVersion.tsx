import { createContext, useContext } from 'react';

// Incremented in _app.tsx whenever translation flags toggle or string data arrives.
// Components that call t()/tAny()/tKr() must call useTranslationVersion() so they
// re-render when the resolved text would change. No remounting needed.
export const TranslationVersionContext = createContext(0);

export function useTranslationVersion() {
  useContext(TranslationVersionContext);
}
