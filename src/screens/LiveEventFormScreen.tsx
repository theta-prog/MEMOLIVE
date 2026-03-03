import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { BaseEntity, EventType, LiveEvent } from '../database/asyncDatabase';
import { theme, typography } from '../styles/theme';

// 日本語ロケール設定
LocaleConfig.locales['ja'] = {
  monthNames: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  monthNamesShort: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  dayNames: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
  dayNamesShort: ['日', '月', '火', '水', '木', '金', '土'],
  today: '今日'
};
LocaleConfig.defaultLocale = 'ja';

const LiveEventFormScreen = ({ navigation, route }: any) => {
  const { artists, addLiveEvent, updateLiveEvent, liveEvents, getLiveEventArtists } = useApp();
  const editingEventId = route.params?.eventId;
  const editingEvent = editingEventId ? liveEvents.find(e => e.id === editingEventId) : null;

  const [title, setTitle] = useState('');
  const [artistId, setArtistId] = useState<string>('');
  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>([]); // 複数アーティスト選択
  const [eventType, setEventType] = useState<EventType>('single'); // イベントタイプ
  const [date, setDate] = useState(new Date());
  const [doorsOpen, setDoorsOpen] = useState<Date | null>(null);
  const [showStart, setShowStart] = useState<Date | null>(null);
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [ticketStatus, setTicketStatus] = useState<'won' | 'lost' | 'pending' | 'purchased' | undefined>(undefined);
  const [ticketPrice, setTicketPrice] = useState('');
  const [seatNumber, setSeatNumber] = useState('');
  const [memo, setMemo] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDoorsOpenPicker, setShowDoorsOpenPicker] = useState(false);
  const [showShowStartPicker, setShowShowStartPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Helper to parse time string "HH:mm" to Date
  const parseTime = (timeStr?: string) => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(hours || 0, minutes || 0, 0, 0);
    return d;
  };

  // Helper to format Date to "HH:mm"
  const formatTime = (d: Date | null) => {
    if (!d) return '';
    return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title);
      setArtistId(editingEvent.artist_id || '');
      setEventType(editingEvent.event_type || 'single');
      setDate(new Date(editingEvent.date));
      setDoorsOpen(parseTime(editingEvent.doors_open));
      setShowStart(parseTime(editingEvent.show_start));
      setVenueName(editingEvent.venue_name);
      setVenueAddress(editingEvent.venue_address || '');
      setTicketStatus(editingEvent.ticket_status);
      setTicketPrice(editingEvent.ticket_price?.toString() || '');
      setSeatNumber(editingEvent.seat_number || '');
      setMemo(editingEvent.memo || '');
      
      // 複数アーティストの読み込み
      getLiveEventArtists(editingEvent.id).then(eventArtists => {
        if (eventArtists.length > 0) {
          setSelectedArtistIds(eventArtists.map(ea => ea.artist_id));
        } else if (editingEvent.artist_id) {
          setSelectedArtistIds([editingEvent.artist_id]);
        }
      });
    }
  }, [editingEvent, getLiveEventArtists]);

  const handleSave = async () => {
    if (isSaving) return; // 二重タップ防止
    
    if (!title.trim()) {
      Alert.alert('エラー', '公演名を入力してください');
      return;
    }
    
    // イベントタイプに応じたバリデーション
    const artistIdsToSave = eventType === 'single' 
      ? (artistId ? [artistId] : [])
      : selectedArtistIds;
    
    if (artistIdsToSave.length === 0) {
      Alert.alert('エラー', 'アーティストを選択してください');
      return;
    }
    if (!venueName.trim()) {
      Alert.alert('エラー', '会場名を入力してください');
      return;
    }

    setIsSaving(true);
    const eventData: Omit<LiveEvent, keyof BaseEntity> = {
      title: title.trim(),
      artist_id: artistIdsToSave[0] || '', // 後方互換: 最初のアーティストをメインに
      date: date.toISOString(),
      doors_open: formatTime(doorsOpen) || undefined,
      show_start: formatTime(showStart) || undefined,
      venue_name: venueName.trim(),
      venue_address: venueAddress.trim() || undefined,
      ticket_status: ticketStatus,
      ticket_price: ticketPrice ? parseFloat(ticketPrice) : undefined,
      seat_number: seatNumber.trim() || undefined,
      memo: memo.trim() || undefined,
      event_type: eventType,
    };

    try {
      if (editingEvent) {
        await updateLiveEvent(editingEvent.id!, eventData, artistIdsToSave);
      } else {
        await addLiveEvent(eventData, artistIdsToSave);
      }
      navigation.goBack();
    } catch {
      Alert.alert('エラー', '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  // アーティスト選択のトグル（複数選択用）
  const toggleArtistSelection = (id: string) => {
    setSelectedArtistIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(aid => aid !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // アーティストの順序を入れ替え
  const moveArtist = (index: number, direction: 'up' | 'down') => {
    setSelectedArtistIds(prev => {
      const newList = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newList.length) return prev;
      [newList[index], newList[targetIndex]] = [newList[targetIndex]!, newList[index]!];
      return newList;
    });
  };

  const onCalendarDayPress = (day: any) => {
    // timestampはUTCの0時基準のため、JSTなどでは日付がずれる可能性がある
    // dateString (YYYY-MM-DD) を使ってローカルタイムの日付オブジェクトを作成する
    const [year, month, dayNum] = day.dateString.split('-').map(Number);
    const newDate = new Date(year, month - 1, dayNum);
    setDate(newDate);
    setShowDatePicker(false);
  };

  const onTimeChange = (setter: (d: Date) => void, setShow: (b: boolean) => void) => (event: any, selectedDate?: Date) => {
    setShow(Platform.OS === 'ios');
    if (selectedDate) {
      setter(selectedDate);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  const toLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const ticketStatusOptions = [
    { label: '選択してください', value: undefined },
    { label: '当選', value: 'won' },
    { label: '落選', value: 'lost' },
    { label: '抽選待ち', value: 'pending' },
    { label: '購入済み', value: 'purchased' },
  ];

  const eventTypeOptions: { label: string; value: EventType; icon: string }[] = [
    { label: 'ワンマン', value: 'single', icon: 'person' },
    { label: '対バン', value: 'taiban', icon: 'people' },
    { label: 'フェス', value: 'festival', icon: 'musical-notes' },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* 固定ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.accent} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {editingEvent ? 'ライブ編集' : 'ライブ追加'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving}>
            <Text style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}>
              {isSaving ? '保存中...' : '保存'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* スクロール可能なコンテンツ */}
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.form}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>基本情報</Text>
          
          {/* イベントタイプ選択 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>イベントタイプ</Text>
            <View style={styles.eventTypeContainer}>
              {eventTypeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.eventTypeButton,
                    eventType === option.value && styles.eventTypeButtonActive,
                  ]}
                  onPress={() => {
                    setEventType(option.value);
                    // タイプ変更時にアーティスト選択をリセット
                    if (option.value === 'single' && selectedArtistIds.length > 0) {
                      setArtistId(selectedArtistIds[0] || '');
                    } else if (option.value !== 'single' && artistId) {
                      setSelectedArtistIds([artistId]);
                    }
                  }}
                >
                  <Ionicons 
                    name={option.icon as any} 
                    size={20} 
                    color={eventType === option.value ? theme.colors.text.inverse : theme.colors.text.secondary} 
                  />
                  <Text style={[
                    styles.eventTypeButtonText,
                    eventType === option.value && styles.eventTypeButtonTextActive,
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>公演名 *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="ライブツアー名など"
              testID="title-input"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              アーティスト *
              {eventType !== 'single' && (
                <Text style={styles.labelHint}> （複数選択可・順序変更可）</Text>
              )}
            </Text>
            {artists.length === 0 && (
              <View style={styles.noArtistContainer}>
                <Text style={styles.noArtistText}>アーティストが登録されていません</Text>
                <TouchableOpacity
                  style={styles.addArtistButton}
                  onPress={() => navigation.navigate('ArtistForm')}
                >
                  <Text style={styles.addArtistButtonText}>登録画面を開く</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* ワンマン: 単一選択 */}
            {artists.length > 0 && eventType === 'single' && (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={artistId}
                  onValueChange={setArtistId}
                  style={styles.picker}
                >
                  <Picker.Item label="選択してください" value="" />
                  {artists.map((artist) => (
                    <Picker.Item
                      key={artist.id}
                      label={artist.name}
                      value={artist.id}
                    />
                  ))}
                </Picker>
                <TouchableOpacity style={styles.inlineAddButton} onPress={() => navigation.navigate('ArtistForm')}>
                  <Ionicons name="add-circle-outline" size={20} color={theme.colors.accent} />
                  <Text style={styles.inlineAddButtonText}>追加</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* 対バン・フェス: 複数選択 */}
            {artists.length > 0 && eventType !== 'single' && (
              <View>
                {/* 選択済みアーティスト（出演順） */}
                {selectedArtistIds.length > 0 && (
                  <View style={styles.selectedArtistsContainer}>
                    <Text style={styles.selectedArtistsLabel}>出演順:</Text>
                    {selectedArtistIds.map((id, index) => {
                      const artist = artists.find(a => a.id === id);
                      return (
                        <View key={id} style={styles.selectedArtistItem}>
                          <View style={styles.selectedArtistInfo}>
                            <Text style={styles.selectedArtistOrder}>{index + 1}.</Text>
                            <Text style={styles.selectedArtistName}>{artist?.name || 'Unknown'}</Text>
                            {index === 0 && (
                              <View style={styles.headlinerBadge}>
                                <Text style={styles.headlinerBadgeText}>メイン</Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.selectedArtistActions}>
                            {index > 0 && (
                              <TouchableOpacity onPress={() => moveArtist(index, 'up')} style={styles.moveButton}>
                                <Ionicons name="chevron-up" size={20} color={theme.colors.accent} />
                              </TouchableOpacity>
                            )}
                            {index < selectedArtistIds.length - 1 && (
                              <TouchableOpacity onPress={() => moveArtist(index, 'down')} style={styles.moveButton}>
                                <Ionicons name="chevron-down" size={20} color={theme.colors.accent} />
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={() => toggleArtistSelection(id)} style={styles.removeButton}>
                              <Ionicons name="close-circle" size={22} color="#FF3B30" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
                
                {/* アーティスト選択リスト */}
                <View style={styles.artistChecklistContainer}>
                  <Text style={styles.artistChecklistLabel}>アーティストを選択:</Text>
                  {artists.filter(a => !selectedArtistIds.includes(a.id)).map((artist) => (
                    <TouchableOpacity
                      key={artist.id}
                      style={styles.artistChecklistItem}
                      onPress={() => toggleArtistSelection(artist.id)}
                    >
                      <View style={styles.checkboxEmpty}>
                        <Ionicons name="add" size={16} color={theme.colors.accent} />
                      </View>
                      <Text style={styles.artistChecklistName}>{artist.name}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity 
                    style={styles.addNewArtistButton} 
                    onPress={() => navigation.navigate('ArtistForm')}
                  >
                    <Ionicons name="add-circle-outline" size={20} color={theme.colors.accent} />
                    <Text style={styles.addNewArtistButtonText}>新しいアーティストを追加</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>日程 *</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(!showDatePicker)}
            >
              <Text style={styles.dateButtonText}>{formatDate(date)}</Text>
              <Ionicons name={showDatePicker ? "chevron-up" : "calendar-outline"} size={20} color="#666" />
            </TouchableOpacity>
            
            {showDatePicker && (
              <View style={styles.inlineCalendarContainer}>
                <Calendar
                  current={toLocalDateString(date)}
                  onDayPress={onCalendarDayPress}
                  markedDates={{
                    [toLocalDateString(date)]: {
                      selected: true,
                      selectedColor: theme.colors.accent,
                      selectedTextColor: theme.colors.text.inverse
                    }
                  }}
                  theme={{
                    backgroundColor: theme.colors.background,
                    calendarBackground: theme.colors.background,
                    textSectionTitleColor: theme.colors.text.secondary,
                    selectedDayBackgroundColor: theme.colors.accent,
                    selectedDayTextColor: theme.colors.text.inverse,
                    todayTextColor: theme.colors.accent,
                    dayTextColor: theme.colors.text.primary,
                    textDisabledColor: theme.colors.text.tertiary,
                    dotColor: theme.colors.accent,
                    selectedDotColor: theme.colors.text.inverse,
                    arrowColor: theme.colors.accent,
                    monthTextColor: theme.colors.text.primary,
                    indicatorColor: theme.colors.accent,
                    textDayFontFamily: theme.fonts.secondary,
                    textMonthFontFamily: theme.fonts.primaryMedium,
                    textDayHeaderFontFamily: theme.fonts.secondaryMedium,
                    textDayFontSize: 16,
                    textMonthFontSize: 16,
                    textDayHeaderFontSize: 14
                  }}
                />
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>時間</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>開場時間</Text>
            {Platform.OS === 'web' ? (
              // @ts-ignore
              React.createElement('input', {
                type: 'time',
                value: formatTime(doorsOpen),
                onChange: (e: any) => {
                  const val = e.target.value;
                  if (val) {
                    setDoorsOpen(parseTime(val));
                  } else {
                    setDoorsOpen(null);
                  }
                },
                onClick: (e: any) => {
                  if (e.target.showPicker) e.target.showPicker();
                },
                style: {
                  padding: '12px',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: theme.colors.border,
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text.primary,
                  width: '100%',
                  boxSizing: 'border-box',
                  height: '44px'
                }
              })
            ) : (
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDoorsOpenPicker(true)}
              >
                <Text style={styles.dateButtonText}>{doorsOpen ? formatTime(doorsOpen) : '未設定'}</Text>
                <Ionicons name="time-outline" size={20} color="#666" />
              </TouchableOpacity>
            )}
            {Platform.OS !== 'web' && showDoorsOpenPicker && (
              <DateTimePicker
                value={doorsOpen || new Date()}
                mode="time"
                display="default"
                onChange={onTimeChange(setDoorsOpen, setShowDoorsOpenPicker)}
              />
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>開演時間</Text>
            {Platform.OS === 'web' ? (
              // @ts-ignore
              React.createElement('input', {
                type: 'time',
                value: formatTime(showStart),
                onChange: (e: any) => {
                  const val = e.target.value;
                  if (val) {
                    setShowStart(parseTime(val));
                  } else {
                    setShowStart(null);
                  }
                },
                onClick: (e: any) => {
                  if (e.target.showPicker) e.target.showPicker();
                },
                style: {
                  padding: '12px',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: theme.colors.border,
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text.primary,
                  width: '100%',
                  boxSizing: 'border-box',
                  height: '44px'
                }
              })
            ) : (
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowShowStartPicker(true)}
              >
                <Text style={styles.dateButtonText}>{showStart ? formatTime(showStart) : '未設定'}</Text>
                <Ionicons name="time-outline" size={20} color="#666" />
              </TouchableOpacity>
            )}
            {Platform.OS !== 'web' && showShowStartPicker && (
              <DateTimePicker
                value={showStart || new Date()}
                mode="time"
                display="default"
                onChange={onTimeChange(setShowStart, setShowShowStartPicker)}
              />
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>会場情報</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>会場名 *</Text>
            <TextInput
              style={styles.input}
              value={venueName}
              onChangeText={setVenueName}
              placeholder="例: 東京ドーム"
              testID="venue-name-input"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>住所</Text>
            <TextInput
              style={styles.input}
              value={venueAddress}
              onChangeText={setVenueAddress}
              placeholder="例: 東京都文京区後楽1-3-61"
              multiline
              numberOfLines={2}
              testID="venue-address-input"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>チケット情報</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>チケット状況</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={ticketStatus}
                onValueChange={setTicketStatus}
                style={styles.picker}
              >
                {ticketStatusOptions.map((option) => (
                  <Picker.Item
                    key={option.value || 'none'}
                    label={option.label}
                    value={option.value}
                  />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>チケット代金</Text>
            <TextInput
              style={styles.input}
              value={ticketPrice}
              onChangeText={setTicketPrice}
              placeholder="例: 8000"
              keyboardType="numeric"
              testID="ticket-price-input"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>座席番号</Text>
            <TextInput
              style={styles.input}
              value={seatNumber}
              onChangeText={setSeatNumber}
              placeholder="例: アリーナ A1 列 10 番"
              testID="seat-number-input"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>メモ</Text>
          
          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.input, styles.memoInput]}
              value={memo}
              onChangeText={setMemo}
              placeholder="その他のメモ"
              multiline
              numberOfLines={4}
              testID="memo-input"
            />
          </View>
        </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
  },
  headerTitle: {
    ...typography.h3,
    color: theme.colors.text.primary,
  },
  saveButton: {
    ...typography.button,
    color: theme.colors.accent,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 100,
  },
  form: {
    padding: 16,
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
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    ...typography.label,
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    ...typography.body1,
    backgroundColor: theme.colors.background,
  },
  memoInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    position: 'relative',
  },
  picker: {
    height: 50,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    backgroundColor: theme.colors.background,
  },
  dateButtonText: {
    ...typography.body1,
    color: theme.colors.text.primary,
  },
  noArtistContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
  },
  noArtistText: {
    ...typography.body1,
    color: theme.colors.text.secondary,
    marginBottom: 12,
  },
  addArtistButton: {
    backgroundColor: theme.colors.accent,
    padding: 12,
    borderRadius: theme.borderRadius.button,
  },
  addArtistButtonText: {
    ...typography.button,
    color: theme.colors.text.inverse,
  },
  inlineAddButton: {
    position: 'absolute',
    right: 8,
    top: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    ...theme.shadows.small,
  },
  inlineAddButtonText: {
    marginLeft: 4,
    fontSize: 12,
    color: theme.colors.accent,
    fontWeight: '600',
  },
  inlineArtistForm: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    padding: 12,
  },
  inlineArtistLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: theme.colors.text.primary,
  },
  inlineArtistActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  inlineArtistCancel: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  inlineArtistCancelText: {
    color: '#666',
    fontSize: 14,
  },
  inlineArtistSave: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  inlineArtistSaveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  gotoArtistFull: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  gotoArtistFullText: {
    fontSize: 12,
    color: theme.colors.accent,
    textDecorationLine: 'underline',
  },
  inlineCalendarContainer: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  // イベントタイプ選択
  eventTypeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  eventTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
  },
  eventTypeButtonActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  eventTypeButtonText: {
    ...typography.body2,
    color: theme.colors.text.secondary,
  },
  eventTypeButtonTextActive: {
    color: theme.colors.text.inverse,
    fontWeight: '600',
  },
  labelHint: {
    ...typography.caption,
    color: theme.colors.text.tertiary,
    fontWeight: 'normal',
  },
  // 複数アーティスト選択
  selectedArtistsContainer: {
    marginBottom: 12,
  },
  selectedArtistsLabel: {
    ...typography.label,
    color: theme.colors.text.secondary,
    marginBottom: 8,
  },
  selectedArtistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    padding: 10,
    marginBottom: 6,
  },
  selectedArtistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedArtistOrder: {
    ...typography.body2,
    color: theme.colors.text.tertiary,
    marginRight: 8,
    minWidth: 20,
  },
  selectedArtistName: {
    ...typography.body1,
    color: theme.colors.text.primary,
    flex: 1,
  },
  headlinerBadge: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  headlinerBadgeText: {
    ...typography.caption,
    color: theme.colors.text.inverse,
    fontWeight: '600',
  },
  selectedArtistActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moveButton: {
    padding: 4,
  },
  removeButton: {
    padding: 4,
    marginLeft: 4,
  },
  artistChecklistContainer: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    padding: 12,
  },
  artistChecklistLabel: {
    ...typography.label,
    color: theme.colors.text.secondary,
    marginBottom: 8,
  },
  artistChecklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  checkboxEmpty: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistChecklistName: {
    ...typography.body1,
    color: theme.colors.text.primary,
  },
  addNewArtistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  addNewArtistButtonText: {
    ...typography.body2,
    color: theme.colors.accent,
    marginLeft: 8,
  },
});

export default LiveEventFormScreen;
