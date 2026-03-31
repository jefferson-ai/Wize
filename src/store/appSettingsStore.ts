import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppSettingsState {
  isOnboarded: boolean;
  currency: string;
  theme: 'light' | 'dark' | 'system';
  isOffline: boolean;
  setOnboarded: (val: boolean) => void;
  setCurrency: (val: string) => void;
  setTheme: (val: 'light' | 'dark' | 'system') => void;
  setIsOffline: (status: boolean) => void;
}

export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set) => ({
      isOnboarded: false,
      currency: '$',
      theme: 'system',
      isOffline: false,
      setOnboarded: (val) => set({ isOnboarded: val }),
      setCurrency: (val) => set({ currency: val }),
      setTheme: (val) => set({ theme: val }),
      setIsOffline: (status) => set({ isOffline: status }),
    }),
    {
      name: 'app-settings-storage', // unique name
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
