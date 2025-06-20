// src/contexts/SettingsContext.tsx
// 功能：全局设置管理，支持界面、编辑器、终端等设置
// 依赖：AsyncStorage
// 被使用：MainContainer, CleanDrawerSettings

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_STORAGE_KEY = '@app_settings';

// 设置接口定义
interface AppSettings {
  // 外观设置
  fullScreen: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  theme: 'dark' | 'blue' | 'purple' | 'orange';
  darkMode: boolean;
  
  // 编辑器设置
  wordWrap: boolean;
  
  // 终端设置
  terminalBell: boolean;
  showPing: boolean;
  
  // 连接设置
  autoConnect: boolean;
}

// 默认设置
const defaultSettings: AppSettings = {
  // 外观设置
  fullScreen: false,
  fontSize: 'medium',
  theme: 'dark',
  darkMode: true,
  
  // 编辑器设置
  wordWrap: true,
  
  // 终端设置
  terminalBell: true,
  showPing: true,
  
  // 连接设置
  autoConnect: false,
};

// Context接口定义
interface SettingsContextState {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  resetSettings: () => Promise<void>;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextState | null>(null);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * 保存设置到AsyncStorage
   */
  const saveSettingsToStorage = async (newSettings: AppSettings) => {
    try {
      const jsonValue = JSON.stringify(newSettings);
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, jsonValue);
      console.log('✓ 设置已保存到存储');
    } catch (error) {
      console.error('✗ 保存设置失败:', error);
      throw error;
    }
  };

  /**
   * 从AsyncStorage加载设置
   */
  const loadSettingsFromStorage = async () => {
    try {
      setIsLoading(true);
      console.log('加载应用设置...');
      
      const jsonValue = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      
      if (jsonValue != null) {
        const loadedSettings: AppSettings = JSON.parse(jsonValue);
        
        // 合并默认设置，确保新版本的设置项存在
        const mergedSettings = { ...defaultSettings, ...loadedSettings };
        
        setSettings(mergedSettings);
        console.log('✓ 从存储加载设置');
      } else {
        console.log('没有保存的设置，使用默认设置');
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('✗ 加载设置失败:', error);
      setSettings(defaultSettings);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 更新单个设置项
   */
  const updateSetting = async <K extends keyof AppSettings>(
    key: K, 
    value: AppSettings[K]
  ) => {
    try {
      console.log('更新设置:', key, '=', value);
      
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await saveSettingsToStorage(newSettings);
      
      console.log('✓ 设置更新成功:', key);
    } catch (error) {
      console.error('✗ 更新设置失败:', error);
      throw error;
    }
  };

  /**
   * 重置所有设置为默认值
   */
  const resetSettings = async () => {
    try {
      console.log('重置所有设置为默认值');
      
      setSettings(defaultSettings);
      await saveSettingsToStorage(defaultSettings);
      
      console.log('✓ 设置已重置');
    } catch (error) {
      console.error('✗ 重置设置失败:', error);
      throw error;
    }
  };

  // 组件挂载时加载设置
  useEffect(() => {
    loadSettingsFromStorage();
  }, []);

  // 调试：监听设置变化
  useEffect(() => {
    console.log('设置状态更新:', Object.keys(settings).length, '个配置项');
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