import { render } from '@testing-library/react-native';
import React from 'react';
import { useApp } from '../../context/AppContext';
import HomeScreen from '../../screens/HomeScreen';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock the useApp hook
jest.mock('../../context/AppContext');
const mockUseApp = useApp as jest.MockedFunction<typeof useApp>;

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

const TestApp = () => {
  const mockNavigation = { navigate: jest.fn() };
  return <HomeScreen navigation={mockNavigation} />;
};

describe('App Integration Tests', () => {
  const mockUpcomingEvents = [
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
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApp.mockReturnValue({
      isSyncing: false,
      lastSyncAt: null,
      syncWithServer: jest.fn().mockResolvedValue({ success: true }),
      artists: [],
      liveEvents: [],
      upcomingEvents: mockUpcomingEvents,
      addArtist: jest.fn(),
      updateArtist: jest.fn(),
      deleteArtist: jest.fn(),
      addLiveEvent: jest.fn(),
      updateLiveEvent: jest.fn(),
      deleteLiveEvent: jest.fn(),
      memories: [],
      addMemory: jest.fn(),
      updateMemory: jest.fn(),
      deleteMemory: jest.fn(),
      refreshData: jest.fn(),
    });
  });

  it('renders app without crashing', () => {
    const { getByText } = render(<TestApp />);
    expect(getByText('次のライブ')).toBeTruthy();
  });

  it('provides app context correctly', () => {
    const { getByText } = render(<TestApp />);
    // Just check that the app renders with context
    expect(getByText('次のライブ')).toBeTruthy();
  });
});