// src/contexts/SettingsContext.tsx
// 功能：管理全局应用设置状态
// 依赖：AsyncStorage
// 被使用：MainContainer, CleanDrawerSettings

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_STORAGE_KEY = '@app_settings';

export interface AppSettings {
  // 外观设置
  darkMode: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  theme: 'dark' | 'blue' | 'purple' | 'orange';
  fullScreen: boolean; // 新增全屏设置
  
  // 终端设置
  terminalBell: boolean;
  showPing: boolean;
  
  // 连接设置
  autoConnect: boolean;
}

// 默认设置
const DEFAULT_SETTINGS: AppSettings = {
  darkMode: true,
  fontSize: 'medium',
  theme: 'dark',
  fullScreen: false,
  terminalBell: false,
  showPing: true,
  autoConnect: true,
};

interface SettingsContextState {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  resetSettings: () => Promise<void>;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextState | null>(null);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // 保存设置到存储
  const saveSettingsToStorage = async (newSettings: AppSettings) => {
    try {
      const jsonValue = JSON.stringify(newSettings);
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, jsonValue);
    } catch (error) {
      throw error;
    }
  };

  // 从存储加载设置
  const loadSettingsFromStorage = async () => {
    try {
      setIsLoading(true);
      
      const jsonValue = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      
      if (jsonValue != null) {
        const loadedSettings: AppSettings = JSON.parse(jsonValue);
        // 合并默认设置，确保新增的设置项有默认值
        const mergedSettings = { ...DEFAULT_SETTINGS, ...loadedSettings };
        setSettings(mergedSettings);
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (error) {
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  };

  // 更新单个设置
  const updateSetting = async <K extends keyof AppSettings>(
    key: K, 
    value: AppSettings[K]
  ): Promise<void> => {
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await saveSettingsToStorage(newSettings);
    } catch (error) {
      throw error;
    }
  };

  // 重置设置
  const resetSettings = async (): Promise<void> => {
    try {
      setSettings(DEFAULT_SETTINGS);
      await saveSettingsToStorage(DEFAULT_SETTINGS);
    } catch (error) {
      throw error;
    }
  };

  // 组件挂载时加载设置
  useEffect(() => {
    loadSettingsFromStorage();
  }, []);

  // 调试：监听设置变化
  useEffect(() => {
  }, [settings]);

  return (
    <SettingsContext.Provider value={{
      settings,
      updateSetting,
      resetSettings,
      isLoading,
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};