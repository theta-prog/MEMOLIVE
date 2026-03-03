import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { artistService, liveEventService, memoryService } from '../api/services';
import { syncService } from '../api/syncService';
import { Artist, ArtistSetlist, BaseEntity, database, LiveEvent, LiveEventArtist, Memory } from '../database/asyncDatabase';
import { isEventToday } from '../utils';
import { storage } from '../utils/storage';
import { useAuth } from './AuthContext';

// 拡張されたLiveEvent型（複数アーティスト対応）
export type LiveEventWithArtists = LiveEvent & { 
  artist_name: string; 
  artist_names: string[];
};

// 拡張されたMemory型（複数アーティスト対応）
export type MemoryWithDetails = Memory & { 
  event_title: string; 
  artist_name: string;
  artist_names: string[];
  event_date: string;
};

interface AppContextType {
  artists: Artist[];
  liveEvents: LiveEventWithArtists[];
  memories: MemoryWithDetails[];
  upcomingEvents: LiveEventWithArtists[];
  isSyncing: boolean;
  lastSyncAt: string | null;
  
  // Artist methods
  addArtist: (artist: Omit<Artist, keyof BaseEntity>) => Promise<void>;
  updateArtist: (id: string, artist: Partial<Artist>) => Promise<void>;
  deleteArtist: (id: string) => Promise<void>;
  
  // Live event methods
  addLiveEvent: (event: Omit<LiveEvent, keyof BaseEntity>, artistIds?: string[]) => Promise<void>;
  updateLiveEvent: (id: string, event: Partial<LiveEvent>, artistIds?: string[]) => Promise<void>;
  deleteLiveEvent: (id: string) => Promise<void>;
  getLiveEventArtists: (liveEventId: string) => Promise<LiveEventArtist[]>;
  
  // Memory methods
  addMemory: (memory: Omit<Memory, keyof BaseEntity>) => Promise<void>;
  updateMemory: (id: string, memory: Partial<Memory>) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  
  // ArtistSetlist methods
  getArtistSetlists: (memoryId: string) => Promise<ArtistSetlist[]>;
  setArtistSetlists: (memoryId: string, setlists: { artistId: string; songs: string }[]) => Promise<void>;
  
