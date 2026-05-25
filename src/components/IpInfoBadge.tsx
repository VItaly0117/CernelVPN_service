import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type {IpInfo} from '../hooks/useIpInfo';

interface IpInfoBadgeProps {
  info: IpInfo | null;
}

export const IpInfoBadge: React.FC<IpInfoBadgeProps> = ({info}) => {
  const slideAnim = useRef(new Animated.Value(20)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (info) {
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [info, slideAnim, fadeAnim]);

  if (!info && fadeAnim) {
    // Still render to allow fade-out animation
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{translateY: slideAnim}],
        },
      ]}>
      {info?.flag ? (
        <Text style={styles.flag}>{info.flag}</Text>
      ) : (
        <MaterialCommunityIcons name="earth" size={24} color="#00E676" />
      )}
      <View style={styles.textGroup}>
        <Text style={styles.ip} numberOfLines={1}>
          {info?.ip ?? '—'}
        </Text>
        <Text style={styles.location} numberOfLines={1}>
          {info ? `${info.city ? info.city + ', ' : ''}${info.country}` : '—'}
        </Text>
      </View>
      <View style={styles.securedBadge}>
        <Text style={styles.securedText}>SECURED</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(0,230,118,0.07)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.2)',
    gap: 10,
  },
  flag: {
    fontSize: 22,
  },
  textGroup: {
    flex: 1,
    gap: 2,
  },
  ip: {
    fontFamily: 'Play-Bold',
    fontSize: 13,
    color: '#00E676',
    letterSpacing: 0.5,
  },
  location: {
    fontFamily: 'Play-Regular',
    fontSize: 9,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.5,
  },
  securedBadge: {
    backgroundColor: 'rgba(0,230,118,0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.3)',
  },
  securedText: {
    fontFamily: 'Play-Bold',
    fontSize: 8,
    color: '#00E676',
    letterSpacing: 2,
  },
});
