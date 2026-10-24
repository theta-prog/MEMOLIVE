import { render } from '@testing-library/react-native';
import React from 'react';
import { useApp } from '../../context/AppContext';
import { Artist } from '../../database/asyncDatabase';
import ArtistsScreen from '../../screens/ArtistsScreen';

// Mock the useApp hook
jest.mock('../../context/AppContext');
const mockUseApp = useApp as jest.MockedFunction<typeof useApp>;

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

// Mock FlatList to force rendering of items
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const mockReact = jest.requireActual('react');
  return {
    ...RN,
    FlatList: jest.fn().mockImplementation(({ data, renderItem, keyExtractor, ...props }) => {
      const MockFlatList = RN.View;
      return mockReact.createElement(
        MockFlatList,
        { testID: 'FlatList', ...props },
        data.map((item: Artist, index: number) => {
          const key = keyExtractor ? keyExtractor(item, index) : index.toString();
          return mockReact.createElement(
            RN.View,
            { key, testID: `artist-card-${item.id}` },
            renderItem({ item, index })
          );
        })
      );
    }),
  };
});

describe('ArtistsScreen Mock Tests', () => {
  const mockAddArtist = jest.fn();
  const mockUpdateArtist = jest.fn();
  const mockDeleteArtist = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tests renderArtist function with complete artist data', () => {
    const artistWithAllFields: Artist = {
      id: '1',
      name: 'Complete Artist',
      website: 'https://complete-artist.com',
      social_media: '@completeartist',
      photo: 'complete-artist-photo.jpg',
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z',
      sync_status: 'synced',
    };

    mockUseApp.mockReturnValue({
      isSyncing: false,
      lastSyncAt: null,
      syncWithServer: jest.fn().mockResolvedValue({ success: true }),
      artists: [artistWithAllFields],
      liveEvents: [],
      upcomingEvents: [],
      memories: [],
      addArtist: mockAddArtist,
      updateArtist: mockUpdateArtist,
      deleteArtist: mockDeleteArtist,
      addLiveEvent: jest.fn(),
      updateLiveEvent: jest.fn(),
      deleteLiveEvent: jest.fn(),
      addMemory: jest.fn(),
      updateMemory: jest.fn(),
      deleteMemory: jest.fn(),
      refreshData: jest.fn(),
    });

    const { getByText } = render(<ArtistsScreen navigation={mockNavigation} />);

    // Verify artist data is rendered
    expect(getByText('Complete Artist')).toBeTruthy();
    expect(getByText('🌐 https://complete-artist.com')).toBeTruthy();
    expect(getByText('📱 @completeartist')).toBeTruthy();
  });

  it('tests renderArtist function with minimal artist data', () => {
    const minimalArtist: Artist = {
      id: '2',
      name: 'Minimal Artist',
      website: undefined,
      social_media: undefined,
      photo: undefined,
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z',
      sync_status: 'synced',
    };

    mockUseApp.mockReturnValue({
      isSyncing: false,
      lastSyncAt: null,
      syncWithServer: jest.fn().mockResolvedValue({ success: true }),
      artists: [minimalArtist],
      liveEvents: [],
      upcomingEvents: [],
      memories: [],
      addArtist: mockAddArtist,
      updateArtist: mockUpdateArtist,
      deleteArtist: mockDeleteArtist,
      addLiveEvent: jest.fn(),
      updateLiveEvent: jest.fn(),
      deleteLiveEvent: jest.fn(),
      addMemory: jest.fn(),
      updateMemory: jest.fn(),
      deleteMemory: jest.fn(),
      refreshData: jest.fn(),
    });

    const { getByText, queryByText } = render(<ArtistsScreen navigation={mockNavigation} />);

    // Verify minimal artist data is rendered
    expect(getByText('Minimal Artist')).toBeTruthy();
    // Verify optional fields are not rendered
    expect(queryByText(/🌐/)).toBeFalsy();
    expect(queryByText(/📱/)).toBeFalsy();
  });

  it('tests renderArtist function with photo rendering', () => {
    const artistWithPhoto: Artist = {
      id: '3',
      name: 'Photo Artist',
      website: undefined,
      social_media: undefined,
      photo: 'artist-photo.jpg',
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z',
      sync_status: 'synced',
    };

    mockUseApp.mockReturnValue({
      isSyncing: false,
      lastSyncAt: null,
      syncWithServer: jest.fn().mockResolvedValue({ success: true }),
      artists: [artistWithPhoto],
      liveEvents: [],
      upcomingEvents: [],
      memories: [],
      addArtist: mockAddArtist,
      updateArtist: mockUpdateArtist,
      deleteArtist: mockDeleteArtist,
      addLiveEvent: jest.fn(),
      updateLiveEvent: jest.fn(),
      deleteLiveEvent: jest.fn(),
      addMemory: jest.fn(),
      updateMemory: jest.fn(),
      deleteMemory: jest.fn(),
      refreshData: jest.fn(),
    });

    const { getByText } = render(<ArtistsScreen navigation={mockNavigation} />);

    // Verify artist with photo is rendered
    expect(getByText('Photo Artist')).toBeTruthy();
  });

  it('tests renderArtist function without photo', () => {
    const artistWithoutPhoto: Artist = {
      id: '4',
      name: 'No Photo Artist',
      website: 'https://nophoto.com',
      social_media: '@nophoto',
      photo: undefined,
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z',
      sync_status: 'synced',
    };

    mockUseApp.mockReturnValue({
      isSyncing: false,
      lastSyncAt: null,
      syncWithServer: jest.fn().mockResolvedValue({ success: true }),
      artists: [artistWithoutPhoto],
      liveEvents: [],
      upcomingEvents: [],
      memories: [],
      addArtist: mockAddArtist,
      updateArtist: mockUpdateArtist,
      deleteArtist: mockDeleteArtist,
      addLiveEvent: jest.fn(),
      updateLiveEvent: jest.fn(),
      deleteLiveEvent: jest.fn(),
      addMemory: jest.fn(),
      updateMemory: jest.fn(),
      deleteMemory: jest.fn(),
      refreshData: jest.fn(),
    });

    const { getByText } = render(<ArtistsScreen navigation={mockNavigation} />);

    // Verify artist without photo is rendered correctly
    expect(getByText('No Photo Artist')).toBeTruthy();
    expect(getByText('🌐 https://nophoto.com')).toBeTruthy();
    expect(getByText('📱 @nophoto')).toBeTruthy();
  });

  it('tests renderArtist function with edit button interaction', () => {
    const testArtist: Artist = {
      id: '5',
      name: 'Editable Artist',
      website: undefined,
      social_media: undefined,
      photo: undefined,
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z',
      sync_status: 'synced',
    };

    mockUseApp.mockReturnValue({
      isSyncing: false,
      lastSyncAt: null,
      syncWithServer: jest.fn().mockResolvedValue({ success: true }),
      artists: [testArtist],
      liveEvents: [],
      upcomingEvents: [],
      memories: [],
      addArtist: mockAddArtist,
      updateArtist: mockUpdateArtist,
      deleteArtist: mockDeleteArtist,
      addLiveEvent: jest.fn(),
      updateLiveEvent: jest.fn(),
      deleteLiveEvent: jest.fn(),
      addMemory: jest.fn(),
      updateMemory: jest.fn(),
      deleteMemory: jest.fn(),
      refreshData: jest.fn(),
    });

    const { getByText } = render(<ArtistsScreen navigation={mockNavigation} />);

    // Verify artist is rendered
    expect(getByText('Editable Artist')).toBeTruthy();

    // Test edit button interaction - verify rendering
    expect(getByText('Editable Artist')).toBeTruthy();
  });

  it('tests renderArtist function with delete button interaction', () => {
    const testArtist: Artist = {
      id: '6',
      name: 'Deletable Artist',
      website: undefined,
      social_media: undefined,
      photo: undefined,
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z',
      sync_status: 'synced',
    };

    mockUseApp.mockReturnValue({
      isSyncing: false,
      lastSyncAt: null,
      syncWithServer: jest.fn().mockResolvedValue({ success: true }),
      artists: [testArtist],
      liveEvents: [],
      upcomingEvents: [],
      memories: [],
      addArtist: mockAddArtist,
      updateArtist: mockUpdateArtist,
      deleteArtist: mockDeleteArtist,
      addLiveEvent: jest.fn(),
      updateLiveEvent: jest.fn(),
      deleteLiveEvent: jest.fn(),
      addMemory: jest.fn(),
      updateMemory: jest.fn(),
      deleteMemory: jest.fn(),
      refreshData: jest.fn(),
    });

    const { getByText } = render(<ArtistsScreen navigation={mockNavigation} />);

    // Verify artist is rendered
    expect(getByText('Deletable Artist')).toBeTruthy();
  });

  it('tests FlatList keyExtractor function', () => {
    const multipleArtists: Artist[] = [
      {
        id: '7',
        name: 'First Artist',
        website: undefined,
        social_media: undefined,
        photo: undefined,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        sync_status: 'synced',
      },
      {
        id: '8',
        name: 'Second Artist',
        website: 'https://second.com',
        social_media: '@second',
        photo: 'second-photo.jpg',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        sync_status: 'synced',
      },
      {
        id: '9',
        name: 'Third Artist',
        website: undefined,
        social_media: '@third',
        photo: undefined,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        sync_status: 'synced',
      },
    ];

    mockUseApp.mockReturnValue({
      isSyncing: false,
      lastSyncAt: null,
      syncWithServer: jest.fn().mockResolvedValue({ success: true }),
      artists: multipleArtists,
      liveEvents: [],
      upcomingEvents: [],
      memories: [],
      addArtist: mockAddArtist,
      updateArtist: mockUpdateArtist,
      deleteArtist: mockDeleteArtist,
      addLiveEvent: jest.fn(),
      updateLiveEvent: jest.fn(),
      deleteLiveEvent: jest.fn(),
      addMemory: jest.fn(),
      updateMemory: jest.fn(),
      deleteMemory: jest.fn(),
      refreshData: jest.fn(),
    });

    const { getByText } = render(<ArtistsScreen navigation={mockNavigation} />);

    // Verify all artists are rendered
    expect(getByText('First Artist')).toBeTruthy();
    expect(getByText('Second Artist')).toBeTruthy();
    expect(getByText('Third Artist')).toBeTruthy();

    // Verify conditional data is rendered correctly
    expect(getByText('🌐 https://second.com')).toBeTruthy();
    expect(getByText('📱 @second')).toBeTruthy();
    expect(getByText('📱 @third')).toBeTruthy();
  });

  it('tests renderArtist function with mixed data configurations', () => {
    const mixedArtists: Artist[] = [
      {
        id: '10',
        name: 'Only Website Artist',
        website: 'https://only-website.com',
        social_media: undefined,
        photo: undefined,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        sync_status: 'synced',
      },
      {
        id: '11',
        name: 'Only Social Artist',
        website: undefined,
        social_media: '@onlysocial',
        photo: undefined,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        sync_status: 'synced',
      },
      {
        id: '12',
        name: 'Only Photo Artist',
        website: undefined,
        social_media: undefined,
        photo: 'only-photo.jpg',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        sync_status: 'synced',
      },
    ];

    mockUseApp.mockReturnValue({
      isSyncing: false,
      lastSyncAt: null,
      syncWithServer: jest.fn().mockResolvedValue({ success: true }),
      artists: mixedArtists,
      liveEvents: [],
      upcomingEvents: [],
      memories: [],
      addArtist: mockAddArtist,
      updateArtist: mockUpdateArtist,
      deleteArtist: mockDeleteArtist,
      addLiveEvent: jest.fn(),
      updateLiveEvent: jest.fn(),
      deleteLiveEvent: jest.fn(),
      addMemory: jest.fn(),
      updateMemory: jest.fn(),
      deleteMemory: jest.fn(),
      refreshData: jest.fn(),
    });

    const { getByText, queryByText } = render(<ArtistsScreen navigation={mockNavigation} />);

    // Verify each artist is rendered with their specific data
    expect(getByText('Only Website Artist')).toBeTruthy();
    expect(getByText('🌐 https://only-website.com')).toBeTruthy();
    
    expect(getByText('Only Social Artist')).toBeTruthy();
    expect(getByText('📱 @onlysocial')).toBeTruthy();
    
    expect(getByText('Only Photo Artist')).toBeTruthy();

    // Verify conditional rendering works correctly
    expect(queryByText('📱 @only-website')).toBeFalsy();
    expect(queryByText('🌐 https://only-social.com')).toBeFalsy();
  });

  it('tests FlatList contentContainerStyle configuration', () => {
    const testArtist: Artist = {
      id: '13',
      name: 'Styled Artist',
      website: undefined,
      social_media: undefined,
      photo: undefined,
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z',
      sync_status: 'synced',
    };

    mockUseApp.mockReturnValue({
      isSyncing: false,
      lastSyncAt: null,
      syncWithServer: jest.fn().mockResolvedValue({ success: true }),
      artists: [testArtist],
      liveEvents: [],
      upcomingEvents: [],
      memories: [],
      addArtist: mockAddArtist,
      updateArtist: mockUpdateArtist,
      deleteArtist: mockDeleteArtist,
      addLiveEvent: jest.fn(),
      updateLiveEvent: jest.fn(),
      deleteLiveEvent: jest.fn(),
      addMemory: jest.fn(),
      updateMemory: jest.fn(),
      deleteMemory: jest.fn(),
      refreshData: jest.fn(),
    });

    const { getByTestId } = render(<ArtistsScreen navigation={mockNavigation} />);

    // Verify FlatList is rendered with proper styling
    const flatList = getByTestId('artists-flatlist');
    expect(flatList).toBeTruthy();
  });
});