  // Utility methods
  refreshData: () => Promise<void>;
  syncWithServer: () => Promise<{ success: boolean; error?: string }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [liveEvents, setLiveEvents] = useState<LiveEventWithArtists[]>([]);
  const [memories, setMemories] = useState<MemoryWithDetails[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<LiveEventWithArtists[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to update state with data
  const updateStateWithData = useCallback((
    artistsData: Artist[],
    eventsData: LiveEventWithArtists[],
    memoriesData: MemoryWithDetails[]
  ) => {
    // Sort artists
    const sortedArtists = artistsData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    setArtists(sortedArtists);

    // Set events
    const sortedEvents = eventsData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setLiveEvents(sortedEvents);

    // Set memories
    const sortedMemories = memoriesData.sort((a, b) => 
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
    setMemories(sortedMemories);

    // Filter upcoming events
    const upcoming = sortedEvents
      .filter(event => {
        const eventDate = new Date(event.date);
        const today = new Date();
        
        if (isEventToday(event.date)) {
          return true;
        }
        
        const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
        const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        return eventDateOnly > todayOnly;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    setUpcomingEvents(upcoming);
    setIsDataLoaded(true);
  }, []);

  const refreshData = useCallback(async () => {
    try {
      // Step 1: まずローカルデータを即座に表示（高速）
      if (!isDataLoaded) {
        const [localArtists, localEvents, localMemories] = await Promise.all([
          database.getAllArtists(),
          database.getLiveEventsWithArtists(), 
          database.getMemoriesWithEventDetails(),
        ]);
        
        updateStateWithData(localArtists, localEvents, localMemories);
      }

      // Step 2: 認証済みユーザーの場合、バックグラウンドでAPIからデータを取得して更新
      const accessToken = await storage.getItem('accessToken');
      const shouldFetchFromAPI = isAuthenticated && accessToken && process.env.NODE_ENV !== 'development';
      
      if (shouldFetchFromAPI) {
        try {
          const [apiArtists, apiEvents, apiMemories] = await Promise.all([
            artistService.getAll(),
            liveEventService.getAll(),
            memoryService.getAll(),
          ]);
          
          const eventsWithArtists = apiEvents.map(event => {
            const artist = apiArtists.find(a => a.id === event.artist_id);
            return {
              ...event,
              artist_name: artist?.name || 'Unknown Artist',
              artist_names: artist ? [artist.name] : [], // 後方互換: APIからはまだ単一アーティストのみ
            };
          });
          
          const memoriesWithDetails = apiMemories.map(memory => {
            const event = apiEvents.find(e => e.id === memory.live_event_id);
            const artist = event ? apiArtists.find(a => a.id === event.artist_id) : null;
            
            return {
              ...memory,
              event_title: event?.title || 'Unknown Event',
              artist_name: artist?.name || 'Unknown Artist',
              artist_names: artist ? [artist.name] : [], // 後方互換: APIからはまだ単一アーティストのみ
              event_date: event?.date || '',
            };
          });
          
          console.log('API data retrieved:', {
            artists: apiArtists.length,
            events: apiEvents.length,
            memories: apiMemories.length
          });
          
          updateStateWithData(apiArtists, eventsWithArtists, memoriesWithDetails);
        } catch (apiError) {
          console.error('Error fetching from API, using local data:', apiError);
          // APIエラーでもローカルデータは既に表示されているので問題なし
        }
      } else if (isDataLoaded) {
        // 既にロード済みでローカルモードの場合は最新のローカルデータを取得
        const [localArtists, localEvents, localMemories] = await Promise.all([
          database.getAllArtists(),
          database.getLiveEventsWithArtists(), 
          database.getMemoriesWithEventDetails(),
        ]);
        updateStateWithData(localArtists, localEvents, localMemories);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }, [isAuthenticated, isDataLoaded, updateStateWithData]);

  // サーバーとの同期を実行
  const syncWithServer = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (isSyncing) {
      return { success: false, error: 'Sync already in progress' };
    }

    try {
      setIsSyncing(true);
      
      const result = await syncService.sync();
      
      if (result.success) {
        // 同期成功後、ローカルデータを再読み込み
        const [localArtists, localEvents, localMemories] = await Promise.all([
          database.getAllArtists(),
          database.getLiveEventsWithArtists(), 
          database.getMemoriesWithEventDetails(),
        ]);
        updateStateWithData(localArtists, localEvents, localMemories);
        
        // 最後の同期日時を更新
        const syncTime = await syncService.getLastSyncTime();
        setLastSyncAt(syncTime);
      }
      
      return result;
    } catch (error: any) {
      console.error('Sync failed:', error);
      return { success: false, error: error.message || 'Unknown error' };
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, updateStateWithData]);

  // 初回データ読み込み（一度だけ実行）
  useEffect(() => {
    // ローカル環境では常にデータを読み込む
    refreshData();
    
    // 最後の同期日時を読み込む
    syncService.getLastSyncTime().then(setLastSyncAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 初回のみ実行

  // 認証済みユーザーは定期的に同期を実行（5分ごと）
  useEffect(() => {
    if (isAuthenticated && process.env.NODE_ENV !== 'development') {
      // 初回同期を実行
      syncWithServer();
      
      // 5分ごとに同期
      syncIntervalRef.current = setInterval(() => {
        syncWithServer();
      }, 5 * 60 * 1000);
      
      return () => {
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
          syncIntervalRef.current = null;
        }
      };
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]); // isAuthenticatedの変更時のみ実行

  // Artist methods
  const addArtist = async (artist: Omit<Artist, keyof BaseEntity>) => {
    try {
      const accessToken = await storage.getItem('accessToken');
      const useLocalDatabase = !isAuthenticated || !accessToken || process.env.NODE_ENV === 'development';
      
      if (useLocalDatabase) {
        await database.createArtist(artist);
      } else {
        await artistService.create(artist);
      }
      await refreshData();
    } catch (error) {
      console.error('Error adding artist:', error);
      throw error;
    }
  };

  const updateArtist = async (id: string, artist: Partial<Artist>) => {
    try {
      const accessToken = await storage.getItem('accessToken');
      const useLocalDatabase = !isAuthenticated || !accessToken || process.env.NODE_ENV === 'development';
      
      if (useLocalDatabase) {
        await database.updateArtist(id, artist);
      } else {
        await artistService.update(id, artist);
      }
      await refreshData();
    } catch (error) {
      console.error('Error updating artist:', error);
      throw error;
    }
  };

  const deleteArtist = async (id: string) => {
    try {
      const accessToken = await storage.getItem('accessToken');
      const useLocalDatabase = !isAuthenticated || !accessToken || process.env.NODE_ENV === 'development';
      
      if (useLocalDatabase) {
        await database.deleteArtist(id);
      } else {
        await artistService.delete(id);
      }
      await refreshData();
    } catch (error) {
      console.error('Error deleting artist:', error);
      throw error;
    }
  };

  // Live event methods
  const addLiveEvent = async (event: Omit<LiveEvent, keyof BaseEntity>, artistIds?: string[]) => {
    try {
      const accessToken = await storage.getItem('accessToken');
      const useLocalDatabase = !isAuthenticated || !accessToken || process.env.NODE_ENV === 'development';
      
      if (useLocalDatabase) {
        const createdEvent = await database.createLiveEvent(event);
        // 複数アーティストが指定されている場合、中間テーブルにも保存
        if (artistIds && artistIds.length > 0) {
          await database.setLiveEventArtists(createdEvent.id, artistIds);
        }
      } else {
        await liveEventService.create(event);
      }
      await refreshData();
    } catch (error) {
      console.error('Error adding live event:', error);
      throw error;
    }
  };

  const updateLiveEvent = async (id: string, event: Partial<LiveEvent>, artistIds?: string[]) => {
    try {
      const accessToken = await storage.getItem('accessToken');
      const useLocalDatabase = !isAuthenticated || !accessToken || process.env.NODE_ENV === 'development';
      
      if (useLocalDatabase) {
        await database.updateLiveEvent(id, event);
        // 複数アーティストが指定されている場合、中間テーブルも更新
        if (artistIds !== undefined) {
          await database.setLiveEventArtists(id, artistIds);
        }
      } else {
        await liveEventService.update(id, event);
      }
      await refreshData();
    } catch (error) {
      console.error('Error updating live event:', error);
      throw error;
    }
  };

  const deleteLiveEvent = async (id: string) => {
    try {
      const accessToken = await storage.getItem('accessToken');
      const useLocalDatabase = !isAuthenticated || !accessToken || process.env.NODE_ENV === 'development';
      
      if (useLocalDatabase) {
        // 中間テーブルのデータも削除
        await database.deleteLiveEventArtistsByEventId(id);
        await database.deleteLiveEvent(id);
      } else {
        await liveEventService.delete(id);
      }
      await refreshData();
    } catch (error) {
      console.error('Error deleting live event:', error);
      throw error;
    }
  };

  // LiveEventArtist取得メソッド
  const getLiveEventArtists = async (liveEventId: string): Promise<LiveEventArtist[]> => {
    return database.getLiveEventArtistsByEventId(liveEventId);
  };

  // Memory methods
  const addMemory = async (memory: Omit<Memory, keyof BaseEntity>) => {
    try {
      const accessToken = await storage.getItem('accessToken');
      const useLocalDatabase = !isAuthenticated || !accessToken || process.env.NODE_ENV === 'development';
      
      if (useLocalDatabase) {
        await database.createMemory(memory);
      } else {
        await memoryService.create(memory);
      }
      await refreshData();
    } catch (error) {
      console.error('Error adding memory:', error);
      throw error;
    }
  };

  const updateMemory = async (id: string, memory: Partial<Memory>) => {
    try {
      const accessToken = await storage.getItem('accessToken');
      const useLocalDatabase = !isAuthenticated || !accessToken || process.env.NODE_ENV === 'development';
      
      if (useLocalDatabase) {
        await database.updateMemory(id, memory);
      } else {
        await memoryService.update(id, memory);
      }
      await refreshData();
    } catch (error) {
      console.error('Error updating memory:', error);
      throw error;
    }
  };

  const deleteMemory = async (id: string) => {
    try {
      const useLocalDatabase = !isAuthenticated || process.env.NODE_ENV === 'development';
      
      if (useLocalDatabase) {
        await database.deleteMemory(id);
      } else {
        await memoryService.delete(id);
      }
      await refreshData();
    } catch (error) {
      console.error('Error deleting memory:', error);
      throw error;
    }
  };

  // ArtistSetlist methods
  const getArtistSetlists = async (memoryId: string): Promise<ArtistSetlist[]> => {
    return database.getArtistSetlistsByMemoryId(memoryId);
  };

  const setArtistSetlists = async (memoryId: string, setlists: { artistId: string; songs: string }[]): Promise<void> => {
    await database.setArtistSetlists(memoryId, setlists);
  };

  const value: AppContextType = {
    artists,
    liveEvents,
    memories,
    upcomingEvents,
    isSyncing,
    lastSyncAt,
    addArtist,
    updateArtist,
    deleteArtist,
    addLiveEvent,
    updateLiveEvent,
    deleteLiveEvent,
    getLiveEventArtists,
    addMemory,
    updateMemory,
    deleteMemory,
    getArtistSetlists,
    setArtistSetlists,
    refreshData,
    syncWithServer,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
