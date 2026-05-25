import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StatusBar,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import {useVpnStore, vpnStore} from '../store/vpnStore';
import {useResolvedTheme} from '../theme/theme';
import {useTranslation} from 'react-i18next';
import {LANG_OPTIONS} from '../locales/i18n';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const {width, height} = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Welcome to KernelVPN',
    description: 'Experience the next generation of secure, lightning-fast internet access with military-grade encryption.',
    iconName: 'shield-lock-outline',
  },
  {
    id: '2',
    title: 'Smart Routing',
    description: 'Local apps like banking work directly without VPN, while the rest of your traffic is safely tunneled.',
    iconName: 'lightning-bolt-outline',
  },
  {
    id: '3',
    title: 'Always Connected',
    description: 'KernelVPN automatically finds and connects you to the fastest server available with the lowest ping.',
    iconName: 'rocket-launch-outline',
  },
];

interface OnboardingScreenProps {
  onDone: () => void;
}

// --- Sub-components for Hook Rules ---

function SlideItem({
  slide,
  index,
  scrollX,
  width,
  theme,
  t,
}: {
  slide: typeof SLIDES[0];
  index: number;
  scrollX: SharedValue<number>;
  width: number;
  theme: any;
  t: any;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const scale = interpolate(scrollX.value, inputRange, [0.8, 1, 0.8], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP);
    return { opacity, transform: [{ scale }] };
  });

  return (
    <View style={[styles.slide, { width }]}>
      <Animated.View style={[styles.iconContainer, animatedStyle]}>
        <Icon name={slide.iconName} size={90} color={theme.colors.primary} />
      </Animated.View>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        {t(`onboarding.slide${slide.id}_title`, slide.title)}
      </Text>
      <Text style={[styles.description, { color: theme.colors.secondaryText }]}>
        {t(`onboarding.slide${slide.id}_desc`, slide.description)}
      </Text>
    </View>
  );
}

function PaginationDot({
  index,
  scrollX,
  width,
  theme,
}: {
  index: number;
  scrollX: SharedValue<number>;
  width: number;
  theme: any;
}) {
  const dotStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const dotWidth = interpolate(scrollX.value, inputRange, [8, 24, 8], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.3, 1, 0.3], Extrapolation.CLAMP);
    return { width: dotWidth, opacity };
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: theme.colors.primary },
        dotStyle,
      ]}
    />
  );
}

// --- Main Component ---

export function OnboardingScreen({onDone}: OnboardingScreenProps): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const { themeMode, language } = useVpnStore();
  const theme = useResolvedTheme(themeMode);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useSharedValue(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = event.nativeEvent.contentOffset.x;
    scrollX.value = x;
    const index = Math.round(x / width);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const nextSlide = () => {
    if (currentIndex < SLIDES.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: width * (currentIndex + 1),
        animated: true,
      });
    } else {
      vpnStore.setHasCompletedOnboarding(true);
      onDone();
    }
  };

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <View style={[styles.langRow, {marginTop: Platform.OS === 'android' ? StatusBar.currentHeight : 44}]}>
        {LANG_OPTIONS.map(option => {
          const selected = language === option.code;
          return (
            <TouchableOpacity
              key={option.code}
              style={[
                styles.langButton,
                selected && {backgroundColor: theme.colors.primary},
              ]}
              activeOpacity={0.8}
              onPress={() => {
                vpnStore.setLanguage(option.code);
                i18n.changeLanguage(option.code);
              }}>
              <Text
                style={[
                  styles.langText,
                  {
                    color: selected ? '#FFF' : theme.colors.secondaryText,
                    fontFamily: theme.fonts.bold,
                  },
                ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}>
        {SLIDES.map((slide, index) => (
          <SlideItem
            key={slide.id}
            slide={slide}
            index={index}
            scrollX={scrollX}
            width={width}
            theme={theme}
            t={t}
          />
        ))}
      </Animated.ScrollView>

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {SLIDES.map((_, index) => (
            <PaginationDot
              key={index.toString()}
              index={index}
              scrollX={scrollX}
              width={width}
              theme={theme}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, {backgroundColor: theme.colors.primary}]}
          onPress={nextSlide}
          activeOpacity={0.8}>
          <Text style={styles.buttonText}>
            {currentIndex === SLIDES.length - 1 ? t('onboarding.btn_start', 'Get Started') : t('onboarding.btn_next', 'Next')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  langRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    zIndex: 10,
  },
  langButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  langText: {
    fontSize: 12,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  iconContainer: {
    width: width * 0.5,
    height: width * 0.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  icon: {
    fontSize: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    padding: 40,
    paddingBottom: 60,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  button: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
