// src/components/Layout/TopBarComponent.tsx
// 顶部导航栏组件 - 显示当前模块信息和动态交互按钮
//
// 主要功能：
// 1. 显示当前活跃模块的名称和图标
// 2. 提供其他模块的快速切换按钮
// 3. 动态显示跨模块操作按钮（打开文件/保存文件）
// 4. 连接管理和设置入口
// 5. 跨模块状态指示器
//
// 动态按钮机制：
// - 监听跨模块Context状态变化
// - 根据操作模式显示对应按钮（打开/保存）
// - 按钮状态管理：禁用/启用/隐藏
// - 操作完成后的状态重置
//
// 模块切换控制：
// - 在跨模块操作期间限制模块切换
// - 提供用户友好的状态提示
// - 确保操作流程的连贯性

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useCrossModule } from '../../contexts/CrossModuleContext';

// ================================
// 类型定义部分
// ================================

export type ModuleType = 'file' | 'editor' | 'forward' | 'terminal';
export type SizeConfig = 'small' | 'medium' | 'large';

// 组件属性接口
interface TopBarComponentProps {
  activeModule: ModuleType;                                           // 当前活跃模块
  onModuleSwitch: (module: ModuleType) => void;                      // 模块切换回调
  sizeConfig: SizeConfig;                                             // 尺寸配置
  onSizeConfigChange: (size: SizeConfig) => void;                    // 尺寸配置变更回调
  onOpenConnectionDrawer: () => void;                                 // 打开连接管理抽屉
  onOpenSettingsDrawer: () => void;                                   // 打开设置抽屉
  onDynamicButtonPress?: (action: 'open' | 'save') => void;          // 动态按钮点击回调
}

// 模块配置数据结构
interface ModuleConfig {
  key: ModuleType;          // 模块标识
  icon: string;             // 显示图标
  label: string;            // 显示名称
  description?: string;     // 描述信息
}

// 动态按钮配置数据结构
interface DynamicButtonConfig {
  show: boolean;            // 是否显示
  text: string;             // 按钮文本
  icon: string;             // 按钮图标
  color: string;            // 按钮颜色
  action: 'open' | 'save';  // 按钮操作类型
  disabled: boolean;        // 是否禁用
  tooltip: string;          // 提示信息
}

// ================================
// 常量定义部分
// ================================

// 所有模块的配置信息
const MODULE_CONFIGS: ModuleConfig[] = [
  { 
    key: 'file', 
    icon: '📁', 
    label: '文件管理器',
    description: '浏览和管理文件'
  },
  { 
    key: 'editor', 
    icon: '📝', 
    label: '文本编辑器',
    description: '编辑代码和文本文件'
  },
  { 
    key: 'forward', 
    icon: '🔄', 
    label: '端口转发',
    description: '网络代理和浏览器'
  },
  { 
    key: 'terminal', 
    icon: '💻', 
    label: '终端',
    description: 'SSH远程终端'
  },
];

// ================================
// 主组件实现
// ================================

