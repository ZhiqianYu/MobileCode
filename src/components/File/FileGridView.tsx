// src/components/File/FileGridView.tsx
// 文件网格视图组件 - 以网格形式展示文件，支持缩略图预览
// 职责：网格布局、缩略图显示、选择状态管理、可见区域检测
// 依赖：FileUtils、ThumbnailManager、FlashList
// 被使用：SimpleFileManager

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { FileUtils } from './FileUtils';
import { FileItem } from './FileTypes';

// ================================
// 组件属性接口
// ================================

interface FileGridViewProps {
  items: FileItem[];
  onItemPress: (item: FileItem) => void;
  onItemLongPress?: (item: FileItem) => void;
  selectedItems?: Set<string>;
  numColumns?: number;
  showCheckboxes?: boolean;
  onBackgroundPress?: () => void;
  thumbnailManager?: any;
}

// ================================
// 常量定义
// ================================

const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_MARGIN = 8;
const CONTAINER_PADDING = 16;

// ================================
// 主组件实现
// ================================

const FileGridView: React.FC<FileGridViewProps> = ({
  items,
  onItemPress,
  onItemLongPress,
  selectedItems = new Set(),
  numColumns = 4,
  showCheckboxes = false,
  onBackgroundPress,
  thumbnailManager,
}) => {

  // ================================
  // 状态管理
  // ================================
  const [thumbnailStates, setThumbnailStates] = useState<{[key: string]: string | null}>({});

  // ================================
  // 计算布局
  // ================================
  const itemSize = (SCREEN_WIDTH - CONTAINER_PADDING * 2 - ITEM_MARGIN * (numColumns - 1)) / numColumns;

  // ================================
  // 缩略图处理
  // ================================
  const handleViewableItemsChanged = useCallback(({ viewableItems }: any) => {
      if (!thumbnailManager) return;
      
      // 🔥 按照在原始列表中的索引排序，确保按显示顺序处理缩略图
      const sortedViewableItems = viewableItems
        .map((viewableItem: any) => ({
          item: viewableItem.item as FileItem,
          index: viewableItem.index
        }))
        .sort((a: any, b: any) => a.index - b.index); // 按索引排序
      
      const visibleFiles = sortedViewableItems.map((item: any) => item.item);
      console.log('👁️ 可见文件变化，数量:', visibleFiles.length, '按顺序:', visibleFiles.map(f => f.name).slice(0, 3));
      
      // 🔥 按排序后的顺序请求缩略图
      if (visibleFiles.length > 0) {
        thumbnailManager.requestVisibleThumbnails(visibleFiles);
      }
      
      // 原有的单个文件处理逻辑保持不变...
      visibleFiles.forEach(async (file: FileItem) => {
        if (file.type === 'file' && thumbnailManager.isSupportedFile && thumbnailManager.isSupportedFile(file.name)) {
          const key = FileUtils.getItemKey(file);
          const cached = thumbnailManager.getCachedThumbnail(file);
          
          if (cached === undefined) {
            const thumbnail = await thumbnailManager.requestThumbnail(file);
            setThumbnailStates(prev => {
              return { ...prev, [key]: thumbnail };
            });
          } else {
            setThumbnailStates(prev => {
              return { ...prev, [key]: cached };
            });
          }
        }
      });
    }, [thumbnailManager]);

  // ================================
  // 渲染函数
  // ================================
  const renderThumbnail = useCallback((item: FileItem) => {
    const key = FileUtils.getItemKey(item);
    const cachedThumbnail = thumbnailManager?.getCachedThumbnail(item);
    const isLoading = thumbnailManager?.isLoading(item);
    
    // 优先使用本地状态，然后是缓存，最后是加载状态
    const thumbnail = thumbnailStates[key] ?? cachedThumbnail;

    // 添加详细调试
    console.log('🎨 渲染缩略图:', item.name);
    console.log('🎨 State中的缩略图:', thumbnailStates[key] ? '有' : '无');
    console.log('🎨 Manager中的缓存:', cachedThumbnail ? '有' : '无');
    console.log('🎨 是否正在加载:', isLoading);
    console.log('🎨 最终使用的缩略图:', thumbnail ? thumbnail.substring(0, 80) + '...' : 'null');

    if (item.type === 'directory') {
      return (
        <View style={styles.folderIcon}>
          <Text style={styles.largeIcon}>📁</Text>
        </View>
      );
    }

    // 如果正在加载，显示加载状态
    if (isLoading) {
      console.log('🎨 显示加载中:', item.name);
      return (
        <View style={styles.thumbnailLoading}>
          <ActivityIndicator size="small" color="#4CAF50" />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      );
    }

    // 如果有缩略图，显示缩略图
    if (thumbnail) {
      if (thumbnail.startsWith('code:')) {
        const code = thumbnail.substring(5);
        console.log('🎨 显示代码预览:', item.name);
        return (
          <View style={styles.codePreview}>
            <Text style={styles.codeText} numberOfLines={5}>
              {code}
            </Text>
          </View>
        );
      } else {
        console.log('🎨 显示图片缩略图:', item.name, '源:', thumbnail.substring(0, 80) + '...');
        return (
          <Image 
            source={{ uri: thumbnail }} 
            style={styles.thumbnail}
            resizeMode="cover"
            onError={(error) => {
              console.warn('🎨 图片加载失败:', item.name, error.nativeEvent.error);
            }}
            onLoad={() => {
              console.log('🎨 图片加载成功:', item.name);
            }}
          />
        );
      }
    }

    // 默认显示文件图标（不是缩略图的文件类型）
    console.log('🎨 显示默认图标:', item.name);
    return (
      <View style={styles.defaultIcon}>
        <Text style={styles.largeIcon}>{item.icon}</Text>
      </View>
    );
  }, [thumbnailStates, thumbnailManager]);

  const renderGridItem = useCallback(({ item }: { item: FileItem }) => {
    const key = FileUtils.getItemKey(item);
    const isSelected = selectedItems.has(key);

    return (
      <TouchableOpacity
        style={[
          styles.gridItem,
          { width: itemSize, height: itemSize + 40 },
          isSelected && styles.selectedItem,
        ]}
        onPress={() => onItemPress(item)}
        onLongPress={() => onItemLongPress?.(item)}
        activeOpacity={0.7}
      >
        {(showCheckboxes || isSelected) && (
          <View style={styles.checkboxOverlay}>
            <View style={[
              styles.gridCheckbox,
              isSelected && styles.gridCheckboxSelected
            ]}>
              {isSelected && (
                <Text style={styles.gridCheckmark}>✓</Text>
              )}
            </View>
          </View>
        )}
        
        <View style={[
          styles.thumbnailContainer,
          { width: itemSize - 16, height: itemSize - 32 }
        ]}>
          {renderThumbnail(item)}
        </View>
        
        <Text style={styles.itemName} numberOfLines={2}>
          {item.name}
        </Text>
        
        {item.size && (
          <Text style={styles.itemSize}>
            {item.size}
          </Text>
        )}
      </TouchableOpacity>
    );
  }, [selectedItems, showCheckboxes, itemSize, onItemPress, onItemLongPress, renderThumbnail]);

  // ================================
  // 渲染组件
  // ================================

  return (
    <TouchableOpacity style={styles.container} activeOpacity={1} onPress={onBackgroundPress}>
      <FlashList
        data={items}
        renderItem={renderGridItem}
        numColumns={numColumns}
        estimatedItemSize={itemSize + 40}
        keyExtractor={(item, index) => `${FileUtils.getItemKey(item)}-${index}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50,
          minimumViewTime: 100,
        }}
      />
    </TouchableOpacity>
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
    padding: CONTAINER_PADDING,
  },
  gridItem: {
    margin: ITEM_MARGIN / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2d2d2d',
    borderRadius: 8,
    padding: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedItem: {
    borderColor: '#4CAF50',
    backgroundColor: '#1a3a1a',
  },
  checkboxOverlay: {
    position: 'absolute',
    top: 4,
    left: 4,
    zIndex: 10,
  },
  gridCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#666',
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridCheckboxSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  gridCheckmark: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  thumbnailContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailLoading: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderIcon: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultIcon: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  largeIcon: {
    fontSize: 32,
  },
  codePreview: {
    width: '100%',
    height: '100%',
    padding: 4,
    backgroundColor: '#0c0c0c',
  },
  codeText: {
    color: '#4CAF50',
    fontSize: 8,
    fontFamily: 'monospace',
    lineHeight: 10,
  },
  itemName: {
    color: '#fff',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    height: 28,
  },
  itemSize: {
    color: '#999',
    fontSize: 9,
    marginTop: 2,
  },
  loadingText: {
    color: '#999',
    fontSize: 10,
    marginTop: 4,
  },
});

export default FileGridView;