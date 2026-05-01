import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { supabase } from './supabase';
import { syncData } from '../features/sync/syncService';

/**
 * Configure Google Sign-In with your platform-specific Client IDs.
 * 
 * IMPORTANT: You must get these from the Google Cloud Console:
 * 1. Web Client ID (Required for Supabase exchange)
 * 2. iOS Client ID
 */
export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    // Web Client ID from Google Cloud Console
    webClientId: '919301720713-2u0d42f2hsum6stphubcbfasckqsf2pp.apps.googleusercontent.com',
    // iOS Client ID from Google Cloud Console
    iosClientId: '919301720713-jf1vlmhqj9oq3ngct1rmd8sbs6lk457d.apps.googleusercontent.com',
    offlineAccess: true,
  });
};

/**
 * Perform Google Sign-In and exchange the idToken for a Supabase session.
 */
export const signInWithGoogle = async () => {
  try {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    
    if (userInfo.data?.idToken) {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: userInfo.data.idToken,
      });

      if (error) throw error;

      // Trigger bidirectional sync after login
      if (data.user?.id) {
        syncData(data.user.id).catch(err => console.warn('Initial sync failed:', err));
      }

      return { data, error: null };
    } else {
      throw new Error('No ID Token present in Google Sign-In response');
    }
  } catch (error: any) {
    return { data: null, error };
  }
};