const TopBarComponent: React.FC<TopBarComponentProps> = ({
  activeModule,
  onModuleSwitch,
  sizeConfig,
  onSizeConfigChange,
  onOpenConnectionDrawer,
  onOpenSettingsDrawer,
  onDynamicButtonPress, 
}) => {

  // ================================
  // Context状态管理
  // ================================
  
  // 获取跨模块状态
  const { state } = useCrossModule();
  
  // ================================
  // 工具函数部分
  // ================================
  
  // 获取当前模块配置信息
  const getCurrentModule = (): ModuleConfig => {
    return MODULE_CONFIGS.find(m => m.key === activeModule) || MODULE_CONFIGS[0];
  };

  // 获取其他可切换的模块
  const getOtherModules = (): ModuleConfig[] => {
    return MODULE_CONFIGS.filter(m => m.key !== activeModule);
  };

  // ================================
  // 动态按钮逻辑部分
  // ================================
  
  // 获取动态按钮配置（核心逻辑）
  const getDynamicButtonConfig = (): DynamicButtonConfig => {
    switch (state.mode) {
      case 'openFile':
        // 打开文件模式：显示打开按钮
        return {
          show: true,
          text: '打开',
          icon: '📂',
          color: '#4CAF50',
          action: 'open',
          disabled: state.selectedFiles.length === 0,
          tooltip: state.selectedFiles.length === 0 
            ? '请先在文件管理器中选择文件' 
            : `打开选中的 ${state.selectedFiles.length} 个文件`
        };
        
      case 'saveFile':
        // 保存文件模式：显示保存按钮
        return {
          show: true,
          text: '保存',
          icon: '💾',
          color: '#2196F3',
          action: 'save',
          disabled: !state.pendingSave,
          tooltip: !state.pendingSave
            ? '没有待保存的文件'
            : `保存文件 "${state.pendingSave.fileName}" 到当前位置`
        };
        
      default:
        // 默认模式：隐藏动态按钮
        return { 
          show: false,
          text: '',
          icon: '',
          color: '',
          action: 'open',
          disabled: true,
          tooltip: ''
        };
    }
  };

  // 处理动态按钮点击事件
  const handleDynamicButtonPress = () => {
    const buttonConfig = getDynamicButtonConfig();
    
    // 安全检查
    if (!buttonConfig.show || buttonConfig.disabled || !onDynamicButtonPress) {
      console.warn('动态按钮不可用:', {
        show: buttonConfig.show,
        disabled: buttonConfig.disabled,
        hasCallback: !!onDynamicButtonPress
      });
      return;
    }

    console.log('TopBar动态按钮点击:', buttonConfig.action, {
      mode: state.mode,
      selectedFiles: state.selectedFiles.length,
      pendingSave: !!state.pendingSave
    });

    // 执行回调
    onDynamicButtonPress(buttonConfig.action);
  };

  // ================================
  // 模块切换控制部分
  // ================================
  
  // 获取模块切换按钮的状态
  const getModuleSwitchStatus = (targetModule: ModuleType) => {
    // 在跨模块操作期间，限制某些切换行为
    if (state.mode !== 'none') {
      // 如果当前在选择文件模式，只允许切换到文件管理器
      if (state.mode === 'openFile' && targetModule !== 'file') {
        return { 
          disabled: true, 
          reason: '请先完成文件选择或取消操作' 
        };
      }
      
      // 如果当前在保存文件模式，只允许切换到文件管理器
      if (state.mode === 'saveFile' && targetModule !== 'file') {
        return { 
          disabled: true, 
          reason: '请先完成文件保存或取消操作' 
        };
      }
    }
    
    return { disabled: false, reason: '' };
  };

  // 处理模块切换事件
  const handleModuleSwitch = (targetModule: ModuleType) => {
    const switchStatus = getModuleSwitchStatus(targetModule);
    
    if (switchStatus.disabled) {
      console.warn('模块切换被限制:', switchStatus.reason);
      // 这里可以显示提示，但不强制阻止（让用户自己判断）
    }
    
    console.log('切换模块:', activeModule, '->', targetModule);
    onModuleSwitch(targetModule);
  };

  // ================================
  // 状态指示器部分
  // ================================
  
  // 获取跨模块状态的显示文本
  const getStatusText = (): string => {
    switch (state.mode) {
      case 'openFile':
        return state.selectedFiles.length > 0 
          ? `已选择 ${state.selectedFiles.length} 个文件` 
          : '请选择文件';
      case 'saveFile':
        return state.pendingSave 
          ? `等待保存 "${state.pendingSave.fileName}"` 
          : '请选择保存位置';
      default:
        return '';
    }
  };

  // 获取状态指示器的颜色
  const getStatusColor = (): string => {
    switch (state.mode) {
      case 'openFile':
        return state.selectedFiles.length > 0 ? '#4CAF50' : '#FF9800';
      case 'saveFile':
        return state.pendingSave ? '#2196F3' : '#FF9800';
      default:
        return '#999';
    }
  };

  // ================================
  // UI渲染部分
  // ================================
  
  const currentModule = getCurrentModule();
  const otherModules = getOtherModules();
  const dynamicButton = getDynamicButtonConfig();
  const statusText = getStatusText();

  return (
    <View style={styles.container}>
      
      {/* ================================ */}
      {/* 左侧：连接管理按钮 */}
      {/* ================================ */}
      <TouchableOpacity 
        style={styles.connectionButton}
        onPress={onOpenConnectionDrawer}
        activeOpacity={0.7}
      >
        <Text style={styles.connectionIcon}>≡</Text>
      </TouchableOpacity>

      {/* ================================ */}
      {/* 中间：模块信息和动态控制区域 */}
      {/* ================================ */}
      <View style={styles.moduleContainer}>
        
        {/* 当前模块信息显示 */}
        <View style={styles.moduleInfo}>
          <Text style={styles.moduleIcon}>{currentModule.icon}</Text>
          <Text style={styles.moduleName}>{currentModule.label}</Text>
        </View>

        {/* 动态按钮（条件显示） */}
        {dynamicButton.show && (
          <TouchableOpacity
            style={[
              styles.dynamicButton,
              { 
                backgroundColor: dynamicButton.color,
                opacity: dynamicButton.disabled ? 0.5 : 1
              }
            ]}
            onPress={handleDynamicButtonPress}
            disabled={dynamicButton.disabled}
            activeOpacity={0.7}
          >
            <Text style={styles.dynamicButtonIcon}>{dynamicButton.icon}</Text>
            <Text style={styles.dynamicButtonText}>{dynamicButton.text}</Text>
          </TouchableOpacity>
        )}

        {/* 跨模块状态指示器（条件显示） */}
        {state.mode !== 'none' && statusText && (
          <View style={[
            styles.statusIndicator,
            { backgroundColor: getStatusColor() }
          ]}>
            <Text style={styles.statusText}>
              {statusText}
            </Text>
          </View>
        )}
      </View>

      {/* ================================ */}
      {/* 右侧：其他模块切换和设置区域 */}
      {/* ================================ */}
      <View style={styles.rightContainer}>
        
        {/* 其他模块的快速切换按钮 */}
        {otherModules.slice(0, 3).map((module) => {
          const switchStatus = getModuleSwitchStatus(module.key);
          
          return (
            <TouchableOpacity
              key={module.key}
              style={[
                styles.moduleButton,
                switchStatus.disabled && styles.moduleButtonDisabled
              ]}
              onPress={() => handleModuleSwitch(module.key)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.moduleButtonIcon,
                switchStatus.disabled && styles.moduleButtonIconDisabled
              ]}>
                {module.icon}
              </Text>
            </TouchableOpacity>
          );
        })}
        
        {/* 设置按钮 */}
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={onOpenSettingsDrawer}
          activeOpacity={0.7}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ================================
// 样式定义部分
// ================================

const styles = StyleSheet.create({
  // 主容器样式
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    paddingHorizontal: 8,
  },
  
  // ================================
  // 左侧连接按钮样式
  // ================================
  connectionButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  connectionIcon: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  
  // ================================
  // 中间模块容器样式
  // ================================
  moduleContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  
  // 模块信息显示样式
  moduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moduleIcon: {
    fontSize: 25,
    marginRight: 8,
    marginTop: 3,
  },
  moduleName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // ================================
  // 动态按钮样式
  // ================================
  dynamicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    // 添加边框效果
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dynamicButtonIcon: {
    fontSize: 14,
    marginRight: 6,
    color: '#fff',
  },
  dynamicButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // ================================
  // 状态指示器样式
  // ================================
  statusIndicator: {
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    // 添加边框和阴影
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  
  // ================================
  // 右侧区域样式
  // ================================
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // 模块切换按钮样式
  moduleButton: {
    padding: 6,
    marginLeft: 4,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  moduleButtonDisabled: {
    opacity: 0.3,
  },
  moduleButtonIcon: {
    fontSize: 18,
    opacity: 0.7,
  },
  moduleButtonIconDisabled: {
    opacity: 0.3,
  },
  
  // 设置按钮样式
  settingsButton: {
    padding: 6,
    marginLeft: 8,
    borderRadius: 4,
  },
  settingsIcon: {
    fontSize: 18,
  },
});

export default TopBarComponent;