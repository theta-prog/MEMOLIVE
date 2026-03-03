import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

export type SyncStatus = 'synced' | 'created' | 'updated';

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
}

export interface Artist extends BaseEntity {
  name: string;
  website?: string;
  social_media?: string;
  photo?: string; // Artist photo URI
}

// イベントタイプ: single=ワンマン, taiban=対バン, festival=フェス
export type EventType = 'single' | 'taiban' | 'festival';

export interface LiveEvent extends BaseEntity {
  title: string;
  artist_id: string; // 後方互換性のため残す（メインアーティスト or 最初のアーティスト）
  date: string;
  doors_open?: string;
  show_start?: string;
  venue_name: string;
  venue_address?: string;
  ticket_status?: 'won' | 'lost' | 'pending' | 'purchased';
  ticket_price?: number;
  seat_number?: string;
  memo?: string;
  event_type?: EventType; // 新規追加
}

// ライブイベントとアーティストの中間テーブル（複数アーティスト対応）
export interface LiveEventArtist extends BaseEntity {
  live_event_id: string;
  artist_id: string;
  order: number; // 出演順
  is_headliner?: boolean; // メインアクトかどうか
}

export interface Memory extends BaseEntity {
  live_event_id: string;
  review?: string;
  setlist?: string; // 後方互換性のため残す（単一アーティストの場合のみ使用）
  photos?: string; // JSON array of photo URIs
  watched_artist_ids?: string; // JSON array - フェスで見たアーティストのID
}

// アーティストごとのセットリスト（対バン・フェス用）
export interface ArtistSetlist extends BaseEntity {
  memory_id: string;
  artist_id: string;
  order: number; // 出演順
  songs: string; // 曲リスト（改行区切り）
}

export interface DeletedItem {
  id: string;
  entityType: 'artist' | 'live_event' | 'memory';
  deletedAt: string;
}

const STORAGE_KEYS = {
  ARTISTS: 'artists',
  LIVE_EVENTS: 'live_events',
  MEMORIES: 'memories',
  DELETED_ITEMS: 'deleted_items',
  LAST_SYNC: 'last_sync',
  LIVE_EVENT_ARTISTS: 'live_event_artists',
  ARTIST_SETLISTS: 'artist_setlists',
};

class Database {
  private getNextId(): string {
    return Crypto.randomUUID();
  }

