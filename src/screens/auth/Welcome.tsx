import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthStackScreenProps } from '../../navigation/types';

const dollarIcon = require('../../assets/dollar-icon.png');

export default function WelcomeScreen({ navigation }: AuthStackScreenProps<'Welcome'>) {
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-zinc-950">
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-28 h-28 bg-violet-50 dark:bg-violet-900/30 rounded-3xl items-center justify-center mb-8 shadow-sm">
          <Image
            source={dollarIcon}
            style={{ width: 80, height: 80 }}
            resizeMode="contain"
          />
        </View>
        <Text className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4 text-center">
          Welcome to SpendWise
        </Text>
        <Text className="text-base text-zinc-500 dark:text-zinc-400 text-center mb-12">
          Take control of your finances easily and securely.
        </Text>

        <TouchableOpacity
          className="w-full bg-violet-500 py-4 rounded-xl items-center mb-4"
          onPress={() => navigation.navigate('SignUp')}
        >
          <Text className="text-white font-semibold text-lg">Create Account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="w-full bg-zinc-100 dark:bg-zinc-800 py-4 rounded-xl items-center"
          onPress={() => navigation.navigate('SignIn')}
        >
          <Text className="text-zinc-900 dark:text-zinc-50 font-semibold text-lg">
            Log In
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
