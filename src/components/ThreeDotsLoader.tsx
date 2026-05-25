import React, {useEffect, useRef} from 'react';
import {Animated, View, StyleSheet} from 'react-native';

interface ThreeDotsLoaderProps {
  color: string;
}

export function ThreeDotsLoader({color}: ThreeDotsLoaderProps): React.JSX.Element {
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const anim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnim = (val: Animated.Value, delay: number) => {
      return Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.sequence([
            Animated.timing(val, {
              toValue: 1,
              duration: 450,
              useNativeDriver: true,
            }),
            Animated.timing(val, {
              toValue: 0,
              duration: 450,
              useNativeDriver: true,
            }),
          ])
        )
      ]);
    };

    Animated.parallel([
      createAnim(anim1, 0),
      createAnim(anim2, 160),
      createAnim(anim3, 320),
    ]).start();
  }, [anim1, anim2, anim3]);

  const getStyle = (val: Animated.Value) => ({
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: color,
    marginHorizontal: 5,
    shadowColor: color,
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 0},
    elevation: 4,
    transform: [
      {
        translateY: val.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -12],
        }),
      },
    ],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={getStyle(anim1)} />
      <Animated.View style={getStyle(anim2)} />
      <Animated.View style={getStyle(anim3)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    marginVertical: 14,
  },
});
