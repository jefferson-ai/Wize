import React from 'react';
import { View, Text, ActivityIndicator, Image, StyleSheet } from 'react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { fontDisplay, fontText } from '../../theme/fonts';

const dollarIcon = require('../../assets/dollar-icon.png');

export default function SplashScreen() {
  const colors = useThemeColors();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Image 
        source={dollarIcon} 
        style={styles.logo} 
        resizeMode="contain" 
      />
      <Text style={[styles.title, { color: colors.text }]}>
        SpendWise
      </Text>
      <ActivityIndicator size="large" color={colors.text} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 120, height: 120, marginBottom: 24 },
  title: { fontSize: 36, fontWeight: '800', color: '#212529', marginBottom: 24, letterSpacing: 1, fontFamily: fontDisplay },
});
