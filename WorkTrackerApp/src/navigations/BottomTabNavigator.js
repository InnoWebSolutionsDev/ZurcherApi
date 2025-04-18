import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import AssignedWorksScreen from '../screens/AssignedWorksScreen';
import { Ionicons } from '@expo/vector-icons';
import WorkDetail from '../screens/WorkDetail';

import LogoutScreen from '../screens/LogoutScreen'; 


const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
     
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="WorkDetail" component={WorkDetail} />
    </Stack.Navigator>
  );
}

const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'AssignedWorks') {
            iconName = 'list';
          
        } else if (route.name === 'Logout') {
          iconName = 'log-out'; // Icono para logout
        }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: 'blue',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen
        name="HomeTab" // Cambia el nombre para evitar conflictos
        component={HomeStackNavigator}
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name="AssignedWorks"
        component={AssignedWorksScreen}
        options={{ title: 'Trabajos Asignados' }}
      />
       <Tab.Screen
        name="Logout"
        component={LogoutScreen} // Pantalla de logout
        options={{ title: 'Cerrar Sesión' }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;

