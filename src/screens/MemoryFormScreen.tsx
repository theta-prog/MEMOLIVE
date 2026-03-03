import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { BaseEntity, Memory } from '../database/asyncDatabase';
import { calculateDaysUntil } from '../utils/index';

// アーティストセットリストの型
interface ArtistSetlistInput {
  artistId: string;
  artistName: string;
  songs: string;
}

const MemoryFormScreen = ({ navigation, route }: any) => {
  const { addMemory, updateMemory, memories, liveEvents, artists, getArtistSetlists, setArtistSetlists, getLiveEventArtists } = useApp();
  const initialEventId = route.params?.eventId as string | undefined;
  const memoryId = route.params?.memoryId;
  
  const [selectedEventId, setSelectedEventId] = useState<string | null>(initialEventId ?? null);
  const [query, setQuery] = useState('');
  const event = liveEvents.find(e => e.id === selectedEventId);

  // memoryIdが渡されていればそれを使い、なければ選択中のイベントに対応する既存の思い出を編集モードにする
  const existingMemoryForEvent = selectedEventId 
    ? memories.find(m => m.live_event_id === selectedEventId) 
    : null;
  const editingMemory = memoryId 
    ? memories.find(m => m.id === memoryId) 
    : existingMemoryForEvent;

  const [review, setReview] = useState('');
  const [setlist, setSetlist] = useState(''); // 単一アーティスト用（後方互換）
  const [artistSetlists, setArtistSetlistsState] = useState<ArtistSetlistInput[]>([]); // 複数アーティスト用
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingMemory) {
      setReview(editingMemory.review || '');
      setSetlist(editingMemory.setlist || '');
      setPhotos(editingMemory.photos ? JSON.parse(editingMemory.photos) : []);
      
      // 見たアーティストを読み込み
      if (editingMemory.watched_artist_ids) {
        try {
          setWatchedArtistIds(JSON.parse(editingMemory.watched_artist_ids));
        } catch (e) {
          console.error('Error parsing watched_artist_ids:', e);
        }
      }
      
      // アーティストごとのセットリストを読み込み
      getArtistSetlists(editingMemory.id).then(setlists => {
        if (setlists.length > 0) {
          const loadedSetlists = setlists.map(s => ({
            artistId: s.artist_id,
            artistName: artists.find(a => a.id === s.artist_id)?.name || 'Unknown',
            songs: s.songs,
          }));
          setArtistSetlistsState(loadedSetlists);
        }
      });
    }
  }, [editingMemory, artists, getArtistSetlists]);

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        '権限が必要です',
        'ライブラリから写真を選択するために、メディアライブラリへのアクセス権限が必要です。',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5, // データサイズを抑制
      allowsMultipleSelection: true,
      base64: true, // Base64データを取得
    });

    if (!result.canceled) {
      try {
        // 各画像をBase64形式のdata URLに変換
        const base64Images = result.assets.map(asset => {
          if (asset.base64) {
            const mimeType = asset.mimeType || 'image/jpeg';
            return `data:${mimeType};base64,${asset.base64}`;
          }
          return null;
        }).filter((img): img is string => img !== null);
        
        if (base64Images.length > 0) {
          setPhotos(prev => [...prev, ...base64Images]);
        } else {
          Alert.alert('エラー', '画像の処理に失敗しました');
        }
      } catch (error) {
        console.error('Error processing images:', error);
        Alert.alert('エラー', '画像の処理に失敗しました');
      }
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // 複数アーティストのセットリストを更新
  const updateArtistSetlist = (artistId: string, songs: string) => {
    setArtistSetlistsState(prev => 
      prev.map(s => s.artistId === artistId ? { ...s, songs } : s)
    );
  };

  // フェスで見たアーティストをトグル
  const toggleWatchedArtist = (artistId: string) => {
    setWatchedArtistIds(prev => {
      if (prev.includes(artistId)) {
        return prev.filter(id => id !== artistId);
      } else {
        return [...prev, artistId];
      }
    });
  };

  // 複数アーティストイベントかどうか
  const isMultiArtistEvent = event?.event_type === 'taiban' || event?.event_type === 'festival' || eventArtistIds.length > 1;
  const isFestival = event?.event_type === 'festival';

  const handleSave = async () => {
    if (isSaving) return; // 二重タップ防止
    
    if (!selectedEventId) {
      Alert.alert('イベント未選択', 'まず対象のライブイベントを選んでください');
      return;
    }
    
    // バリデーション: セットリストのチェック
    const hasArtistSetlists = artistSetlists.some(s => s.songs.trim());
    if (!review.trim() && !setlist.trim() && !hasArtistSetlists && photos.length === 0) {
      Alert.alert('エラー', '感想、セットリスト、写真のうち少なくとも一つは入力してください');
      return;
    }

    setIsSaving(true);
    const memoryData: Omit<Memory, keyof BaseEntity> = {
      live_event_id: selectedEventId,
      review: review.trim() || undefined,
      setlist: isMultiArtistEvent ? undefined : (setlist.trim() || undefined), // 複数アーティストの場合は別テーブル
      photos: photos.length > 0 ? JSON.stringify(photos) : undefined,
      watched_artist_ids: isFestival ? JSON.stringify(watchedArtistIds) : undefined,
    };

    try {
      let savedMemoryId: string;
      
      if (editingMemory) {
        await updateMemory(editingMemory.id!, memoryData);
        savedMemoryId = editingMemory.id!;
      } else {
        // Note: addMemoryは新しいIDを返さないので、一旦保存してから取得する必要がある
        await addMemory(memoryData);
        // 保存されたメモリを取得（selectedEventIdで検索）
        const savedMemory = memories.find(m => m.live_event_id === selectedEventId);
        savedMemoryId = savedMemory?.id || '';
      }
      
      // 複数アーティストのセットリストを保存
      if (isMultiArtistEvent && savedMemoryId) {
        const setlistsToSave = artistSetlists
          .filter(s => s.songs.trim())
          .map(s => ({ artistId: s.artistId, songs: s.songs }));
        await setArtistSetlists(savedMemoryId, setlistsToSave);
      }
      
      navigation.goBack();
    } catch {
      Alert.alert('エラー', '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const renderPhoto = ({ item, index }: { item: string; index: number }) => (
    <View style={styles.photoItem}>
      <Image source={{ uri: item }} style={styles.photoThumbnail} />
      <TouchableOpacity
        style={styles.removePhotoButton}
        onPress={() => removePhoto(index)}
      >
        <Ionicons name="close-circle" size={24} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

  if (!event) {
    // イベント未選択: イベント選択画面を表示
    // 検索・グルーピング
    const normalized = query.trim().toLowerCase();
    const filtered = liveEvents.filter((ev) => {
      if (!normalized) return true;
      const title = (ev.title || '').toLowerCase();
      const artist = (ev.artist_name || '').toLowerCase();
      const venue = (ev.venue_name || '').toLowerCase();
      return title.includes(normalized) || artist.includes(normalized) || venue.includes(normalized);
    });
    const upcoming = filtered
      .filter((ev) => calculateDaysUntil(ev.date) >= 0)
      .sort((a, b) => calculateDaysUntil(a.date) - calculateDaysUntil(b.date));
    const past = filtered
      .filter((ev) => calculateDaysUntil(ev.date) < 0)
      .sort((a, b) => calculateDaysUntil(b.date) - calculateDaysUntil(a.date));

    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>思い出追加</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>対象のライブを選択</Text>
            {/* 検索バー */}
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color="#999" />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="イベント名 / アーティスト / 会場 で検索"
                placeholderTextColor="#aaa"
                testID="event-search-input"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#bbb" />
                </TouchableOpacity>
              )}
            </View>
            {liveEvents.length === 0 ? (
              <View style={styles.noEventsContainer}>
                <Ionicons name="calendar-outline" size={48} color="#bbb" />
                <Text style={styles.noEventsText}>ライブイベントがありません</Text>
                <Text style={styles.noEventsSubtext}>先にライブ予定を追加してください</Text>
                <TouchableOpacity
                  style={styles.createEventButton}
                  onPress={() => navigation.navigate('LiveEventForm')}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.createEventButtonText}>ライブを追加</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                {normalized && filtered.length === 0 && (
                  <Text style={styles.emptyFilterText}>該当するイベントがありません</Text>
                )}
                {/* 今後のイベント */}
                {upcoming.length > 0 && (
                  <View style={styles.eventSelectList}>
                    <Text style={styles.sectionLabel}>今後のイベント</Text>
                    {upcoming.map((ev) => {
                      const d = new Date(ev.date);
                      const month = String(d.getMonth() + 1).padStart(2, '0');
                      const day = String(d.getDate()).padStart(2, '0');
                      return (
                        <TouchableOpacity
                          key={ev.id}
                          style={styles.eventItem}
                          onPress={() => setSelectedEventId(ev.id!)}
                          testID={`select-event-${ev.id}`}
                        >
                          <View style={styles.dateBadge}>
                            <Text style={styles.dateBadgeMonth}>{month}</Text>
                            <Text style={styles.dateBadgeDay}>{day}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.eventItemTitle}>{ev.title}</Text>
                            <Text style={styles.eventItemArtist}>{ev.artist_name}</Text>
                            {!!ev.venue_name && (
                              <Text style={styles.eventItemMeta}>{ev.venue_name}</Text>
                            )}
                          </View>
                          <Ionicons name="chevron-forward" size={20} color="#ccc" />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
                {/* 過去のイベント */}
                {past.length > 0 && (
                  <View style={styles.eventSelectList}>
                    <Text style={styles.sectionLabel}>過去のイベント</Text>
                    {past.map((ev) => {
                      const d = new Date(ev.date);
                      const month = String(d.getMonth() + 1).padStart(2, '0');
                      const day = String(d.getDate()).padStart(2, '0');
                      return (
                        <TouchableOpacity
                          key={ev.id}
                          style={styles.eventItem}
                          onPress={() => setSelectedEventId(ev.id!)}
                          testID={`select-event-${ev.id}`}
                        >
                          <View style={styles.dateBadgePast}>
                            <Text style={styles.dateBadgeMonth}>{month}</Text>
                            <Text style={styles.dateBadgeDay}>{day}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.eventItemTitle}>{ev.title}</Text>
                            <Text style={styles.eventItemArtist}>{ev.artist_name}</Text>
                            {!!ev.venue_name && (
                              <Text style={styles.eventItemMeta}>{ev.venue_name}</Text>
                            )}
                          </View>
                          <Ionicons name="chevron-forward" size={20} color="#ccc" />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {editingMemory ? '思い出編集' : '思い出追加'}
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={isSaving}>
          <Text style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}>
            {isSaving ? '保存中...' : '保存'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.artistName}>{event.artist_name}</Text>
          <Text style={styles.eventDate}>
            {new Date(event.date).toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>感想</Text>
          <TextInput
            style={[styles.input, styles.reviewInput]}
            value={review}
            onChangeText={setReview}
            placeholder="ライブの感想を記録しましょう...&#10;・最高だった瞬間&#10;・印象に残った曲&#10;・感動したポイント"
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            blurOnSubmit={false}
            returnKeyType="default"
          />
        </View>

        {/* フェス用: 見たアーティスト選択 */}
        {isFestival && eventArtistIds.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>見たアーティスト</Text>
            <Text style={styles.sectionHint}>観覧したアーティストを選択してください</Text>
            <View style={styles.watchedArtistsContainer}>
              {eventArtistIds.map((artistId, index) => {
                const artist = artists.find(a => a.id === artistId);
                const isWatched = watchedArtistIds.includes(artistId);
                return (
                  <TouchableOpacity
                    key={artistId}
                    style={[
                      styles.watchedArtistItem,
                      isWatched && styles.watchedArtistItemActive
                    ]}
                    onPress={() => toggleWatchedArtist(artistId)}
                  >
                    <Ionicons 
                      name={isWatched ? "checkbox" : "square-outline"} 
                      size={22} 
                      color={isWatched ? "#007AFF" : "#999"} 
                    />
                    <Text style={[
                      styles.watchedArtistName,
                      isWatched && styles.watchedArtistNameActive
                    ]}>
                      {artist?.name || 'Unknown'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* セットリスト: 単一アーティストまたは複数アーティスト */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>セットリスト</Text>
          
          {/* 複数アーティストの場合: アーティストごとにセットリスト入力 */}
          {isMultiArtistEvent && artistSetlists.length > 0 ? (
            <View>
              {artistSetlists.map((artistSetlist, index) => {
                // フェスの場合、見たアーティストのみ表示
                if (isFestival && !watchedArtistIds.includes(artistSetlist.artistId)) {
                  return null;
                }
                return (
                  <View key={artistSetlist.artistId} style={styles.artistSetlistContainer}>
                    <View style={styles.artistSetlistHeader}>
                      <Text style={styles.artistSetlistOrder}>{index + 1}.</Text>
                      <Text style={styles.artistSetlistName}>{artistSetlist.artistName}</Text>
                    </View>
                    <TextInput
                      style={[styles.input, styles.setlistInput]}
                      value={artistSetlist.songs}
                      onChangeText={(text) => updateArtistSetlist(artistSetlist.artistId, text)}
                      placeholder={`${artistSetlist.artistName}のセットリスト...&#10;1. 曲名1&#10;2. 曲名2`}
                      multiline
                      numberOfLines={6}
                      textAlignVertical="top"
                      blurOnSubmit={false}
                      returnKeyType="default"
                    />
                  </View>
                );
              })}
            </View>
          ) : (
            // 単一アーティストの場合: 従来のセットリスト入力
            <TextInput
              style={[styles.input, styles.setlistInput]}
              value={setlist}
              onChangeText={setSetlist}
              placeholder="セットリストを記録しましょう...&#10;例：&#10;1. Opening SE&#10;2. 曲名1&#10;3. 曲名2&#10;- MC -&#10;4. 曲名3"
              multiline
              numberOfLines={10}
              textAlignVertical="top"
              blurOnSubmit={false}
              returnKeyType="default"
            />
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.photoSectionHeader}>
            <Text style={styles.sectionTitle}>写真</Text>
            <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
              <Ionicons name="camera" size={20} color="#007AFF" />
              <Text style={styles.addPhotoButtonText}>追加</Text>
            </TouchableOpacity>
          </View>

          {photos.length === 0 ? (
            <View style={styles.noPhotosContainer}>
              <Ionicons name="camera-outline" size={48} color="#ccc" />
              <Text style={styles.noPhotosText}>写真を追加してみましょう</Text>
              <Text style={styles.noPhotosSubtext}>ライブ会場や思い出の写真を記録できます</Text>
            </View>
          ) : (
            <FlatList
              data={photos}
              renderItem={renderPhoto}
              keyExtractor={(item, index) => index.toString()}
              numColumns={3}
              contentContainerStyle={styles.photosGrid}
              scrollEnabled={false}
            />
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  content: {
    padding: 16,
  },
  eventInfo: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  artistName: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  reviewInput: {
    height: 150,
    textAlignVertical: 'top',
  },
  setlistInput: {
    height: 200,
    textAlignVertical: 'top',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  photoSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addPhotoButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  noPhotosContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noPhotosText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  noPhotosSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  photosGrid: {
    gap: 8,
  },
  photoItem: {
    flex: 1,
    margin: 4,
    position: 'relative',
  },
  photoThumbnail: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  // Event select styles
  eventSelectList: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  eventItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  eventItemArtist: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 2,
  },
  eventItemMeta: {
    fontSize: 13,
    color: '#666',
  },
  noEventsContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  noEventsText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  noEventsSubtext: {
    fontSize: 14,
    color: '#999',
  },
  createEventButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#007AFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createEventButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    paddingVertical: 0,
  },
  emptyFilterText: {
    color: '#888',
    marginBottom: 8,
  },
  dateBadge: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#e8f1ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dateBadgePast: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dateBadgeMonth: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: -4,
  },
  dateBadgeDay: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
  
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 24,
  },
  errorBackButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: 8,
  },
  errorSubText: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
  },
  // フェス用: 見たアーティスト選択
  sectionHint: {
    fontSize: 12,
    color: '#888',
    marginBottom: 12,
  },
  watchedArtistsContainer: {
    gap: 8,
  },
  watchedArtistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  watchedArtistItemActive: {
    backgroundColor: '#e8f4ff',
    borderColor: '#007AFF',
  },
  watchedArtistName: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
  },
  watchedArtistNameActive: {
    color: '#333',
    fontWeight: '500',
  },
  // アーティストごとのセットリスト
  artistSetlistContainer: {
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  artistSetlistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  artistSetlistOrder: {
    fontSize: 14,
    color: '#888',
    marginRight: 8,
  },
  artistSetlistName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});

export default MemoryFormScreen;
