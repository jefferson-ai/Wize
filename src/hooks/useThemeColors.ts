import { useColorScheme as useNativeColorScheme } from 'react-native';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { LightTheme, DarkTheme } from '../theme/colors';

export function useThemeColors() {
  const { theme } = useAppSettingsStore();
  const systemColorScheme = useNativeColorScheme();
  
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  return isDark ? DarkTheme : LightTheme;
}
