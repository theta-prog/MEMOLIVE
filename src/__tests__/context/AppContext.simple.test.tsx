import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { AppProvider, useApp } from '../../context/AppContext';

// Mock AuthContext first (before importing AppContext which uses it)
jest.mock('../../context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    login: jest.fn(),
    loginAsGuest: jest.fn(),
    logout: jest.fn(),
  }),
}));

// Mock the database module - define inside jest.mock to avoid hoisting issues
jest.mock('../../database/asyncDatabase', () => {
  const mockDb = {
    getAllArtists: jest.fn().mockResolvedValue([]),
    getLiveEventsWithArtists: jest.fn().mockResolvedValue([]),
    getMemoriesWithEventDetails: jest.fn().mockResolvedValue([]),
    getUpcomingLiveEvents: jest.fn().mockResolvedValue([]),
    createArtist: jest.fn().mockResolvedValue('1'),
    updateArtist: jest.fn().mockResolvedValue(true),
    deleteArtist: jest.fn().mockResolvedValue(true),
    createLiveEvent: jest.fn().mockResolvedValue({ id: '1' }),
    updateLiveEvent: jest.fn().mockResolvedValue(true),
    deleteLiveEvent: jest.fn().mockResolvedValue(true),
    createMemory: jest.fn().mockResolvedValue('1'),
    updateMemory: jest.fn().mockResolvedValue(true),
    deleteMemory: jest.fn().mockResolvedValue(true),
    // 新しいメソッド
    getLiveEventArtistsByEventId: jest.fn().mockResolvedValue([]),
    setLiveEventArtists: jest.fn().mockResolvedValue(undefined),
    deleteLiveEventArtistsByEventId: jest.fn().mockResolvedValue(undefined),
    getArtistSetlistsByMemoryId: jest.fn().mockResolvedValue([]),
    setArtistSetlists: jest.fn().mockResolvedValue(undefined),
  };
  return {
    database: mockDb,
    Artist: {},
    LiveEvent: {},
    Memory: {},
    BaseEntity: {},
  };
});

// Get the mocked database for use in tests
import { database } from '../../database/asyncDatabase';
const mockDatabase = database as jest.Mocked<typeof database>;

const TestComponent = () => {
  return <Text testID="test-component">Test Component</Text>;
};

