import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' }, // hidden — only one main tab for now
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Home' }}
      />
      {/* explore.tsx exists but is not a visible tab yet */}
      <Tabs.Screen
        name="explore"
        options={{ href: null, title: 'Explore' }}
      />
    </Tabs>
  );
}
