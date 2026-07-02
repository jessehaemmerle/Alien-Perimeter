import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ItemsScreen from './src/screens/ItemsScreen';
import MapScreen from './src/screens/MapScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import WorldScreen from './src/screens/WorldScreen';
import { useGame } from './src/state/store';
import { colors } from './src/theme';

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.panel,
    border: colors.panelBorder,
    primary: colors.accent,
    text: colors.text,
  },
};

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{icon}</Text>;
}

export default function App() {
  const hydrated = useGame((s) => s.hydrated);
  const tickWorld = useGame((s) => s.tickWorld);

  // Weltsimulation: Angriffswellen, instabile Zonen, Koop-Verbündete
  useEffect(() => {
    if (!hydrated) return;
    tickWorld(Date.now());
    const interval = setInterval(() => tickWorld(Date.now()), 10_000);
    return () => clearInterval(interval);
  }, [hydrated, tickWorld]);

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.loadingText}>Verbindung zum Verteidigungsnetz…</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="light" />
        <Tab.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: colors.panel },
            headerTitleStyle: { color: colors.text, fontWeight: '800' },
            headerTintColor: colors.text,
            tabBarStyle: { backgroundColor: colors.panel, borderTopColor: colors.panelBorder },
            tabBarActiveTintColor: colors.accent,
            tabBarInactiveTintColor: colors.dim,
          }}
        >
          <Tab.Screen
            name="Karte"
            component={MapScreen}
            options={{
              headerShown: false,
              tabBarIcon: ({ focused }) => <TabIcon icon="🗺️" focused={focused} />,
            }}
          />
          <Tab.Screen
            name="Welt"
            component={WorldScreen}
            options={{
              title: 'Alien Perimeter – Weltlage',
              tabBarLabel: 'Welt',
              tabBarIcon: ({ focused }) => <TabIcon icon="🌍" focused={focused} />,
            }}
          />
          <Tab.Screen
            name="Ausrüstung"
            component={ItemsScreen}
            options={{
              headerShown: false,
              tabBarIcon: ({ focused }) => <TabIcon icon="🎒" focused={focused} />,
            }}
          />
          <Tab.Screen
            name="Profil"
            component={ProfileScreen}
            options={{
              title: 'Widerstandsprofil',
              tabBarLabel: 'Profil',
              tabBarIcon: ({ focused }) => <TabIcon icon="🪖" focused={focused} />,
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { color: colors.dim, marginTop: 12, fontSize: 13 },
});