  private async getStoredData<T>(key: string): Promise<T[]> {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error(`Error getting stored data for ${key}:`, error);
      return [];
    }
  }

  private async setStoredData<T>(key: string, data: T[]): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error setting stored data for ${key}:`, error);
    }
  }

  private async addDeletedItem(id: string, entityType: DeletedItem['entityType']): Promise<void> {
    const deletedItems = await this.getStoredData<DeletedItem>(STORAGE_KEYS.DELETED_ITEMS);
    deletedItems.push({
      id,
      entityType,
      deletedAt: new Date().toISOString(),
    });
    await this.setStoredData(STORAGE_KEYS.DELETED_ITEMS, deletedItems);
  }

  // Artists methods
  async createArtist(artist: Omit<Artist, keyof BaseEntity>): Promise<Artist> {
    const artists = await this.getStoredData<Artist>(STORAGE_KEYS.ARTISTS);
    const newArtist: Artist = {
      ...artist,
      id: this.getNextId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'created',
    };
    artists.push(newArtist);
    await this.setStoredData(STORAGE_KEYS.ARTISTS, artists);
    return newArtist;
  }

  async getArtist(id: string): Promise<Artist | null> {
    const artists = await this.getStoredData<Artist>(STORAGE_KEYS.ARTISTS);
    return artists.find(artist => artist.id === id) || null;
  }

  async getAllArtists(): Promise<Artist[]> {
    const artists = await this.getStoredData<Artist>(STORAGE_KEYS.ARTISTS);
    return artists.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  async updateArtist(id: string, artistData: Partial<Artist>): Promise<void> {
    const artists = await this.getStoredData<Artist>(STORAGE_KEYS.ARTISTS);
    const index = artists.findIndex(artist => artist.id === id);
    if (index !== -1) {
      const currentArtist = artists[index]!;
      artists[index] = { 
        ...currentArtist, 
        ...artistData,
        updated_at: new Date().toISOString(),
        sync_status: currentArtist.sync_status === 'created' ? 'created' : 'updated'
      };
      await this.setStoredData(STORAGE_KEYS.ARTISTS, artists);
    }
  }

  async deleteArtist(id: string): Promise<void> {
    const artists = await this.getStoredData<Artist>(STORAGE_KEYS.ARTISTS);
    const filteredArtists = artists.filter(artist => artist.id !== id);
    await this.setStoredData(STORAGE_KEYS.ARTISTS, filteredArtists);
    await this.addDeletedItem(id, 'artist');
  }

  // ========== LiveEventArtist methods (中間テーブル) ==========
  
  async createLiveEventArtist(data: Omit<LiveEventArtist, keyof BaseEntity>): Promise<LiveEventArtist> {
    const items = await this.getStoredData<LiveEventArtist>(STORAGE_KEYS.LIVE_EVENT_ARTISTS);
    const newItem: LiveEventArtist = {
      ...data,
      id: this.getNextId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'created',
    };
    items.push(newItem);
    await this.setStoredData(STORAGE_KEYS.LIVE_EVENT_ARTISTS, items);
    return newItem;
  }

  async getLiveEventArtistsByEventId(liveEventId: string): Promise<LiveEventArtist[]> {
    const items = await this.getStoredData<LiveEventArtist>(STORAGE_KEYS.LIVE_EVENT_ARTISTS);
    return items
      .filter(item => item.live_event_id === liveEventId)
      .sort((a, b) => a.order - b.order);
  }

  async getLiveEventArtistsByArtistId(artistId: string): Promise<LiveEventArtist[]> {
    const items = await this.getStoredData<LiveEventArtist>(STORAGE_KEYS.LIVE_EVENT_ARTISTS);
    return items.filter(item => item.artist_id === artistId);
  }

  async deleteLiveEventArtistsByEventId(liveEventId: string): Promise<void> {
    const items = await this.getStoredData<LiveEventArtist>(STORAGE_KEYS.LIVE_EVENT_ARTISTS);
    const filtered = items.filter(item => item.live_event_id !== liveEventId);
    await this.setStoredData(STORAGE_KEYS.LIVE_EVENT_ARTISTS, filtered);
  }

  async setLiveEventArtists(liveEventId: string, artistIds: string[]): Promise<void> {
    // 既存の関連を削除
    await this.deleteLiveEventArtistsByEventId(liveEventId);
    
    // 新しい関連を作成
    for (let i = 0; i < artistIds.length; i++) {
      await this.createLiveEventArtist({
        live_event_id: liveEventId,
        artist_id: artistIds[i]!,
        order: i,
        is_headliner: i === 0, // 最初のアーティストをヘッドライナーとする
      });
    }
  }

  // Live events methods
  async createLiveEvent(event: Omit<LiveEvent, keyof BaseEntity>): Promise<LiveEvent> {
    const events = await this.getStoredData<LiveEvent>(STORAGE_KEYS.LIVE_EVENTS);
    const newEvent: LiveEvent = {
      ...event,
      id: this.getNextId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'created',
    };
    events.push(newEvent);
    await this.setStoredData(STORAGE_KEYS.LIVE_EVENTS, events);
    return newEvent;
  }

  async getLiveEvent(id: string): Promise<LiveEvent | null> {
    const events = await this.getStoredData<LiveEvent>(STORAGE_KEYS.LIVE_EVENTS);
    return events.find(event => event.id === id) || null;
  }

  async getAllLiveEvents(): Promise<LiveEvent[]> {
    const events = await this.getStoredData<LiveEvent>(STORAGE_KEYS.LIVE_EVENTS);
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async getLiveEventsWithArtists(): Promise<(LiveEvent & { artist_name: string; artist_names: string[] })[]> {
    const events = await this.getAllLiveEvents();
    const artists = await this.getAllArtists();
    const liveEventArtists = await this.getStoredData<LiveEventArtist>(STORAGE_KEYS.LIVE_EVENT_ARTISTS);
    
    return events.map(event => {
      // 中間テーブルから複数アーティストを取得
      const eventArtistLinks = liveEventArtists
        .filter(lea => lea.live_event_id === event.id)
        .sort((a, b) => a.order - b.order);
      
      let artistNames: string[] = [];
      
      if (eventArtistLinks.length > 0) {
        // 新形式: 中間テーブルから複数アーティストを取得
        artistNames = eventArtistLinks
          .map(link => artists.find(a => a.id === link.artist_id)?.name || 'Unknown Artist');
      } else if (event.artist_id) {
        // 後方互換: 単一artist_idから取得
        const artist = artists.find(a => a.id === event.artist_id);
        artistNames = [artist?.name || 'Unknown Artist'];
      }
      
      return {
        ...event,
        artist_name: artistNames.join(' / ') || 'Unknown Artist', // 後方互換用
        artist_names: artistNames,
      };
    });
  }

  async getUpcomingLiveEvents(): Promise<(LiveEvent & { artist_name: string })[]> {
    const eventsWithArtists = await this.getLiveEventsWithArtists();
    const today = new Date().toISOString().split('T')[0]!;
    
    return eventsWithArtists
      .filter(event => event.date >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async updateLiveEvent(id: string, eventData: Partial<LiveEvent>): Promise<void> {
    const events = await this.getStoredData<LiveEvent>(STORAGE_KEYS.LIVE_EVENTS);
    const index = events.findIndex(event => event.id === id);
    if (index !== -1) {
      const currentEvent = events[index]!;
      events[index] = { 
        ...currentEvent, 
        ...eventData,
        updated_at: new Date().toISOString(),
        sync_status: currentEvent.sync_status === 'created' ? 'created' : 'updated'
      };
      await this.setStoredData(STORAGE_KEYS.LIVE_EVENTS, events);
    }
  }

  async deleteLiveEvent(id: string): Promise<void> {
    const events = await this.getStoredData<LiveEvent>(STORAGE_KEYS.LIVE_EVENTS);
    const filteredEvents = events.filter(event => event.id !== id);
    await this.setStoredData(STORAGE_KEYS.LIVE_EVENTS, filteredEvents);
    await this.addDeletedItem(id, 'live_event');
  }

  // Memories methods
  async createMemory(memory: Omit<Memory, keyof BaseEntity>): Promise<Memory> {
    const memories = await this.getStoredData<Memory>(STORAGE_KEYS.MEMORIES);
    const newMemory: Memory = {
      ...memory,
      id: this.getNextId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'created',
    };
    memories.push(newMemory);
    await this.setStoredData(STORAGE_KEYS.MEMORIES, memories);
    return newMemory;
  }

  async getMemory(id: string): Promise<Memory | null> {
    const memories = await this.getStoredData<Memory>(STORAGE_KEYS.MEMORIES);
    return memories.find(memory => memory.id === id) || null;
  }

  async getMemoryByLiveEventId(liveEventId: string): Promise<Memory | null> {
    const memories = await this.getStoredData<Memory>(STORAGE_KEYS.MEMORIES);
    return memories.find(memory => memory.live_event_id === liveEventId) || null;
  }

  async getAllMemories(): Promise<Memory[]> {
    const memories = await this.getStoredData<Memory>(STORAGE_KEYS.MEMORIES);
    return memories.sort((a, b) => 
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
  }

  async getMemoriesWithEventDetails(): Promise<(Memory & { event_title: string; artist_name: string; artist_names: string[]; event_date: string })[]> {
    const memories = await this.getAllMemories();
    const eventsWithArtists = await this.getLiveEventsWithArtists();

    return memories.map(memory => {
      const event = eventsWithArtists.find(e => e.id === memory.live_event_id);
      
      return {
        ...memory,
        event_title: event?.title || 'Unknown Event',
        artist_name: event?.artist_name || 'Unknown Artist',
        artist_names: event?.artist_names || [],
        event_date: event?.date || '',
      };
    });
  }

  async updateMemory(id: string, memoryData: Partial<Memory>): Promise<void> {
    const memories = await this.getStoredData<Memory>(STORAGE_KEYS.MEMORIES);
    const index = memories.findIndex(memory => memory.id === id);
    if (index !== -1) {
      const currentMemory = memories[index]!;
      memories[index] = { 
        ...currentMemory, 
        ...memoryData,
        updated_at: new Date().toISOString(),
        sync_status: currentMemory.sync_status === 'created' ? 'created' : 'updated'
      };
      await this.setStoredData(STORAGE_KEYS.MEMORIES, memories);
    }
  }

  async deleteMemory(id: string): Promise<void> {
    const memories = await this.getStoredData<Memory>(STORAGE_KEYS.MEMORIES);
    const filteredMemories = memories.filter(memory => memory.id !== id);
    await this.setStoredData(STORAGE_KEYS.MEMORIES, filteredMemories);
    await this.addDeletedItem(id, 'memory');
    
    // 関連するアーティストセットリストも削除
    await this.deleteArtistSetlistsByMemoryId(id);
  }

  // ========== ArtistSetlist methods (アーティストごとのセットリスト) ==========

  async createArtistSetlist(data: Omit<ArtistSetlist, keyof BaseEntity>): Promise<ArtistSetlist> {
    const items = await this.getStoredData<ArtistSetlist>(STORAGE_KEYS.ARTIST_SETLISTS);
    const newItem: ArtistSetlist = {
      ...data,
      id: this.getNextId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'created',
    };
    items.push(newItem);
    await this.setStoredData(STORAGE_KEYS.ARTIST_SETLISTS, items);
    return newItem;
  }

  async getArtistSetlistsByMemoryId(memoryId: string): Promise<ArtistSetlist[]> {
    const items = await this.getStoredData<ArtistSetlist>(STORAGE_KEYS.ARTIST_SETLISTS);
    return items
      .filter(item => item.memory_id === memoryId)
      .sort((a, b) => a.order - b.order);
  }

  async updateArtistSetlist(id: string, data: Partial<ArtistSetlist>): Promise<void> {
    const items = await this.getStoredData<ArtistSetlist>(STORAGE_KEYS.ARTIST_SETLISTS);
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      const current = items[index]!;
      items[index] = {
        ...current,
        ...data,
        updated_at: new Date().toISOString(),
        sync_status: current.sync_status === 'created' ? 'created' : 'updated',
      };
      await this.setStoredData(STORAGE_KEYS.ARTIST_SETLISTS, items);
    }
  }

  async deleteArtistSetlist(id: string): Promise<void> {
    const items = await this.getStoredData<ArtistSetlist>(STORAGE_KEYS.ARTIST_SETLISTS);
    const filtered = items.filter(item => item.id !== id);
    await this.setStoredData(STORAGE_KEYS.ARTIST_SETLISTS, filtered);
  }

  async deleteArtistSetlistsByMemoryId(memoryId: string): Promise<void> {
    const items = await this.getStoredData<ArtistSetlist>(STORAGE_KEYS.ARTIST_SETLISTS);
    const filtered = items.filter(item => item.memory_id !== memoryId);
    await this.setStoredData(STORAGE_KEYS.ARTIST_SETLISTS, filtered);
  }

  async setArtistSetlists(memoryId: string, setlists: { artistId: string; songs: string }[]): Promise<void> {
    // 既存のセットリストを削除
    await this.deleteArtistSetlistsByMemoryId(memoryId);
    
    // 新しいセットリストを作成
    for (let i = 0; i < setlists.length; i++) {
      const setlist = setlists[i]!;
      if (setlist.songs.trim()) {
        await this.createArtistSetlist({
          memory_id: memoryId,
          artist_id: setlist.artistId,
          order: i,
          songs: setlist.songs.trim(),
        });
      }
    }
  }

  // ========== Sync methods ==========
  
  /**
   * 削除されたアイテムを取得
   */
  async getDeletedItems(): Promise<DeletedItem[]> {
    return this.getStoredData<DeletedItem>(STORAGE_KEYS.DELETED_ITEMS);
  }

  /**
   * 削除済みアイテムをクリア（同期完了後に呼ぶ）
   */
  async clearDeletedItems(): Promise<void> {
    await this.setStoredData(STORAGE_KEYS.DELETED_ITEMS, []);
  }

  /**
   * アーティストをupsert（サーバーからのデータ適用用）
   */
  async upsertArtist(artist: Artist): Promise<void> {
    const artists = await this.getStoredData<Artist>(STORAGE_KEYS.ARTISTS);
    const index = artists.findIndex(a => a.id === artist.id);
    if (index !== -1) {
      // 既存のアーティストを更新（サーバーのデータで上書き）
      artists[index] = artist;
    } else {
      // 新規追加
      artists.push(artist);
    }
    await this.setStoredData(STORAGE_KEYS.ARTISTS, artists);
  }

  /**
   * ライブイベントをupsert（サーバーからのデータ適用用）
   */
  async upsertLiveEvent(event: LiveEvent): Promise<void> {
    const events = await this.getStoredData<LiveEvent>(STORAGE_KEYS.LIVE_EVENTS);
    const index = events.findIndex(e => e.id === event.id);
    if (index !== -1) {
      events[index] = event;
    } else {
      events.push(event);
    }
    await this.setStoredData(STORAGE_KEYS.LIVE_EVENTS, events);
  }

  /**
   * メモリをupsert（サーバーからのデータ適用用）
   */
  async upsertMemory(memory: Memory): Promise<void> {
    const memories = await this.getStoredData<Memory>(STORAGE_KEYS.MEMORIES);
    const index = memories.findIndex(m => m.id === memory.id);
    if (index !== -1) {
      memories[index] = memory;
    } else {
      memories.push(memory);
    }
    await this.setStoredData(STORAGE_KEYS.MEMORIES, memories);
  }

  /**
   * アーティストを同期済みにマーク
   */
  async markArtistAsSynced(id: string): Promise<void> {
    const artists = await this.getStoredData<Artist>(STORAGE_KEYS.ARTISTS);
    const index = artists.findIndex(a => a.id === id);
    if (index !== -1) {
      artists[index] = { ...artists[index]!, sync_status: 'synced' };
      await this.setStoredData(STORAGE_KEYS.ARTISTS, artists);
    }
  }

  /**
   * ライブイベントを同期済みにマーク
   */
  async markLiveEventAsSynced(id: string): Promise<void> {
    const events = await this.getStoredData<LiveEvent>(STORAGE_KEYS.LIVE_EVENTS);
    const index = events.findIndex(e => e.id === id);
    if (index !== -1) {
      events[index] = { ...events[index]!, sync_status: 'synced' };
      await this.setStoredData(STORAGE_KEYS.LIVE_EVENTS, events);
    }
  }

  /**
   * メモリを同期済みにマーク
   */
  async markMemoryAsSynced(id: string): Promise<void> {
    const memories = await this.getStoredData<Memory>(STORAGE_KEYS.MEMORIES);
    const index = memories.findIndex(m => m.id === id);
    if (index !== -1) {
      memories[index] = { ...memories[index]!, sync_status: 'synced' };
      await this.setStoredData(STORAGE_KEYS.MEMORIES, memories);
    }
  }

  /**
   * 全データをクリア（ログアウト時に使用）
   */
  async clearAllData(): Promise<void> {
    await Promise.all([
      this.setStoredData(STORAGE_KEYS.ARTISTS, []),
      this.setStoredData(STORAGE_KEYS.LIVE_EVENTS, []),
      this.setStoredData(STORAGE_KEYS.MEMORIES, []),
      this.setStoredData(STORAGE_KEYS.DELETED_ITEMS, []),
    ]);
  }
}

export const database = new Database();
export default Database;
