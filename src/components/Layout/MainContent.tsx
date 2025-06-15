// src/components/Layout/MainContent.tsx - 简化版本
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { ViewMode } from '../../types/ui';
import Terminal from '../Terminal/Terminal';

interface MainContentProps {
  currentView: ViewMode;
}

const MainContent: React.FC<MainContentProps> = ({ currentView }) => {
  const renderContent = () => {
    switch (currentView) {
      case 'terminal':
        return <Terminal />;
      
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
          </View>
        );
        
      default:
        return null;
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
});

export default MainContent;