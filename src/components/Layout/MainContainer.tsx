// src/components/Layout/MainContainer.tsx
// 功能：0号容器，管理4个基础组件的布局，修复边距问题
// 依赖：4个基础组件，布局状态管理，安全区域适配
// 被使用：App.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Dimensions,
  Platform,
  UIManager,
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
  
  // 根据全屏设置计算实际可用高度
  const availableHeight = settings.fullScreen 
    ? screenHeight  // 全屏模式使用全部高度
    : screenHeight - insets.top - insets.bottom; // 普通模式扣除安全区域
  
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
    console.log('设置全屏模式:', settings.fullScreen);
    
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
    
    // Android平台控制导航栏（需要安装 react-native-navigation-bar-color）
    if (Platform.OS === 'android') {
      try {
        // 导入导航栏控制库
        const NavigationBar = require('react-native-navigation-bar-color').default;
        
        if (settings.fullScreen) {
          // 全屏模式：隐藏导航栏
          console.log('隐藏导航栏');
          NavigationBar.hideNavigationBar();
        } else {
          // 非全屏模式：显示导航栏并设置颜色
          console.log('显示导航栏');
          NavigationBar.setNavigationBarColor('#1a1a1a', false, true);
          NavigationBar.showNavigationBar();
        }
      } catch (error) {
        console.log('导航栏控制库未安装，使用备选方案');
        
        // 备选方案：在设置中提示用户手动控制
        if (settings.fullScreen) {
          console.log('全屏模式：建议用户手动隐藏导航栏');
        } else {
          console.log('普通模式：建议用户显示导航栏');
        }
      }
    }
    
    console.log('状态栏和导航栏配置完成');
  }, [settings.fullScreen]);
  
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

  // 调试信息
  useEffect(() => {
    if (__DEV__) {
      console.log('=== 布局位置计算 ===');
      console.log('可用高度:', availableHeight);
      console.log('组件高度:', heights);
      console.log('可见性:', visibility);
      console.log('计算位置:', positions);
    }
  }, [availableHeight, heights, visibility, positions]);

  // 切换快捷工具栏可见性
  const toggleQuickTool = () => {
    setVisibility(prev => ({
      ...prev,
      quickTool: !prev.quickTool,
    }));
  };

  // 切换输入栏可见性
  const toggleInputBar = () => {
    setVisibility(prev => ({
      ...prev,
      inputBar: !prev.inputBar,
    }));
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
    console.log('Quick tool command:', command);
    // TODO: 根据不同模块处理命令
  };

  // 处理输入栏发送
  const handleInputSend = (input: string) => {
    console.log('Input sent:', input);
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
        __DEV__ && styles.debugMainContainer
      ]}>
        
        {/* 1. Top Bar - 绝对定位在顶部 */}
        <View style={[
          styles.absoluteComponent,
          positions.topBar,
          __DEV__ && styles.debugTopBar
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
          __DEV__ && styles.debugMainContent
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
            __DEV__ && styles.debugQuickTool
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
            __DEV__ && styles.debugInputBar
          ]}>
            <InputBarComponent
              activeModule={activeModule}
              sizeConfig={sizeConfig}
              onToggleVisibility={toggleInputBar}
              onSendInput={handleInputSend}
            />
          </View>
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
  // 开发阶段调试边框
  debugMainContainer: {
    borderWidth: 2,
    borderColor: '#FFFF00', // 黄色 - 0号容器
  },
  debugTopBar: {
    borderWidth: 2,
    borderColor: '#FF0000', // 红色 - TopBar
  },
  debugMainContent: {
    borderWidth: 2,
    borderColor: '#0000FF', // 蓝色 - MainContent  
  },
  debugQuickTool: {
    borderWidth: 2,
    borderColor: '#FFFFFF', // 白色 - QuickTool
  },
  debugInputBar: {
    borderWidth: 2,
    borderColor: '#808080', // 灰色 - InputBar
  },
});

export default MainContainer;