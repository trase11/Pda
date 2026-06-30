import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { AppProvider, useApp } from './src/context/AppContext';
import { KitchenProvider } from './src/context/KitchenContext';
import TablesScreen from './src/screens/TablesScreen';
import TableDetailScreen from './src/screens/TableDetailScreen';
import AddItemsScreen from './src/screens/AddItemsScreen';
import MenuManagerScreen from './src/screens/MenuManagerScreen';
import KitchenScreen from './src/screens/KitchenScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import RolePickerScreen from './src/screens/RolePickerScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TablesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tables" component={TablesScreen} />
      <Stack.Screen name="TableDetail" component={TableDetailScreen} />
      <Stack.Screen name="AddItems" component={AddItemsScreen} />
    </Stack.Navigator>
  );
}

function WaiterApp() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: '#16213e', borderTopColor: '#2d2d4e', paddingBottom: 8, height: 60 },
          tabBarActiveTintColor: '#4ecca3',
          tabBarInactiveTintColor: '#666',
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        }}
      >
        <Tab.Screen
          name="TablesTab"
          component={TablesStack}
          options={{
            tabBarLabel: 'Τραπέζια',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🪑</Text>,
          }}
        />
        <Tab.Screen
          name="HistoryTab"
          component={HistoryScreen}
          options={{
            tabBarLabel: 'Ιστορικό',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🧾</Text>,
          }}
        />
        <Tab.Screen
          name="MenuTab"
          component={MenuManagerScreen}
          options={{
            tabBarLabel: 'Κατάλογος',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📋</Text>,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

function Root() {
  const { role, loaded } = useApp();

  if (!loaded) {
    return <View style={{ flex: 1, backgroundColor: '#1a1a2e' }} />;
  }
  if (!role) {
    return <RolePickerScreen />;
  }
  if (role === 'kitchen') {
    return <KitchenScreen />;
  }
  return <WaiterApp />;
}

export default function App() {
  return (
    <AppProvider>
      <KitchenProvider>
        <Root />
      </KitchenProvider>
    </AppProvider>
  );
}
