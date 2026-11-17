export type ThemeMode = 'dark' | 'light';

export interface NotificationSettings {
  newFromFollowing: boolean;
  likesAndSaves: boolean;
  weeklyDigest: boolean;
}

export interface UserSettings {
  theme: ThemeMode;
  defaultMuted: boolean;
  volume: number;
  enableNarration: boolean;
  showCaptions: boolean;
  defaultPlaybackRate: 1 | 1.25 | 1.5;
  notifications: NotificationSettings;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  theme: 'dark',
  defaultMuted: false,
  volume: 0.75,
  enableNarration: true,
  showCaptions: true,
  defaultPlaybackRate: 1,
  notifications: {
    newFromFollowing: true,
    likesAndSaves: true,
    weeklyDigest: false,
  },
};
