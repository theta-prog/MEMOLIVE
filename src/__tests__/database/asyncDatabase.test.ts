import AsyncStorage from '@react-native-async-storage/async-storage';
import Database from '../../database/asyncDatabase';

// Mock AsyncStorage for testing
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
  clear: jest.fn(),
}));

describe('Database', () => {
  let database: Database;
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

  beforeEach(() => {
    database = new Database();
    jest.clearAllMocks();
  });

  describe('Artists', () => {
    it('should create an artist', async () => {
      const mockArtist = {
        name: 'Test Artist',
        website: 'https://example.com',
        social_media: '@testartist',
      };

      // Mock: getStoredData for existing artists
      mockAsyncStorage.getItem
        .mockResolvedValueOnce('[]'); // existing artists

      const result = await database.createArtist(mockArtist);

      expect(result).toEqual({
        id: expect.any(String),
        ...mockArtist,
        created_at: expect.any(String),
        updated_at: expect.any(String),
        sync_status: 'created',
      });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'artists',
        expect.any(String)
      );
    });

    it('should get all artists', async () => {
      const mockArtists = [
        {
          id: '1',
          name: 'Artist 1',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
          sync_status: 'synced',
        },
        {
          id: '2',
          name: 'Artist 2',
          created_at: '2023-01-02T00:00:00.000Z',
          updated_at: '2023-01-02T00:00:00.000Z',
          sync_status: 'synced',
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockArtists));

      const result = await database.getAllArtists();

      expect(result).toEqual(mockArtists);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('artists');
    });

    it('should update an artist', async () => {
      const mockArtists = [
        {
          id: '1',
          name: 'Original Artist',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
          sync_status: 'synced',
        },
      ];

      const updatedArtist = {
        name: 'Updated Artist',
        website: 'https://updated.com',
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockArtists));

      await database.updateArtist('1', updatedArtist);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'artists',
        expect.stringMatching(/"id":"1"/)
      );
    });

    it('should delete an artist', async () => {
      const mockArtists = [
        {
          id: '1',
          name: 'Artist 1',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
          sync_status: 'synced',
        },
        {
          id: '2',
          name: 'Artist 2',
          created_at: '2023-01-02T00:00:00.000Z',
          updated_at: '2023-01-02T00:00:00.000Z',
          sync_status: 'synced',
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockArtists));

      await database.deleteArtist('1');

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'artists',
        JSON.stringify([
          {
            id: '2',
            name: 'Artist 2',
            created_at: '2023-01-02T00:00:00.000Z',
            updated_at: '2023-01-02T00:00:00.000Z',
            sync_status: 'synced',
          },
        ])
      );
    });
  });

  describe('Live Events', () => {
    it('should create a live event', async () => {
      const mockEvent = {
        title: 'Test Concert',
        artist_id: '1',
        date: '2023-12-25',
        venue_name: 'Test Venue',
        ticket_status: 'purchased' as const,
      };

      // Mock: getStoredData for existing events
      mockAsyncStorage.getItem
        .mockResolvedValueOnce('[]'); // existing events

      const result = await database.createLiveEvent(mockEvent);

      expect(result).toEqual({
        id: expect.any(String),
        ...mockEvent,
        created_at: expect.any(String),
        updated_at: expect.any(String),
        sync_status: 'created',
      });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'live_events',
        expect.any(String)
      );
    });

    it('should get live events with artist details', async () => {
      const mockEvents = [
        {
          id: '1',
          title: 'Concert 1',
          artist_id: '1',
          date: '2023-12-25',
          venue_name: 'Venue 1',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
          sync_status: 'synced',
        },
      ];

      const mockArtists = [
        {
          id: '1',
          name: 'Artist 1',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
          sync_status: 'synced',
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockEvents));
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockArtists));
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([])); // live_event_artists

      const result = await database.getLiveEventsWithArtists();

      expect(result[0]).toEqual({
        ...mockEvents[0],
        artist_name: mockArtists[0]!.name,
        artist_names: [mockArtists[0]!.name],
      });
    });

    it('should get upcoming live events', async () => {
      const futureDate1 = new Date();
      futureDate1.setDate(futureDate1.getDate() + 10);
      const futureDate2 = new Date();
      futureDate2.setDate(futureDate2.getDate() + 20);

      const mockEvents = [
        {
          id: '1',
          title: 'Concert 1',
          artist_id: '1',
          date: futureDate1.toISOString().split('T')[0],
          venue_name: 'Venue 1',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
          sync_status: 'synced',
        },
        {
          id: '2',
          title: 'Concert 2',
          artist_id: '1',
          date: futureDate2.toISOString().split('T')[0],
          venue_name: 'Venue 2',
          created_at: '2023-01-02T00:00:00.000Z',
          updated_at: '2023-01-02T00:00:00.000Z',
          sync_status: 'synced',
        },
      ];

      const mockArtists = [
        {
          id: '1',
          name: 'Artist 1',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
          sync_status: 'synced',
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockEvents));
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockArtists));
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([])); // live_event_artists

      const result = await database.getUpcomingLiveEvents();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        ...mockEvents[0],
        artist_name: mockArtists[0]!.name,
        artist_names: [mockArtists[0]!.name],
      });
    });
  });

  describe('Memories', () => {
    it('should create a memory', async () => {
      const mockMemory = {
        live_event_id: '1',
        review: 'Great concert!',
        setlist: 'Song 1, Song 2, Song 3',
        photos: JSON.stringify(['photo1.jpg', 'photo2.jpg']),
      };

      // Mock: getStoredData for existing memories
      mockAsyncStorage.getItem
        .mockResolvedValueOnce('[]'); // existing memories

      const result = await database.createMemory(mockMemory);

      expect(result).toEqual({
        id: expect.any(String),
        ...mockMemory,
        created_at: expect.any(String),
        updated_at: expect.any(String),
        sync_status: 'created',
      });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'memories',
        expect.any(String)
      );
    });

    it('should get memories with event and artist details', async () => {
      const mockMemories = [
        {
          id: '1',
          live_event_id: '1',
          review: 'Great concert!',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
          sync_status: 'synced',
        },
      ];

      const mockEvents = [
        {
          id: '1',
          title: 'Concert 1',
          artist_id: '1',
          date: '2023-12-25',
          venue_name: 'Venue 1',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
          sync_status: 'synced',
        },
      ];

      const mockArtists = [
        {
          id: '1',
          name: 'Artist 1',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
          sync_status: 'synced',
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockMemories));
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockEvents));
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockArtists));
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([])); // live_event_artists

      const result = await database.getMemoriesWithEventDetails();

      expect(result[0]).toEqual({
        ...mockMemories[0],
        event_title: mockEvents[0]!.title,
        artist_name: mockArtists[0]!.name,
        artist_names: [mockArtists[0]!.name],
        event_date: mockEvents[0]!.date,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle AsyncStorage errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage error'));

      const result = await database.getAllArtists();
      expect(result).toEqual([]);
    });

    it('should handle JSON parsing errors', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('invalid json');

      const result = await database.getAllArtists();
      expect(result).toEqual([]);
    });

    it('should return empty array when no data exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      const result = await database.getAllArtists();

      expect(result).toEqual([]);
    });
  });

  describe('Individual Item Retrieval', () => {
    it('should get individual artist by id', async () => {
      const mockArtists = [
        {
          id: '1',
          name: 'Artist 1',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
          sync_status: 'synced',
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockArtists));

      const result = await database.getArtist('1');

      expect(result).toEqual(mockArtists[0]);
    });

    it('should return null for non-existent artist', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('[]');

      const result = await database.getArtist('999');

      expect(result).toBeNull();
    });

    it('should get individual live event by id', async () => {
      const mockEvents = [
        {
          id: '1',
          title: 'Concert 1',
          artist_id: '1',
          date: '2023-12-25',
          venue_name: 'Venue 1',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
          sync_status: 'synced',
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockEvents));

      const result = await database.getLiveEvent('1');

      expect(result).toEqual(mockEvents[0]);
    });

    it('should get memory by live event id', async () => {
      const mockMemories = [
        {
          id: '1',
          live_event_id: '1',
          review: 'Great concert!',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
          sync_status: 'synced',
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockMemories));

      const result = await database.getMemoryByLiveEventId('1');

      expect(result).toEqual(mockMemories[0]);
    });
  });

  describe('Data Updates', () => {
    it('should update artist name', async () => {
      const mockArtists = [
        {
          id: '1',
          name: 'Old Name',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
          sync_status: 'synced',
        },
      ];

      const updatedArtist = {
        name: 'New Name',
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockArtists));
      mockAsyncStorage.setItem.mockResolvedValueOnce();

      await database.updateArtist('1', updatedArtist);

      const setItemCall = mockAsyncStorage.setItem.mock.calls.find(call => call[0] === 'artists');
      expect(setItemCall).toBeDefined();
      const savedArtists = JSON.parse(setItemCall![1]);
      expect(savedArtists[0]).toEqual({
        id: '1',
        name: 'New Name',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: expect.any(String),
        sync_status: 'updated',
      });
    });

    it('should update live event details', async () => {
      const mockEvents = [
        {
          id: '1',
          title: 'Old Title',
          artist_id: '1',
          date: '2023-12-25',
          venue_name: 'Old Venue',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
          sync_status: 'synced',
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockEvents));
      mockAsyncStorage.setItem.mockResolvedValueOnce();

      await database.updateLiveEvent('1', {
        title: 'New Title',
        venue_name: 'New Venue',
      });

      const setItemCall = mockAsyncStorage.setItem.mock.calls.find(call => call[0] === 'live_events');
      expect(setItemCall).toBeDefined();
      const savedEvents = JSON.parse(setItemCall![1]);
      expect(savedEvents[0]).toEqual({
        id: '1',
        title: 'New Title',
        artist_id: '1',
        date: '2023-12-25',
        venue_name: 'New Venue',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: expect.any(String),
        sync_status: 'updated',
      });
    });

    it('should update memory review', async () => {
      const mockMemories = [
        {
          id: '1',
          live_event_id: '1',
          review: 'Old review',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
          sync_status: 'synced',
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockMemories));
      mockAsyncStorage.setItem.mockResolvedValueOnce();

      await database.updateMemory('1', { review: 'Updated review' });

      const setItemCall = mockAsyncStorage.setItem.mock.calls.find(call => call[0] === 'memories');
      expect(setItemCall).toBeDefined();
      const savedMemories = JSON.parse(setItemCall![1]);
      expect(savedMemories[0]).toEqual({
        id: '1',
        live_event_id: '1',
        review: 'Updated review',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: expect.any(String),
        sync_status: 'updated',
      });
    });
  });

  describe('Data Deletion', () => {
    it('should delete artist and related data', async () => {
      const mockArtists = [
        {
          id: '1',
          name: 'Artist 1',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
          sync_status: 'synced',
        },
        {
          id: '2',
          name: 'Artist 2',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
          sync_status: 'synced',
        },
      ];

      const mockEvents = [
        {
          id: '1',
          title: 'Concert 1',
          artist_id: '1',
          date: '2023-12-25',
          venue_name: 'Venue 1',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
          sync_status: 'synced',
        },
      ];

      mockAsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify(mockArtists))
        .mockResolvedValueOnce(JSON.stringify(mockEvents))
        .mockResolvedValueOnce('[]'); // memories

      mockAsyncStorage.setItem.mockResolvedValue();

      await database.deleteArtist('1');

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'artists',
        JSON.stringify([mockArtists[1]])
      );
    });

    it('should delete live event', async () => {
      const mockEvents = [
        {
          id: '1',
          title: 'Concert 1',
          artist_id: '1',
          date: '2023-12-25',
          venue_name: 'Venue 1',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
          sync_status: 'synced',
        },
        {
          id: '2',
          title: 'Concert 2',
          artist_id: '1',
          date: '2023-12-26',
          venue_name: 'Venue 2',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
          sync_status: 'synced',
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockEvents));

      await database.deleteLiveEvent('1');

      // Verify setItem was called (deletion method filters out the deleted item)
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'live_events',
        expect.any(String)
      );
    });

    it('should delete memory', async () => {
      const mockMemories = [
        {
          id: '1',
          live_event_id: '1',
          review: 'Memory 1',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
          sync_status: 'synced',
        },
        {
          id: '2',
          live_event_id: '2',
          review: 'Memory 2',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
          sync_status: 'synced',
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockMemories));

      await database.deleteMemory('1');

      // Verify setItem was called (deletion method filters out the deleted item)
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'memories',
        expect.any(String)
      );
    });
  });

  // Error handling and edge case tests
  describe('Error handling and edge cases', () => {
    it('handles AsyncStorage errors in createArtist', async () => {
      // Mock AsyncStorage to throw error on setItem
      const mockSetItem = jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('Storage error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const artist = await database.createArtist({
        name: 'Test Artist',
      });
      
      // Should still create artist but log error
      expect(artist.name).toBe('Test Artist');
      expect(consoleSpy).toHaveBeenCalled();

      mockSetItem.mockRestore();
      consoleSpy.mockRestore();
    });

    it('handles AsyncStorage getItem errors', async () => {
      const mockGetItem = jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('Storage error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const artists = await database.getAllArtists();
      
      // Should return empty array when error occurs
      expect(artists).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();

      mockGetItem.mockRestore();
      consoleSpy.mockRestore();
    });

    it('handles JSON parse errors', async () => {
      const mockGetItem = jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce('invalid-json');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const artists = await database.getAllArtists();
      
      // Should return empty array when JSON parse fails
      expect(artists).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();

      mockGetItem.mockRestore();
      consoleSpy.mockRestore();
    });

    it('handles missing memory in getMemory', async () => {
      const result = await database.getMemory('999999');
      expect(result).toBeNull();
    });

    it('handles missing memory in getMemoryByLiveEventId', async () => {
      const result = await database.getMemoryByLiveEventId('999999');
      expect(result).toBeNull();
    });

    it('handles memory with missing event details', async () => {
      // Simply test that getMemoriesWithEventDetails doesn't crash with non-existent events
      const memories = await database.getMemoriesWithEventDetails();
      expect(Array.isArray(memories)).toBe(true);
    });

    it('handles date filtering in upcoming events', async () => {
      // Simply test that getUpcomingLiveEvents doesn't crash and returns an array
      const upcomingEvents = await database.getUpcomingLiveEvents();
      expect(Array.isArray(upcomingEvents)).toBe(true);
    });

    it('handles AsyncStorage errors during setItem operations', async () => {
      // Mock AsyncStorage setItem to fail
      const originalSetItem = AsyncStorage.setItem;
      const mockSetItem = jest.fn().mockRejectedValue(new Error('Storage error'));
      AsyncStorage.setItem = mockSetItem;
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Call setStoredData indirectly through createArtist which uses setStoredData internally
      try {
        await database.createArtist({ name: 'Test Artist' });
      } catch {
        // Expected to fail silently due to error handling in setStoredData
      }
      
      expect(consoleSpy).toHaveBeenCalled();

      // Restore original method
      AsyncStorage.setItem = originalSetItem;
      consoleSpy.mockRestore();
    });

    it('tests ID generation behavior', async () => {
      // This test indirectly tests the ID generation by causing storage errors during creation
      const mockGetItem = jest.spyOn(AsyncStorage, 'getItem')
        .mockRejectedValueOnce(new Error('Storage error'))
        .mockResolvedValueOnce(null); // Allow artist storage to work
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const artist = await database.createArtist({
        name: 'Test Artist',
      });

      // Should have created artist with UUID
      expect(artist.id).toBeDefined();
      expect(typeof artist.id).toBe('string');
      expect(consoleSpy).toHaveBeenCalledWith('Error getting stored data for artists:', expect.any(Error));

      mockGetItem.mockRestore();
      consoleSpy.mockRestore();
    });
  });
});
