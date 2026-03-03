import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    ImageStyle,
    Modal,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { memoryService } from '../api/services';
import ShareableMemoryCard from '../components/ShareableMemoryCard';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { ArtistSetlist, Memory } from '../database/asyncDatabase';
import { confirmDelete } from '../utils/alert';
import { captureViewAsImage, generateShareMessage, shareImage } from '../utils/share';

// Get initial dimensions once
const INITIAL_WIDTH = Dimensions.get('window').width;
const PHOTO_HEIGHT = 220;

type MemoryWithDetails = Memory & {
  event_title: string;
  artist_name: string;
  event_date: string;
  venue_name?: string;
};

// Native用ヘッダーコンポーネント
interface HeaderProps {
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
  showEditDelete?: boolean;
  showShare?: boolean;
}

const Header = memo(function Header({ onBack, onEdit, onDelete, onShare, showEditDelete = true, showShare = true }: HeaderProps) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#007AFF" />
      </TouchableOpacity>
      <View style={styles.headerActions}>
        {showShare && (
          <TouchableOpacity style={styles.headerButton} onPress={onShare}>
            <Ionicons name="share-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        )}
        {showEditDelete && (
          <>
            <TouchableOpacity style={styles.headerButton} onPress={onEdit}>
              <Ionicons name="create-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={onDelete}>
              <Ionicons name="trash-outline" size={24} color="#FF3B30" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
});

// Memoized Photo Carousel - isolated from header
interface PhotoCarouselProps {
  photos: string[];
  containerWidth: number;
  selectedPhotoIndex: number;
  onPhotoPress: (index: number) => void;
  onIndexChange: (index: number) => void;
  onLayout: (e: any) => void;
}

// Native用写真カルーセル
const PhotoCarousel = memo(function PhotoCarousel({
  photos,
  containerWidth,
  selectedPhotoIndex,
  onPhotoPress,
  onIndexChange,
  onLayout,
}: PhotoCarouselProps) {
  if (photos.length === 0) return null;
  
  return (
    <View style={styles.photosSection}>
      <Text style={styles.sectionTitle}>写真</Text>
      <View style={styles.photoCarouselContainer} onLayout={onLayout}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled
          onMomentumScrollEnd={(event) => {
            const w = event.nativeEvent.layoutMeasurement.width || containerWidth;
            const index = Math.round(event.nativeEvent.contentOffset.x / w);
            onIndexChange(index);
          }}
        >
          {photos.map((photo: string, index: number) => (
            <TouchableOpacity
              key={index}
              onPress={() => onPhotoPress(index)}
              style={[styles.photoTouchable, { width: containerWidth }]}
            >
              <Image
                source={{ uri: photo }}
                style={[styles.photo, { width: containerWidth }] as ImageStyle[]}
                resizeMode="contain"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {photos.length > 1 && (
        <View style={styles.photoIndicators}>
          {photos.map((_: any, index: number) => (
            <View
              key={index}
              style={[
                styles.indicator,
                { opacity: index === selectedPhotoIndex ? 1 : 0.3 }
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
});

const MemoryDetailScreen = ({ navigation, route }: any) => {
  const { memories, deleteMemory, liveEvents, artists, getArtistSetlists } = useApp();
  const { isAuthenticated } = useAuth();
  const memoryId = route.params?.memoryId;
  const memory = memories.find(m => m.id === memoryId);
  const [sharedMemory, setSharedMemory] = useState<MemoryWithDetails | null>(null);
  const [isSharedLoading, setIsSharedLoading] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [containerWidth, setContainerWidth] = useState(INITIAL_WIDTH - 72);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloadCompleteModalVisible, setIsDownloadCompleteModalVisible] = useState(false);
  const shareCardRef = useRef<View>(null);
  const [artistSetlists, setArtistSetlists] = useState<(ArtistSetlist & { artistName: string })[]>([]);
  const initialShareSettings = useMemo(() => {
    // route.paramsから共有設定を取得（AppNavigatorでURLパラメータが処理済み）
    const shared = !!route.params?.shared;
    const showSetlist = !!route.params?.showSetlist;
    const shareToken = route.params?.shareToken as string | undefined;

    return { shared, showSetlist, shareToken };
  }, [route.params]);
  const [isSharedView, setIsSharedView] = useState(initialShareSettings.shared);
  const [showSetlist, setShowSetlist] = useState(initialShareSettings.showSetlist);
  const [shareToken, setShareToken] = useState<string | undefined>(initialShareSettings.shareToken);

  useEffect(() => {
    setIsSharedView(initialShareSettings.shared);
    setShowSetlist(initialShareSettings.showSetlist);
    setShareToken(initialShareSettings.shareToken);
  }, [initialShareSettings, memoryId]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const existing = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!isSharedView) {
      const meta = existing || document.createElement('meta');
      meta.name = 'robots';
      meta.content = 'noindex, nofollow';
      if (!existing) {
        document.head.appendChild(meta);
      }
    } else if (existing) {
      existing.content = 'index, follow';
    }
  }, [isSharedView]);

  useEffect(() => {
    if (!isSharedView || !shareToken) return;
    if (sharedMemory) return;
    let cancelled = false;
    setIsSharedLoading(true);
    memoryService
      .getSharedByToken(shareToken)
      .then((data) => {
        if (!cancelled) {
          setSharedMemory(data);
        }
      })
      .catch((error) => {
        console.error('Shared memory fetch error:', error);
      })
      .finally(() => {
        if (!cancelled) {
          setIsSharedLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isSharedView, shareToken, sharedMemory]);

  // アーティストごとのセットリストを取得
  useEffect(() => {
    if (memoryId && !isSharedView) {
      getArtistSetlists(memoryId).then(async (setlists) => {
        if (setlists.length > 0) {
          const setlistsWithNames = setlists.map(s => ({
            ...s,
            artistName: artists.find(a => a.id === s.artist_id)?.name || 'Unknown',
          }));
          setArtistSetlists(setlistsWithNames);
        }
      });
    }
  }, [memoryId, isSharedView, getArtistSetlists, artists]);

  // Parse photos using useMemo
  const resolvedMemory = (sharedMemory || memory) as MemoryWithDetails | undefined;

  const photos = useMemo(() => {
    if (!resolvedMemory?.photos) return [];
    try {
      return JSON.parse(resolvedMemory.photos);
    } catch {
      return [];
    }
  }, [resolvedMemory?.photos]);

  const event = !isSharedView && resolvedMemory
    ? liveEvents.find(e => e.id === resolvedMemory.live_event_id)
    : null;
  const venueName = isSharedView ? resolvedMemory?.venue_name : event?.venue_name;

  const Wrapper = Platform.OS === 'web' ? View : SafeAreaView;

  // Stable callbacks using useMemo to prevent Header re-renders
  const headerCallbacks = useMemo(() => ({
    onBack: () => {
      if (isSharedView) {
        if (!isAuthenticated) {
          navigation.navigate('Login');
        } else {
          navigation.navigate('Main', { screen: 'Home' });
        }
        return;
      }
      navigation.goBack();
    },
    onEdit: () => {
      if (memoryId && resolvedMemory?.live_event_id) {
        navigation.navigate('MemoryForm', {
          eventId: resolvedMemory.live_event_id,
          memoryId: memoryId
        });
      }
    },
    onDelete: () => {
      if (!memoryId) return;
      confirmDelete(
        '削除確認',
        'この思い出を削除しますか？',
        async () => {
          try {
            await deleteMemory(memoryId);
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
    },
    onShare: () => {
      if (isSharedView) return;
      setIsShareModalVisible(true);
    },
  }), [navigation, memoryId, resolvedMemory?.live_event_id, deleteMemory, isSharedView, isAuthenticated]);
  const handleProtectedNavigate = useCallback(() => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }
    navigation.navigate('Main', { screen: 'Home' });
  }, [isAuthenticated, navigation]);

  // 共有処理
  const handleShare = useCallback(async () => {
    if (!resolvedMemory || !shareCardRef.current) return;

    setIsSharing(true);
    try {
      // カードを画像としてキャプチャ
      const imageUri = await captureViewAsImage(shareCardRef);
      if (!imageUri) {
        throw new Error('Failed to capture image');
      }

      // 共有メッセージを生成
      const message = generateShareMessage({
        eventTitle: resolvedMemory.event_title,
        artistName: resolvedMemory.artist_name,
        eventDate: resolvedMemory.event_date,
        review: resolvedMemory.review,
      });

      // 画像を共有
      const success = await shareImage(imageUri, {
        title: '思い出を共有',
        message,
      }, () => {
        // Web環境でダウンロードが完了した時のコールバック
        setIsShareModalVisible(false);
        setIsDownloadCompleteModalVisible(true);
      });

      if (success) {
        setIsShareModalVisible(false);
      }
    } catch (error) {
      console.error('Share error:', error);
      // shareImage内で適切なエラーメッセージが表示されるため、
      // ここでは追加のエラーメッセージは表示しない
    } finally {
      setIsSharing(false);
    }
  }, [resolvedMemory]);

  const handleContainerLayout = useCallback((event: any) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && Math.abs(width - containerWidth) > 1) {
      setContainerWidth(width);
    }
  }, [containerWidth]);

  const handlePhotoPress = useCallback((index: number) => {
    setSelectedPhotoIndex(index);
    setIsModalVisible(true);
  }, []);

  const handleIndexChange = useCallback((index: number) => {
    setSelectedPhotoIndex(index);
  }, []);

  const updateShareUrlSetlist = useCallback((nextShowSetlist: boolean) => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!shareToken) return;
    const url = new URL(window.location.href);
    url.searchParams.set('share', '1');
    url.searchParams.set('token', shareToken);
    url.searchParams.set('setlist', nextShowSetlist ? '1' : '0');
    window.history.replaceState({}, '', url.toString());
  }, [shareToken]);

  const handleToggleSetlist = useCallback(() => {
    setShowSetlist((prev) => {
      const next = !prev;
      updateShareUrlSetlist(next);
      return next;
    });
  }, [updateShareUrlSetlist]);

  const buildShareUrl = useCallback((token: string, includeSetlist: boolean) => {
    const baseUrl =
      (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.origin)
        ? window.location.origin
        : (process.env.EXPO_PUBLIC_WEB_URL || '');
    if (!baseUrl || !token) return null;
    const url = new URL(baseUrl);
    url.searchParams.set('share', '1');
    url.searchParams.set('token', token);
    url.searchParams.set('setlist', includeSetlist ? '1' : '0');
    return url.toString();
  }, []);

  const handleShareLink = useCallback(async () => {
    if (!resolvedMemory) return;
    let token = shareToken;
    if (!token && resolvedMemory.id) {
      try {
        const result = await memoryService.createShareLink(resolvedMemory.id);
        token = result.shareToken;
        setShareToken(token);
      } catch (error) {
        console.error('Share link creation error:', error);
      }
    }
    if (!token) {
      const message = '共有リンクを作成できませんでした。もう一度お試しください。';
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('エラー', message);
      }
      return;
    }
    const link = buildShareUrl(token, false);
    if (!link) {
      const message = '共有リンクを作成できませんでした。もう一度お試しください。';
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('エラー', message);
      }
      return;
    }

    const message = generateShareMessage({
      eventTitle: resolvedMemory.event_title,
      artistName: resolvedMemory.artist_name,
      eventDate: resolvedMemory.event_date,
      review: resolvedMemory.review,
    });

    if (Platform.OS === 'web') {
      if (navigator.share) {
        await navigator.share({
          title: '思い出を共有',
          text: message,
          url: link,
        });
        return;
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(link);
        window.alert('共有リンクをコピーしました');
        return;
      }
      window.open(link, '_blank');
      return;
    }

    await Share.share({
      message: `${message}\n${link}`,
    });
  }, [resolvedMemory, shareToken, buildShareUrl]);

  if (isSharedView && isSharedLoading) {
    return (
      <Wrapper style={styles.safeArea} edges={['top']}>
        <View style={styles.errorContainer}>
          <ActivityIndicator size="large" color="#0095f6" />
        </View>
      </Wrapper>
    );
  }

  if (!resolvedMemory) {
    return (
      <Wrapper style={styles.safeArea} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>思い出が見つかりません</Text>
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

  const renderSetlistLines = (setlist: string) => {
    return setlist.split('\n').map((line, index) => (
      <Text key={index} style={styles.setlistLine}>
        {line}
      </Text>
    ));
  };

  // Web用のレンダリング
  if (Platform.OS === 'web') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f5f5f5' }}>
        {/* Web用固定ヘッダー */}
        <div 
          style={{
            position: 'sticky',
            top: 0,
            height: 64,
            backgroundColor: '#fff',
            borderBottom: '1px solid #eee',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            zIndex: 9999,
            boxSizing: 'border-box',
            flexShrink: 0,
          }}
        >
          <button
            onClick={headerCallbacks.onBack}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </button>
          <div style={{ display: 'flex', gap: 16 }}>
            {!isSharedView && (
              <button
                onClick={headerCallbacks.onShare}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="share-outline" size={24} color="#007AFF" />
              </button>
            )}
            {!isSharedView && (
              <>
                <button
                  onClick={headerCallbacks.onEdit}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="create-outline" size={24} color="#007AFF" />
                </button>
                <button
                  onClick={headerCallbacks.onDelete}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* スクロールコンテンツ */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {/* イベント情報 */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 20,
            marginBottom: 16,
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 8 }}>
              {resolvedMemory.event_title}
            </div>
            <div style={{ fontSize: 16, color: '#007AFF', marginBottom: 4 }}>
              {resolvedMemory.artist_name}
            </div>
            <div style={{ fontSize: 14, color: '#666' }}>
              {formatDate(resolvedMemory.event_date)}
            </div>
          </div>

          {/* 写真セクション */}
          {photos.length > 0 && (
            <div style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 20,
              marginBottom: 16,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}>
              <div style={{ fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16 }}>
                写真
              </div>
              <div
                style={{
                  height: PHOTO_HEIGHT,
                  overflow: 'hidden',
                  display: 'flex',
                  scrollSnapType: 'x mandatory',
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                }}
                onScroll={(e) => {
                  const target = e.target as HTMLDivElement;
                  const w = target.clientWidth || 1;
                  const index = Math.round(target.scrollLeft / w);
                  if (index !== selectedPhotoIndex) {
                    setSelectedPhotoIndex(index);
                  }
                }}
              >
                {photos.map((photo: string, index: number) => (
                  <div
                    key={index}
                    onClick={() => {
                      setSelectedPhotoIndex(index);
                      setIsModalVisible(true);
                    }}
                    style={{
                      flex: '0 0 100%',
                      height: PHOTO_HEIGHT,
                      scrollSnapAlign: 'start',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#000',
                      borderRadius: 8,
                    }}
                  >
                    <img
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                      }}
                    />
                  </div>
                ))}
              </div>
              
              {photos.length > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12, gap: 8 }}>
                  {photos.map((_: any, index: number) => (
                    <div
                      key={index}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: '#007AFF',
                        opacity: index === selectedPhotoIndex ? 1 : 0.3,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 感想セクション */}
          {resolvedMemory.review && (
            <div style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 20,
              marginBottom: 16,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}>
              <div style={{ fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16 }}>
                感想
              </div>
              <div style={{ fontSize: 16, color: '#333', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {resolvedMemory.review}
              </div>
            </div>
          )}

          {/* セットリストセクション */}
          {isSharedView && resolvedMemory.setlist && (
            <div style={{ marginBottom: 12 }}>
              <button
                onClick={handleToggleSetlist}
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid #0095f6',
                  color: '#0095f6',
                  borderRadius: 16,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {showSetlist ? 'セットリストを隠す' : 'セットリストを表示'}
              </button>
            </div>
          )}

          {resolvedMemory.setlist && (!isSharedView || showSetlist) && (
            <div style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 20,
              marginBottom: 16,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}>
              <div style={{ fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16 }}>
                セットリスト
              </div>
              <div style={{ backgroundColor: '#f8f8f8', borderRadius: 8, padding: 16 }}>
                {resolvedMemory.setlist.split('\n').map((line: string, index: number) => (
                  <div key={index} style={{ fontSize: 14, color: '#333', lineHeight: 1.5, marginBottom: 4 }}>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ライブ詳細セクション */}
          {!isSharedView && event && (
            <div style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 20,
              marginBottom: 100,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}>
              <div style={{ fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16 }}>
                ライブ詳細
              </div>
              <button
                onClick={() => {
                  if (isSharedView) {
                    handleProtectedNavigate();
                    return;
                  }
                  navigation.navigate('LiveEventDetail', { eventId: event.id });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: 16,
                  backgroundColor: '#f8f8f8',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 }}>
                    {event.title}
                  </div>
                  <div style={{ fontSize: 14, color: '#666', marginBottom: 2 }}>
                    {event.venue_name}
                  </div>
                  <div style={{ fontSize: 14, color: '#666' }}>
                    {formatDate(event.date)}
                  </div>
                </div>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </button>
            </div>
          )}
        </div>

        {/* Full Screen Image Modal */}
        {isModalVisible && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 10000,
            }}
          >
            <button
              onClick={() => setIsModalVisible(false)}
              style={{
                position: 'absolute',
                top: 40,
                right: 20,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 10,
                zIndex: 1,
              }}
            >
              <Ionicons name="close" size={30} color="#fff" />
            </button>
            <div 
              style={{ 
                flex: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <img
                src={photos[selectedPhotoIndex]}
                alt="Full size"
                style={{
                  maxWidth: '90%',
                  maxHeight: '80%',
                  objectFit: 'contain',
                }}
              />
            </div>
          </div>
        )}

        {/* Web Share Modal */}
        {!isSharedView && isShareModalVisible && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10001,
              padding: 20,
            }}
            onClick={() => setIsShareModalVisible(false)}
            data-share-modal
          >
            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: 16,
                maxWidth: 420,
                width: '100%',
                maxHeight: '90vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 16,
                  borderBottom: '1px solid #eee',
                }}
              >
                <span style={{ fontSize: 18, fontWeight: 600, color: '#333' }}>
                  思い出を共有
                </span>
                <button
                  onClick={() => setIsShareModalVisible(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 4,
                  }}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </button>
              </div>

              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  overflowX: 'auto',
                  padding: 20,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                }}
                data-share-card-container
              >
                {/* キャプチャ用に固定サイズを維持するラッパー */}
                <div style={{ 
                  flexShrink: 0, 
                  width: 360,
                  minWidth: 360,
                }}>
                  <ShareableMemoryCard
                    ref={shareCardRef}
                    eventTitle={resolvedMemory.event_title || ''}
                    artistName={resolvedMemory.artist_name || ''}
                    eventDate={resolvedMemory.event_date || ''}
                    venueName={venueName}
                    review={resolvedMemory.review}
                    photo={photos.length > 0 ? photos[0] : undefined}
                    setlist={resolvedMemory.setlist}
                  />
                </div>
              </div>

              <div
                style={{
                  padding: 16,
                  borderTop: '1px solid #eee',
                }}
              >
                <button
                  onClick={handleShare}
                  disabled={isSharing}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    width: '100%',
                    backgroundColor: isSharing ? '#b2dffc' : '#0095f6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '14px 20px',
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: isSharing ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSharing ? (
                    <span>共有中...</span>
                  ) : (
                    <>
                      <Ionicons name="share-outline" size={20} color="#fff" />
                      <span>画像を共有</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleShareLink}
                  disabled={isSharing}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    width: '100%',
                    marginTop: 12,
                    backgroundColor: isSharing ? '#b2dffc' : '#0095f6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '14px 20px',
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: isSharing ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Ionicons name="link-outline" size={20} color="#fff" />
                  <span>リンクを共有</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Download Complete Modal */}
        {isDownloadCompleteModalVisible && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10002,
              padding: 20,
            }}
            onClick={() => setIsDownloadCompleteModalVisible(false)}
          >
            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: 16,
                maxWidth: 400,
                width: '100%',
                overflow: 'hidden',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                style={{
                  padding: 20,
                  textAlign: 'center',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    backgroundColor: '#4CAF50',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <Ionicons name="checkmark" size={32} color="#fff" />
                </div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#333' }}>
                  ダウンロード完了！
                </h3>
              </div>

              {/* Content */}
              <div style={{ padding: 20, textAlign: 'center' }}>
                <p style={{ margin: '0 0 20px', fontSize: 16, color: '#666', lineHeight: 1.5 }}>
                  画像が正常にダウンロードされました。<br />
                  SNSアプリで投稿して思い出を共有してください！
                </p>

                <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
                  {/* Popular SNS buttons */}
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    <button
                      onClick={() => window.open('https://twitter.com/intent/tweet', '_blank')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 16px',
                        backgroundColor: '#1DA1F2',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: 'pointer',
                        flex: 1,
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="logo-twitter" size={16} color="#fff" />
                      <span>X (Twitter)</span>
                    </button>
                    <button
                      onClick={() => window.open('https://www.instagram.com/', '_blank')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 16px',
                        backgroundColor: '#E4405F',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: 'pointer',
                        flex: 1,
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="logo-instagram" size={16} color="#fff" />
                      <span>Instagram</span>
                    </button>
                  </div>

                  {/* Close button */}
                  <button
                    onClick={() => setIsDownloadCompleteModalVisible(false)}
                    style={{
                      padding: '12px 20px',
                      backgroundColor: '#f8f9fa',
                      color: '#666',
                      border: '1px solid #ddd',
                      borderRadius: 8,
                      fontSize: 16,
                      fontWeight: 500,
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Native用レンダリング
  return (
    <Wrapper style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <Header
          onBack={headerCallbacks.onBack}
          onEdit={headerCallbacks.onEdit}
          onDelete={headerCallbacks.onDelete}
          onShare={headerCallbacks.onShare}
          showEditDelete={!isSharedView}
          showShare={!isSharedView}
        />

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.content}>
            <View style={styles.eventInfo}>
              <Text style={styles.eventTitle}>{resolvedMemory.event_title}</Text>
              <Text style={styles.artistName}>{resolvedMemory.artist_name}</Text>
              <Text style={styles.eventDate}>{formatDate(resolvedMemory.event_date)}</Text>
            </View>

            <PhotoCarousel
              photos={photos}
              containerWidth={containerWidth}
              selectedPhotoIndex={selectedPhotoIndex}
              onPhotoPress={handlePhotoPress}
              onIndexChange={handleIndexChange}
              onLayout={handleContainerLayout}
            />

            {resolvedMemory.review && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>感想</Text>
                <Text style={styles.reviewText}>{resolvedMemory.review}</Text>
              </View>
            )}

            {isSharedView && resolvedMemory.setlist && (
              <TouchableOpacity
                style={styles.setlistToggle}
                onPress={handleToggleSetlist}
              >
                <Text style={styles.setlistToggleText}>
                  {showSetlist ? 'セットリストを隠す' : 'セットリストを表示'}
                </Text>
              </TouchableOpacity>
            )}

            {/* アーティストごとのセットリスト（対バン・フェス用） */}
            {artistSetlists.length > 0 && (!isSharedView || showSetlist) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>セットリスト</Text>
                {artistSetlists.map((setlist, index) => (
                  <View key={setlist.id} style={styles.artistSetlistSection}>
                    <View style={styles.artistSetlistHeader}>
                      <Text style={styles.artistSetlistOrder}>{index + 1}.</Text>
                      <Text style={styles.artistSetlistName}>{setlist.artistName}</Text>
                    </View>
                    <View style={styles.setlistContainer}>
                      {renderSetlistLines(setlist.songs)}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* 従来のセットリスト（単一アーティスト用） */}
            {resolvedMemory.setlist && artistSetlists.length === 0 && (!isSharedView || showSetlist) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>セットリスト</Text>
                <View style={styles.setlistContainer}>
                  {renderSetlistLines(resolvedMemory.setlist)}
                </View>
              </View>
            )}

            {!isSharedView && event && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>ライブ詳細</Text>
                <TouchableOpacity
                  style={styles.eventDetailButton}
                  onPress={() => {
                    if (isSharedView) {
                      handleProtectedNavigate();
                      return;
                    }
                    navigation.navigate('LiveEventDetail', { eventId: event.id });
                  }}
                >
                  <View style={styles.eventDetailInfo}>
                    <Text style={styles.eventDetailTitle}>{event.title}</Text>
                    <Text style={styles.eventDetailVenue}>{event.venue_name}</Text>
                    <Text style={styles.eventDetailDate}>{formatDate(event.date)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      {/* Full Screen Image Modal */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setIsModalVisible(false)}
          >
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: selectedPhotoIndex * INITIAL_WIDTH, y: 0 }}
          >
            {photos.map((photo: string, index: number) => (
              <View key={index} style={[styles.modalImageContainer, { width: INITIAL_WIDTH }]}>
                <Image
                  source={{ uri: photo }}
                  style={[styles.modalImage, { width: INITIAL_WIDTH }] as ImageStyle[]}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Share Modal */}
      {!isSharedView && (
        <Modal
          visible={isShareModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsShareModalVisible(false)}
        >
          <View style={styles.shareModalOverlay}>
            <View style={styles.shareModalContainer}>
              <View style={styles.shareModalHeader}>
                <Text style={styles.shareModalTitle}>思い出を共有</Text>
                <TouchableOpacity
                  onPress={() => setIsShareModalVisible(false)}
                  style={styles.shareModalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.shareCardScrollView}
                contentContainerStyle={styles.shareCardScrollContent}
                showsVerticalScrollIndicator={true}
              >
                <ShareableMemoryCard
                  ref={shareCardRef}
                  eventTitle={resolvedMemory.event_title || ''}
                  artistName={resolvedMemory.artist_name || ''}
                  eventDate={resolvedMemory.event_date || ''}
                  venueName={venueName}
                  review={resolvedMemory.review}
                  photo={photos.length > 0 ? photos[0] : undefined}
                  setlist={resolvedMemory.setlist}
                />
              </ScrollView>

              <View style={styles.shareModalActions}>
                <TouchableOpacity
                  style={[styles.shareButton, isSharing && styles.shareButtonDisabled]}
                  onPress={handleShare}
                  disabled={isSharing}
                >
                  {isSharing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="share-outline" size={20} color="#fff" />
                      <Text style={styles.shareButtonText}>画像を共有</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.linkShareButton, isSharing && styles.shareButtonDisabled]}
                  onPress={handleShareLink}
                  disabled={isSharing}
                >
                  <Ionicons name="link-outline" size={20} color="#fff" />
                  <Text style={styles.shareButtonText}>リンクを共有</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
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
    minHeight: 64,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    zIndex: 10,
    // Web: ハードウェアアクセラレーションで振動を防止
    ...(Platform.OS === 'web' ? {
      transform: [{ translateZ: 0 }],
      willChange: 'transform',
    } : {}),
  } as any,
  backButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 80,
    justifyContent: 'flex-end',
  },
  headerButton: {
    marginLeft: 16,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 20,
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
  photosSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    // Web: 画像の再レンダリングがヘッダーに影響しないよう隔離
    ...(Platform.OS === 'web' ? {
      contain: 'layout paint',
    } : {}),
  } as any,
  photoCarouselContainer: {
    height: PHOTO_HEIGHT,
    overflow: 'hidden',
    // Web: GPUレイヤーで分離
    ...(Platform.OS === 'web' ? {
      transform: [{ translateZ: 0 }],
    } : {}),
  } as any,
  photoTouchable: {
    height: PHOTO_HEIGHT,
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
  photo: {
    height: PHOTO_HEIGHT,
    borderRadius: 8,
    backgroundColor: '#000',
  },
  photoIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginHorizontal: 4,
  },
  reviewText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  setlistContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
  },
  setlistLine: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 4,
  },
  eventDetailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  eventDetailInfo: {
    flex: 1,
  },
  eventDetailTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  eventDetailVenue: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  eventDetailDate: {
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
  modalImageContainer: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    height: '80%',
  },
  // Share Modal Styles
  shareModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  shareModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  shareModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  shareModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  shareModalCloseButton: {
    padding: 4,
  },
  shareCardScrollView: {
    maxHeight: 500,
  },
  shareCardScrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  shareModalActions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0095f6',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  linkShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0095f6',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 12,
  },
  shareButtonDisabled: {
    backgroundColor: '#b2dffc',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  setlistToggle: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderColor: '#0095f6',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  setlistToggleText: {
    color: '#0095f6',
    fontSize: 12,
    fontWeight: '600',
  },
  // アーティストごとのセットリスト
  artistSetlistSection: {
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
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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

export default MemoryDetailScreen;
