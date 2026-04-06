import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Title row height below the status bar (matches `AnimatedHeader` layout). */
export const TAB_HEADER_BODY = 70;

export function useTabHeaderInset(): number {
  const insets = useSafeAreaInsets();
  return TAB_HEADER_BODY + insets.top;
}
