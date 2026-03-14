import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const SFU_RED = '#C8102E';

function SplashScreen({ onDone }: { onDone: () => void }) {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const lineWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(lineWidth, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start(() => {
      setTimeout(onDone, 800);
    });
  }, []);

  return (
    <View style={styles.splashContainer}>
      <StatusBar style="light" />
      <Animated.View style={{ opacity: fadeIn, alignItems: 'center' }}>
        <Text style={styles.splashWelcome}>Welcome to</Text>
        <Text style={styles.splashTitle}>AskSFU</Text>
        <Animated.View
          style={[
            styles.splashUnderline,
            {
              width: lineWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

function RootLayoutNav() {
  const router = useRouter();
  // null = still deciding, string = route is ready to navigate to
  const routeTarget = useRef<string | null>(null);
  const [splashDone, setSplashDone] = useState(false);

  // Start the AsyncStorage check immediately (in parallel with the splash animation)
  useEffect(() => {
    AsyncStorage.getItem('hasOnboarded')
      .then(val => {
        routeTarget.current = val === 'true' ? '/(tabs)' : '/onboarding';
      })
      .catch(() => {
        routeTarget.current = '/onboarding';
      });
  }, []);

  // Once the Stack is mounted (splashDone = true), navigate to the target route.
  // useEffect runs AFTER the render, so the Stack is fully mounted before we navigate.
  useEffect(() => {
    if (!splashDone) return;
    // If check already done, navigate immediately; otherwise poll until ready.
    const navigate = () => {
      if (routeTarget.current) {
        router.replace(routeTarget.current as any);
      } else {
        setTimeout(navigate, 16);
      }
    };
    navigate();
  }, [splashDone]);

  if (!splashDone) {
    return <SplashScreen onDone={() => setSplashDone(true)} />;
  }

  // Render Stack — navigation fires in the useEffect above after mount
  return (
    <>
      <StatusBar style="dark" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="chatbot" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return <RootLayoutNav />;
}

export const unstable_settings = {
  anchor: '(tabs)',
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: SFU_RED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashWelcome: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  splashTitle: {
    color: '#fff',
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: 1,
  },
  splashUnderline: {
    height: 3,
    backgroundColor: '#fff',
    marginTop: 6,
    borderRadius: 2,
    alignSelf: 'flex-start',
  },
});
