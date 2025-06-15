// src/components/Layout/MainContent.tsx
// 功能：主内容区域，根据当前视图显示不同功能（文件、编辑器、终端、转发）
// 依赖：ViewMode类型, NewTerminal组件
// 被使用：MainScreen

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { ViewMode } from '../../types/ui';
import NewTerminal from '../Terminal/NewTerminal';

interface MainContentProps {
  currentView: ViewMode;
  terminalRef?: React.RefObject<any>;
  isConnected?: boolean;
  isConnecting?: boolean;
  currentConnection?: any;
}

const MainContent: React.FC<MainContentProps> = ({ 
  currentView, 
  terminalRef,
  isConnected,
  isConnecting,
  currentConnection 
}) => {
  const renderContent = () => {
    switch (currentView) {
      case 'terminal':
        return <NewTerminal ref={terminalRef} />;
      
      case 'file':
        return (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>📁</Text>
            <Text style={styles.placeholderLabel}>文件浏览器</Text>
            <Text style={styles.placeholderDesc}>
              浏览和管理远程文件{'\n'}
              - 查看目录结构{'\n'}
              - 上传/下载文件{'\n'}
              - 文件权限管理
            </Text>
            <TouchableOpacity style={styles.comingSoonButton}>
              <Text style={styles.comingSoonText}>即将推出</Text>
            </TouchableOpacity>
            {isConnected && (
              <View style={styles.connectionHint}>
                <Text style={styles.connectionHintText}>
                  已连接到 {currentConnection?.host}
                </Text>
              </View>
            )}
          </View>
        );
        
      case 'editor':
        return (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>📝</Text>
            <Text style={styles.placeholderLabel}>代码编辑器</Text>
            <Text style={styles.placeholderDesc}>
              在线编辑远程文件{'\n'}
              - 语法高亮{'\n'}
              - 自动保存{'\n'}
              - 多文件标签
            </Text>
            <TouchableOpacity style={styles.comingSoonButton}>
              <Text style={styles.comingSoonText}>即将推出</Text>
            </TouchableOpacity>
            {isConnected && (
              <View style={styles.connectionHint}>
                <Text style={styles.connectionHintText}>
                  已连接到 {currentConnection?.host}
                </Text>
              </View>
            )}
          </View>
        );
        
      case 'forward':
        return (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>🔄</Text>
            <Text style={styles.placeholderLabel}>端口转发</Text>
            <Text style={styles.placeholderDesc}>
              管理端口映射和隧道{'\n'}
              - 本地端口转发{'\n'}
              - 远程端口转发{'\n'}
              - 动态隧道
            </Text>
            <TouchableOpacity style={styles.comingSoonButton}>
              <Text style={styles.comingSoonText}>即将推出</Text>
            </TouchableOpacity>
            {isConnected && (
              <View style={styles.connectionHint}>
                <Text style={styles.connectionHintText}>
                  已连接到 {currentConnection?.host}
                </Text>
              </View>
            )}
          </View>
        );
        
      default:
        return (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>❓</Text>
            <Text style={styles.placeholderLabel}>未知视图</Text>
            <Text style={styles.placeholderDesc}>请选择一个功能</Text>
          </View>
        );
    }
  };

  return <View style={styles.container}>{renderContent()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  placeholderText: {
    fontSize: 64,
    marginBottom: 16,
  },
  placeholderLabel: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  placeholderDesc: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  comingSoonButton: {
    backgroundColor: '#333',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
  },
  comingSoonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
  },
  connectionHint: {
    marginTop: 16,
    backgroundColor: '#1a2e1a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  connectionHintText: {
    color: '#4CAF50',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default MainContent;