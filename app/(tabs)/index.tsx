import { useRouter } from 'expo-router';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const SFU_RED = '#C8102E';

// ---- Icons (simple SVG-like emoji stand-ins drawn with pure RN) ----
// We'll use simple unicode/emoji icons inside colored circle badges.

interface FeatureCardProps {
  title: string;
  subtitle: string;
  icon: string;
  bgColor: string;
  iconBg: string;
  textColor?: string;
  subtitleColor?: string;
  flex?: number;
  onPress?: () => void;
}

function FeatureCard({
  title,
  subtitle,
  icon,
  bgColor,
  iconBg,
  textColor = '#fff',
  subtitleColor,
  flex = 1,
  onPress,
}: FeatureCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: bgColor, flex }]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      {/* Arrow */}
      <Text style={[styles.cardArrow, { color: textColor }]}>↗</Text>

      {/* Icon badge */}
      <View style={[styles.iconBadge, { backgroundColor: iconBg }]}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>

      {/* Text */}
      <Text style={[styles.cardTitle, { color: textColor }]}>{title}</Text>
      <Text style={[styles.cardSubtitle, { color: subtitleColor ?? (textColor === '#fff' ? 'rgba(255,255,255,0.7)' : '#888') }]}>
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
}

interface WideCardProps {
  title: string;
  subtitle: string;
  icon: string;
  bgColor: string;
  iconBg: string;
  textColor?: string;
  subtitleColor?: string;
  onPress?: () => void;
}

function WideCard({
  title,
  subtitle,
  icon,
  bgColor,
  iconBg,
  textColor = '#1a1a1a',
  subtitleColor = '#666',
  onPress,
}: WideCardProps) {
  return (
    <TouchableOpacity
      style={[styles.wideCard, { backgroundColor: bgColor }]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      {/* Icon badge */}
      <View style={[styles.wideIconBadge, { backgroundColor: iconBg }]}>
        <Text style={styles.wideIconText}>{icon}</Text>
      </View>

      {/* Text */}
      <View style={styles.wideTextBlock}>
        <Text style={[styles.wideTitle, { color: textColor }]}>{title}</Text>
        <Text style={[styles.wideSubtitle, { color: subtitleColor }]}>{subtitle}</Text>
      </View>

      {/* Arrow */}
      <Text style={[styles.wideArrow, { color: textColor === '#fff' ? 'rgba(255,255,255,0.6)' : '#aaa' }]}>↗</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();

  const handleAcademicAdvisor = () => {
    // TODO: navigate to Academic Advisor screen
    console.log('Academic Advisor pressed');
  };

  const handleCoursesProfs = () => {
    // TODO: navigate to Courses & Profs screen
    console.log('Courses & Profs pressed');
  };

  const handleMap = () => {
    // TODO: navigate to Map screen
    console.log('Map pressed');
  };

  const handleChatbot = () => {
    router.push('/chatbot');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerText}>
            Discover <Text style={styles.headerRed}>ASKSFU</Text>
          </Text>
        </View>

        {/* Top row: 2 square cards */}
        <View style={styles.row}>
          <FeatureCard
            title={'Academic\nAdvisor'}
            subtitle={'Get degree planning &\ngraduation help'}
            icon="🎓"
            bgColor={SFU_RED}
            iconBg="rgba(255,255,255,0.2)"
            onPress={handleAcademicAdvisor}
          />
          <View style={styles.rowGap} />
          <FeatureCard
            title={'Courses &\nProfs'}
            subtitle={'Faculty insights\n& degree requirements'}
            icon="📖"
            bgColor="#2C2C2C"
            iconBg="rgba(255,255,255,0.12)"
            onPress={handleCoursesProfs}
          />
        </View>

        {/* Map — wide light card */}
        <WideCard
          title="Map"
          subtitle="Find your way to class"
          icon="📍"
          bgColor="#F0F0F0"
          iconBg="rgba(200,16,46,0.12)"
          textColor="#1a1a1a"
          subtitleColor="#666"
          onPress={handleMap}
        />

        {/* Chatbot — wide dark card */}
        <WideCard
          title="SFU AI Chatbot"
          subtitle="Your intelligent university companion"
          icon="💬"
          bgColor="#1E1E1E"
          iconBg={SFU_RED}
          textColor="#fff"
          subtitleColor="rgba(255,255,255,0.55)"
          onPress={handleChatbot}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scroll: {
    paddingTop: 64,
    paddingBottom: 40,
    paddingHorizontal: 20,
    gap: 16,
  },
  header: {
    marginBottom: 8,
  },
  headerText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },
  headerRed: {
    color: SFU_RED,
  },
  row: {
    flexDirection: 'row',
  },
  rowGap: {
    width: 14,
  },
  // Square cards
  card: {
    borderRadius: 20,
    padding: 18,
    minHeight: 190,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  cardArrow: {
    position: 'absolute',
    top: 14,
    right: 16,
    fontSize: 16,
    opacity: 0.6,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconText: {
    fontSize: 22,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
  // Wide cards
  wideCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  wideIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  wideIconText: {
    fontSize: 24,
  },
  wideTextBlock: {
    flex: 1,
  },
  wideTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 3,
  },
  wideSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
  wideArrow: {
    fontSize: 16,
    alignSelf: 'flex-start',
  },
});
