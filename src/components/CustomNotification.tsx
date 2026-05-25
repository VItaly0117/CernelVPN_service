import React, {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, Animated, Dimensions, View, TouchableOpacity} from 'react-native';

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

      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 40,
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

      const timer = setTimeout(() => {
        dismissNotification();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      dismissNotification();
    }
  }, [message, duration, dismissNotification, opacityAnim, slideAnim]);

  if (!visibleMessage) {return null;}

  const getThemeStyles = () => {
    switch (type) {
      case 'success':
        return {borderColor: 'rgba(11,226,188,0.4)', glowColor: 'rgba(11,226,188,0.1)', indicator: '#0be2bc'};
      case 'warning':
        return {borderColor: 'rgba(255,171,0,0.4)', glowColor: 'rgba(255,171,0,0.1)', indicator: '#FFAB00'};
      case 'error':
        return {borderColor: 'rgba(255,23,68,0.4)', glowColor: 'rgba(255,23,68,0.1)', indicator: '#FF1744'};
      default:
        return {borderColor: 'rgba(0,229,255,0.4)', glowColor: 'rgba(0,229,255,0.1)', indicator: '#00E5FF'};
    }
  };

  const themeStyles = getThemeStyles();

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          borderColor: themeStyles.borderColor,
          backgroundColor: 'rgba(13,14,18,0.95)',
          borderLeftColor: themeStyles.indicator,
          transform: [{translateY: slideAnim}],
          opacity: opacityAnim,
          shadowColor: themeStyles.indicator,
        },
      ]}>
      {/* Tap-to-dismiss full area */}
      <TouchableOpacity
        style={styles.tapArea}
        activeOpacity={0.85}
        onPress={dismissNotification}>
        <Text style={styles.toastText} numberOfLines={2}>
          {visibleMessage}
        </Text>
      </TouchableOpacity>

      {/* Close × button */}
      <TouchableOpacity
        style={[styles.closeBtn, {borderColor: themeStyles.borderColor}]}
        onPress={dismissNotification}
        hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
        <Text style={[styles.closeX, {color: themeStyles.indicator}]}>×</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const {width} = Dimensions.get('window');

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: width * 0.05,
    width: width * 0.9,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderLeftWidth: 6,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 9999,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  tapArea: {
    flex: 1,
    paddingVertical: 2,
    paddingRight: 8,
  },
  toastText: {
    color: '#F0F2F5',
    fontSize: 14.5,
    fontFamily: 'Play-Regular',
    lineHeight: 20,
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  closeX: {
    fontSize: 20,
    lineHeight: 24,
    fontFamily: 'Play-Bold',
  },
});
