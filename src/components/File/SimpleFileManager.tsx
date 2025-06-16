// src/components/File/SimpleFileManager.tsx
// 功能：简化版文件管理器，显示文件树和基本操作
// 依赖：React Native基础组件
// 被使用：MainContentComponent

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';

interface FileItem {
  name: string;
  type: 'file' | 'directory';
  size?: string;
  modified?: string;
  icon: string;
}

const SimpleFileManager = React.forwardRef<any, {}>((_, ref) => {
  const [currentPath, setCurrentPath] = useState('/home/user');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [fileOperation, setFileOperation] = useState<'copy' | 'cut' | null>(null);

  // 模拟文件数据
  const mockFiles: FileItem[] = [
    { name: '..', type: 'directory', icon: '📁' },
    { name: 'Documents', type: 'directory', icon: '📁', modified: '2024-01-15' },
    { name: 'Downloads', type: 'directory', icon: '📁', modified: '2024-01-14' },
    { name: 'Pictures', type: 'directory', icon: '📁', modified: '2024-01-13' },
    { name: 'projects', type: 'directory', icon: '📁', modified: '2024-01-12' },
    { name: 'config.json', type: 'file', icon: '📄', size: '2.4 KB', modified: '2024-01-15' },
    { name: 'script.py', type: 'file', icon: '🐍', size: '5.1 KB', modified: '2024-01-14' },
    { name: 'app.js', type: 'file', icon: '📜', size: '12.3 KB', modified: '2024-01-13' },
    { name: 'README.md', type: 'file', icon: '📝', size: '1.8 KB', modified: '2024-01-12' },
    { name: 'image.png', type: 'file', icon: '🖼️', size: '245 KB', modified: '2024-01-11' },
  ];

  const handleItemPress = (item: FileItem) => {
    if (item.name === selectedItem) {
      // 双击效果 - 进入目录或打开文件
      if (item.type === 'directory') {
        if (item.name === '..') {
          setCurrentPath('/home');
        } else {
          setCurrentPath(`${currentPath}/${item.name}`);
        }
      } else {
        Alert.alert('打开文件', `将在编辑器中打开 ${item.name}`);
      }
      setSelectedItem(null);
    } else {
      // 单击选中
      setSelectedItem(item.name);
    }
  };

  const handleLongPress = (item: FileItem) => {
    Alert.alert(
      '文件操作',
      `选择对 "${item.name}" 的操作：`,
      [
        { text: '取消', style: 'cancel' },
        { text: '重命名', onPress: () => console.log('重命名', item.name) },
        { text: '复制', onPress: () => console.log('复制', item.name) },
        { text: '删除', style: 'destructive', onPress: () => console.log('删除', item.name) },
      ]
    );
  };

  // 截断文件名显示
  const truncateFileName = (fileName: string, maxLength: number = 15) => {
    if (fileName.length <= maxLength) {
      return fileName;
    }
    return fileName.substring(0, maxLength - 3) + '...';
  };

  // 暴露方法给父组件
  React.useImperativeHandle(ref, () => ({
    copy: () => {
      if (selectedItem) {
        setCopiedItem(selectedItem);
        setFileOperation('copy');
        Alert.alert('复制', `已复制: ${selectedItem}`);
      } else {
        Alert.alert('提示', '请先选择一个文件或文件夹');
      }
    },
    paste: () => {
      if (copiedItem && fileOperation) {
        const operationType = fileOperation === 'copy' ? '复制' : '移动';
        Alert.alert('粘贴', `${operationType} "${copiedItem}" 到当前目录`);
        if (fileOperation === 'cut') {
          setCopiedItem(null);
          setFileOperation(null);
        }
      } else {
        Alert.alert('提示', '没有可粘贴的文件');
      }
    },
    cut: () => {
      if (selectedItem) {
        setCopiedItem(selectedItem);
        setFileOperation('cut');
        Alert.alert('剪切', `已剪切: ${selectedItem}`);
      } else {
        Alert.alert('提示', '请先选择一个文件或文件夹');
      }
    },
    delete: () => {
      if (selectedItem) {
        Alert.alert(
          '删除确认',
          `确定要删除 "${selectedItem}" 吗？`,
          [
            { text: '取消', style: 'cancel' },
            { 
              text: '删除', 
              style: 'destructive', 
              onPress: () => {
                console.log('删除文件:', selectedItem);
                setSelectedItem(null);
                Alert.alert('删除成功', `已删除: ${selectedItem}`);
              }
            },
          ]
        );
      } else {
        Alert.alert('提示', '请先选择一个文件或文件夹');
      }
    },
    newFile: () => {
      Alert.prompt(
        '新建文件',
        '请输入文件名:',
        (fileName) => {
          if (fileName && fileName.trim()) {
            console.log('创建新文件:', fileName);
            Alert.alert('创建成功', `已创建文件: ${fileName}`);
          }
        },
        'plain-text',
        '',
        'default'
      );
    },
    newDir: () => {
      Alert.prompt(
        '新建文件夹',
        '请输入文件夹名:',
        (dirName) => {
          if (dirName && dirName.trim()) {
            console.log('创建新文件夹:', dirName);
            Alert.alert('创建成功', `已创建文件夹: ${dirName}`);
          }
        },
        'plain-text',
        '',
        'default'
      );
    },
    refresh: () => {
      console.log('刷新文件列表');
      setSelectedItem(null);
      setCopiedItem(null);
      setFileOperation(null);
      Alert.alert('刷新', '文件列表已刷新');
    },
  }));

  const renderFileItem = (item: FileItem, index: number) => {
    const isSelected = selectedItem === item.name;
    
    return (
      <TouchableOpacity
        key={index}
        style={[styles.fileItem, isSelected && styles.fileItemSelected]}
        onPress={() => handleItemPress(item)}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.fileInfo}>
          <Text style={styles.fileIcon}>{item.icon}</Text>
          <View style={styles.fileDetails}>
            <Text style={[styles.fileName, isSelected && styles.fileNameSelected]}>
              {item.name}
            </Text>
            <Text style={styles.fileMetadata}>
              {item.size && `${item.size} • `}{item.modified}
            </Text>
          </View>
        </View>
        
        {item.type === 'directory' && (
          <Text style={styles.chevron}>›</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* 路径栏 */}
      <View style={styles.pathBar}>
        <Text style={styles.pathText}>📁 {currentPath}</Text>
        <TouchableOpacity style={styles.refreshButton}>
          <Text style={styles.refreshIcon}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* 文件列表 */}
      <ScrollView style={styles.fileList} showsVerticalScrollIndicator={false}>
        {mockFiles.map((item, index) => renderFileItem(item, index))}
      </ScrollView>

      {/* 状态栏 */}
      <View style={styles.statusBar}>
        {/* 左侧：文件统计 */}
        <View style={styles.statusLeft}>
          <Text style={styles.statusText}>
            {mockFiles.filter(f => f.type === 'directory').length - 1} 文件夹, {' '}
            {mockFiles.filter(f => f.type === 'file').length} 文件
          </Text>
        </View>
        
        {/* 右侧：选择和复制状态（一行显示） */}
        <View style={styles.statusRight}>
          {selectedItem && (
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>已选择:</Text>
              <Text style={styles.selectedText} numberOfLines={1} ellipsizeMode="middle">
                {truncateFileName(selectedItem)}
              </Text>
            </View>
          )}
          
          {copiedItem && (
            <View style={styles.statusItem}>
              <Text style={styles.operationIcon}>
                {fileOperation === 'copy' ? '📋' : '✂️'}
              </Text>
              <Text style={styles.operationText} numberOfLines={1} ellipsizeMode="middle">
                {truncateFileName(copiedItem)}
              </Text>
            </View>
          )}
        </View>
      </View>

      
    </View>
  );
});

