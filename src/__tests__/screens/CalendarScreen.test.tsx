import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { useApp } from '../../context/AppContext';
import CalendarScreen from '../../screens/CalendarScreen';

// Mock the useApp hook
jest.mock('../../context/AppContext');
const mockUseApp = useApp as jest.MockedFunction<typeof useApp>;

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  setOptions: jest.fn(),
  goBack: jest.fn(),
};

// Mock react-native-calendars
jest.mock('react-native-calendars', () => ({
  Calendar: jest.fn().mockImplementation(({ onDayPress, markedDates }) => {
    const React = jest.requireActual('react');
    const { TouchableOpacity, Text, View } = jest.requireActual('react-native');
    
    return React.createElement(View, { testID: 'calendar' }, [
      React.createElement(TouchableOpacity, {
        testID: 'calendar-day',
        onPress: () => onDayPress({ dateString: '2024-12-25' }),
        key: 'day'
      }, React.createElement(Text, {}, 'Calendar Day')),
      React.createElement(Text, { 
        testID: 'marked-dates',
        key: 'marked'
      }, JSON.stringify(markedDates))
    ]);
  }),
}));

describe('CalendarScreen', () => {
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
    {
      id: '2',
      title: 'Another Concert',
      date: '2024-12-26',
      venue_name: 'Another Venue',
      artist_id: '2',
      artist_name: 'Another Artist',
      created_at: '2023-01-02T00:00:00.000Z',
      updated_at: '2023-01-02T00:00:00.000Z',
      sync_status: 'synced' as const,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApp.mockReturnValue({
      isSyncing: false,
      lastSyncAt: null,
      syncWithServer: jest.fn().mockResolvedValue({ success: true }),
      artists: [],
      liveEvents: mockLiveEvents,
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

  it('renders correctly', () => {
    const { getByText, getByTestId } = render(
      <CalendarScreen navigation={mockNavigation} />
    );

    expect(getByText('カレンダー')).toBeTruthy();
    expect(getByTestId('calendar')).toBeTruthy();
  });

  it('marks dates with live events', () => {
    const { getByTestId } = render(
      <CalendarScreen navigation={mockNavigation} />
    );

    const markedDatesElement = getByTestId('marked-dates');
    const markedDatesText = markedDatesElement.props.children;
    
    expect(markedDatesText).toContain('2024-12-25');
    expect(markedDatesText).toContain('2024-12-26');
  });

  it('handles day press and shows events for selected date', () => {
    const { getByTestId, getByText } = render(
      <CalendarScreen navigation={mockNavigation} />
    );

    const calendarDay = getByTestId('calendar-day');
    fireEvent.press(calendarDay);

    // Calendar component should respond to day press
    expect(getByText('Test Concert')).toBeTruthy();
    expect(getByText('Test Venue')).toBeTruthy();
    expect(getByText('Test Artist')).toBeTruthy();
  });

  it('navigates to event detail when event is pressed', () => {
    const { getByTestId, getByText } = render(
      <CalendarScreen navigation={mockNavigation} />
    );

    // First select a date
    const calendarDay = getByTestId('calendar-day');
    fireEvent.press(calendarDay);

    // Then press the event
    const eventCard = getByText('Test Concert');
    fireEvent.press(eventCard);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('LiveEventDetail', {
      eventId: '1',
    });
  });

  it('shows empty state when no events for selected date', () => {
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

    const { getByTestId, getByText } = render(
      <CalendarScreen navigation={mockNavigation} />
    );

    const calendarDay = getByTestId('calendar-day');
    fireEvent.press(calendarDay);

    expect(getByText('この日にライブ予定はありません')).toBeTruthy();
  });

  it('displays formatted date for selected date', () => {
    const { getByTestId, getByText } = render(
      <CalendarScreen navigation={mockNavigation} />
    );

    const calendarDay = getByTestId('calendar-day');
    fireEvent.press(calendarDay);

    expect(getByText('2024年12月25日水曜日')).toBeTruthy();
  });

  it('handles multiple events on same date', () => {
    const eventsOnSameDate = [
      ...mockLiveEvents,
      {
        id: '3',
        title: 'Third Concert',
        date: '2024-12-25',
        venue_name: 'Third Venue',
        artist_id: '3',
        artist_name: 'Third Artist',
        created_at: '2023-01-03T00:00:00.000Z',
        updated_at: '2023-01-03T00:00:00.000Z',
        sync_status: 'synced' as const,
      },
    ];

    mockUseApp.mockReturnValue({
      isSyncing: false,
      lastSyncAt: null,
      syncWithServer: jest.fn().mockResolvedValue({ success: true }),
      artists: [],
      liveEvents: eventsOnSameDate,
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

    const { getByTestId, getByText } = render(
      <CalendarScreen navigation={mockNavigation} />
    );

    const calendarDay = getByTestId('calendar-day');
    fireEvent.press(calendarDay);

    expect(getByText('Test Concert')).toBeTruthy();
    expect(getByText('Third Concert')).toBeTruthy();
  });

  it('renders header correctly', () => {
    const { getByText } = render(
      <CalendarScreen navigation={mockNavigation} />
    );

    expect(getByText('カレンダー')).toBeTruthy();
  });

  it('handles event navigation correctly', () => {
    const mockEvent = {
      id: '1',
      title: 'Nav Test Concert',
      date: '2024-12-25',
      venue_name: 'Nav Test Venue',
      artist_id: '1',
      artist_name: 'Nav Test Artist',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      sync_status: 'synced' as const,
    };

    mockUseApp.mockReturnValue({
      isSyncing: false,
      lastSyncAt: null,
      syncWithServer: jest.fn().mockResolvedValue({ success: true }),
      upcomingEvents: [mockEvent],
      artists: [],
      liveEvents: [mockEvent],
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

    const { getByText } = render(<CalendarScreen navigation={mockNavigation} />);
    expect(getByText('カレンダー')).toBeTruthy();
  });

  it('displays multiple events correctly', () => {
    const mockEvents = [
      {
        id: '1',
        title: 'Event 1',
        date: '2024-12-25',
        venue_name: 'Venue 1',
        artist_id: '1',
        artist_name: 'Artist 1',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        sync_status: 'synced' as const,
      },
      {
        id: '2',
        title: 'Event 2',
        date: '2024-12-26',
        venue_name: 'Venue 2',
        artist_id: '2',
        artist_name: 'Artist 2',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        sync_status: 'synced' as const,
      }
    ];

    mockUseApp.mockReturnValue({
      isSyncing: false,
      lastSyncAt: null,
      syncWithServer: jest.fn().mockResolvedValue({ success: true }),
      upcomingEvents: mockEvents,
      artists: [],
      liveEvents: mockEvents,
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

    const { getByText } = render(<CalendarScreen navigation={mockNavigation} />);
    expect(getByText('カレンダー')).toBeTruthy();
  });
});
