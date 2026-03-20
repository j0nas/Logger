import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet, Alert, Share,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { colors, spacing } from '../theme';
import { useTrackers } from '../hooks/useTrackers';
import { useExportLogs } from '../hooks/useLogs';

const TRACKER_TYPES = [
  { value: 'medication', label: 'Medication', icon: '💊' },
  { value: 'exercise', label: 'Exercise', icon: '🏃' },
  { value: 'custom', label: 'Custom', icon: '📝' },
];

const ICON_OPTIONS = ['💊', '🏃', '💪', '🧘', '💧', '😴', '☕', '📝', '🎯', '⭐', '🧠', '❤️'];
const COLOR_OPTIONS = ['#8b5cf6', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#ec4899', '#14b8a6', '#f97316'];

export default function SettingsScreen() {
  const { trackers, create, update } = useTrackers();
  const getExportData = useExportLogs();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('custom');
  const [icon, setIcon] = useState('📝');
  const [color, setColor] = useState('#6366f1');
  const [optionsText, setOptionsText] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return Alert.alert('Name required');
    const options = optionsText.split(',').map(s => s.trim()).filter(Boolean);
    const config = {};
    if (type === 'medication' && options.length) {
      config.doses = options;
      config.defaultDose = options[0];
    } else if (options.length) {
      config.options = options;
    }

    await create({ name: name.trim(), type, icon, color, config });
    setName('');
    setType('custom');
    setIcon('📝');
    setColor('#6366f1');
    setOptionsText('');
    setShowAdd(false);
  };

  const handleArchive = (tracker) => {
    Alert.alert(
      `Archive ${tracker.name}?`,
      'It will be hidden from the log screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', style: 'destructive', onPress: () => update(tracker.id, { archived: 1 }) },
      ]
    );
  };

  const handleExport = async (format) => {
    const logs = await getExportData();
    let content, filename;

    if (format === 'csv') {
      const header = 'timestamp,tracker,type,value,note';
      const rows = logs.map(l =>
        `${l.logged_at},${l.tracker},${l.type},${(l.value || '').replace(/,/g, ';')},${(l.note || '').replace(/,/g, ';')}`
      );
      content = [header, ...rows].join('\n');
      filename = 'logger-export.csv';
    } else {
      content = JSON.stringify(logs, null, 2);
      filename = 'logger-export.json';
    }

    const path = FileSystem.documentDirectory + filename;
    await FileSystem.writeAsStringAsync(path, content);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path);
    } else {
      await Share.share({ message: content });
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trackers</Text>
        {trackers.map(t => (
          <Pressable
            key={t.id}
            style={styles.trackerRow}
            onLongPress={() => handleArchive(t)}
          >
            <Text style={styles.trackerRowIcon}>{t.icon}</Text>
            <View style={styles.trackerRowInfo}>
              <Text style={styles.trackerRowName}>{t.name}</Text>
              <Text style={styles.trackerRowType}>{t.type}</Text>
            </View>
            <View style={[styles.colorDot, { backgroundColor: t.color }]} />
          </Pressable>
        ))}

        {!showAdd ? (
          <Pressable style={styles.addBtn} onPress={() => setShowAdd(true)}>
            <Text style={styles.addBtnText}>+ Add Tracker</Text>
          </Pressable>
        ) : (
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Water intake"
                placeholderTextColor={colors.textDim}
                value={name}
                onChangeText={setName}
                autoFocus
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Type</Text>
              <View style={styles.chipRow}>
                {TRACKER_TYPES.map(t => (
                  <Pressable
                    key={t.value}
                    style={[styles.chip, type === t.value && styles.chipActive]}
                    onPress={() => { setType(t.value); setIcon(t.icon); }}
                  >
                    <Text style={[styles.chipText, type === t.value && styles.chipTextActive]}>
                      {t.icon} {t.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Icon</Text>
              <View style={styles.chipRow}>
                {ICON_OPTIONS.map(i => (
                  <Pressable
                    key={i}
                    style={[styles.iconChip, icon === i && styles.iconChipActive]}
                    onPress={() => setIcon(i)}
                  >
                    <Text style={styles.iconChipText}>{i}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Color</Text>
              <View style={styles.chipRow}>
                {COLOR_OPTIONS.map(c => (
                  <Pressable
                    key={c}
                    style={[styles.colorChip, { backgroundColor: c }, color === c && styles.colorChipActive]}
                    onPress={() => setColor(c)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Options (comma-separated, optional)</Text>
              <TextInput
                style={styles.input}
                placeholder={type === 'medication' ? 'e.g. 5mg, 10mg, 20mg' : 'e.g. Run, Bike, Walk'}
                placeholderTextColor={colors.textDim}
                value={optionsText}
                onChangeText={setOptionsText}
              />
            </View>

            <View style={styles.formActions}>
              <Pressable style={styles.btnPrimary} onPress={handleCreate}>
                <Text style={styles.btnPrimaryText}>Create</Text>
              </Pressable>
              <Pressable style={styles.btnSecondary} onPress={() => setShowAdd(false)}>
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        <View style={styles.exportRow}>
          <Pressable style={styles.btnSecondary} onPress={() => handleExport('csv')}>
            <Text style={styles.btnSecondaryText}>Export CSV</Text>
          </Pressable>
          <Pressable style={styles.btnSecondary} onPress={() => handleExport('json')}>
            <Text style={styles.btnSecondaryText}>Export JSON</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.hint}>Long-press a tracker to archive it</Text>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  trackerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  trackerRowIcon: { fontSize: 24 },
  trackerRowInfo: { flex: 1 },
  trackerRowName: { fontSize: 15, fontWeight: '500', color: colors.text },
  trackerRowType: { fontSize: 12, color: colors.textDim },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  addBtn: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addBtnText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '500',
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 12,
    color: colors.textDim,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.bg,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.text,
    fontSize: 14,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.bg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  chipText: { fontSize: 13, color: colors.textDim },
  chipTextActive: { color: colors.accent, fontWeight: '600' },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.bg,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChipActive: { borderColor: colors.accent },
  iconChipText: { fontSize: 20 },
  colorChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorChipActive: {
    borderColor: 'white',
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: colors.accent,
    padding: spacing.md,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnPrimaryText: { color: 'white', fontWeight: '600', fontSize: 14 },
  btnSecondary: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  btnSecondaryText: { color: colors.text, fontSize: 14 },
  exportRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  hint: {
    fontSize: 12,
    color: colors.textDim,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
