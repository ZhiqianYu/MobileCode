// src/components/File/SelectionManager.ts
// 选择状态管理器 - 处理文件选择、多选模式、双击检测等所有选择相关逻辑
// 职责：文件选择状态、多选模式切换、双击检测、背景点击处理
// 依赖：FileUtils（获取文件键值）
// 被使用：SimpleFileManager

import { FileUtils } from './FileUtils';
import { FileItem, InteractionResult, SelectionState } from './FileTypes';

export class SelectionManager {
  // ================================
  // 状态管理
  // ================================
  private selectedItems = new Set<string>();
  private highlightedItem: string | null = null;
  private multiSelectMode = false;
  private lastPressTime = 0;
  private lastPressedItem: string | null = null;
  private doubleClickCooldown = 0; // 添加双击冷却期
  private callbacks = new Map<string, Function[]>();

  // ================================
  // 核心交互处理
  // ================================

  handlePress(item: FileItem): InteractionResult {
    const key = FileUtils.getItemKey(item);
    const now = Date.now();
    
    // 如果在双击冷却期内，忽略点击
    if (now < this.doubleClickCooldown) {
      return { type: 'single', item }; // 返回单击但不执行逻辑
    }
    
    const isDoubleClick = this.lastPressedItem === key && now - this.lastPressTime < 300;
    
    if (isDoubleClick) {
      // 设置冷却期，防止三击或多击
      this.doubleClickCooldown = now + 500; // 500ms冷却期
      this.lastPressTime = 0;
      this.lastPressedItem = null;
      this.clearHighlight();
      return { type: 'double', item };
    }

    this.lastPressTime = now;
    this.lastPressedItem = key;

    if (this.multiSelectMode) {
      return this.handleMultiSelectPress(item, key);
    } else {
      this.setHighlight(key);
      return { type: 'single', item };
    }
  }

  handleLongPress(item: FileItem): InteractionResult {
    const key = FileUtils.getItemKey(item);
    
    console.log('🔗 长按处理开始:', item.name, '键:', key, '当前多选模式:', this.multiSelectMode);
    console.log('🔗 长按前选中项:', Array.from(this.selectedItems));
    
    if (!this.multiSelectMode) {
      console.log('🔗 进入多选模式，选中单个文件:', item.name);
      this.multiSelectMode = true;
      this.selectedItems.clear();
      this.selectedItems.add(key);
      this.clearHighlight();
      
      console.log('🔗 长按后选中项:', Array.from(this.selectedItems));
      this.notifySelectionChange();
      return { type: 'multiselect_enter', item };
    } else {
      console.log('🔗 已在多选模式，切换选择状态');
      return this.handleMultiSelectPress(item, key);
    }
  }

  handleBackgroundPress(): InteractionResult | null {
    if (this.multiSelectMode) {
      return this.exitMultiSelectMode();
    } else if (this.highlightedItem) {
      this.clearHighlight();
      return null;
    }
    return null;
  }

  // ================================
  // 选择操作
  // ================================

  selectAll(items: FileItem[]): void {
    console.log('🔗 执行全选操作，文件数量:', items.length);
    console.log('🔗 全选调用堆栈:', new Error().stack);
    
    this.multiSelectMode = true;
    this.selectedItems.clear();
    items.forEach(item => {
      this.selectedItems.add(FileUtils.getItemKey(item));
    });
    this.notifySelectionChange();
  }

  clearSelection(): void {
    this.selectedItems.clear();
    this.highlightedItem = null;
    this.multiSelectMode = false;
    this.notifySelectionChange();
  }

  exitMultiSelectMode(): InteractionResult {
    this.multiSelectMode = false;
    this.selectedItems.clear();
    this.notifySelectionChange();
    return { type: 'multiselect_exit' };
  }

  // ================================
  // 状态查询
  // ================================

  getSelectionState(): SelectionState {
    return {
      selectedItems: new Set(this.selectedItems),
      highlightedItem: this.highlightedItem,
      multiSelectMode: this.multiSelectMode,
      selectedCount: this.selectedItems.size,
      selectedItemsArray: Array.from(this.selectedItems),
    };
  }

  getItemState(item: FileItem) {
    const key = FileUtils.getItemKey(item);
    return {
      isSelected: this.selectedItems.has(key),
      isHighlighted: this.highlightedItem === key,
      showCheckbox: this.multiSelectMode,
    };
  }

  getSelectedFiles(allFiles: FileItem[]): FileItem[] {
    return allFiles.filter(file => 
      this.selectedItems.has(FileUtils.getItemKey(file))
    );
  }

  // ================================
  // 事件监听
  // ================================

  on(event: 'selection_changed', callback: (state: SelectionState) => void): () => void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event)!.push(callback);
    
    return () => {
      const eventCallbacks = this.callbacks.get(event);
      if (eventCallbacks) {
        const index = eventCallbacks.indexOf(callback);
        if (index > -1) {
          eventCallbacks.splice(index, 1);
        }
      }
    };
  }

  // ================================
  // 私有方法
  // ================================

  private handleMultiSelectPress(item: FileItem, key: string): InteractionResult {
    if (this.selectedItems.has(key)) {
      this.selectedItems.delete(key);
      if (this.selectedItems.size === 0) {
        this.multiSelectMode = false;
        this.notifySelectionChange();
        return { type: 'multiselect_exit' };
      }
      this.notifySelectionChange();
      return { type: 'deselect', item };
    } else {
      this.selectedItems.add(key);
      this.notifySelectionChange();
      return { type: 'select', item };
    }
  }

  private setHighlight(key: string): void {
    this.highlightedItem = key;
    setTimeout(() => {
      if (this.highlightedItem === key) {
        this.highlightedItem = null;
      }
    }, 2000);
  }

  private clearHighlight(): void {
    this.highlightedItem = null;
  }

  private notifySelectionChange(): void {
    const callbacks = this.callbacks.get('selection_changed') || [];
    const state = this.getSelectionState();
    callbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.warn('Selection callback error:', error);
      }
    });
  }
}