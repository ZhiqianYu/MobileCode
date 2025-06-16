// src/components/Layout/MainContainer.tsx
// 功能：0号容器，管理4个基础组件的布局，简化版仅支持点击显示/隐藏
// 依赖：4个基础组件，布局状态管理，安全区域适配
// 被使用：App.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Dimensions,
  Platform,
  TouchableOpacity,
  Text,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '../../contexts/SettingsContext';
import TopBarComponent from './TopBarComponent';
import MainContentComponent from './MainContentComponent';
import QuickToolComponent from './QuickToolComponent';
import InputBarComponent from './InputBarComponent';
import CleanDrawerConnection from '../Drawer/CleanDrawerConnection';
import CleanDrawerSettings from '../Drawer/CleanDrawerSettings';

// 尺寸配置类型
export type SizeConfig = 'small' | 'medium' | 'large';

// 模块类型
export type ModuleType = 'file' | 'editor' | 'forward' | 'terminal';

// 组件可见性状态
interface VisibilityState {
  quickTool: boolean;
  inputBar: boolean;
}

// 抽屉状态
interface DrawerState {
  connectionDrawer: boolean;
  settingsDrawer: boolean;
}

const MainContainer: React.FC = () => {
  // 获取安全区域信息
  const insets = useSafeAreaInsets();
  
  // 获取设置
  const { settings } = useSettings();
  
  // 屏幕尺寸
  const screenHeight = Dimensions.get('window').height;
  const screenWidth = Dimensions.get('window').width;

  // 键盘高度状态
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // 根据全屏设置计算实际可用高度
  const availableHeight = (settings.fullScreen 
    ? screenHeight  // 全屏模式使用全部高度
    : screenHeight - insets.top - insets.bottom) // 普通模式扣除安全区域
    - keyboardHeight; // 扣除键盘高度
  
  // 当前激活的模块
  const [activeModule, setActiveModule] = useState<ModuleType>('terminal');
  
  // 组件可见性状态
  const [visibility, setVisibility] = useState<VisibilityState>({
    quickTool: true,
    inputBar: true,
  });

  // 抽屉状态
  const [drawerState, setDrawerState] = useState<DrawerState>({
    connectionDrawer: false,
    settingsDrawer: false,
  });
  
  // 尺寸配置
  const [sizeConfig, setSizeConfig] = useState<SizeConfig>('medium');
  
  // 动态控制状态栏和导航栏显示
  useEffect(() => {    
    // 控制状态栏
    StatusBar.setHidden(settings.fullScreen, 'slide');
    
    if (!settings.fullScreen) {
      // 非全屏模式：显示状态栏，设置颜色
      StatusBar.setBackgroundColor('#1a1a1a', true);
      StatusBar.setBarStyle('light-content', true);
      StatusBar.setTranslucent(false);
    } else {
      // 全屏模式：隐藏状态栏
      StatusBar.setBarStyle('light-content', true);
    }
    
    // Android平台控制导航栏
    if (Platform.OS === 'android') {
      const NavigationBar = require('react-native-navigation-bar-color');
      
      if (settings.fullScreen) {
        // 全屏模式：隐藏导航栏
        NavigationBar.hideNavigationBar();
      } else {
        // 非全屏模式：显示导航栏
        NavigationBar.showNavigationBar();
      }
    }
  }, [settings.fullScreen]);

  // 键盘事件监听
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    // 清理监听器
    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);
  
  // 根据尺寸配置获取组件高度
  const getComponentHeights = () => {
    const configs = {
      small: {
        topBar: 50,
        quickTool: 60,
        inputBar: 50,
      },
      medium: {
        topBar: 60,
        quickTool: 80,
        inputBar: 60,
      },
      large: {
        topBar: 70,
        quickTool: 100,
        inputBar: 70,
      },
    };
    return configs[sizeConfig];
  };

  const heights = getComponentHeights();
  
  // 计算各组件的绝对位置
  const calculatePositions = () => {
    const positions = {
      // 1号 TopBar - 固定在顶部
      topBar: {
        top: 0,
        left: 0,
        right: 0,
        height: heights.topBar,
      },
      
      // 4号 InputBar - 固定在底部（如果可见）
      inputBar: visibility.inputBar ? {
        bottom: 0,
        left: 0,
        right: 0,
        height: heights.inputBar,
      } : null,
      
      // 3号 QuickTool - 在4号上边（如果可见）
      quickTool: visibility.quickTool ? {
        bottom: visibility.inputBar ? heights.inputBar : 0,
        left: 0,
        right: 0,
        height: heights.quickTool,
      } : null,
      
      // 2号 MainContent - 填充剩余空间
      mainContent: {
        top: heights.topBar,
        left: 0,
        right: 0,
        bottom: (() => {
          let bottomOffset = 0;
          if (visibility.inputBar) bottomOffset += heights.inputBar;
          if (visibility.quickTool) bottomOffset += heights.quickTool;
          return bottomOffset;
        })(),
      },
    };
    
    return positions;
  };

  const positions = calculatePositions();

  // 计算MainContent的实际尺寸（用于悬浮按钮定位）
  const getMainContentBounds = () => {
    const mainContentTop = heights.topBar;
    let mainContentBottom = 0;
    if (visibility.inputBar) mainContentBottom += heights.inputBar;
    if (visibility.quickTool) mainContentBottom += heights.quickTool;
    
    const mainContentHeight = availableHeight - heights.topBar - mainContentBottom;
    
    return {
      top: mainContentTop,
      left: 0,
      right: screenWidth,
      bottom: mainContentTop + mainContentHeight,
      width: screenWidth,
      height: mainContentHeight,
    };
  };

  // 计算悬浮按钮的固定位置（在MainContent范围内）
  const getFloatingButtonPosition = (buttonType: 'quickTool' | 'inputBar') => {
    const bounds = getMainContentBounds();
    
    // 固定位置：在MainContent区域内，距离边界16px
    const positions = {
      quickTool: {
        right: 16, // 距离右边界16px
        top: bounds.bottom - 40 - 16, // 距离MainContent底部16px（40是按钮高度）
      },
      inputBar: {
        left: 16,  // 距离左边界16px
        top: bounds.bottom - 40 - 16, // 距离MainContent底部16px
      }
    };

    return positions[buttonType];
  };

  // 切换快捷工具栏可见性
  const toggleQuickTool = () => {
    setVisibility(prev => ({ ...prev, quickTool: !prev.quickTool }));
  };

  // 切换输入栏可见性
  const toggleInputBar = () => {
    setVisibility(prev => ({ ...prev, inputBar: !prev.inputBar }));
  };

  // 切换模块
  const switchModule = (module: ModuleType) => {
    setActiveModule(module);
  };

  // 打开连接管理抽屉
  const openConnectionDrawer = () => {
    setDrawerState(prev => ({ ...prev, connectionDrawer: true }));
  };

  // 关闭连接管理抽屉
  const closeConnectionDrawer = () => {
    setDrawerState(prev => ({ ...prev, connectionDrawer: false }));
  };

  // 打开设置抽屉
  const openSettingsDrawer = () => {
    setDrawerState(prev => ({ ...prev, settingsDrawer: true }));
  };

  // 关闭设置抽屉
  const closeSettingsDrawer = () => {
    setDrawerState(prev => ({ ...prev, settingsDrawer: false }));
  };

  // 连接成功后关闭连接抽屉
  const handleConnectionSuccess = () => {
    closeConnectionDrawer();
  };

  // 处理快捷工具命令
  const handleQuickToolCommand = (command: string) => {
    // TODO: 根据不同模块处理命令
  };

  // 处理输入栏发送
  const handleInputSend = (input: string) => {
    // TODO: 根据不同模块处理输入
  };

  return (
    <View style={styles.safeContainer}>
      <StatusBar backgroundColor="#1a1a1a" barStyle="light-content" />
      
      {/* 手动添加顶部安全区域 */}
      <View style={[styles.topSafeArea, { height: insets.top }]} />
      
      {/* 0号容器 - 改为相对定位，子元素绝对定位 */}
      <View style={[
        styles.mainContainer, 
        { height: availableHeight },
      ]}>
        
        {/* 1. Top Bar - 绝对定位在顶部 */}
        <View style={[
          styles.absoluteComponent,
          positions.topBar,
        ]}>
          <TopBarComponent
            activeModule={activeModule}
            onModuleSwitch={switchModule}
            sizeConfig={sizeConfig}
            onSizeConfigChange={setSizeConfig}
            onOpenConnectionDrawer={openConnectionDrawer}
            onOpenSettingsDrawer={openSettingsDrawer}
          />
        </View>

        {/* 2. Main Content - 绝对定位，填充剩余空间 */}
        <View style={[
          styles.absoluteComponent,
          positions.mainContent,
        ]}>
          <MainContentComponent
            activeModule={activeModule}
            height={availableHeight - heights.topBar - (positions.mainContent.bottom || 0)}
            width={screenWidth}
          />
        </View>

        {/* 3. Quick Tool - 绝对定位在底部上方，可隐藏 */}
        {visibility.quickTool && positions.quickTool && (
          <View style={[
            styles.absoluteComponent,
            positions.quickTool,
          ]}>
            <QuickToolComponent
              activeModule={activeModule}
              sizeConfig={sizeConfig}
              onToggleVisibility={toggleQuickTool}
              onInputCommand={handleQuickToolCommand}
            />
          </View>
        )}

        {/* 4. Input Bar - 绝对定位在底部，可隐藏 */}
        {visibility.inputBar && positions.inputBar && (
          <View style={[
            styles.absoluteComponent,
            positions.inputBar,
          ]}>
            <InputBarComponent
              activeModule={activeModule}
              sizeConfig={sizeConfig}
              onToggleVisibility={toggleInputBar}
              onSendInput={handleInputSend}
            />
          </View>
        )}

        {/* QuickTool 悬浮按钮 - 固定位置，仅点击功能 */}
        {!visibility.quickTool && (
          <TouchableOpacity
            style={[
              styles.floatingButton,
              getFloatingButtonPosition('quickTool')
            ]}
            onPress={toggleQuickTool}
            activeOpacity={0.7}
          >
            <Text style={styles.floatingButtonIcon}>⚡</Text>
          </TouchableOpacity>
        )}

        {/* InputBar 悬浮按钮 - 固定位置，仅点击功能 */}
        {!visibility.inputBar && (
          <TouchableOpacity
            style={[
              styles.floatingButton,
              getFloatingButtonPosition('inputBar')
            ]}
            onPress={toggleInputBar}
            activeOpacity={0.7}
          >
            <Text style={styles.floatingButtonIcon}>⌨️</Text>
          </TouchableOpacity>
        )}

      </View>

      {/* 手动添加底部安全区域 */}
      <View style={[styles.bottomSafeArea, { height: insets.bottom }]} />

      {/* 抽屉式连接管理 */}
      <CleanDrawerConnection
        visible={drawerState.connectionDrawer}
        onClose={closeConnectionDrawer}
        onConnectionSuccess={handleConnectionSuccess}
      />

      {/* 抽屉式设置 */}
      <CleanDrawerSettings
        visible={drawerState.settingsDrawer}
        onClose={closeSettingsDrawer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // 安全容器
  safeContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  topSafeArea: {
    backgroundColor: '#1a1a1a',
  },
  bottomSafeArea: {
    backgroundColor: '#1a1a1a',
  },
  
  // 主容器 - 改为相对定位
  mainContainer: {
    position: 'relative', // 重要：作为绝对定位子元素的参考点
    backgroundColor: '#1a1a1a',
  },
  
  // 绝对定位组件的通用样式
  absoluteComponent: {
    position: 'absolute',
  },

  // 悬浮按钮样式 - 简化版，小尺寸，半透明
  floatingButton: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    opacity: 0.5, // 50% 透明度
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingButtonIcon: {
    fontSize: 16, // 调小图标
    marginBottom: 1,
    color: '#fff',
  },
});

export default MainContainer;