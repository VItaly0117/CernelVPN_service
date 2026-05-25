import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {alertService} from '../services/alertService';
import type {AlertPayload, AlertAction} from '../services/alertService';

interface CustomAlertModalProps {
  isDark?: boolean;
}

export const CustomAlertModal: React.FC<CustomAlertModalProps> = ({isDark = true}) => {
  const [payload, setPayload] = useState<AlertPayload | null>(null);
  const [visible, setVisible] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const show = useCallback((p: AlertPayload) => {
    setPayload(p);
    setVisible(true);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 90,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  const dismiss = useCallback((cb?: () => void) => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      setPayload(null);
      cb?.();
    });
  }, [scaleAnim, opacityAnim]);

  useEffect(() => {
    alertService.setListener(show);
  }, [show]);

  if (!visible || !payload) {return null;}

  const actions: AlertAction[] = payload.actions?.length
    ? payload.actions
    : [{text: 'OK', style: 'default'}];

  const bg = isDark ? '#0D0E12' : '#FFFFFF';
  const textColor = isDark ? '#F0F2F5' : '#0D0E12';
  const secondaryText = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => dismiss()}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: bg,
              transform: [{scale: scaleAnim}],
              opacity: opacityAnim,
            },
          ]}>
          {/* Neon accent top bar */}
          <View style={styles.accentBar} />

          <View style={styles.body}>
            <Text style={[styles.title, {color: textColor}]}>
              {payload.title}
            </Text>
            {!!payload.message && (
              <Text style={[styles.message, {color: secondaryText}]}>
                {payload.message}
              </Text>
            )}
          </View>

          <View style={styles.buttonRow}>
            {actions.map((action, idx) => {
              const isDestructive = action.style === 'destructive';
              const isCancel = action.style === 'cancel';
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.button,
                    idx > 0 && styles.buttonBorderLeft,
                    isDestructive && styles.buttonDestructive,
                    isCancel && styles.buttonCancel,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => dismiss(action.onPress)}>
                  <Text
                    style={[
                      styles.buttonText,
                      isDestructive && {color: '#FF1744'},
                      isCancel && {color: 'rgba(255,255,255,0.45)'},
                      !isDestructive && !isCancel && {color: '#00E5FF'},
                    ]}>
                    {action.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0,229,255,0.3)',
    overflow: 'hidden',
    shadowColor: '#00E5FF',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  accentBar: {
    height: 3,
    backgroundColor: '#00E5FF',
    shadowColor: '#00E5FF',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    gap: 10,
  },
  title: {
    fontFamily: 'Play-Bold',
    fontSize: 17,
    letterSpacing: 0.5,
  },
  message: {
    fontFamily: 'Play-Regular',
    fontSize: 13,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonBorderLeft: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'rgba(255,255,255,0.1)',
  },
  buttonDestructive: {
    backgroundColor: 'rgba(255,23,68,0.07)',
  },
  buttonCancel: {},
  buttonText: {
    fontFamily: 'Play-Bold',
    fontSize: 14,
    letterSpacing: 1,
  },
});