// 设置display name用于调试  
SimpleFileManager.displayName = 'SimpleFileManager';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  pathBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2d2d2d',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  pathText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  refreshButton: {
    padding: 4,
  },
  refreshIcon: {
    fontSize: 18,
  },
  fileList: {
    flex: 1,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  fileItemSelected: {
    backgroundColor: '#2d4a3d',
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  fileNameSelected: {
    color: '#4CAF50',
  },
  fileMetadata: {
    color: '#999',
    fontSize: 12,
  },
  chevron: {
    color: '#666',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusBar: {
    flexDirection: 'row', // 左右布局
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2d2d2d',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#444',
    minHeight: 40,
  },
  statusLeft: {
    flex: 1, // 占据左侧空间
  },
  statusText: {
    color: '#999',
    fontSize: 12,
  },
  statusRight: {
    flexDirection: 'row', // 右侧内容也是左右排列
    alignItems: 'center',
    flex: 1, // 占据右侧空间
    justifyContent: 'flex-end', // 右对齐
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12, // 右侧各项之间的间距
  },
  statusLabel: {
    color: '#999',
    fontSize: 11,
    marginRight: 4,
  },
  selectedText: {
    color: '#4CAF50',
    fontSize: 11,
    fontWeight: '500',
    maxWidth: 80, // 限制最大宽度
  },
  operationIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  operationText: {
    color: '#2196F3',
    fontSize: 11,
    fontWeight: '500',
    maxWidth: 80, // 限制最大宽度
  },
});

export default SimpleFileManager;