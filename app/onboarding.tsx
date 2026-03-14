import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';

const SFU_RED = '#C8102E';

interface PrefRowProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

function PrefRow({ label, value, onChange }: PrefRowProps) {
  return (
    <View style={styles.prefRow}>
      <Text style={styles.prefLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#D1D1D1', true: SFU_RED }}
        thumbColor="#fff"
        ios_backgroundColor="#D1D1D1"
      />
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const [allowPromptData, setAllowPromptData] = useState(true);
  const [rememberFiles, setRememberFiles] = useState(true);
  const [promptHistory, setPromptHistory] = useState(true);

  const handleStart = async () => {
    await AsyncStorage.setItem('hasOnboarded', 'true');
    await AsyncStorage.setItem(
      'preferences',
      JSON.stringify({ allowPromptData, rememberFiles, promptHistory })
    );
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.heading}>Preferences</Text>
          <Text style={styles.subheading}>These can be changed later</Text>

          <PrefRow
            label="Allow usage of my prompt data to help improve AskSFU?"
            value={allowPromptData}
            onChange={setAllowPromptData}
          />

          <PrefRow
            label="Remember uploaded files?"
            value={rememberFiles}
            onChange={setRememberFiles}
          />

          <PrefRow
            label="Enable prompt history?"
            value={promptHistory}
            onChange={setPromptHistory}
          />

          <TouchableOpacity onPress={() => console.log('Terms of service pressed')}>
            <Text style={styles.tos}>Terms of service</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.startButton} onPress={handleStart} activeOpacity={0.85}>
            <Text style={styles.startButtonText}>Start</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#C8102E',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subheading: {
    fontSize: 13,
    color: '#888',
    marginBottom: 24,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F2F2F2',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 12,
  },
  prefLabel: {
    flex: 1,
    fontSize: 14,
    color: '#1a1a1a',
    lineHeight: 20,
  },
  tos: {
    textAlign: 'center',
    color: '#555',
    fontSize: 13,
    textDecorationLine: 'underline',
    marginTop: 8,
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: '#C8102E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
