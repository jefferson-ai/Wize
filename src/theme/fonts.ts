import { Platform } from 'react-native';

/** Web: stack requested by the user, prioritized Helvetica Neue */
const WEB_TEXT =
  '"Helvetica Neue", Helvetica, -apple-system, "system-ui", "Apple Color Emoji", "SF Pro", "SF Pro Icons", Arial, sans-serif';

export const fontText = Platform.select({
  ios: 'Helvetica Neue',
  android: 'sans-serif',
  web: WEB_TEXT,
  default: 'System',
}) as string;

export const fontDisplay = Platform.select({
  ios: 'Helvetica Neue',
  android: 'sans-serif',
  web: WEB_TEXT,
  default: 'System',
}) as string;

export const fontRounded = Platform.select({
  ios: 'Helvetica Neue',
  android: 'sans-serif',
  web: WEB_TEXT,
  default: 'System',
}) as string;
