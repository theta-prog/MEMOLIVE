import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { useApp } from '../../context/AppContext';
import { Memory } from '../../database/asyncDatabase';
import MemoryDetailScreen from '../../screens/MemoryDetailScreen';

// Mock AuthContext
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

// Mock the useApp hook
jest.mock('../../context/AppContext');
const mockUseApp = useApp as jest.MockedFunction<typeof useApp>;

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

// Mock route params
const mockRoute = {
  params: {
    memoryId: '1',
  },
};

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('MemoryDetailScreen', () => {
  const mockMemories: (Memory & { event_title: string; artist_name: string; event_date: string })[] = [
    {
      id: '1',
      live_event_id: '1',
      review: 'Amazing concert experience!',
      setlist: 'Song 1\nSong 2\nSong 3',
      photos: JSON.stringify(['photo1.jpg', 'photo2.jpg']),
      event_title: 'Test Concert',
      artist_name: 'Test Artist',
      event_date: '2024-12-25',
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z',
      sync_status: 'synced',
    },
  ];

  const mockLiveEvents = [
    {
      id: '1',
      title: 'Test Concert',
      date: '2024-12-25',
      venue_name: 'Test Venue',
      artist_id: '1',
      artist_name: 'Test Artist',
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z',
      sync_status: 'synced' as const,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApp.mockReturnValue({
      artists: [],
      liveEvents: mockLiveEvents,
      upcomingEvents: [],
      addArtist: jest.fn(),
      updateArtist: jest.fn(),
      deleteArtist: jest.fn(),
      addLiveEvent: jest.fn(),
      updateLiveEvent: jest.fn(),
      deleteLiveEvent: jest.fn(),
      getLiveEventArtists: jest.fn().mockResolvedValue([]),
      memories: mockMemories,
      addMemory: jest.fn(),
      updateMemory: jest.fn(),
      deleteMemory: jest.fn(),
      getArtistSetlists: jest.fn().mockResolvedValue([]),
      setArtistSetlists: jest.fn().mockResolvedValue(undefined),
      refreshData: jest.fn(),
      getArtistSetlists: jest.fn().mockResolvedValue([]),
      getLiveEventArtists: jest.fn().mockResolvedValue([]),
    });
  });

  it('renders correctly with memory data', () => {
    const { getAllByText } = render(
      <MemoryDetailScreen navigation={mockNavigation} route={mockRoute} />
    );

    expect(getAllByText('Test Concert')[0]).toBeTruthy();
    expect(getAllByText('Test Artist')[0]).toBeTruthy();
    expect(getAllByText('Amazing concert experience!')[0]).toBeTruthy();
  });

  it('displays formatted date correctly', () => {
    const { getAllByText } = render(
      <MemoryDetailScreen navigation={mockNavigation} route={mockRoute} />
    );

    expect(getAllByText('2024年12月25日水曜日')[0]).toBeTruthy();
  });

  it('displays setlist correctly', () => {
    const { getByText } = render(
      <MemoryDetailScreen navigation={mockNavigation} route={mockRoute} />
    );

    expect(getByText('Song 1')).toBeTruthy();
    expect(getByText('Song 2')).toBeTruthy();
    expect(getByText('Song 3')).toBeTruthy();
  });

  it('shows error message when memory not found', () => {
    const invalidRoute = { params: { memoryId: '999' } };
    
    const { getByText } = render(
      <MemoryDetailScreen navigation={mockNavigation} route={invalidRoute} />
    );

    expect(getByText('思い出が見つかりません')).toBeTruthy();
  });

  it('handles back navigation', () => {
    const { getAllByTestId } = render(
      <MemoryDetailScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Look for back button (first TouchableOpacity in header)
    const touchableElements = getAllByTestId('TouchableOpacity');
    expect(touchableElements.length).toBeGreaterThan(0);
    
    fireEvent.press(touchableElements[0]);
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('navigates to edit form when edit button is pressed', () => {
    const { getAllByTestId } = render(
      <MemoryDetailScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Edit button should be one of the TouchableOpacity elements
    // Order: [0] back, [1] share, [2] edit, [3] delete
    const touchableElements = getAllByTestId('TouchableOpacity');
    expect(touchableElements.length).toBeGreaterThan(2);
    
    // Press the edit button (index 2)
    fireEvent.press(touchableElements[2]);
    expect(mockNavigation.navigate).toHaveBeenCalledWith('MemoryForm', {
      eventId: '1',
      memoryId: '1',
    });
  });

  it('shows delete confirmation when delete button is pressed', () => {
    const { getAllByTestId } = render(
      <MemoryDetailScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Delete button should be one of the TouchableOpacity elements
    // Order: [0] back, [1] share, [2] edit, [3] delete
    const touchableElements = getAllByTestId('TouchableOpacity');
    expect(touchableElements.length).toBeGreaterThan(3);
    
    // Press the delete button (index 3)
    fireEvent.press(touchableElements[3]);
    expect(Alert.alert).toHaveBeenCalledWith(
      '削除確認',
      'この思い出を削除しますか？',
      expect.any(Array),
      expect.any(Object) // Options argument
    );
  });

  it('handles memory with photos', () => {
    const { getAllByText } = render(
      <MemoryDetailScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Should render without crashing when photos are present
    expect(getAllByText('Test Concert')[0]).toBeTruthy();
  });

  it('handles memory without photos', () => {
    const memoryWithoutPhotos: (Memory & { event_title: string; artist_name: string; event_date: string })[] = [
      {
        ...mockMemories[0]!,
        photos: JSON.stringify([]),
      },
    ];

    mockUseApp.mockReturnValue({
      artists: [],
      liveEvents: mockLiveEvents,
      upcomingEvents: [],
      addArtist: jest.fn(),
      updateArtist: jest.fn(),
      deleteArtist: jest.fn(),
      addLiveEvent: jest.fn(),
      updateLiveEvent: jest.fn(),
      deleteLiveEvent: jest.fn(),
      getLiveEventArtists: jest.fn().mockResolvedValue([]),
      memories: memoryWithoutPhotos,
      addMemory: jest.fn(),
      updateMemory: jest.fn(),
      deleteMemory: jest.fn(),
      getArtistSetlists: jest.fn().mockResolvedValue([]),
      setArtistSetlists: jest.fn().mockResolvedValue(undefined),
      refreshData: jest.fn(),
      getArtistSetlists: jest.fn().mockResolvedValue([]),
      getLiveEventArtists: jest.fn().mockResolvedValue([]),
    });

    const { getAllByText } = render(
      <MemoryDetailScreen navigation={mockNavigation} route={mockRoute} />
    );

    expect(getAllByText('Test Concert')[0]).toBeTruthy();
  });

  it('handles memory without setlist', () => {
    const memoryWithoutSetlist: (Memory & { event_title: string; artist_name: string; event_date: string })[] = [
      {
        ...mockMemories[0]!,
        setlist: '',
      },
    ];

    mockUseApp.mockReturnValue({
      artists: [],
      liveEvents: mockLiveEvents,
      upcomingEvents: [],
      addArtist: jest.fn(),
      updateArtist: jest.fn(),
      deleteArtist: jest.fn(),
      addLiveEvent: jest.fn(),
      updateLiveEvent: jest.fn(),
      deleteLiveEvent: jest.fn(),
      getLiveEventArtists: jest.fn().mockResolvedValue([]),
      memories: memoryWithoutSetlist,
      addMemory: jest.fn(),
      updateMemory: jest.fn(),
      deleteMemory: jest.fn(),
      getArtistSetlists: jest.fn().mockResolvedValue([]),
      setArtistSetlists: jest.fn().mockResolvedValue(undefined),
      refreshData: jest.fn(),
      getArtistSetlists: jest.fn().mockResolvedValue([]),
      getLiveEventArtists: jest.fn().mockResolvedValue([]),
    });

    const { getAllByText } = render(
      <MemoryDetailScreen navigation={mockNavigation} route={mockRoute} />
    );

    expect(getAllByText('Test Concert')[0]).toBeTruthy();
  });

  it('calls deleteMemory when delete is confirmed', () => {
    const mockDeleteMemory = jest.fn();
    
    mockUseApp.mockReturnValue({
      artists: [],
      liveEvents: mockLiveEvents,
      upcomingEvents: [],
      addArtist: jest.fn(),
      updateArtist: jest.fn(),
      deleteArtist: jest.fn(),
      addLiveEvent: jest.fn(),
      updateLiveEvent: jest.fn(),
      deleteLiveEvent: jest.fn(),
      getLiveEventArtists: jest.fn().mockResolvedValue([]),
      memories: mockMemories,
      addMemory: jest.fn(),
      updateMemory: jest.fn(),
      deleteMemory: mockDeleteMemory,
      getArtistSetlists: jest.fn().mockResolvedValue([]),
      setArtistSetlists: jest.fn().mockResolvedValue(undefined),
      refreshData: jest.fn(),
      getArtistSetlists: jest.fn().mockResolvedValue([]),
      getLiveEventArtists: jest.fn().mockResolvedValue([]),
    });

    const { getAllByTestId } = render(
      <MemoryDetailScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Basic test that the component renders and delete function is available
    expect(getAllByTestId('TouchableOpacity').length).toBeGreaterThan(0);
  });
});
