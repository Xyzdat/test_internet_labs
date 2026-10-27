import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { UpdatedAgo } from '../components/UpdatedAgo';
import { FavoriteButton } from '../components/FavoriteButton';
import { useFavorites } from '../hooks/useFavorites';
import { MATCHES_URL } from '../config';
import sampleData from '../../data/matches.json';

type Team = { id: string; name: string; city?: string };
type Match = {
  id: string;
  startsAt: string | null;
  status: string;
  minute?: number;
  home: Team;
  away: Team;
  score: { home: number; away: number } | null;
};
type Filter = 'all' | 'upcoming' | 'finished';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'upcoming', label: 'Предстоящие' },
  { key: 'finished', label: 'Завершённые' },
];

function statusLabel(match: Match) {
  switch (match.status) {
    case 'finished': return 'Завершён';
    case 'live': return match.minute == null ? 'Идёт' : `Идёт · ${match.minute}′`;
    case 'scheduled': return 'Предстоящий';
    case 'postponed': return 'Перенесён';
    default: return 'Статус неизвестен';
  }
}

function formatStart(value: string | null) {
  if (!value) return 'Дата и время не назначены';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Дата и время неизвестны';
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function isMatchList(value: unknown): value is Match[] {
  if (!Array.isArray(value)) return false;
  return value.every((item) => item && typeof item.id === 'string'
    && typeof item.status === 'string' && item.home && typeof item.home.name === 'string'
    && item.away && typeof item.away.name === 'string');
}

type MatchesScreenProps = {
  darkMode: boolean;
  onToggleTheme: () => void;
};

export function MatchesScreen({ darkMode, onToggleTheme }: MatchesScreenProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [usingSampleData, setUsingSampleData] = useState(false);
  const { isFavorite, toggle } = useFavorites();
  const styles = useMemo(() => createStyles(darkMode), [darkMode]);

  const loadMatches = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const response = await fetch(MATCHES_URL);
      // The supplied URL is intentionally a placeholder until OWNER/REPO is replaced.
      if (!response.ok && MATCHES_URL.includes('/OWNER/REPO/')) {
        setMatches(sampleData.matches as Match[]);
        setUsingSampleData(true);
        setUpdatedAt(new Date());
        return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload: unknown = await response.json();
      const list = typeof payload === 'object' && payload !== null && 'matches' in payload
        ? (payload as { matches: unknown }).matches : null;
      if (!isMatchList(list)) throw new Error('Некорректный формат списка матчей');
      setMatches(list);
      setUsingSampleData(false);
      setUpdatedAt(new Date());
    } catch {
      setError('Не удалось загрузить матчи. Проверьте соединение и попробуйте ещё раз.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadMatches(); }, [loadMatches]);

  const visibleMatches = useMemo(() => {
    const filtered = matches.filter((match) => {
      if (filter === 'finished') return match.status === 'finished';
      if (filter === 'upcoming') return match.status !== 'finished';
      return true;
    });
    return filtered.sort((a, b) => {
      const aTime = a.startsAt ? Date.parse(a.startsAt) : Number.POSITIVE_INFINITY;
      const bTime = b.startsAt ? Date.parse(b.startsAt) : Number.POSITIVE_INFINITY;
      return aTime - bTime;
    });
  }, [matches, filter]);

  const renderMatch = ({ item }: { item: Match }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={[styles.status, item.status === 'live' && styles.liveStatus]}>{statusLabel(item)}</Text>
        <FavoriteButton active={isFavorite(item.id)} onPress={() => toggle(item.id)} />
      </View>
      <View style={styles.teamsRow}>
        <Text style={styles.team} numberOfLines={2}>{item.home.name}</Text>
        <Text style={styles.score}>{item.score ? `${item.score.home} : ${item.score.away}` : '—'}</Text>
        <Text style={[styles.team, styles.awayTeam]} numberOfLines={2}>{item.away.name}</Text>
      </View>
      <Text style={styles.start}>{formatStart(item.startsAt)}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Матчи тура</Text>
        <Pressable
          onPress={onToggleTheme}
          style={styles.themeButton}
          accessibilityRole="button"
          accessibilityLabel={darkMode ? 'Включить светлую тему' : 'Включить тёмную тему'}
        >
          <Text style={styles.themeButtonText}>{darkMode ? '☀ Светлая' : '☾ Тёмная'}</Text>
        </Pressable>
      </View>
      <View style={styles.toolbar}>
        <View style={styles.filters}>
          {FILTERS.map(({ key, label }) => (
            <Pressable key={key} onPress={() => setFilter(key)} style={[styles.filter, filter === key && styles.selectedFilter]} accessibilityRole="button" accessibilityState={{ selected: filter === key }}>
              <Text style={[styles.filterText, filter === key && styles.selectedFilterText]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => void loadMatches(true)} disabled={refreshing || loading} style={styles.refreshButton} accessibilityRole="button">
          <Text style={styles.refreshText}>{refreshing ? 'Обновляем…' : 'Обновить'}</Text>
        </Pressable>
      </View>
      {updatedAt && <UpdatedAgo since={updatedAt} color={darkMode ? '#aab6c8' : '#6b7280'} />}
      {usingSampleData && <Text style={styles.demoNote}>Показаны данные из примера: адрес сервера пока шаблонный.</Text>}

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.message}>Загружаем матчи…</Text></View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={() => void loadMatches()} style={styles.retryButton} accessibilityRole="button"><Text style={styles.retryText}>Повторить</Text></Pressable>
        </View>
      ) : matches.length === 0 ? (
        <View style={styles.center}><Text style={styles.emptyTitle}>Матчей пока нет</Text><Text style={styles.message}>Здесь появятся матчи тура.</Text></View>
      ) : visibleMatches.length === 0 ? (
        <View style={styles.center}><Text style={styles.emptyTitle}>В этой категории матчей нет</Text></View>
      ) : (
        <FlatList
          data={visibleMatches}
          keyExtractor={(item) => item.id}
          renderItem={renderMatch}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadMatches(true)} tintColor={darkMode ? '#93b4ff' : '#1d4ed8'} colors={[darkMode ? '#93b4ff' : '#1d4ed8']} />}
        />
      )}
    </View>
  );
}

function createStyles(darkMode: boolean) {
  const colors = darkMode
    ? { background: '#111827', surface: '#1f2937', border: '#374151', text: '#f3f4f6', muted: '#aab6c8', filter: '#374151', primary: '#93b4ff', selected: '#3159a8' }
    : { background: '#f6f7fb', surface: '#fff', border: '#e7eaf0', text: '#172033', muted: '#64748b', filter: '#e9edf4', primary: '#1d4ed8', selected: '#1d4ed8' };

  return StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 16, paddingTop: 8, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16 },
    title: { flex: 1, fontSize: 27, fontWeight: '800', color: colors.text },
    themeButton: { paddingVertical: 8, paddingHorizontal: 11, borderRadius: 18, backgroundColor: colors.filter },
    themeButtonText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
    toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
    filters: { flexDirection: 'row', gap: 4, flexShrink: 1 },
    filter: { paddingVertical: 8, paddingHorizontal: 9, borderRadius: 18, backgroundColor: colors.filter },
    selectedFilter: { backgroundColor: colors.selected },
    filterText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
    selectedFilterText: { color: '#fff' },
    refreshButton: { paddingVertical: 8, paddingHorizontal: 10 },
    refreshText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
    list: { paddingTop: 10, paddingBottom: 24, gap: 10 },
    card: { backgroundColor: colors.surface, borderRadius: 14, padding: 15, borderWidth: 1, borderColor: colors.border },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    status: { color: colors.muted, fontSize: 12, fontWeight: '700' },
    liveStatus: { color: darkMode ? '#ff8585' : '#dc2626' },
    teamsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    team: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
    awayTeam: { textAlign: 'right' },
    score: { minWidth: 54, textAlign: 'center', fontSize: 17, fontWeight: '800', color: colors.text },
    start: { marginTop: 10, color: colors.muted, fontSize: 13 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
    message: { color: colors.muted, textAlign: 'center' },
    demoNote: { color: colors.muted, fontSize: 12, marginTop: 4 },
    error: { color: darkMode ? '#fca5a5' : '#b91c1c', textAlign: 'center', fontSize: 15 },
    emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
    retryButton: { backgroundColor: colors.selected, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 11, marginTop: 4 },
    retryText: { color: '#fff', fontWeight: '700' },
  });
}

