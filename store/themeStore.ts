export type ThemeState = { override: boolean | null }
export const initialThemeState: ThemeState = { override: null }
export function setThemeOverride(state: ThemeState, override: boolean | null): ThemeState {
  return { ...state, override }
}
