// src/components/File/FileListView.tsx
// 文件列表视图组件 - 以列表形式展示文件和文件夹
// 职责：列表渲染、交互处理、选择状态显示、背景点击检测
// 依赖：FileUtils、FileTypes、FlashList
// 被使用：SimpleFileManager

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { FileUtils } from './FileUtils';
import { FileItem } from './FileTypes';

// ================================
// 组件属性接口
// ================================

interface FileListViewProps {
  items: FileItem[];
  onItemPress: (item: FileItem) => void;
  onItemLongPress?: (item: FileItem) => void;
  selectedItems?: Set<string>;
  showCheckboxes?: boolean;
  onBackgroundPress?: () => void;
}

// ================================
// 主组件实现
// ================================

const FileListView: React.FC<FileListViewProps> = ({
  items,
  onItemPress,
  onItemLongPress,
  selectedItems = new Set(),
  showCheckboxes = false,
  onBackgroundPress,
}) => {

  // ================================
  // 工具函数
  // ================================

  const getFileTypeText = (fileName: string): string => {
    if (FileUtils.isImageFile(fileName)) return '图片';
    if (FileUtils.isCodeFile(fileName)) return '代码';
    if (FileUtils.isArchiveFile(fileName)) return '压缩包';
    
    const ext = FileUtils.getExtension(fileName);
    if (ext) return ext.toUpperCase();
    
    return '文件';
  };

  // ================================
  // 渲染函数
  // ================================

  const renderItem = useCallback(({ item }: { item: FileItem }) => {
    const key = FileUtils.getItemKey(item);
    const isSelected = selectedItems.has(key);

    return (
      <TouchableOpacity
        style={[
          styles.listItem,
          isSelected && styles.selectedItem,
        ]}
        onPress={() => onItemPress(item)}
        onLongPress={() => onItemLongPress?.(item)}
        activeOpacity={0.7}
      >
        <View style={styles.leftSection}>
          {(showCheckboxes || isSelected) && (
            <View style={styles.checkboxContainer}>
              <View style={[
                styles.checkbox,
                isSelected && styles.checkboxSelected
              ]}>
                {isSelected && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
            </View>
          )}
          
          <View style={styles.iconContainer}>
            <Text style={styles.fileIcon}>{item.icon}</Text>
          </View>
        </View>

        <View style={styles.middleSection}>
          <Text style={styles.fileName} numberOfLines={1}>
            {item.name}
          </Text>
          
          <View style={styles.fileDetails}>
            <Text style={styles.fileType}>
              {item.type === 'directory' ? '文件夹' : getFileTypeText(item.name)}
            </Text>
            {item.size && (
              <>
                <Text style={styles.separator}> • </Text>
                <Text style={styles.fileSize}>{item.size}</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.rightSection}>
          {item.modified && (
            <Text style={styles.modifiedTime} numberOfLines={1}>
              {item.modified}
            </Text>
          )}
          
          <View style={styles.typeIndicator}>
            {item.type === 'directory' && (
              <Text style={styles.directoryIndicator}>📁</Text>
            )}
            {FileUtils.isImageFile(item.name) && (
              <Text style={styles.imageIndicator}>🖼️</Text>
            )}
            {FileUtils.isCodeFile(item.name) && (
              <Text style={styles.codeIndicator}>📄</Text>
            )}
            {FileUtils.isArchiveFile(item.name) && (
              <Text style={styles.archiveIndicator}>📦</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [selectedItems, showCheckboxes, onItemPress, onItemLongPress, getFileTypeText]);

  const handleBackgroundTouch = useCallback(() => {
    onBackgroundPress?.();
  }, [onBackgroundPress]);

  // ================================
  // 渲染组件
  // ================================

  return (
    <TouchableWithoutFeedback onPress={handleBackgroundTouch}>
      <View style={styles.container}>
        <FlashList
          data={items}
          renderItem={renderItem}
          estimatedItemSize={72}
          keyExtractor={(item, index) => `${FileUtils.getItemKey(item)}-${index}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          removeClippedSubviews={true}
          maxToRenderPerBatch={20}
          updateCellsBatchingPeriod={100}
          windowSize={10}
        />
      </View>
    </TouchableWithoutFeedback>
  );
};

// ================================
// 样式定义
// ================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2d2d2d',
    borderBottomWidth: 1,
    borderBottomColor: '#3d3d3d',
    minHeight: 72,
  },
  selectedItem: {
    backgroundColor: '#1a3a1a',
    borderBottomColor: '#4CAF50',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxContainer: {
    marginRight: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#666',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3d3d3d',
    borderRadius: 8,
  },
  fileIcon: {
    fontSize: 20,
  },
  middleSection: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 12,
  },
  fileName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  fileDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileType: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '500',
  },
  separator: {
    color: '#666',
    fontSize: 12,
  },
  fileSize: {
    color: '#999',
    fontSize: 12,
  },
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 80,
  },
  modifiedTime: {
    color: '#999',
    fontSize: 11,
    marginBottom: 4,
  },
  typeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  directoryIndicator: {
    fontSize: 12,
    opacity: 0.7,
  },
  imageIndicator: {
    fontSize: 12,
    opacity: 0.7,
  },
  codeIndicator: {
    fontSize: 12,
    opacity: 0.7,
  },
  archiveIndicator: {
    fontSize: 12,
    opacity: 0.7,
  },
});

export default FileListView;