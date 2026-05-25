import React, {useMemo} from 'react';
import {View, Text, StyleSheet, Animated} from 'react-native';
import {formatBytes} from '../hooks/useTrafficStats';
import {AppTheme} from '../theme/theme';

export interface DailyTraffic {
  date: string;
  rx: number;
  tx: number;
}

interface Props {
  data: DailyTraffic[];
  theme: AppTheme;
}

export function TrafficChart({data, theme}: Props): React.JSX.Element {
  const chartData = useMemo(() => {
    // Fill last 7 days
    const result: DailyTraffic[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let maxVal = 100 * 1024 * 1024; // min 100MB scale

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const entry = data.find(item => item.date === dateStr);
      const rx = entry?.rx || 0;
      const tx = entry?.tx || 0;
      
      if (rx + tx > maxVal) {
        maxVal = rx + tx;
      }

      result.push({date: dateStr, rx, tx});
    }

    return {points: result, maxVal};
  }, [data]);

  const heightAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [heightAnim, data]);

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.surface, borderColor: theme.colors.separator}]}>
      <View style={styles.header}>
        <Text style={[styles.title, {color: theme.colors.text, fontFamily: theme.fonts.bold}]}>
          7-Day Traffic History
        </Text>
        <Text style={[styles.maxLabel, {color: theme.colors.tertiaryText}]}>
          Max: {formatBytes(chartData.maxVal)}
        </Text>
      </View>

      <View style={styles.chartArea}>
        {chartData.points.map((pt, idx) => {
          const total = pt.rx + pt.tx;
          const pct = Math.min(100, Math.max(2, (total / chartData.maxVal) * 100)); // min 2% for visibility
          const dayLabel = new Date(pt.date).toLocaleDateString('en-US', {weekday: 'short'});

          return (
            <View key={pt.date} style={styles.barColumn}>
              <View style={styles.barTrack}>
                <Animated.View
                  style={[
                    styles.barFill,
                    {
                      backgroundColor: theme.colors.primary,
                      height: heightAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', `${pct}%`],
                      }),
                    },
                  ]}
                />
              </View>
              <Text style={[styles.dayLabel, {color: theme.colors.secondaryText}]} numberOfLines={1}>
                {dayLabel}
              </Text>
            </View>
          );
        })}
      </View>
      
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, {backgroundColor: theme.colors.primary}]} />
          <Text style={[styles.legendText, {color: theme.colors.secondaryText}]}>Total (Rx + Tx)</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
  },
  maxLabel: {
    fontSize: 12,
  },
  chartArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    marginBottom: 8,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  barTrack: {
    width: 12,
    height: 100,
    backgroundColor: 'rgba(128,128,128,0.1)',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  legend: {
    flexDirection: 'row',
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
    paddingTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
  },
});
