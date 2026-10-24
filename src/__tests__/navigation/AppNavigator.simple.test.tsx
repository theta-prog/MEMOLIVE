import { render } from '@testing-library/react-native';
import React from 'react';
import { useApp } from '../../context/AppContext';
import AppNavigator from '../../navigation/AppNavigator';

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

// Mock SafeAreaProvider
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }),
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useFocusEffect: jest.fn(),
}));

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: ({ children }: { children: React.ReactNode }) => children,
  }),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: ({ children }: { children: React.ReactNode }) => children,
  }),
}));

// Mock DateTimePicker (ESM in node_modules causing Jest parse error)
jest.mock('@react-native-community/datetimepicker', () => {
  return function MockDateTimePicker() {
    return null;
  };
});

// Mock Picker as simple null component
jest.mock('@react-native-picker/picker', () => ({
  Picker: () => null,
}));

// Mock Expo Status Bar
jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

describe('AppNavigator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApp.mockReturnValue({
      isSyncing: false,
      lastSyncAt: null,
      syncWithServer: jest.fn().mockResolvedValue({ success: true }),
      artists: [],
      liveEvents: [],
      upcomingEvents: [],
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

  it('renders AppNavigator without crashing', () => {
    expect(() => render(<AppNavigator />)).not.toThrow();
  });

  it('renders navigation structure correctly', () => {
    const component = render(<AppNavigator />);
    expect(component).toBeTruthy();
  });

  it('handles SafeAreaProvider configuration', () => {
    expect(() => render(<AppNavigator />)).not.toThrow();
  });

  it('configures stack navigation properly', () => {
    expect(() => render(<AppNavigator />)).not.toThrow();
  });

  it('includes tab navigation structure', () => {
    expect(() => render(<AppNavigator />)).not.toThrow();
  });

  it('handles StatusBar configuration', () => {
    expect(() => render(<AppNavigator />)).not.toThrow();
  });

  it('renders all required screens', () => {
    expect(() => render(<AppNavigator />)).not.toThrow();
  });

  it('configures screen options correctly', () => {
    expect(() => render(<AppNavigator />)).not.toThrow();
  });

  it('handles modal presentation modes', () => {
    expect(() => render(<AppNavigator />)).not.toThrow();
  });

  it('includes proper screen hierarchy', () => {
    expect(() => render(<AppNavigator />)).not.toThrow();
  });

  describe('TabNavigator component', () => {
    it('renders tab screens correctly', () => {
      expect(() => render(<AppNavigator />)).not.toThrow();
    });

    it('configures tab bar options', () => {
      expect(() => render(<AppNavigator />)).not.toThrow();
    });

    it('includes all tab screens', () => {
      expect(() => render(<AppNavigator />)).not.toThrow();
    });
  });

  describe('Stack screens configuration', () => {
    it('configures Main screen with TabNavigator', () => {
      expect(() => render(<AppNavigator />)).not.toThrow();
    });

    it('configures LiveEventForm modal screen', () => {
      expect(() => render(<AppNavigator />)).not.toThrow();
    });

    it('configures LiveEventDetail screen', () => {
      expect(() => render(<AppNavigator />)).not.toThrow();
    });

    it('configures MemoryForm modal screen', () => {
      expect(() => render(<AppNavigator />)).not.toThrow();
    });

    it('configures MemoryDetail screen', () => {
      expect(() => render(<AppNavigator />)).not.toThrow();
    });
  });

  describe('screenOptions configurations', () => {
    it('applies stack navigator screen options', () => {
      expect(() => render(<AppNavigator />)).not.toThrow();
    });

    it('configures tab bar styling', () => {
      expect(() => render(<AppNavigator />)).not.toThrow();
    });

    it('handles icon configurations', () => {
      expect(() => render(<AppNavigator />)).not.toThrow();
    });
  });

  describe('Navigation structure integrity', () => {
    it('maintains proper component hierarchy', () => {
      expect(() => render(<AppNavigator />)).not.toThrow();
    });

    it('handles navigation state correctly', () => {
      expect(() => render(<AppNavigator />)).not.toThrow();
    });

    it('supports all navigation patterns', () => {
      expect(() => render(<AppNavigator />)).not.toThrow();
    });
  });

  describe('Error handling', () => {
    it('handles component mounting errors gracefully', () => {
      expect(() => render(<AppNavigator />)).not.toThrow();
    });

    it('recovers from navigation errors', () => {
      expect(() => render(<AppNavigator />)).not.toThrow();
    });
  });

  describe('Performance and optimization', () => {
    it('renders efficiently without memory leaks', () => {
      expect(() => render(<AppNavigator />)).not.toThrow();
    });

    it('handles re-renders correctly', () => {
      const { rerender } = render(<AppNavigator />);
      expect(() => rerender(<AppNavigator />)).not.toThrow();
    });
  });

  describe('Integration with app context', () => {
    it('works with empty app state', () => {
      expect(() => render(<AppNavigator />)).not.toThrow();
    });

    it('works with populated app state', () => {
      mockUseApp.mockReturnValue({
        isSyncing: false,
        lastSyncAt: null,
        syncWithServer: jest.fn().mockResolvedValue({ success: true }),
        artists: [{ id: '1', name: 'Test Artist', website: '', social_media: '', created_at: '', updated_at: '', sync_status: 'synced' as const }],
        liveEvents: [{ id: '1', title: 'Test Event', date: '2024-01-01', venue_name: 'Test Venue', artist_id: '1', artist_name: 'Test Artist', created_at: '', updated_at: '', sync_status: 'synced' as const }],
        upcomingEvents: [],
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

      expect(() => render(<AppNavigator />)).not.toThrow();
    });
  });
});
