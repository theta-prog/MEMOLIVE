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
  setOptions: jest.fn(),
  goBack: jest.fn(),
};

// Mock FlatList to force renderItem execution
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  
  const MockedFlatList = ({ data, renderItem, keyExtractor }: any) => {
    return (
      <RN.View testID="mocked-flatlist">
        {data && data.map((item: any, index: number) => {
          const key = keyExtractor ? keyExtractor(item, index) : index;
          return (
            <RN.View key={key} testID={`flatlist-item-${key}`}>
              {renderItem({ item, index })}
            </RN.View>
          );
        })}
      </RN.View>
    );
  };
  
  RN.FlatList = MockedFlatList;

  return RN;
});

describe('MemoriesScreen Function Coverage Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('executes formatDate and renderMemory through FlatList mock', () => {
    const memoryData = {
      id: '1',
      live_event_id: '1',
      review: 'Test review for function execution',
      setlist: 'Test setlist for function execution',
      photos: JSON.stringify(['photo1.jpg', 'photo2.jpg']),
      event_title: 'Function Test Event',
      artist_name: 'Function Test Artist',
      event_date: '2024-01-15',
      created_at: '2024-01-15T00:00:00.000Z',
      updated_at: '2024-01-15T00:00:00.000Z',
      sync_status: 'synced' as const,
    };

    mockUseApp.mockReturnValue({
      isSyncing: false,
      lastSyncAt: null,
      syncWithServer: jest.fn().mockResolvedValue({ success: true }),
      memories: [memoryData],
      artists: [],
      liveEvents: [],
      upcomingEvents: [],
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

    const { getByTestId } = render(<MemoriesScreen navigation={mockNavigation} />);
    
    // Mock された FlatList が実行されることを確認
    expect(getByTestId('mocked-flatlist')).toBeTruthy();
    
    // FlatList item が生成されることを確認
    expect(getByTestId('flatlist-item-1')).toBeTruthy();
    
    // Memory card をクリック
    const memoryCard = getByTestId('memory-card-1');
    fireEvent.press(memoryCard);
    
    expect(mockNavigation.navigate).toHaveBeenCalledWith('MemoryDetail', { memoryId: '1' });
  });

  it('executes formatDate with different date formats through mock', () => {
    const dates = ['2024-01-01', '2024-06-15', '2024-12-31'];
    
    dates.forEach((date, index) => {
      const memoryData = {
        id: (index + 1).toString(),
        live_event_id: (index + 1).toString(),
        review: `Date test ${date}`,
        setlist: `Setlist ${date}`,
        photos: JSON.stringify([`photo-${date}.jpg`]),
        event_title: `Event ${date}`,
        artist_name: `Artist ${date}`,
        event_date: date,
        created_at: `${date}T00:00:00.000Z`,
        updated_at: `${date}T00:00:00.000Z`,
        sync_status: 'synced' as const,
      };

      mockUseApp.mockReturnValue({
        isSyncing: false,
        lastSyncAt: null,
        syncWithServer: jest.fn().mockResolvedValue({ success: true }),
        memories: [memoryData],
        artists: [],
        liveEvents: [],
        upcomingEvents: [],
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

      const { getByTestId, unmount } = render(<MemoriesScreen navigation={mockNavigation} />);
      
      // formatDate が実行されるパスを通る
      expect(getByTestId('mocked-flatlist')).toBeTruthy();
      expect(getByTestId(`flatlist-item-${index + 1}`)).toBeTruthy();
      
      unmount();
    });
  });

  it('executes renderMemory with photos JSON parsing through mock', () => {
    const photosTestCases = [
      {
        name: 'valid photos array',
        photos: JSON.stringify(['photo1.jpg', 'photo2.jpg', 'photo3.jpg']),
      },
      {
        name: 'empty photos array',
        photos: JSON.stringify([]),
      },
      {
        name: 'null photos',
        photos: undefined,
      },
      {
        name: 'invalid JSON photos',
        photos: 'invalid json string',
      }
    ];

    photosTestCases.forEach((testCase, index) => {
      const memoryData = {
        id: (index + 1).toString(),
        live_event_id: (index + 1).toString(),
        review: `Test ${testCase.name}`,
        setlist: `Setlist ${testCase.name}`,
        photos: testCase.photos,
        event_title: `Event ${testCase.name}`,
        artist_name: `Artist ${testCase.name}`,
        event_date: '2024-01-15',
        created_at: '2024-01-15T00:00:00.000Z',
        updated_at: '2024-01-15T00:00:00.000Z',
        sync_status: 'synced' as const,
      };

      mockUseApp.mockReturnValue({
        isSyncing: false,
        lastSyncAt: null,
        syncWithServer: jest.fn().mockResolvedValue({ success: true }),
        memories: [memoryData],
        artists: [],
        liveEvents: [],
        upcomingEvents: [],
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

      // Invalid JSON の場合はエラーが起きる可能性があるが、コンポーネントは壊れないことを確認
      expect(() => {
        const { getByTestId, unmount } = render(<MemoriesScreen navigation={mockNavigation} />);
        expect(getByTestId('mocked-flatlist')).toBeTruthy();
        expect(getByTestId(`flatlist-item-${index + 1}`)).toBeTruthy();
        unmount();
      }).not.toThrow();
    });
  });

  it('executes renderMemory with conditional rendering logic through mock', () => {
    const conditionalTestCases = [
      {
        name: 'with review and setlist',
        review: 'Amazing concert with great songs!',
        setlist: 'Song 1, Song 2, Song 3, Encore',
      },
      {
        name: 'without review',
        review: undefined,
        setlist: 'Song 1, Song 2, Song 3',
      },
      {
        name: 'without setlist',
        review: 'Great concert!',
        setlist: undefined,
      },
      {
        name: 'without review and setlist',
        review: undefined,
        setlist: undefined,
      }
    ];

    conditionalTestCases.forEach((testCase, index) => {
      const memoryData = {
        id: (index + 1).toString(),
        live_event_id: (index + 1).toString(),
        review: testCase.review,
        setlist: testCase.setlist,
        photos: JSON.stringify(['photo.jpg']),
        event_title: `Event ${testCase.name}`,
        artist_name: `Artist ${testCase.name}`,
        event_date: '2024-01-15',
        created_at: '2024-01-15T00:00:00.000Z',
        updated_at: '2024-01-15T00:00:00.000Z',
        sync_status: 'synced' as const,
      };

      mockUseApp.mockReturnValue({
        isSyncing: false,
        lastSyncAt: null,
        syncWithServer: jest.fn().mockResolvedValue({ success: true }),
        memories: [memoryData],
        artists: [],
        liveEvents: [],
        upcomingEvents: [],
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

      const { getByTestId, unmount } = render(<MemoriesScreen navigation={mockNavigation} />);
      
      // 条件分岐が実行されることを確認
      expect(getByTestId('mocked-flatlist')).toBeTruthy();
      expect(getByTestId(`flatlist-item-${index + 1}`)).toBeTruthy();
      
      unmount();
    });
  });

  it('executes multiple memories with different data through mock', () => {
    const multipleMemories = [
      {
        id: '1',
        live_event_id: '1',
        review: 'First memory with photos',
        setlist: 'First setlist',
        photos: JSON.stringify(['photo1.jpg', 'photo2.jpg']),
        event_title: 'First Event',
        artist_name: 'First Artist',
        event_date: '2024-01-01',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        sync_status: 'synced' as const,
      },
      {
        id: '2',
        live_event_id: '2',
        review: undefined,
        setlist: undefined,
        photos: undefined,
        event_title: 'Second Event',
        artist_name: 'Second Artist',
        event_date: '2024-02-01',
        created_at: '2024-02-01T00:00:00.000Z',
        updated_at: '2024-02-01T00:00:00.000Z',
        sync_status: 'synced' as const,
      },
      {
        id: '3',
        live_event_id: '3',
        review: 'Third memory with invalid photos',
        setlist: 'Third setlist',
        photos: 'invalid json string',
        event_title: 'Third Event',
        artist_name: 'Third Artist',
        event_date: '2024-03-01',
        created_at: '2024-03-01T00:00:00.000Z',
        updated_at: '2024-03-01T00:00:00.000Z',
        sync_status: 'synced' as const,
      }
    ];

    mockUseApp.mockReturnValue({
      isSyncing: false,
      lastSyncAt: null,
      syncWithServer: jest.fn().mockResolvedValue({ success: true }),
      memories: multipleMemories,
      artists: [],
      liveEvents: [],
      upcomingEvents: [],
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

    const { getByTestId } = render(<MemoriesScreen navigation={mockNavigation} />);
    
    // 複数のメモリーが処理されることを確認
    expect(getByTestId('mocked-flatlist')).toBeTruthy();
    expect(getByTestId('flatlist-item-1')).toBeTruthy();
    expect(getByTestId('flatlist-item-2')).toBeTruthy();
    expect(getByTestId('flatlist-item-3')).toBeTruthy();
    
    // 各メモリーカードをクリック
    ['1', '2', '3'].forEach(id => {
      const memoryCard = getByTestId(`memory-card-${id}`);
      fireEvent.press(memoryCard);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('MemoryDetail', { memoryId: id });
    });
  });
});
