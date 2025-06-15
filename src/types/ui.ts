export type ViewMode = 'file' | 'editor' | 'terminal' | 'forward';

export interface AppState {
  currentView: ViewMode;
  sidebarVisible: boolean;
  settingsVisible: boolean;
}