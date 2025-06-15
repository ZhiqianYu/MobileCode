import { useState } from 'react';
import { ViewMode } from '../types/ui';

export interface AppState {
  currentView: ViewMode;
  sidebarVisible: boolean;
  settingsVisible: boolean;
}

export const useAppState = () => {
  const [state, setState] = useState<AppState>({
    currentView: 'terminal',
    sidebarVisible: false,
    settingsVisible: false,
  });

  const setCurrentView = (view: ViewMode) => {
    setState(prev => ({ ...prev, currentView: view }));
  };

  const toggleSidebar = () => {
    setState(prev => ({ ...prev, sidebarVisible: !prev.sidebarVisible }));
  };

  const toggleSettings = () => {
    setState(prev => ({ ...prev, settingsVisible: !prev.settingsVisible }));
  };

  return {
    state,
    setCurrentView,
    toggleSidebar,
    toggleSettings,
  };
};