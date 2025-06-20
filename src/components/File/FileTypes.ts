// src/components/File/FileTypes.ts
// 类型定义中心 - 所有文件管理器相关的类型定义和接口
// 职责：统一类型定义、数据结构规范、跨组件通信接口
// 依赖：无
// 被使用：所有文件管理器相关组件

// ================================
// 核心数据类型
// ================================

export interface FileItem {
  name: string;
  type: 'file' | 'directory';
  path?: string;
  uri?: string;
  size?: string;
  sizeBytes?: number;
  modified?: string;
  icon: string;
}

export interface ThumbnailResult {
  data: string;
  sizeBytes: number;
  type: 'image' | 'code';
}

export interface ThumbnailCache {
  [key: string]: string | null;
}

export interface ThumbnailConfig {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'jpeg' | 'png';
}

// ================================
// 导航相关类型
// ================================
export interface NavigationState {
  level: 'app_home' | 'function_root' | 'folder'; // 三个层级
  functionType?: 'app' | 'phone' | 'network'; // 当前功能类型
  currentPath?: string;
  currentFolderId?: string;
}

export interface NavigationItem {
  path: string;
  name: string;
  type: 'app_home' | 'function_root' | 'folder'; // 对应三个层级
  functionType?: 'app' | 'phone' | 'network'; // 功能类型
  uri?: string;
  folderId?: string;
}

// ================================
// 选择相关类型
// ================================

export interface SelectionState {
  selectedItems: Set<string>;
  highlightedItem: string | null;
  multiSelectMode: boolean;
  selectedCount: number;
  selectedItemsArray: string[];
}

export type InteractionResult = 
  | { type: 'single'; item: FileItem }
  | { type: 'double'; item: FileItem }
  | { type: 'select'; item: FileItem }
  | { type: 'deselect'; item: FileItem }
  | { type: 'multiselect_enter'; item: FileItem }
  | { type: 'multiselect_exit' };

// ================================
// 缓存相关类型
// ================================

export interface CacheStats {
  folders: number;
  thumbnails: number;
  totalSize: string;
  usagePercent: number;
  limit: string;
  averageThumbnailSize: string;
}

// ================================
// 操作结果类型
// ================================

export interface OperationResult {
  id: string;
  type: 'create' | 'delete' | 'rename' | 'copy' | 'move';
  message: string;
  details: string;
  canUndo: boolean;
  undoData?: any;
}

// ================================
// 面包屑导航类型
// ================================

export interface BreadcrumbItem {
  name: string;
  path: string;
  onPress: () => void;
}

// ================================
// 视图相关类型
// ================================

export type ViewMode = 'list' | 'grid';

export interface ViewConfig {
  mode: ViewMode;
  sortBy: 'name' | 'size' | 'modified' | 'type';
  sortOrder: 'asc' | 'desc';
  showHidden: boolean;
}

// ================================
// 文件操作类型
// ================================

export interface FileOperation {
  type: 'copy' | 'cut' | 'delete' | 'rename' | 'create';
  items: FileItem[];
  targetPath?: string;
  newName?: string;
}

export interface ClipboardData {
  items: FileItem[];
  operation: 'copy' | 'cut';
  timestamp: number;
}

// ================================
// 错误处理类型
// ================================

export interface FileError {
  code: string;
  message: string;
  context: string;
  recoverable: boolean;
  retryAction?: () => Promise<void>;
}

// ================================
// 进度相关类型
// ================================

export interface ProgressState {
  isLoading: boolean;
  progress: number;
  message: string;
  canCancel: boolean;
}

// ================================
// 事件类型
// ================================

export type FileManagerEvent = 
  | 'files_loaded'
  | 'selection_changed' 
  | 'navigation_changed'
  | 'view_changed'
  | 'operation_completed';

export interface EventPayload {
  files_loaded: FileItem[];
  selection_changed: SelectionState;
  navigation_changed: NavigationState;
  view_changed: ViewConfig;
  operation_completed: OperationResult;
}

// ================================
// 组件属性类型
// ================================

export interface FileManagerProps {
  mode?: 'browse' | 'select' | 'save';
  initialPath?: string;
  allowMultiSelect?: boolean;
  fileFilter?: (file: FileItem) => boolean;
  onFileSelected?: (files: FileItem[]) => void;
  onPathChanged?: (path: string) => void;
  onError?: (error: FileError) => void;
}

export interface FileListProps {
  items: FileItem[];
  selectedItems: Set<string>;
  showCheckboxes: boolean;
  onItemPress: (item: FileItem) => void;
  onItemLongPress: (item: FileItem) => void;
  onBackgroundPress?: () => void;
}

export interface FileGridProps extends FileListProps {
  numColumns: number;
  thumbnailManager?: any;
}

// ================================
// 管理器接口类型
// ================================

export interface IFileDataService {
  getFiles(folderUri?: string, folderId?: string): Promise<FileItem[]>;
  refreshFiles(folderUri?: string, folderId?: string): Promise<FileItem[]>;
  searchFiles(files: FileItem[], query: string): FileItem[];
  createFile(parentUri: string, fileName: string, content?: string): Promise<void>;
  createDirectory(parentUri: string, dirName: string): Promise<void>;
  deleteFile(fileUri: string): Promise<void>;
  clearAllCache(): void;
}

export interface INavigationManager {
  enterFolder(folderUri: string, folderName: string, folderId?: string): void;
  goBack(): { item: NavigationItem | null; shouldRefresh: boolean };
  canGoBack(): boolean;
  getCurrentState(): NavigationState;
  getCurrentPath(): string;
  getBreadcrumbItems(): BreadcrumbItem[];
  reset(): void;
}

export interface ISelectionManager {
  handlePress(item: FileItem): InteractionResult;
  handleLongPress(item: FileItem): InteractionResult;
  handleBackgroundPress(): InteractionResult | null;
  getSelectionState(): SelectionState;
  getItemState(item: FileItem): {
    isSelected: boolean;
    isHighlighted: boolean;
    showCheckbox: boolean;
  };
  selectAll(items: FileItem[]): void;
  clearSelection(): void;
  getSelectedFiles(allFiles: FileItem[]): FileItem[];
}

export interface IThumbnailManager {
  requestThumbnail(file: FileItem): Promise<string | null>;
  requestVisibleThumbnails(files: FileItem[]): void;
  getCachedThumbnail(file: FileItem): string | null | undefined;
  isLoading(file: FileItem): boolean;
  clearCache(): void;
}

// ================================
// 外部集成类型
// ================================

export interface CrossModuleFileInfo {
  name: string;
  path: string;
  uri: string;
  type: 'file' | 'directory';
  mimeType?: string;
}

export interface EditorFileInfo {
  content: string;
  fileName: string;
  filePath?: string;
  isModified: boolean;
  tabId: string;
}

// ================================
// 配置类型
// ================================

export interface FileManagerConfig {
  cacheSize: number;
  thumbnailSize: number;
  autoRefresh: boolean;
  showHiddenFiles: boolean;
  defaultSortBy: 'name' | 'size' | 'modified';
  enableThumbnails: boolean;
  enableAnimations: boolean;
}