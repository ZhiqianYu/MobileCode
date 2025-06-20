// src/components/Layout/MainContainer.tsx
// 功能：0号容器，管理4个基础组件的布局，支持跨模块通信
// 依赖：4个基础组件，布局状态管理，安全区域适配
// 被使用：App.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Dimensions,
  Platform,
  TouchableOpacity,
  Text,
  Keyboard,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '../../contexts/SettingsContext';
import { useCrossModule } from '../../contexts/CrossModuleContext'; // 🔥 修复：添加缺失的导入
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
  
  // 🔥 修复：添加跨模块状态管理
  const { state: crossModuleState, setMode, clearSelectedFiles, clearPendingSave } = useCrossModule();
  
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
  
  // 当前激活的模块 - 默认启动文件管理
  const [activeModule, setActiveModule] = useState<ModuleType>('file');
  
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
  
  // MainContent的ref
  const mainContentRef = useRef<any>(null);
  
  // 动态控制状态栏和导航栏显示
  useEffect(() => {    
    StatusBar.setHidden(settings.fullScreen, 'slide');
    
    if (!settings.fullScreen) {
      StatusBar.setBackgroundColor('#1a1a1a', true);
      StatusBar.setBarStyle('light-content', true);
      StatusBar.setTranslucent(false);
    } else {
      StatusBar.setBarStyle('light-content', true);
    }
    
    if (Platform.OS === 'android') {
      const NavigationBar = require('react-native-navigation-bar-color');
      
      if (settings.fullScreen) {
        NavigationBar.hideNavigationBar();
      } else {
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
      topBar: {
        top: 0,
        left: 0,
        right: 0,
        height: heights.topBar,
      },
      
      inputBar: visibility.inputBar ? {
        bottom: 0,
        left: 0,
        right: 0,
        height: heights.inputBar,
      } : null,
      
      quickTool: visibility.quickTool ? {
        bottom: visibility.inputBar ? heights.inputBar : 0,
        left: 0,
        right: 0,
        height: heights.quickTool,
      } : null,
      
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

  // 计算悬浮按钮的固定位置
  const getFloatingButtonPosition = (buttonType: 'quickTool' | 'inputBar') => {
    const bounds = getMainContentBounds();
    
    const positions = {
      quickTool: {
        right: 16,
        top: bounds.bottom - 40 - 16,
      },
      inputBar: {
        left: 16,
        top: bounds.bottom - 40 - 16,
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

  // 文件管理器与编辑器交互：打开文件编辑
  const openFileInEditor = (filePath: string, fileName: string) => {
    console.log('打开文件编辑:', fileName, filePath);
    
    // 切换到编辑器模块
    setActiveModule('editor');
    
    // 延迟执行以确保编辑器已渲染
    setTimeout(() => {
      if (mainContentRef.current?.editor?.openFile) {
        mainContentRef.current.editor.openFile(filePath, fileName);
      }
    }, 100);
  };

  // 编辑器与文件管理器交互：保存文件
  const saveFileFromEditor = (content: string, fileName?: string, currentPath?: string) => {
    console.log('从编辑器保存文件:', fileName);
    
    if (currentPath) {
      // 已有文件路径，直接保存
      if (mainContentRef.current?.fileManager?.saveFile) {
        mainContentRef.current.fileManager.saveFile(currentPath, content);
      }
    } else {
      // 新文件，需要选择保存位置
      Alert.alert(
        '保存文件',
        '选择保存方式',
        [
          { text: '取消', style: 'cancel' },
          {
            text: '选择位置',
            onPress: () => {
              // 切换到文件管理器选择保存位置
              setActiveModule('file');
              // 传递保存数据给文件管理器
              setTimeout(() => {
                if (mainContentRef.current?.fileManager?.startSaveProcess) {
                  mainContentRef.current.fileManager.startSaveProcess(content, fileName);
                }
              }, 100);
            }
          }
        ]
      );
    }
  };

  // 处理快捷工具命令 - 增强版
  const handleQuickToolCommand = (command: string) => {
    console.log('执行快捷命令:', command);
    
    if (!mainContentRef.current) {
      console.warn('MainContent引用不可用');
      return;
    }

    try {
      switch (activeModule) {
        case 'file':
          const fileManagerMethods = mainContentRef.current;
          if (fileManagerMethods) {
            switch (command) {
              case 'copy': 
                fileManagerMethods.copy?.(); 
                break;
              case 'paste': 
                fileManagerMethods.paste?.(); 
                break;
              case 'cut': 
                fileManagerMethods.cut?.(); 
                break;
              case 'delete': 
                fileManagerMethods.delete?.(); 
                break;
              case 'new_file': 
                // 新建文件：输入文件名后用编辑器打开
                Alert.prompt(
                  '新建文件',
                  '请输入文件名:',
                  (fileName) => {
                    if (fileName && fileName.trim()) {
                      // 创建新文件并用编辑器打开
                      openFileInEditor('', fileName.trim());
                    }
                  },
                  'plain-text',
                  'untitled.txt'
                );
                break;
              case 'new_dir': 
                fileManagerMethods.newDir?.(); 
                break;
              case 'refresh': 
                fileManagerMethods.refresh?.(); 
                break;
              case 'toggleView': 
                fileManagerMethods.toggleView?.(); 
                break;
              default: 
                console.log('未知文件命令:', command);
            }
          }
          break;
          
        case 'editor':
          const editor = mainContentRef.current.editor;
          if (editor) {
            switch (command) {
              case 'save': 
                editor.save?.();
                break;
              case 'new_file':
                editor.newFile?.();
                break;
              case 'open_file':
                // 切换到文件管理器选择文件
                setActiveModule('file');
                break;
              case 'copy': 
                editor.copy?.(); 
                break;
              case 'paste': 
                editor.paste?.(); 
                break;
              case 'cut': 
                editor.cut?.(); 
                break;
              case 'undo': 
                editor.undo?.(); 
                break;
              case 'redo': 
                editor.redo?.(); 
                break;
              default: 
                console.log('未知编辑器命令:', command);
            }
          }
          break;
          
        case 'terminal':
          const terminal = mainContentRef.current.terminal;
          if (terminal && command !== 'clear') {
            handleInputSend(command);
          } else if (terminal && command === 'clear') {
            terminal.clearTerminal?.();
          }
          break;
          
        case 'forward':
          const forward = mainContentRef.current.forward;
          if (forward) {
            switch (command) {
              case 'back': forward.goBack?.(); break;
              case 'forward': forward.goForward?.(); break;
              case 'refresh': forward.refresh?.(); break;
              case 'stop': forward.stop?.(); break;
              case 'screenshot': forward.screenshot?.(); break;
              case 'bookmark': forward.bookmark?.(); break;
              default: console.log('未知转发命令:', command);
            }
          }
          break;
          
        default:
          console.log('未知模块:', activeModule);
      }
    } catch (error) {
      console.error('执行命令失败:', error);
      Alert.alert('错误', `命令执行失败: ${error.message}`);
    }
  };

  // 🔥 修复：处理输入栏发送 - 修复语法错误
  const handleInputSend = (input: string) => {
    console.log('发送输入:', input);
    
    if (!mainContentRef.current) {
      console.warn('MainContent引用不可用');
      return;
    }

    try {
      switch (activeModule) {
        case 'file':
          if (input.includes('/') || input === '..' || input === '~') {
            // 路径跳转
            if (mainContentRef.current.navigateToPath) {
              mainContentRef.current.navigateToPath(input);
            }
          } else if (input.includes(' ')) {
            // Linux命令
            if (mainContentRef.current.executeCommand) {
              mainContentRef.current.executeCommand(input);
            }
          } else {
            // 搜索
            if (mainContentRef.current.search) {
              mainContentRef.current.search(input);
            }
          }
          break;
          
        case 'terminal':
          const terminal = mainContentRef.current.terminal;
          if (terminal?.executeCommand) {
            terminal.executeCommand(input);
          }
          break;
          
        case 'editor':
          const editor = mainContentRef.current.editor;
          if (editor?.insertText) {
            editor.insertText(input);
          }
          break;
          
        case 'forward':
          const forward = mainContentRef.current.forward;
          if (forward?.navigate) {
            forward.navigate(input);
          }
          break;
          
        default:
          console.log('未知模块输入:', activeModule, input);
      }
    } catch (error) {
      console.error('发送输入失败:', error);
      Alert.alert('错误', `输入处理失败: ${error.message}`);
    }
  }; // 🔥 修复：添加缺失的闭合大括号

  // 🔥 修复：处理动态按钮点击
  const handleDynamicButtonPress = (action: 'open' | 'save') => {
    console.log('动态按钮点击:', action);
    
    if (action === 'open') {
      // 处理打开文件
      const selectedFiles = crossModuleState.selectedFiles;
      if (selectedFiles.length > 0) {
        const file = selectedFiles[0];
        const filePath = file.path || file.uri || '';
        const fileName = file.name;
        
        // 切换到编辑器并打开文件
        openFileInEditor(filePath, fileName);
        
        // 清除选中状态和模式
        clearSelectedFiles();
        setMode('none');
      } else {
        Alert.alert('提示', '请先选择要打开的文件');
      }
    } else if (action === 'save') {
      // 处理保存文件
      const pendingSave = crossModuleState.pendingSave;
      if (pendingSave) {
        // 这里应该调用文件管理器的保存方法
        // 具体实现需要在文件管理器中完成
        Alert.alert('保存', '保存功能即将完成实现');
        
        // 清除待保存状态
        clearPendingSave();
        setMode('none');
      } else {
        Alert.alert('提示', '没有待保存的文件');
      }
    }
  };

  return (
    <View style={styles.safeContainer}>
      <StatusBar backgroundColor="#1a1a1a" barStyle="light-content" />
      
      {/* 手动添加顶部安全区域 */}
      <View style={[styles.topSafeArea, { height: insets.top }]} />
      
      {/* 0号容器 */}
      <View style={[
        styles.mainContainer, 
        { height: availableHeight },
      ]}>
        
        {/* 1. Top Bar */}
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
            onDynamicButtonPress={handleDynamicButtonPress}
          />
        </View>

        {/* 2. Main Content */}
        <View style={[
          styles.absoluteComponent,
          positions.mainContent,
        ]}>
          <MainContentComponent
            ref={mainContentRef}
            activeModule={activeModule}
            height={availableHeight - heights.topBar - (positions.mainContent.bottom || 0)}
            width={screenWidth}
            onModuleSwitch={switchModule}
            onOpenFileInEditor={openFileInEditor}
            onSaveFileFromEditor={saveFileFromEditor}
          />
        </View>

        {/* 3. Quick Tool */}
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
              mainContentRef={mainContentRef}
            />
          </View>
        )}

        {/* 4. Input Bar */}
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

        {/* QuickTool 悬浮按钮 */}
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

        {/* InputBar 悬浮按钮 */}
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
  
  // 主容器
  mainContainer: {
    position: 'relative',
    backgroundColor: '#1a1a1a',
  },
  
  // 绝对定位组件的通用样式
  absoluteComponent: {
    position: 'absolute',
  },

  // 悬浮按钮样式
  floatingButton: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    opacity: 0.5,
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
    fontSize: 16,
    marginBottom: 1,
    color: '#fff',
  },
});

export default MainContainer;