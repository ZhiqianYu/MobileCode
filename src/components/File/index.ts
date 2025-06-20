// src/components/File/index.ts
// 文件管理器模块统一导出 - 提供所有组件、管理器、工具类的导出接口
// 职责：模块接口管理、版本控制、向后兼容性
// 依赖：所有文件管理器子模块
// 被使用：外部组件导入文件管理器功能

// ================================
// 主组件导出
// ================================
export { default as SimpleFileManager } from './SimpleFileManager';

// ================================
// 核心管理器导出
// ================================
export { FileDataService } from './FileDataService';
export { NavigationManager } from './NavigationManager';
export { SelectionManager } from './SelectionManager';
export { ThumbnailManager } from './ThumbnailManager';
export { CommandProcessor } from './CommandProcessor';

// ================================
// UI组件导出
// ================================
export { default as FileListView } from './FileListView';
export { default as FileGridView } from './FileGridView';
export { default as BreadcrumbNav } from './BreadcrumbNav';
export { default as FileInfoModal } from './FileInfoModal';

// ================================
// 工具类导出
// ================================
export { FileUtils } from './FileUtils';
export { default as FileCache } from '../../utils/FileCache'; // 🔥 导出你的FileCache

// ================================
// 类型定义导出
// ================================
export type {
  // 核心数据类型
  FileItem,
  ThumbnailResult,
  ThumbnailCache,
  ThumbnailConfig,
  
  // 导航相关类型
  NavigationItem,
  NavigationState,
  BreadcrumbItem,
  
  // 选择相关类型
  SelectionState,
  InteractionResult,
  
  // 操作相关类型
  OperationResult,
  FileOperation,
  ClipboardData,
  
  // 视图相关类型
  ViewMode,
  ViewConfig,
  
  // 缓存相关类型
  CacheStats,
  
  // 错误处理类型
  FileError,
  
  // 进度相关类型
  ProgressState,
  
  // 事件类型
  FileManagerEvent,
  EventPayload,
  
  // 组件属性类型
  FileManagerProps,
  FileListProps,
  FileGridProps,
  
  // 管理器接口类型
  IFileDataService,
  INavigationManager,
  ISelectionManager,
  IThumbnailManager,
  
  // 外部集成类型
  CrossModuleFileInfo,
  EditorFileInfo,
  
  // 配置类型
  FileManagerConfig,
} from './FileTypes';

// ================================
// 扩展管理器导出（未来扩展）
// ================================

// 错误恢复管理器（待实现）
// export { ErrorRecoveryManager } from './ErrorRecoveryManager';

// 持久化缓存管理器（待实现）  
// export { PersistentCacheManager } from './PersistentCacheManager';

// 进度管理器（待实现）
// export { ProgressManager } from './ProgressManager';

// ================================
// 版本信息
// ================================
export const FILE_MANAGER_VERSION = '2.0.0';
export const FILE_MANAGER_BUILD = 'refactored';

// ================================
// 兼容性接口（向后兼容）
// ================================

// 旧版本接口重新导出，保持向后兼容
export type TreeNode = FileItem; // 兼容旧的TreeNode类型
export type FileManagerRef = any; // 兼容旧的ref类型

// ================================
// 工厂函数和便捷方法
// ================================

export const createFileManager = () => {
  return {
    dataService: new FileDataService(),
    navigationManager: new NavigationManager(),
    selectionManager: new SelectionManager(),
    thumbnailManager: new ThumbnailManager(),
  };
};

export const createFileManagerWithDefaults = (config?: Partial<FileManagerConfig>) => {
  const defaultConfig: FileManagerConfig = {
    cacheSize: 100,
    thumbnailSize: 120,
    autoRefresh: true,
    showHiddenFiles: false,
    defaultSortBy: 'name',
    enableThumbnails: true,
    enableAnimations: true,
    ...config,
  };
  
  return {
    ...createFileManager(),
    config: defaultConfig,
  };
};

// ================================
// 调试和开发工具
// ================================

export const FileManagerDevTools = {
  version: FILE_MANAGER_VERSION,
  build: FILE_MANAGER_BUILD,
  
  getManagerStats: (managers: ReturnType<typeof createFileManager>) => ({
    dataService: {
      cacheSize: 'N/A', // 需要管理器实现统计接口
    },
    navigationManager: {
      historyLength: 'N/A',
    },
    selectionManager: {
      selectedCount: managers.selectionManager.getSelectionState().selectedCount,
    },
    thumbnailManager: {
      cacheSize: 'N/A',
    },
  }),
  
  validateFileItem: (item: any): item is FileItem => {
    return item && 
           typeof item.name === 'string' && 
           (item.type === 'file' || item.type === 'directory') &&
           typeof item.icon === 'string';
  },
  
  logFileManagerState: (managers: ReturnType<typeof createFileManager>) => {
    console.group('📁 File Manager State');
    console.log('Selection:', managers.selectionManager.getSelectionState());
    console.log('Navigation:', managers.navigationManager.getCurrentState());
    console.groupEnd();
  },
};

// ================================
// 导出汇总（便于IDE智能提示）
// ================================

export default {
  // 主组件
  SimpleFileManager,
  
  // 管理器
  FileDataService,
  NavigationManager,
  SelectionManager,
  ThumbnailManager,
  CommandProcessor,
  
  // UI组件
  FileListView,
  FileGridView,
  BreadcrumbNav,
  FileInfoModal,
  
  // 工具
  FileUtils,
  
  // 工厂函数
  createFileManager,
  createFileManagerWithDefaults,
  
  // 开发工具
  FileManagerDevTools,
  
  // 版本信息
  version: FILE_MANAGER_VERSION,
  build: FILE_MANAGER_BUILD,
};