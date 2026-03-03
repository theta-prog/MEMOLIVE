import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { theme, typography } from '../styles/theme';
import { confirmDelete } from '../utils/alert';

const LiveEventDetailScreen = ({ navigation, route }: any) => {
  const { liveEvents, deleteLiveEvent, memories } = useApp();
  const eventId = route.params?.eventId;
  const event = liveEvents.find(e => e.id === eventId);
  const memory = memories.find(m => m.live_event_id === eventId);

  // Webの場合はSafeAreaViewの代わりにViewを使用
  const Wrapper = Platform.OS === 'web' ? View : SafeAreaView;

  if (!event) {
    return (
      <Wrapper style={styles.safeArea} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>イベントが見つかりません</Text>
        </View>
      </Wrapper>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  const calculateDaysUntil = (date: string) => {
    const eventDate = new Date(date);
    const today = new Date();
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isEventPassed = () => {
    const eventDate = new Date(event.date);
    const today = new Date();
    return eventDate < today;
  };

  const handleDelete = () => {
    confirmDelete(
      '削除確認',
      `「${event.title}」を削除しますか？`,
      async () => {
        try {
          await deleteLiveEvent(event.id!);
          navigation.goBack();
        } catch (error) {
          console.error('Delete error:', error);
          if (Platform.OS === 'web') {
            window.alert('削除に失敗しました。もう一度お試しください。');
          } else {
            Alert.alert('エラー', '削除に失敗しました。もう一度お試しください。');
          }
        }
      }
    );
  };

  const getTicketStatusText = (status?: string) => {
    switch (status) {
      case 'won': return '当選';
      case 'lost': return '落選';
      case 'pending': return '抽選待ち';
      case 'purchased': return '購入済み';
      default: return '未設定';
    }
  };

  const getTicketStatusColor = (status?: string) => {
    switch (status) {
      case 'won': return '#4CAF50';
      case 'lost': return '#F44336';
      case 'pending': return '#FF9800';
      case 'purchased': return '#2196F3';
      default: return '#999';
    }
  };

  return (
    <Wrapper style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* 固定ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('LiveEventForm', { eventId: event.id })}
            >
              <Ionicons name="create-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={24} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>

        {/* スクロール可能なコンテンツ */}
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={true}
          scrollEventThrottle={16}
        >
          <View style={styles.content}>
        <View style={styles.mainInfo}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          
          {/* イベントタイプバッジ */}
          {event.event_type && event.event_type !== 'single' && (
            <View style={styles.eventTypeBadge}>
              <Ionicons 
                name={event.event_type === 'taiban' ? 'people' : 'musical-notes'} 
                size={14} 
                color={theme.colors.text.inverse} 
              />
              <Text style={styles.eventTypeBadgeText}>
                {event.event_type === 'taiban' ? '対バン' : 'フェス'}
              </Text>
            </View>
          )}
          
          {/* 複数アーティスト表示 */}
          {event.artist_names && event.artist_names.length > 1 ? (
            <View style={styles.artistsList}>
              {event.artist_names.map((name, index) => (
                <View key={index} style={styles.artistListItem}>
                  <Text style={styles.artistListOrder}>{index + 1}.</Text>
                  <Text style={[
                    styles.artistListName,
                    index === 0 && styles.artistListNameMain
                  ]}>
                    {name}
                  </Text>
                  {index === 0 && (
                    <View style={styles.mainActBadge}>
                      <Text style={styles.mainActBadgeText}>メイン</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.artistName}>{event.artist_name}</Text>
          )}
          
          <Text style={styles.eventDate}>{formatDate(event.date)}</Text>
          
          {!isEventPassed() && (
            <View style={styles.countdown}>
              <Text style={styles.countdownLabel}>あと</Text>
              <Text style={styles.countdownDays}>
                {calculateDaysUntil(event.date)}
              </Text>
              <Text style={styles.countdownLabel}>日</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>時間</Text>
          {event.doors_open && (
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color="#666" />
              <Text style={styles.infoLabel}>開場</Text>
              <Text style={styles.infoValue}>{event.doors_open}</Text>
            </View>
          )}
          {event.show_start && (
            <View style={styles.infoRow}>
              <Ionicons name="play-outline" size={20} color="#666" />
              <Text style={styles.infoLabel}>開演</Text>
              <Text style={styles.infoValue}>{event.show_start}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>会場</Text>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <Text style={styles.infoLabel}>会場名</Text>
            <Text style={styles.infoValue}>{event.venue_name}</Text>
          </View>
          {event.venue_address && (
            <View style={styles.infoRow}>
              <Ionicons name="map-outline" size={20} color="#666" />
              <Text style={styles.infoLabel}>住所</Text>
              <Text style={styles.infoValue}>{event.venue_address}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>チケット情報</Text>
          <View style={styles.infoRow}>
            <Ionicons name="ticket-outline" size={20} color="#666" />
            <Text style={styles.infoLabel}>状況</Text>
            <Text style={[
              styles.ticketStatus,
              { color: getTicketStatusColor(event.ticket_status) }
            ]}>
              {getTicketStatusText(event.ticket_status)}
            </Text>
          </View>
          {event.ticket_price && (
            <View style={styles.infoRow}>
              <Ionicons name="card-outline" size={20} color="#666" />
              <Text style={styles.infoLabel}>金額</Text>
              <Text style={styles.infoValue}>¥{event.ticket_price.toLocaleString()}</Text>
            </View>
          )}
          {event.seat_number && (
            <View style={styles.infoRow}>
              <Ionicons name="albums-outline" size={20} color="#666" />
              <Text style={styles.infoLabel}>座席</Text>
              <Text style={styles.infoValue}>{event.seat_number}</Text>
            </View>
          )}
        </View>

        {event.memo && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>メモ</Text>
            <Text style={styles.memoText}>{event.memo}</Text>
          </View>
        )}

        {isEventPassed() && (
          <View style={styles.memorySection}>
            <View style={styles.memorySectionHeader}>
              <Text style={styles.sectionTitle}>思い出</Text>
              <TouchableOpacity
                style={styles.addMemoryButton}
                onPress={() => navigation.navigate('MemoryForm', { 
                  eventId: event.id,
                  memoryId: memory?.id 
                })}
              >
                <Text style={styles.addMemoryButtonText}>
                  {memory ? '編集' : '追加'}
                </Text>
              </TouchableOpacity>
            </View>
            
            {memory ? (
              <TouchableOpacity
                style={styles.memoryCard}
                onPress={() => navigation.navigate('MemoryDetail', { memoryId: memory.id })}
              >
                <Text style={styles.memoryCardText}>思い出が記録されています</Text>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            ) : (
              <View style={styles.noMemoryCard}>
                <Text style={styles.noMemoryText}>まだ思い出が記録されていません</Text>
              </View>
            )}
          </View>
        )}
          </View>
        </ScrollView>
      </View>
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    ...(Platform.OS === 'web' && { minHeight: '100vh' as any }),
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    zIndex: 10,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    marginLeft: 16,
  },
  scrollContent: {
    flex: 1,
    ...Platform.select({
      web: {
        height: 'calc(100vh - 60px)' as any,
        overflowY: 'auto' as any,
      },
    }),
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  content: {
    padding: 16,
  },
  mainInfo: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.card,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    ...theme.shadows.medium,
  },
  eventTitle: {
    ...typography.h2,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  artistName: {
    ...typography.body1,
    color: theme.colors.accent,
    marginBottom: 8,
  },
  eventDate: {
    ...typography.body2,
    color: theme.colors.text.secondary,
    marginBottom: 16,
  },
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: theme.borderRadius.md,
  },
  countdownLabel: {
    ...typography.body2,
    color: theme.colors.text.secondary,
  },
  countdownDays: {
    ...typography.h2,
    color: theme.colors.accent,
    marginHorizontal: 8,
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.card,
    padding: 20,
    marginBottom: 16,
    ...theme.shadows.medium,
  },
  sectionTitle: {
    ...typography.h3,
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    ...typography.body2,
    color: theme.colors.text.secondary,
    marginLeft: 12,
    minWidth: 60,
  },
  infoValue: {
    ...typography.body1,
    color: theme.colors.text.primary,
    flex: 1,
    marginLeft: 12,
  },
  ticketStatus: {
    ...typography.body1,
    fontWeight: '500',
    flex: 1,
    marginLeft: 12,
  },
  memoText: {
    ...typography.body1,
    color: theme.colors.text.primary,
    lineHeight: 24,
  },
  memorySection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.card,
    padding: 20,
    marginBottom: 16,
    ...theme.shadows.medium,
  },
  memorySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addMemoryButton: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.button,
  },
  addMemoryButtonText: {
    ...typography.button,
    color: theme.colors.text.inverse,
  },
  memoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
  },
  memoryCardText: {
    ...typography.body1,
    color: theme.colors.text.primary,
  },
  noMemoryCard: {
    padding: 16,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  noMemoryText: {
    ...typography.body2,
    color: theme.colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  errorText: {
    ...typography.body1,
    color: theme.colors.text.secondary,
  },
  // イベントタイプバッジ
  eventTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
    gap: 4,
  },
  eventTypeBadgeText: {
    ...typography.caption,
    color: theme.colors.text.inverse,
    fontWeight: '600',
  },
  // 複数アーティストリスト
  artistsList: {
    marginVertical: 8,
  },
  artistListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  artistListOrder: {
    ...typography.body2,
    color: theme.colors.text.tertiary,
    marginRight: 8,
    minWidth: 20,
  },
  artistListName: {
    ...typography.body1,
    color: theme.colors.text.primary,
  },
  artistListNameMain: {
    fontWeight: '600',
  },
  mainActBadge: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  mainActBadgeText: {
    ...typography.caption,
    color: theme.colors.text.inverse,
    fontWeight: '600',
    fontSize: 10,
  },
});

export default LiveEventDetailScreen;
