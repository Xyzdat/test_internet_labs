import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { MatchesScreen } from './src/screens/MatchesScreen';

export default function App() {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <View style={[styles.root, darkMode && styles.darkRoot]}>
      <MatchesScreen darkMode={darkMode} onToggleTheme={() => setDarkMode((current) => !current)} />
      <StatusBar style={darkMode ? 'light' : 'dark'} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 48,
    backgroundColor: '#fff',
  },
  darkRoot: {
    backgroundColor: '#111827',
  },
});
