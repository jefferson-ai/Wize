import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthStackScreenProps } from '../../navigation/types';
import { supabase } from '../../utils/supabase';
import { Eye, EyeOff } from 'lucide-react-native';

export default function SignUpScreen({ navigation }: AuthStackScreenProps<'SignUp'>) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert(
        'Success',
        'Account created! You can now sign in.',
        [{ text: 'OK', onPress: () => navigation.navigate('SignIn') }]
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-zinc-950 px-6">
      <View className="flex-1 justify-center">
        <Text className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Create Account
        </Text>
        <Text className="text-zinc-500 dark:text-zinc-400 mb-8">
          Start your journey to better finance today.
        </Text>

        <View className="space-y-4 mb-8">
          <View>
            <Text className="text-zinc-700 dark:text-zinc-300 mb-2 font-medium">Email</Text>
            <TextInput
              className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-zinc-50"
              placeholder="you@example.com"
              placeholderTextColor="#71717a"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          
          <View>
            <Text className="text-zinc-700 dark:text-zinc-300 mb-2 font-medium">Password</Text>
            <View className="relative justify-center">
              <TextInput
                className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 pr-12 text-zinc-900 dark:text-zinc-50"
                placeholder="••••••••"
                placeholderTextColor="#71717a"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity 
                className="absolute right-4" 
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showPassword ? (
                  <EyeOff size={20} color="#71717a" />
                ) : (
                  <Eye size={20} color="#71717a" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity
          className={`w-full bg-violet-500 py-4 rounded-xl items-center mb-4 flex-row justify-center ${loading ? 'opacity-70' : ''}`}
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading && <ActivityIndicator color="#fff" className="mr-2" />}
          <Text className="text-white font-semibold text-lg">
            Sign Up
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="items-center"
          onPress={() => navigation.navigate('SignIn')}
          disabled={loading}
        >
          <Text className="text-violet-600 dark:text-violet-400 font-medium">
            Already have an account? Sign In
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
