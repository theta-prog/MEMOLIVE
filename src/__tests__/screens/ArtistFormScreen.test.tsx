import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useApp } from '../../context/AppContext';
import ArtistFormScreen from '../../screens/ArtistFormScreen';

// Mock the useApp hook
jest.mock('../../context/AppContext');
const mockUseApp = useApp as jest.MockedFunction<typeof useApp>;

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
  canGoBack: jest.fn(() => true),
};

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

const mockArtists = [
  {
    id: '1',
    name: '既存アーティスト',
    website: 'https://example.com',
    social_media: '@existing',
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
    sync_status: 'synced' as const,
  },
];

describe('ArtistFormScreen', () => {
  const mockAddArtist = jest.fn();
  const mockUpdateArtist = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApp.mockReturnValue({
      isSyncing: false,
      lastSyncAt: null,
      syncWithServer: jest.fn().mockResolvedValue({ success: true }),
      artists: mockArtists,
      liveEvents: [],
      upcomingEvents: [],
      addArtist: mockAddArtist,
      updateArtist: mockUpdateArtist,
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

  describe('新規アーティスト作成', () => {
    const newArtistRoute = { params: {} };

    it('新規アーティストフォームが正しく表示される', () => {
      const { getByText, getByTestId } = render(
        <ArtistFormScreen navigation={mockNavigation} route={newArtistRoute} />
      );

  expect(getByText('アーティスト追加')).toBeTruthy();
      expect(getByTestId('artist-name-input')).toBeTruthy();
      expect(getByTestId('artist-website-input')).toBeTruthy();
      expect(getByTestId('artist-social-input')).toBeTruthy();
    });

    it('フォーム入力が正しく動作する', () => {
      const { getByTestId } = render(
        <ArtistFormScreen navigation={mockNavigation} route={newArtistRoute} />
      );

      const nameInput = getByTestId('artist-name-input');
      const websiteInput = getByTestId('artist-website-input');
      const socialInput = getByTestId('artist-social-input');

      fireEvent.changeText(nameInput, '新しいアーティスト');
      fireEvent.changeText(websiteInput, 'https://newartist.com');
      fireEvent.changeText(socialInput, '@newartist');

      expect(nameInput.props.value).toBe('新しいアーティスト');
      expect(websiteInput.props.value).toBe('https://newartist.com');
      expect(socialInput.props.value).toBe('@newartist');
    });

    it('必須フィールドが空の場合エラーが表示される', async () => {
      const { getByText } = render(
        <ArtistFormScreen navigation={mockNavigation} route={newArtistRoute} />
      );

  const saveButton = getByText('追加');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'エラー',
          'アーティスト名は必須です'
        );
      });
    });

    it('正しいデータで保存できる', async () => {
  const { getByTestId, getByText } = render(
        <ArtistFormScreen navigation={mockNavigation} route={newArtistRoute} />
      );

      // フォームに入力
  fireEvent.changeText(getByTestId('artist-name-input'), '新しいアーティスト');
  fireEvent.changeText(getByTestId('artist-website-input'), 'https://newartist.com');
  fireEvent.changeText(getByTestId('artist-social-input'), '@newartist');

      // 保存ボタンを押す
  const saveButton = getByText('追加');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockAddArtist).toHaveBeenCalledWith({
          name: '新しいアーティスト',
          website: 'https://newartist.com',
          social_media: '@newartist',
        });
      });
    });
  });

  describe('既存アーティスト編集', () => {
    const editArtistRoute = { params: { artistId: '1' } };

    it('既存アーティストデータが正しく表示される', () => {
  const { getByText, getByTestId } = render(
        <ArtistFormScreen navigation={mockNavigation} route={editArtistRoute} />
      );

      expect(getByText('アーティスト編集')).toBeTruthy();
  expect(getByTestId('artist-name-input').props.value).toBe('既存アーティスト');
  expect(getByTestId('artist-website-input').props.value).toBe('https://example.com');
  expect(getByTestId('artist-social-input').props.value).toBe('@existing');
    });

    it('既存アーティストを更新できる', async () => {
  const { getByTestId, getByText } = render(
        <ArtistFormScreen navigation={mockNavigation} route={editArtistRoute} />
      );

      // 名前を変更
  const nameInput = getByTestId('artist-name-input');
      fireEvent.changeText(nameInput, '更新されたアーティスト');

      // 保存ボタンを押す
  const saveButton = getByText('更新');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockUpdateArtist).toHaveBeenCalledWith(
          '1',
          expect.objectContaining({
            name: '更新されたアーティスト',
          })
        );
      });
    });

    it('存在しないアーティストIDの場合エラーが表示される', () => {
      const invalidRoute = { params: { artistId: '999' } };

      const { getByText } = render(
        <ArtistFormScreen navigation={mockNavigation} route={invalidRoute} />
      );

      expect(getByText('アーティストが見つかりません')).toBeTruthy();
    });
  });

  describe('フォームバリデーション', () => {
    const newArtistRoute = { params: {} };

    it('無効なウェブサイトURLでエラーが表示される', async () => {
  const { getByTestId, getByText } = render(
        <ArtistFormScreen navigation={mockNavigation} route={newArtistRoute} />
      );

  fireEvent.changeText(getByTestId('artist-name-input'), '新しいアーティスト');
  fireEvent.changeText(getByTestId('artist-website-input'), '無効なURL');

  const saveButton = getByText('追加');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'エラー',
          expect.stringContaining('有効なURL')
        );
      });
    });

    it('空白のみの名前でエラーが表示される', async () => {
  const { getByTestId, getByText } = render(
        <ArtistFormScreen navigation={mockNavigation} route={newArtistRoute} />
      );

  fireEvent.changeText(getByTestId('artist-name-input'), '   ');

  const saveButton = getByText('追加');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'エラー',
          'アーティスト名は必須です'
        );
      });
    });

    it('重複するアーティスト名でエラーが表示される', async () => {
  const { getByTestId, getByText } = render(
        <ArtistFormScreen navigation={mockNavigation} route={newArtistRoute} />
      );

  fireEvent.changeText(getByTestId('artist-name-input'), '既存アーティスト');

  const saveButton = getByText('追加');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'エラー',
          'このアーティスト名は既に存在します'
        );
      });
    });
  });

  describe('UI インタラクション', () => {
    const newArtistRoute = { params: {} };

    it('キャンセルボタンで前の画面に戻る', () => {
      const { getByText } = render(
        <ArtistFormScreen navigation={mockNavigation} route={newArtistRoute} />
      );

      const cancelButton = getByText('キャンセル');
      fireEvent.press(cancelButton);

      expect(mockNavigation.goBack).toHaveBeenCalled();
    });

    it('オプションフィールドが正しく動作する', () => {
  const { getByTestId } = render(
        <ArtistFormScreen navigation={mockNavigation} route={newArtistRoute} />
      );

      // ウェブサイトとSNSは任意項目
  const websiteInput = getByTestId('artist-website-input');
  const socialInput = getByTestId('artist-social-input');

      expect(websiteInput).toBeTruthy();
      expect(socialInput).toBeTruthy();
    });

    it('入力フィールドのクリアが正しく動作する', () => {
  const { getByTestId } = render(
        <ArtistFormScreen navigation={mockNavigation} route={newArtistRoute} />
      );

  const nameInput = getByTestId('artist-name-input');
      
      fireEvent.changeText(nameInput, 'テスト');
      expect(nameInput.props.value).toBe('テスト');
      
      fireEvent.changeText(nameInput, '');
      expect(nameInput.props.value).toBe('');
    });
  });

  describe('エラーハンドリング', () => {
    const newArtistRoute = { params: {} };

    it('保存時のエラーを適切に処理する', async () => {
      const errorMessage = 'データベースエラー';
      mockAddArtist.mockRejectedValueOnce(new Error(errorMessage));

  const { getByTestId, getByText } = render(
        <ArtistFormScreen navigation={mockNavigation} route={newArtistRoute} />
      );

  fireEvent.changeText(getByTestId('artist-name-input'), '新しいアーティスト');

  const saveButton = getByText('追加');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'エラー',
          expect.stringContaining('保存に失敗')
        );
      });
    });

    it('ネットワークエラーを適切に処理する', async () => {
      mockAddArtist.mockRejectedValueOnce(new Error('Network Error'));

  const { getByTestId, getByText } = render(
        <ArtistFormScreen navigation={mockNavigation} route={newArtistRoute} />
      );

  fireEvent.changeText(getByTestId('artist-name-input'), '新しいアーティスト');

  const saveButton = getByText('追加');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'エラー',
          expect.stringContaining('保存に失敗')
        );
      });
    });
  });

  describe('ナビゲーション', () => {
    it('保存成功後に前の画面に戻る', async () => {
      const newArtistRoute = { params: {} };
      mockAddArtist.mockResolvedValueOnce({ id: '2', name: '新しいアーティスト' });

  const { getByTestId, getByText } = render(
        <ArtistFormScreen navigation={mockNavigation} route={newArtistRoute} />
      );

  fireEvent.changeText(getByTestId('artist-name-input'), '新しいアーティスト');

  const saveButton = getByText('追加');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockNavigation.goBack).toHaveBeenCalled();
      });
    });
  });
});
