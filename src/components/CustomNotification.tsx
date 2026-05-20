import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, Animated, Dimensions, View } from 'react-native';

interface CustomNotificationProps {
  message: string | null;
  type?: 'success' | 'info' | 'warning' | 'error';
  duration?: number;
  onDismiss: () => void;
}

export const CustomNotification: React.FC<CustomNotificationProps> = ({
  message,
  type = 'info',
  duration = 3500,
  onDismiss,
}) => {
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [visibleMessage, setVisibleMessage] = useState<string | null>(null);

  const dismissNotification = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisibleMessage(null);
      onDismiss();
    });
  }, [onDismiss, opacityAnim, slideAnim]);

  useEffect(() => {
    if (message) {
      setVisibleMessage(message);

      // Slide in and fade in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 40, // standard offset from top (safe-area friendly)
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // Setup dismiss timer
      const timer = setTimeout(() => {
        dismissNotification();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      dismissNotification();
    }
  }, [message, duration, dismissNotification, opacityAnim, slideAnim]);

  if (!visibleMessage) return null;

  // Design tokens based on type
  const getThemeStyles = () => {
    switch (type) {
      case 'success':
        return {
          borderColor: 'rgba(11, 226, 188, 0.4)',
          glowColor: 'rgba(11, 226, 188, 0.1)',
          indicator: '#0be2bc',
        };
      case 'warning':
        return {
          borderColor: 'rgba(255, 171, 0, 0.4)',
          glowColor: 'rgba(255, 171, 0, 0.1)',
          indicator: '#FFAB00',
        };
      case 'error':
        return {
          borderColor: 'rgba(255, 23, 68, 0.4)',
          glowColor: 'rgba(255, 23, 68, 0.1)',
          indicator: '#FF1744',
        };
      case 'info':
      default:
        return {
          borderColor: 'rgba(0, 229, 255, 0.4)',
          glowColor: 'rgba(0, 229, 255, 0.1)',
          indicator: '#00E5FF',
        };
    }
  };

  const themeStyles = getThemeStyles();

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          borderColor: themeStyles.borderColor,
          backgroundColor: 'rgba(21, 23, 29, 0.92)', // Glassmorphic card surface
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
          shadowColor: themeStyles.indicator,
        },
      ]}
    >
      <View style={[styles.statusIndicator, { backgroundColor: themeStyles.indicator }]} />
      <Text style={styles.toastText} numberOfLines={2}>
        {visibleMessage}
      </Text>
    </Animated.View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: width * 0.05,
    width: width * 0.9,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 9999,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  statusIndicator: {
    width: 6,
    height: 18,
    borderRadius: 3,
    marginRight: 12,
  },
  toastText: {
    color: '#F0F2F5', // light text
    fontSize: 14.5,
    fontWeight: '600',
    fontFamily: 'Inter-Medium',
    flex: 1,
    lineHeight: 20,
  },
});
