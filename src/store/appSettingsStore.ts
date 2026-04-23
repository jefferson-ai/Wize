import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppSettingsState {
  isOnboarded: boolean;
  hasSeenWelcomeCarousel: boolean;
  currency: string;
  theme: 'light' | 'dark' | 'system';
  isOffline: boolean;
  isPro: boolean;
  lastNotificationViewedAt: string | null;
  dismissedNotificationIds: string[];
  setOnboarded: (val: boolean) => void;
  setHasSeenWelcomeCarousel: (val: boolean) => void;
  setCurrency: (val: string) => void;
  setTheme: (val: 'light' | 'dark' | 'system') => void;
  setIsOffline: (status: boolean) => void;
  setIsPro: (val: boolean) => void;
  setLastNotificationViewedAt: (val: string) => void;
  dismissNotification: (id: string) => void;
}

export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set) => ({
      isOnboarded: false,
      hasSeenWelcomeCarousel: false,
      currency: '$',
      theme: 'system',
      isOffline: false,
      isPro: false,
      lastNotificationViewedAt: null,
      dismissedNotificationIds: [],
      setOnboarded: (val) => set({ isOnboarded: val }),
      setHasSeenWelcomeCarousel: (val) => set({ hasSeenWelcomeCarousel: val }),
      setCurrency: (val) => set({ currency: val }),
      setTheme: (val) => set({ theme: val }),
      setIsOffline: (status) => set({ isOffline: status }),
      setIsPro: (val) => set({ isPro: val }),
      setLastNotificationViewedAt: (val) => set({ lastNotificationViewedAt: val }),
      dismissNotification: (id) => set((state) => ({ 
        dismissedNotificationIds: [...state.dismissedNotificationIds, id] 
      })),
    }),
    {
      name: 'app-settings-storage', // unique name
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
