import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { useApp } from '../../context/AppContext';
import MemoriesScreen from '../../screens/MemoriesScreen';

// Mock the useApp hook
jest.mock('../../context/AppContext');
const mockUseApp = useApp as jest.MockedFunction<typeof useApp>;

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
};

describe('MemoriesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApp.mockReturnValue({
      isSyncing: false,
      lastSyncAt: null,
      syncWithServer: jest.fn().mockResolvedValue({ success: true }),
      artists: [],
      liveEvents: [],
      upcomingEvents: [],
      memories: [],
      addArtist: jest.fn(),
      updateArtist: jest.fn(),
      deleteArtist: jest.fn(),
      addLiveEvent: jest.fn(),
      updateLiveEvent: jest.fn(),
      deleteLiveEvent: jest.fn(),
      addMemory: jest.fn(),
      updateMemory: jest.fn(),
      deleteMemory: jest.fn(),
      refreshData: jest.fn(),
    });
  });

  it('renders basic screen structure', () => {
    const { getByText } = render(<MemoriesScreen navigation={mockNavigation} />);
    expect(getByText('思い出')).toBeTruthy();
  });

  it('calls navigation.navigate when add button is pressed', () => {
    const { getByTestId } = render(<MemoriesScreen navigation={mockNavigation} />);
    const addButton = getByTestId('add-memory-button');
    
    fireEvent.press(addButton);
    expect(mockNavigation.navigate).toHaveBeenCalledWith('MemoryForm');
  });

  it('renders basic screen components', () => {
    const { getByTestId, getAllByTestId } = render(<MemoriesScreen navigation={mockNavigation} />);
    
    // ScrollViewの存在を確認
    const scrollView = getByTestId('ScrollView');
    expect(scrollView).toBeTruthy();
    
    // 基本的なView要素の存在を確認
    const views = getAllByTestId('View');
    expect(views.length).toBeGreaterThan(0);
  });
});