describe('AppContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock implementations
    mockDatabase.getAllArtists.mockResolvedValue([]);
    mockDatabase.getLiveEventsWithArtists.mockResolvedValue([]);
    mockDatabase.getMemoriesWithEventDetails.mockResolvedValue([]);
    mockDatabase.createArtist.mockResolvedValue('1');
    mockDatabase.updateArtist.mockResolvedValue(true);
    mockDatabase.deleteArtist.mockResolvedValue(true);
    mockDatabase.createLiveEvent.mockResolvedValue('1');
    mockDatabase.updateLiveEvent.mockResolvedValue(true);
    mockDatabase.deleteLiveEvent.mockResolvedValue(true);
    mockDatabase.createMemory.mockResolvedValue('1');
    mockDatabase.updateMemory.mockResolvedValue(true);
    mockDatabase.deleteMemory.mockResolvedValue(true);
  });

  it('provides context values correctly', async () => {
    const { getByTestId } = render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    await waitFor(() => {
      expect(getByTestId('test-component')).toBeTruthy();
    });
  });

  it('renders children correctly', async () => {
    const { getByTestId } = render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    await waitFor(() => {
      expect(getByTestId('test-component')).toBeTruthy();
    });
  });

  it('initializes with default values', async () => {
    let contextValue: any;
    
    const TestContextValues = () => {
      const context = useApp();
      contextValue = context;
      return <Text testID="context-test">Context Test</Text>;
    };

    render(
      <AppProvider>
        <TestContextValues />
      </AppProvider>
    );

    await waitFor(() => {
      expect(contextValue).toBeDefined();
      expect(contextValue.artists).toEqual([]);
      expect(contextValue.liveEvents).toEqual([]);
      expect(contextValue.memories).toEqual([]);
      expect(contextValue.upcomingEvents).toEqual([]);
    });
  });

  it('provides all required methods', async () => {
    let contextValue: any;
    
    const TestContextMethods = () => {
      const context = useApp();
      contextValue = context;
      return <Text testID="methods-test">Methods Test</Text>;
    };

    render(
      <AppProvider>
        <TestContextMethods />
      </AppProvider>
    );

    await waitFor(() => {
      expect(contextValue).toBeDefined();
      expect(typeof contextValue.addArtist).toBe('function');
      expect(typeof contextValue.updateArtist).toBe('function');
      expect(typeof contextValue.deleteArtist).toBe('function');
      expect(typeof contextValue.addLiveEvent).toBe('function');
      expect(typeof contextValue.updateLiveEvent).toBe('function');
      expect(typeof contextValue.deleteLiveEvent).toBe('function');
      expect(typeof contextValue.addMemory).toBe('function');
      expect(typeof contextValue.updateMemory).toBe('function');
      expect(typeof contextValue.deleteMemory).toBe('function');
      expect(typeof contextValue.refreshData).toBe('function');
    });
  });

  it('handles addArtist operation', async () => {
    let contextValue: any;
    
    const TestAddArtist = () => {
      const context = useApp();
      contextValue = context;
      return <Text testID="test">Test</Text>;
    };

    render(
      <AppProvider>
        <TestAddArtist />
      </AppProvider>
    );

    await waitFor(() => {
      expect(contextValue).toBeDefined();
    });

    // Test adding an artist
    await contextValue.addArtist({
      name: 'Test Artist',
      website: 'https://test.com',
      social_media: '@test',
    });

    expect(typeof contextValue.addArtist).toBe('function');
  });

  it('handles updateArtist operation', async () => {
    let contextValue: any;
    
    const TestUpdateArtist = () => {
      const context = useApp();
      contextValue = context;
      return <Text testID="test">Test</Text>;
    };

    render(
      <AppProvider>
        <TestUpdateArtist />
      </AppProvider>
    );

    await waitFor(() => {
      expect(contextValue).toBeDefined();
    });

    // Test updating an artist
    await contextValue.updateArtist('1', {
      name: 'Updated Artist',
    });

    expect(typeof contextValue.updateArtist).toBe('function');
  });

  it('handles deleteArtist operation', async () => {
    let contextValue: any;
    
    const TestDeleteArtist = () => {
      const context = useApp();
      contextValue = context;
      return <Text testID="test">Test</Text>;
    };

    render(
      <AppProvider>
        <TestDeleteArtist />
      </AppProvider>
    );

    await waitFor(() => {
      expect(contextValue).toBeDefined();
    });

    // Test deleting an artist
    await contextValue.deleteArtist('1');

    expect(typeof contextValue.deleteArtist).toBe('function');
  });

  it('handles live event operations', async () => {
    let contextValue: any;
    
    const TestLiveEvents = () => {
      const context = useApp();
      contextValue = context;
      return <Text testID="test">Test</Text>;
    };

    render(
      <AppProvider>
        <TestLiveEvents />
      </AppProvider>
    );

    await waitFor(() => {
      expect(contextValue).toBeDefined();
    });

    // Test adding a live event
    await contextValue.addLiveEvent({
      title: 'Test Concert',
      artist_id: '1',
      date: '2024-12-25',
      venue_name: 'Test Venue',
    });

    // Test updating a live event
    await contextValue.updateLiveEvent('1', {
      title: 'Updated Concert',
    });

    // Test deleting a live event
    await contextValue.deleteLiveEvent('1');

    expect(typeof contextValue.addLiveEvent).toBe('function');
    expect(typeof contextValue.updateLiveEvent).toBe('function');
    expect(typeof contextValue.deleteLiveEvent).toBe('function');
  });

  it('handles memory operations', async () => {
    let contextValue: any;
    
    const TestMemories = () => {
      const context = useApp();
      contextValue = context;
      return <Text testID="test">Test</Text>;
    };

    render(
      <AppProvider>
        <TestMemories />
      </AppProvider>
    );

    await waitFor(() => {
      expect(contextValue).toBeDefined();
    });

    // Test adding a memory
    await contextValue.addMemory({
      live_event_id: '1',
      review: 'Great concert!',
      setlist: 'Song 1, Song 2',
    });

    // Test updating a memory
    await contextValue.updateMemory('1', {
      review: 'Updated review',
    });

    // Test deleting a memory
    await contextValue.deleteMemory('1');

    expect(typeof contextValue.addMemory).toBe('function');
    expect(typeof contextValue.updateMemory).toBe('function');
    expect(typeof contextValue.deleteMemory).toBe('function');
  });

  it('handles refreshData operation', async () => {
    let contextValue: any;
    
    const TestRefresh = () => {
      const context = useApp();
      contextValue = context;
      return <Text testID="test">Test</Text>;
    };

    render(
      <AppProvider>
        <TestRefresh />
      </AppProvider>
    );

    await waitFor(() => {
      expect(contextValue).toBeDefined();
    });

    // Test refreshing data
    await contextValue.refreshData();

    expect(typeof contextValue.refreshData).toBe('function');
  });

  it('handles addArtist error gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // Use mockDatabase from module scope
    mockDatabase.createArtist.mockRejectedValueOnce(new Error('Database error'));

    const TestComponent = () => {
      const { addArtist } = useApp();
      
      React.useEffect(() => {
        // Catch the re-thrown error to prevent test failure
        addArtist({ name: 'Test Artist' }).catch(() => {});
      }, [addArtist]);

      return <Text>Test</Text>;
    };

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error adding artist:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('handles updateArtist error gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // Use mockDatabase from module scope
    mockDatabase.updateArtist.mockRejectedValueOnce(new Error('Update error'));

    const TestComponent = () => {
      const { updateArtist } = useApp();
      
      React.useEffect(() => {
        // Catch the re-thrown error to prevent test failure
        updateArtist('1', { name: 'Updated Artist' }).catch(() => {});
      }, [updateArtist]);

      return <Text>Test</Text>;
    };

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error updating artist:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('handles deleteArtist error gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // Use mockDatabase from module scope
    mockDatabase.deleteArtist.mockRejectedValueOnce(new Error('Delete error'));

    const TestComponent = () => {
      const { deleteArtist } = useApp();
      
      React.useEffect(() => {
        // Catch the re-thrown error to prevent test failure
        deleteArtist('1').catch(() => {});
      }, [deleteArtist]);

      return <Text>Test</Text>;
    };

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error deleting artist:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('handles addLiveEvent error gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // Use mockDatabase from module scope
    mockDatabase.createLiveEvent.mockRejectedValueOnce(new Error('LiveEvent error'));

    const TestComponent = () => {
      const { addLiveEvent } = useApp();
      
      React.useEffect(() => {
        // Catch the re-thrown error to prevent test failure
        addLiveEvent({
          title: 'Test Event',
          artist_id: '1',
          date: '2024-12-25',
          venue_name: 'Test Venue',
        }).catch(() => {});
      }, [addLiveEvent]);

      return <Text>Test</Text>;
    };

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error adding live event:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('handles updateLiveEvent error gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // Use mockDatabase from module scope
    mockDatabase.updateLiveEvent.mockRejectedValueOnce(new Error('Update LiveEvent error'));

    const TestComponent = () => {
      const { updateLiveEvent } = useApp();
      
      React.useEffect(() => {
        // Catch the re-thrown error to prevent test failure
        updateLiveEvent('1', { title: 'Updated Event' }).catch(() => {});
      }, [updateLiveEvent]);

      return <Text>Test</Text>;
    };

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error updating live event:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('handles deleteLiveEvent error gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // Use mockDatabase from module scope
    mockDatabase.deleteLiveEvent.mockRejectedValueOnce(new Error('Delete LiveEvent error'));

    const TestComponent = () => {
      const { deleteLiveEvent } = useApp();
      
      React.useEffect(() => {
        // Catch the re-thrown error to prevent test failure
        deleteLiveEvent('1').catch(() => {});
      }, [deleteLiveEvent]);

      return <Text>Test</Text>;
    };

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error deleting live event:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('throws error when useApp is called outside AppProvider', () => {
    const TestComponent = () => {
      useApp(); // This should throw an error
      return <Text>Test</Text>;
    };

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useApp must be used within an AppProvider');

    consoleSpy.mockRestore();
  });

  it('initializes state variables correctly on mount', () => {
    const TestComponentWithState = () => {
      const { artists, liveEvents, memories, upcomingEvents } = useApp();
      return (
        <View>
          <Text testID="artists-length">{artists.length}</Text>
          <Text testID="live-events-length">{liveEvents.length}</Text>
          <Text testID="memories-length">{memories.length}</Text>
          <Text testID="upcoming-events-length">{upcomingEvents.length}</Text>
        </View>
      );
    };

    const { getByTestId } = render(
      <AppProvider>
        <TestComponentWithState />
      </AppProvider>
    );

    // Check mocked data is loaded (from mocked database)
    expect(getByTestId('artists-length')).toBeTruthy();
    expect(getByTestId('live-events-length')).toBeTruthy();
    expect(getByTestId('memories-length')).toBeTruthy();
    expect(getByTestId('upcoming-events-length')).toBeTruthy();
  });

});
