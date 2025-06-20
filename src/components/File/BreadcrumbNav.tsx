// src/components/File/BreadcrumbNav.tsx
// 面包屑导航组件 - 支持路径快速跳转和智能显示
// 职责：路径显示、层级跳转、省略处理、完整路径展示
// 依赖：React Native基础组件
// 被使用：SimpleFileManager

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import { BreadcrumbItem } from './FileTypes';

// ================================
// 组件属性接口
// ================================

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  maxVisibleItems?: number;
}

// ================================
// 主组件实现
// ================================

const BreadcrumbNav: React.FC<BreadcrumbNavProps> = ({ 
  items, 
  maxVisibleItems = 2  // 减少显示数量，为长路径留出空间
}) => {
  // ================================
  // 状态管理
  // ================================
  const [showFullPath, setShowFullPath] = useState(false);

  // ================================
  // 工具函数
  // ================================

  const getVisibleItems = () => {
    if (items.length <= maxVisibleItems) {
      return items.map(item => ({
        ...item,
        name: item.name.length > 15 ? item.name.slice(0, 12) + '...' : item.name
      }));
    }
    
    const visibleItems = items.slice(-maxVisibleItems);
    return [
      { name: '...', path: '', onPress: () => setShowFullPath(true) },
      ...visibleItems.map(item => ({
        ...item,
        name: item.name.length > 15 ? item.name.slice(0, 12) + '...' : item.name
      })),
    ];
  };

  // ================================
  // 渲染逻辑
  // ================================

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.rootText}>根目录</Text>
      </View>
    );
  }

  const visibleItems = getVisibleItems();

  return (
    <>
      <View style={styles.container}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {visibleItems.map((item, index) => (
            <React.Fragment key={`${item.path}-${index}`}>
              {index > 0 && <Text style={styles.separator}> › </Text>}
              
              {item.name === '...' ? (
                <TouchableOpacity onPress={item.onPress}>
                  <Text style={styles.ellipsis}>{item.name}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  onPress={() => {
                    console.log('🔗 面包屑点击:', item.name);
                    item.onPress();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.itemText,
                    index === visibleItems.length - 1 && styles.currentItem
                  ]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            </React.Fragment>
          ))}
        </ScrollView>
        
        {items.length > maxVisibleItems && (
          <TouchableOpacity 
            style={styles.expandButton}
            onPress={() => setShowFullPath(true)}
          >
            <Text style={styles.expandButtonText}>▼</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={showFullPath}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFullPath(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFullPath(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>完整路径</Text>
            <ScrollView style={styles.modalScroll}>
              {items.map((item, index) => (
                <TouchableOpacity
                  key={`${item.path}-${index}`}
                  style={styles.modalItem}
                  onPress={() => {
                    setShowFullPath(false);
                    item.onPress();
                  }}
                >
                  <Text style={styles.modalItemText}>
                    {'  '.repeat(index)}{index > 0 ? '└ ' : ''}{item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

// ================================
// 样式定义
// ================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  scrollContent: {
    alignItems: 'center',
  },
  separator: {
    color: '#666',
    marginHorizontal: 4,
    fontSize: 14,
  },
  itemText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
  currentItem: {
    color: '#fff',
    fontWeight: 'bold',
  },
  ellipsis: {
    color: '#999',
    fontSize: 14,
    fontWeight: 'bold',
  },
  expandButton: {
    marginLeft: 4,
    padding: 4,
  },
  expandButtonText: {
    color: '#999',
    fontSize: 12,
  },
  rootText: {
    color: '#999',
    fontSize: 14,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 16,
    maxWidth: '80%',
    maxHeight: '60%',
    minWidth: 250,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalScroll: {
    maxHeight: 300,
  },
  modalItem: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  modalItemText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'monospace',
  },
});

export default BreadcrumbNav;