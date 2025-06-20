// src/components/File/NavigationManager.ts
// 导航管理器 - 统一的三级导航结构管理
// Level 0: app_home (3选1页面)
// Level 1: function_root (功能根目录)  
// Level 2+: folder (具体文件夹)

import { NavigationItem, NavigationState } from './FileTypes';

type FunctionType = 'app' | 'phone' | 'network';

export class NavigationManager {
  // ================================
  // 状态管理
  // ================================
  private history: NavigationItem[] = [];
  private currentIndex = -1;
  private state: NavigationState = { level: 'app_home' };
  private callbacks = new Map<string, Function[]>();

  // ================================
  // 功能级别导航
  // ================================

  enterFunction(functionType: FunctionType): void {
    console.log('🚀 进入功能:', functionType);
    
    // 重置历史记录，添加功能根节点
    this.history = [{
      path: '',
      name: this.getFunctionDisplayName(functionType),
      type: 'function_root',
      functionType,
    }];
    
    this.currentIndex = 0;
    this.state = {
      level: 'function_root',
      functionType,
    };
    
    this.notifyNavigationChange();
  }

  enterFolder(folderUri: string, folderName: string, folderId?: string): void {
    if (this.state.level === 'app_home') {
      console.warn('⚠️ 无法从app_home直接进入文件夹，请先进入功能');
      return;
    }
    
    console.log('📁 进入文件夹:', folderName, '当前功能:', this.state.functionType);
    
    // 清除前进历史
    this.history = this.history.slice(0, this.currentIndex + 1);
    
    // 添加新文件夹
    const newItem: NavigationItem = {
      path: folderUri,
      name: folderName,
      type: 'folder',
      functionType: this.state.functionType,
      uri: folderUri,
      folderId,
    };
    
    this.history.push(newItem);
    this.currentIndex = this.history.length - 1;
    
    this.state = {
      level: 'folder',
      functionType: this.state.functionType,
      currentPath: folderUri,
      currentFolderId: folderId,
    };
    
    this.notifyNavigationChange();
  }

  // ================================
  // 返回导航
  // ================================

  goBack(): { item: NavigationItem | null; shouldRefresh: boolean } {
    console.log('🔙 导航返回，当前索引:', this.currentIndex, '历史长度:', this.history.length);
    
    if (this.currentIndex <= 0) {
      // 已经在功能根目录，返回app_home
      console.log('🏠 返回应用首页');
      this.reset();
      return { 
        item: { path: '', name: 'app_home', type: 'app_home' }, 
        shouldRefresh: true 
      };
    }
    
    // 返回上一级
    this.currentIndex--;
    const previousItem = this.history[this.currentIndex];
    
    console.log('📍 返回到:', previousItem);
    
    if (previousItem.type === 'function_root') {
      this.state = {
        level: 'function_root',
        functionType: previousItem.functionType,
      };
    } else {
      this.state = {
        level: 'folder',
        functionType: previousItem.functionType,
        currentPath: previousItem.path,
        currentFolderId: previousItem.folderId,
      };
    }
    
    this.notifyNavigationChange();
    return { item: previousItem, shouldRefresh: true };
  }

  goToIndex(index: number): { item: NavigationItem | null; shouldRefresh: boolean } {
    console.log('🎯 导航到索引:', index, '历史长度:', this.history.length);
    
    if (index < 0 || index >= this.history.length || !this.history[index]) {
      console.warn('⚠️ 无效的导航索引:', index);
      return { item: null, shouldRefresh: false };
    }
    
    this.currentIndex = index;
    const item = this.history[index];
    
    console.log('📍 导航到项目:', item);
    
    if (item.type === 'function_root') {
      this.state = {
        level: 'function_root',
        functionType: item.functionType,
      };
    } else if (item.type === 'folder') {
      this.state = {
        level: 'folder',
        functionType: item.functionType,
        currentPath: item.path,
        currentFolderId: item.folderId,
      };
    }
    
    this.notifyNavigationChange();
    return { item, shouldRefresh: true };
  }

  goToAppHome(): { item: NavigationItem; shouldRefresh: boolean } {
    console.log('🏠 返回应用首页');
    this.reset();
    return { 
      item: { path: '', name: 'app_home', type: 'app_home' }, 
      shouldRefresh: true 
    };
  }

  // ================================
  // 状态查询
  // ================================

  canGoBack(): boolean {
    return this.state.level !== 'app_home';
  }

  getCurrentState(): NavigationState {
    return { ...this.state };
  }

  getCurrentPath(): string {
    return this.state.currentPath || '';
  }

  getCurrentFunctionType(): FunctionType | undefined {
    return this.state.functionType;
  }

  getBreadcrumbItems(): Array<{name: string, path: string, onPress: () => void}> {
    const items: Array<{name: string, path: string, onPress: () => void}> = [];
    
    // 遍历历史记录生成面包屑
    for (let i = 0; i <= this.currentIndex && i < this.history.length; i++) {
      const item = this.history[i];
      
      items.push({
        name: item.name,
        path: item.path,
        onPress: () => {
          console.log('🔗 面包屑点击:', item.name, '索引:', i);
          this.goToIndex(i);
        },
      });
    }
    
    return items;
  }

  // ================================
  // 工具方法
  // ================================

  reset(): void {
    console.log('🔄 重置导航管理器');
    this.history = [];
    this.currentIndex = -1;
    this.state = { level: 'app_home' };
    this.notifyNavigationChange();
  }

  private getFunctionDisplayName(functionType: FunctionType): string {
    switch (functionType) {
      case 'app': return '应用文件';
      case 'phone': return '手机文件';
      case 'network': return '网络文件';
      default: return '未知功能';
    }
  }

  // ================================
  // 事件监听
  // ================================

  on(event: 'navigation_changed', callback: (state: NavigationState) => void): () => void {
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

  private notifyNavigationChange(): void {
    const callbacks = this.callbacks.get('navigation_changed') || [];
    const state = this.getCurrentState();
    callbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.warn('Navigation callback error:', error);
      }
    });
  }
}