// src/components/Layout/TopBarComponent.tsx
// 功能：1号组件 - 顶部栏，包含连接按钮、状态、功能图标、设置
// 依赖：模块类型定义
// 被使用：MainContainer

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

export type ModuleType = 'file' | 'editor' | 'forward' | 'terminal';
export type SizeConfig = 'small' | 'medium' | 'large';

interface TopBarComponentProps {
  activeModule: ModuleType;
  onModuleSwitch: (module: ModuleType) => void;
  sizeConfig: SizeConfig;
  onSizeConfigChange: (size: SizeConfig) => void;
  onOpenConnectionDrawer: () => void;
  onOpenSettingsDrawer: () => void;
}

const TopBarComponent: React.FC<TopBarComponentProps> = ({
  activeModule,
  onModuleSwitch,
  sizeConfig,
  onSizeConfigChange,
  onOpenConnectionDrawer,
  onOpenSettingsDrawer,
}) => {
  
  // 模块配置
  const modules = [
    { key: 'file' as ModuleType, icon: '📁', label: '文件' },
    { key: 'editor' as ModuleType, icon: '📝', label: '编辑器' },
    { key: 'forward' as ModuleType, icon: '🔄', label: '转发' },
    { key: 'terminal' as ModuleType, icon: '💻', label: '终端' },
  ];

  // 模拟连接状态（UI设计阶段使用）
  const mockConnectionStatus = {
    user: 'demo',
    host: '演示模式',
    ping: 42,
    isConnected: true,
  };

  return (
    <View style={styles.container}>
      
      {/* 左侧：连接按钮 */}
      <TouchableOpacity 
        style={styles.connectionButton}
        onPress={onOpenConnectionDrawer}
      >
        <Text style={styles.connectionIcon}>≡</Text>
      </TouchableOpacity>

      {/* 中间：连接状态 */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          {mockConnectionStatus.user}@{mockConnectionStatus.host}
        </Text>
        <Text style={[
          styles.pingText,
          { color: mockConnectionStatus.isConnected ? '#4CAF50' : '#F44336' }
        ]}>
          {mockConnectionStatus.isConnected ? `${mockConnectionStatus.ping}ms` : '离线'}
        </Text>
      </View>

      {/* 右侧：功能图标 */}
      <View style={styles.modulesContainer}>
        {modules.map((module) => (
          module.key !== activeModule && (
            <TouchableOpacity
              key={module.key}
              style={styles.moduleButton}
              onPress={() => onModuleSwitch(module.key)}
            >
              <Text style={styles.moduleIcon}>{module.icon}</Text>
            </TouchableOpacity>
          )
        ))}
        
        {/* 设置按钮 */}
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={onOpenSettingsDrawer}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    paddingHorizontal: 8,
  },
  
  // 左侧连接按钮
  connectionButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectionIcon: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  
  // 中间状态区域
  statusContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  pingText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  
  // 右侧模块区域
  modulesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moduleButton: {
    padding: 6,
    marginLeft: 4,
  },
  moduleIcon: {
    fontSize: 18,
  },
  settingsButton: {
    padding: 6,
    marginLeft: 8,
  },
  settingsIcon: {
    fontSize: 18,
  },
});

export default TopBarComponent;