import React from 'react';
import { View, Text, ActivityIndicator, Image } from 'react-native';

const dollarIcon = require('../../assets/dollar-icon.png');

export default function SplashScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-zinc-900">
      <Image 
        source={dollarIcon} 
        style={{ width: 120, height: 120, marginBottom: 24 }} 
        resizeMode="contain" 
      />
      <Text className="text-4xl font-extrabold text-violet-500 mb-6 tracking-wide">
        SpendWise
      </Text>
      <ActivityIndicator size="large" color="#600aff" />
    </View>
  );
}
