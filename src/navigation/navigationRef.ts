import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate(name: keyof RootStackParamList, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as any, params as any);
  }
}

export function navigateNested(stackName: keyof RootStackParamList, screenName: string, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(stackName, {
      screen: screenName,
      params,
    } as any);
  }
}
