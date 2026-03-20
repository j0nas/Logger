import { Suspense } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { migrateDb } from '../db/migrations';
import { colors } from '../theme';

function Loading() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

export default function Layout() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <Suspense fallback={<Loading />}>
        <SQLiteProvider databaseName="logger.db" onInit={migrateDb} useSuspense>
          <Tabs
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg, shadowColor: 'transparent' },
              headerTintColor: colors.text,
              headerTitleStyle: { fontWeight: '700' },
              tabBarStyle: {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
                paddingBottom: 4,
              },
              tabBarActiveTintColor: colors.accent,
              tabBarInactiveTintColor: colors.textDim,
            }}
          >
            <Tabs.Screen
              name="index"
              options={{
                title: 'Log',
                headerTitle: 'Logger',
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="add-circle" size={size} color={color} />
                ),
              }}
            />
            <Tabs.Screen
              name="history"
              options={{
                title: 'History',
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="time" size={size} color={color} />
                ),
              }}
            />
            <Tabs.Screen
              name="settings"
              options={{
                title: 'Settings',
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="settings-outline" size={size} color={color} />
                ),
              }}
            />
          </Tabs>
        </SQLiteProvider>
      </Suspense>
    </View>
  );
}
