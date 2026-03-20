import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, Pressable, ScrollView, Modal, TextInput,
  StyleSheet, Animated, RefreshControl, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, spacing } from '../theme';
import { useTrackers } from '../hooks/useTrackers';
import { useLogs, useLastLog } from '../hooks/useLogs';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function TrackerButton({ tracker, onPress, justLogged, width }) {
  const lastLog = useLastLog(tracker.id, justLogged);
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (justLogged) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 100, useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 1500, useNativeDriver: false }),
      ]).start();
    }
  }, [justLogged]);

  const borderColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.success],
  });

  return (
    <Pressable
      onPress={() => onPress(tracker)}
      accessibilityRole="button"
      accessibilityLabel={`Log ${tracker.name}${lastLog ? `, last logged ${timeAgo(lastLog.logged_at)}` : ''}`}
    >
      <Animated.View style={[
        styles.trackerBtn,
        { width, transform: [{ scale }], borderColor },
      ]}>
        <Text style={styles.trackerIcon}>{tracker.icon}</Text>
        <Text style={styles.trackerName}>{tracker.name}</Text>
        {lastLog && (
          <Text style={styles.trackerLastLog}>{timeAgo(lastLog.logged_at)}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

function OptionPicker({ tracker, visible, onClose, onSelect }) {
  const [note, setNote] = useState('');
  const insets = useSafeAreaInsets();
  const config = tracker?.config || {};
  const options = config.doses || config.options || [];
  const defaultVal = config.defaultDose;

  const handleSelect = (value) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(tracker.id, value, note || null);
    setNote('');
    onClose();
  };

  if (!tracker || options.length === 0) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]} onPress={e => e.stopPropagation()}>
          <Text style={styles.sheetTitle}>{tracker.icon} {tracker.name}</Text>

          <View style={styles.optionGrid}>
            {options.map((opt) => (
              <Pressable
                key={opt}
                style={[styles.optionBtn, opt === defaultVal && styles.optionDefault]}
                onPress={() => handleSelect(opt)}
                accessibilityRole="button"
                accessibilityLabel={`${opt}${opt === defaultVal ? ', default' : ''}`}
              >
                <Text style={styles.optionText}>{opt}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.noteRow}>
            <TextInput
              style={styles.noteInput}
              placeholder="Add a note (optional)"
              placeholderTextColor={colors.textDim}
              value={note}
              onChangeText={setNote}
            />
          </View>

          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Toast({ message, onUndo, onDismiss }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        onDismiss();
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.toast, { opacity, transform: [{ translateY }] }]}>
      <Text style={styles.toastText}>{message}</Text>
      <Pressable onPress={onUndo} hitSlop={8}>
        <Text style={styles.toastUndo}>Undo</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function LogScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const { trackers, reload } = useTrackers();
  const { add, remove } = useLogs();
  const [pickerTracker, setPickerTracker] = useState(null);
  const [justLoggedId, setJustLoggedId] = useState(null);
  const [toast, setToast] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const busyRef = useRef(false);

  // 2-column grid: screen width - padding(16*2) - gap(12), divided by 2
  const btnWidth = (screenWidth - spacing.lg * 2 - spacing.md) / 2;

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const handlePress = useCallback((tracker) => {
    if (busyRef.current) return; // double-tap guard
    const config = tracker.config || {};
    const options = config.doses || config.options || [];

    if (options.length === 0) {
      doLog(tracker.id, null, null, tracker);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPickerTracker(tracker);
    }
  }, []);

  const doLog = async (trackerId, value, note, tracker) => {
    if (busyRef.current) return;
    busyRef.current = true;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const logId = await add(trackerId, value, note);
      tracker = tracker || trackers.find(t => t.id === trackerId);
      setJustLoggedId(trackerId);
      setToast({
        message: `${tracker?.icon} ${tracker?.name}${value ? ` — ${value}` : ''}`,
        logId,
      });
      setTimeout(() => setJustLoggedId(null), 2000);
    } finally {
      busyRef.current = false;
    }
  };

  const handleUndo = async () => {
    if (toast?.logId) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await remove(toast.logId);
    }
    setToast(null);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.grid}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {trackers.map((t) => (
          <TrackerButton
            key={t.id}
            tracker={t}
            width={btnWidth}
            onPress={handlePress}
            justLogged={justLoggedId === t.id}
          />
        ))}
      </ScrollView>

      <OptionPicker
        tracker={pickerTracker}
        visible={!!pickerTracker}
        onClose={() => setPickerTracker(null)}
        onSelect={(id, value, note) => doLog(id, value, note)}
      />

      {toast && (
        <Toast
          key={toast.logId}
          message={toast.message}
          onUndo={handleUndo}
          onDismiss={() => setToast(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.lg,
    gap: spacing.md,
  },
  trackerBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
  },
  trackerIcon: {
    fontSize: 36,
    marginBottom: spacing.sm,
  },
  trackerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  trackerLastLog: {
    fontSize: 11,
    color: colors.textDim,
    marginTop: spacing.xs,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionBtn: {
    flexBasis: '30%',
    flexGrow: 1,
    paddingVertical: 14,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  optionDefault: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  noteRow: {
    marginTop: spacing.md,
  },
  noteInput: {
    backgroundColor: colors.bg,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.text,
    fontSize: 14,
  },
  cancelBtn: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.bg,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    color: colors.textDim,
  },
  toast: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.success,
    paddingVertical: 10,
    paddingLeft: 20,
    paddingRight: 14,
    borderRadius: 100,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  toastText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  toastUndo: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
