import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { useApp } from '../../context/AppContext';
import ArtistsScreen from '../../screens/ArtistsScreen';

// Mock the useApp hook
jest.mock('../../context/AppContext');
const mockUseApp = useApp as jest.MockedFunction<typeof useApp>;

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

describe('ArtistsScreen Alert Tests (navigation-based)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('「+」ボタン押下で ArtistForm 遷移を呼ぶ（バリデーションはArtistFormで別途検証）', () => {
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

    const { getByTestId } = render(<ArtistsScreen navigation={mockNavigation} />);
    fireEvent.press(getByTestId('add-artist-button'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('ArtistForm');
  });
});
