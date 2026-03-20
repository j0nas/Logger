import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Alert, RefreshControl,
} from 'react-native';
import { colors, spacing } from '../theme';
import { useTrackers } from '../hooks/useTrackers';
import { useLogs } from '../hooks/useLogs';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now - 86400000).toDateString();
  const dateString = d.toDateString();

  if (dateString === today) return 'Today';
  if (dateString === yesterday) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function groupByDate(logs) {
  const groups = {};
  for (const log of logs) {
    const day = new Date(log.logged_at).toDateString();
    if (!groups[day]) groups[day] = [];
    groups[day].push(log);
  }
  return Object.entries(groups).map(([, entries]) => ({
    label: formatDate(entries[0].logged_at),
    entries,
  }));
}

export default function HistoryScreen() {
  const [filter, setFilter] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const { trackers } = useTrackers();
  const { logs, reload, remove } = useLogs({ trackerId: filter, limit: 200 });

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const handleDelete = (log) => {
    Alert.alert('Delete entry?', `${log.tracker_icon} ${log.tracker_name}${log.value ? ` — ${log.value}` : ''}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(log.id) },
    ]);
  };

  const groups = groupByDate(logs);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        <Pressable
          style={[styles.filterChip, !filter && styles.filterActive]}
          onPress={() => setFilter(null)}
        >
          <Text style={[styles.filterText, !filter && styles.filterTextActive]}>All</Text>
        </Pressable>
        {trackers.map(t => (
          <Pressable
            key={t.id}
            style={[styles.filterChip, filter === t.id && styles.filterActive]}
            onPress={() => setFilter(filter === t.id ? null : t.id)}
          >
            <Text style={[styles.filterText, filter === t.id && styles.filterTextActive]}>
              {t.icon} {t.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {groups.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No entries yet</Text>
          </View>
        )}

        {groups.map((group) => (
          <View key={group.label} style={styles.dayGroup}>
            <Text style={styles.dayHeader}>{group.label}</Text>
            {group.entries.map((log) => (
              <Pressable
                key={log.id}
                style={styles.logEntry}
                onLongPress={() => handleDelete(log)}
              >
                <Text style={styles.logIcon}>{log.tracker_icon}</Text>
                <View style={styles.logDetails}>
                  <Text style={styles.logName}>{log.tracker_name}</Text>
                  {(log.value || log.note) && (
                    <Text style={styles.logValue}>
                      {[log.value, log.note].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                </View>
                <Text style={styles.logTime}>{formatTime(log.logged_at)}</Text>
              </Pressable>
            ))}
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  filterRow: {
    maxHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterText: {
    fontSize: 13,
    color: colors.textDim,
  },
  filterTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  list: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  dayGroup: {
    marginTop: spacing.lg,
  },
  dayHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  logIcon: {
    fontSize: 22,
    width: 32,
    textAlign: 'center',
  },
  logDetails: {
    flex: 1,
  },
  logName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  logValue: {
    fontSize: 12,
    color: colors.textDim,
    marginTop: 2,
  },
  logTime: {
    fontSize: 12,
    color: colors.textDim,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textDim,
  },
});
