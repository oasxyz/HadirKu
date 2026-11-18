import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/components/ui';
import { Palette } from '@/constants/theme';

const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'] as const;
const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
] as const;

export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateString(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function getMonday(date: Date): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

export interface ExpandableCalendarProps {
  selectedDate: string; // Format YYYY-MM-DD
  onSelectDate: (date: string) => void;
  markedDates?: ReadonlySet<string> | string[]; // Daftar tanggal YYYY-MM-DD yang memiliki sesi
}

export function ExpandableCalendar({
  selectedDate,
  onSelectDate,
  markedDates = [],
}: ExpandableCalendarProps) {
  const todayStr = useMemo(() => toDateString(new Date()), []);
  const [isExpanded, setIsExpanded] = useState(false);
  const [cursorDate, setCursorDate] = useState<Date>(() => parseDateString(selectedDate));

  const markedSet = useMemo(
    () => (markedDates instanceof Set ? markedDates : new Set(markedDates)),
    [markedDates]
  );

  // Daftar tanggal untuk mode kompak (7 hari dalam minggu cursorDate)
  const weekDays = useMemo(() => {
    const monday = getMonday(cursorDate);
    return Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      return {
        dateStr: toDateString(d),
        dayNumber: d.getDate(),
        inCurrentMonth: d.getMonth() === cursorDate.getMonth(),
      };
    });
  }, [cursorDate]);

  // Daftar tanggal untuk mode terbuka (35/42 hari grid bulanan penuh)
  const monthGridDays = useMemo(() => {
    const firstOfMonth = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1);
    const startMonday = getMonday(firstOfMonth);
    return Array.from({ length: 35 }, (_, idx) => {
      const d = new Date(startMonday);
      d.setDate(startMonday.getDate() + idx);
      return {
        dateStr: toDateString(d),
        dayNumber: d.getDate(),
        inCurrentMonth: d.getMonth() === cursorDate.getMonth(),
      };
    });
  }, [cursorDate]);

  function handleNavigate(direction: -1 | 1) {
    const next = new Date(cursorDate);
    if (isExpanded) {
      next.setMonth(next.getMonth() + direction, 1);
    } else {
      next.setDate(next.getDate() + direction * 7);
    }
    setCursorDate(next);
  }

  function handleJumpToday() {
    const now = new Date();
    setCursorDate(now);
    onSelectDate(toDateString(now));
  }

  function handleDayPress(dateStr: string) {
    onSelectDate(dateStr);
    setCursorDate(parseDateString(dateStr));
    if (isExpanded) {
      setIsExpanded(false);
    }
  }

  const monthTitle = `${MONTH_NAMES[cursorDate.getMonth()]} ${cursorDate.getFullYear()}`;
  const daysToRender = isExpanded ? monthGridDays : weekDays;

  return (
    <GlassCard style={styles.card}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => setIsExpanded((prev) => !prev)}
          style={styles.monthPill}>
          <Text style={styles.monthPillText}>{monthTitle}</Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={15}
            color={Palette.ink}
          />
        </Pressable>

        <View style={styles.navGroup}>
          {selectedDate !== todayStr && (
            <Pressable onPress={handleJumpToday} style={styles.todayChip}>
              <Text style={styles.todayChipText}>Hari Ini</Text>
            </Pressable>
          )}
          <Pressable onPress={() => handleNavigate(-1)} style={styles.navButton}>
            <Ionicons name="chevron-back" size={18} color={Palette.ink} />
          </Pressable>
          <Pressable onPress={() => handleNavigate(1)} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={18} color={Palette.ink} />
          </Pressable>
        </View>
      </View>

      <View style={styles.dayLabelsRow}>
        {DAY_LABELS.map((label) => (
          <Text key={label} style={styles.dayLabel}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {daysToRender.map((item) => {
          const isSelected = item.dateStr === selectedDate;
          const isToday = item.dateStr === todayStr;
          const hasSession = markedSet.has(item.dateStr);

          return (
            <Pressable
              key={item.dateStr}
              onPress={() => handleDayPress(item.dateStr)}
              style={[
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                !isSelected && isToday && styles.dayCellToday,
              ]}>
              <Text
                style={[
                  styles.dayNumber,
                  isExpanded && !item.inCurrentMonth && styles.dayNumberMuted,
                  isSelected && styles.dayNumberSelected,
                ]}>
                {item.dayNumber}
              </Text>
              <View
                style={[
                  styles.sessionDot,
                  hasSession && (isSelected ? styles.sessionDotSelected : styles.sessionDotActive),
                ]}
              />
            </Pressable>
          );
        })}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: 16,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  monthPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: Palette.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  monthPillText: {
    color: Palette.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  navGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  todayChip: {
    backgroundColor: Palette.primaryMuted,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  todayChipText: {
    color: Palette.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  navButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  dayLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dayLabel: {
    color: Palette.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    width: '14.28%',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 6,
  },
  dayCell: {
    alignItems: 'center',
    borderRadius: 999,
    gap: 3,
    justifyContent: 'center',
    paddingVertical: 8,
    width: '14.28%',
  },
  dayCellSelected: {
    backgroundColor: Palette.primary,
  },
  dayCellToday: {
    borderColor: Palette.primary,
    borderWidth: 1,
  },
  dayNumber: {
    color: Palette.text,
    fontSize: 14,
    fontWeight: '600',
  },
  dayNumberMuted: {
    color: Palette.textMuted,
    opacity: 0.45,
  },
  dayNumberSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sessionDot: {
    borderRadius: 999,
    height: 5,
    width: 5,
  },
  sessionDotActive: {
    backgroundColor: Palette.primary,
  },
  sessionDotSelected: {
    backgroundColor: '#FFFFFF',
  },
});