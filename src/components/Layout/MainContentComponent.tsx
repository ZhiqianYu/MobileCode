// src/components/Layout/MainContentComponent.tsx
// 功能：2号组件 - 主内容区，根据模块显示不同内容，有3D突起效果
// 依赖：模块类型定义
// 被使用：MainContainer

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';

export type ModuleType = 'file' | 'editor' | 'forward' | 'terminal';

interface MainContentComponentProps {
  activeModule: ModuleType;
  height: number;
  width: number;
}

const MainContentComponent: React.FC<MainContentComponentProps> = ({
  activeModule,
  height,
  width,
}) => {
  
  // 模块内容渲染
  const renderModuleContent = () => {
    switch (activeModule) {
      case 'file':
        return (
          <View style={styles.moduleContent}>
            <Text style={styles.moduleTitle}>📁 文件管理模块</Text>
            <Text style={styles.moduleDescription}>
              这里将显示文件浏览器{'\n'}
              - 目录结构{'\n'}
              - 文件列表{'\n'}
              - 文件操作
            </Text>
          </View>
        );
        
      case 'editor':
        return (
          <View style={styles.moduleContent}>
            <Text style={styles.moduleTitle}>📝 编辑器模块</Text>
            <Text style={styles.moduleDescription}>
              这里将显示代码编辑器{'\n'}
              - 语法高亮{'\n'}
              - 行号显示{'\n'}
              - 多文件标签
            </Text>
          </View>
        );
        
      case 'forward':
        return (
          <View style={styles.moduleContent}>
            <Text style={styles.moduleTitle}>🔄 端口转发模块</Text>
            <Text style={styles.moduleDescription}>
              这里将显示浏览器内核{'\n'}
              - 网页浏览{'\n'}
              - 端口转发管理{'\n'}
              - 开发预览
            </Text>
          </View>
        );
        
      case 'terminal':
        return (
          <View style={styles.moduleContent}>
            <Text style={styles.moduleTitle}>💻 终端模块</Text>
            <Text style={styles.moduleDescription}>
              这里将显示终端界面{'\n'}
              - SSH连接{'\n'}
              - 本地终端{'\n'}
              - 命令执行
            </Text>
          </View>
        );
        
      default:
        return (
          <View style={styles.moduleContent}>
            <Text style={styles.moduleTitle}>❓ 未知模块</Text>
          </View>
        );
    }
  };

  return (
    <View style={[
      styles.container,
      { height, width },
    ]}>
      {/* 3D效果的内容区域 */}
      <View style={styles.contentArea}>
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderModuleContent()}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    position: 'relative',
  },
  
  // 3D效果的内容区域
  contentArea: {
    flex: 1,
    margin: 4, // 为3D效果留出空间
    backgroundColor: '#222',
    borderRadius: 8,
    // 3D突起效果
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6, // Android阴影
    // 内部阴影效果（通过边框模拟）
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: '#333',
    borderLeftColor: '#333',
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderBottomColor: '#111',
    borderRightColor: '#111',
  },
  
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  
  // 模块内容样式
  moduleContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  moduleTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  moduleDescription: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'monospace',
  },
});

export default MainContentComponent;