import React, {useEffect, useState} from 'react';
import {StyleSheet, Dimensions} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const {width, height} = Dimensions.get('window');
const PARTICLE_COUNT = 30;

interface ParticleProps {
  x: number;
  y: number;
  angle: number;
  distance: number;
  color: string;
  size: number;
  delay: number;
  onComplete?: () => void;
}

function Particle({
  x,
  y,
  angle,
  distance,
  color,
  size,
  delay,
  onComplete,
}: ParticleProps) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withSequence(
      withTiming(1, {duration: 100}),
      withTiming(0, {duration: 600, easing: Easing.out(Easing.quad)})
    ));
    progress.value = withDelay(
      delay,
      withTiming(1, {duration: 700, easing: Easing.out(Easing.cubic)}, (finished) => {
        if (finished && onComplete) {
          runOnJS(onComplete)();
        }
      })
    );
  }, [delay, progress, opacity, onComplete]);

  const animatedStyle = useAnimatedStyle(() => {
    const currentDistance = progress.value * distance;
    const currentX = x + Math.cos(angle) * currentDistance;
    const currentY = y + Math.sin(angle) * currentDistance;
    const scale = 1 - progress.value * 0.5;

    return {
      opacity: opacity.value,
      transform: [
        {translateX: currentX},
        {translateY: currentY},
        {scale},
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

interface ParticlesBurstProps {
  x: number;
  y: number;
  color?: string;
  onComplete?: () => void;
}

export function ParticlesBurst({x, y, color = '#00E676', onComplete}: ParticlesBurstProps) {
  const [particles] = useState(() => {
    return Array.from({length: PARTICLE_COUNT}).map((_, i) => ({
      id: i,
      angle: (i * (Math.PI * 2)) / PARTICLE_COUNT + (Math.random() * 0.5 - 0.25),
      distance: 50 + Math.random() * 100,
      size: 4 + Math.random() * 6,
      delay: Math.random() * 100,
    }));
  });

  const [active, setActive] = useState(true);

  const handleComplete = () => {
    setActive(false);
    onComplete?.();
  };

  if (!active) return null;

  return (
    <Animated.View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, index) => (
        <Particle
          key={p.id}
          x={x}
          y={y}
          angle={p.angle}
          distance={p.distance}
          color={color}
          size={p.size}
          delay={p.delay}
          onComplete={index === 0 ? handleComplete : undefined}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
