// src/components/File/FileDataService.ts
// 数据管理服务 - 统一处理文件数据获取、缓存、搜索等数据相关操作
// 职责：文件列表获取、缓存管理、搜索过滤、与FolderContext集成
// 依赖：useFolders、FileUtils、FileCache、react-native-scoped-storage
// 被使用：SimpleFileManager

import { useFolders, AuthorizedFolder } from '../../contexts/FolderContext';
import { FileUtils } from './FileUtils';
import FileCache from '../../utils/FileCache'; // 🔥 使用你的FileCache
import { FileItem } from './FileTypes';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class FileDataService {
  // ================================
  // 状态管理
  // ================================
  private cache = FileCache;
  private backgroundRefreshAbortController = new Map<string, AbortController>();
  private foldersContext: ReturnType<typeof useFolders> | null = null;
  private callbacks = new Map<string, Function[]>();
  private thumbnailManager: any = null; // 缩略图管理器引用

  setThumbnailManager(manager: any): void {
    this.thumbnailManager = manager;
  }

  // ================================
  // 缓存键管理
  // ================================
  private generateCacheKey(folderUri?: string, folderId?: string): string {
    if (!folderUri && !folderId) {
      return 'root';
    }
    
    // 标准化URI作为缓存键
    if (folderUri) {
      return FileUtils.normalizeUri(folderUri);
    }
    
    return folderId || 'unknown';
  }

  // ================================
  // 初始化
  // ================================
  setFoldersContext(context: ReturnType<typeof useFolders>): void {
    this.foldersContext = context;
  }

  // ================================
  // 核心数据获取
  // ================================

  async getFiles(folderUri?: string, folderId?: string): Promise<FileItem[]> {
    const cacheKey = this.generateCacheKey(folderUri, folderId);
    
    try {
      // 🔥 使用你的FileCache高级功能：分级加载
      const cached = this.cache.get(cacheKey, false); // 不要求完全加载
      if (cached) {
        console.log('📋 使用缓存数据，完全加载状态:', this.cache.isFullyLoaded(cacheKey));
        // 如果缓存未完全加载，后台刷新
        if (!this.cache.isFullyLoaded(cacheKey)) {
          this.refreshInBackground(folderUri, folderId, cacheKey);
        }
        return cached;
      }

      const files = await this.loadFiles(folderUri, folderId);
      this.cache.set(cacheKey, files, true); // 标记为完全加载
      return files;
      
    } catch (error) {
      console.error('获取文件列表失败:', error);
      throw new Error(`无法加载文件夹内容: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  async refreshFiles(folderUri?: string, folderId?: string): Promise<FileItem[]> {
    const cacheKey = this.generateCacheKey(folderUri, folderId);
    console.log('🔄 强制刷新文件列表');
    this.cache.delete(cacheKey); // 使用你的delete方法
    return this.getFiles(folderUri, folderId);
  }

  searchFiles(files: FileItem[], query: string): FileItem[] {
    if (!query.trim()) return files;
    
    const lowerQuery = query.toLowerCase();
    return files.filter(file => 
      file.name.toLowerCase().includes(lowerQuery)
    );
  }

  clearAllCache(): void {
    this.cache.clear(); // 使用你的clear方法
    console.log('🗑️ 已清除所有文件缓存');
  }

  // 🔥 新增：利用你的FileCache高级功能
  getCacheStats() {
    return this.cache.getStats();
  }

  cleanupCache(): void {
    this.cache.cleanup();
  }

  preloadFolder(folderUri: string, basicFiles: FileItem[]): void {
    this.cache.preload(folderUri, basicFiles);
  }

  invalidateAllCache(): void {
    this.cache.invalidateAll();
  }

  // ================================
  // 文件操作
  // ================================

  async createFile(parentUri: string, fileName: string, content: string = ''): Promise<void> {
    try {
      const { createFile } = require('react-native-scoped-storage');
      await createFile(parentUri, fileName, 'text/plain', content);
      this.invalidateCache(parentUri);
    } catch (error) {
      throw new Error(`创建文件失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  async createDirectory(parentUri: string, dirName: string): Promise<void> {
    try {
      const { createDirectory } = require('react-native-scoped-storage');
      await createDirectory(parentUri, dirName);
      this.invalidateCache(parentUri);
    } catch (error) {
      throw new Error(`创建文件夹失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  async deleteFile(fileUri: string): Promise<void> {
    try {
      const { deleteFile } = require('react-native-scoped-storage');
      await deleteFile(fileUri);
      this.invalidateCacheForFile(fileUri);
    } catch (error) {
      throw new Error(`删除文件失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // ================================
  // 事件监听
  // ================================

  on(event: 'files_loaded', callback: (files: FileItem[]) => void): () => void {
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

  private async loadFiles(folderUri?: string, folderId?: string): Promise<FileItem[]> {
    if (!folderUri) {
      return this.getAuthorizedFolders();
    } else {
      return this.readFolderContents(folderUri);
    }
  }

  private backgroundRefreshAbortController = new Map<string, AbortController>();

  private async refreshInBackground(folderUri?: string, folderId?: string, cacheKey?: string): Promise<void> {
    const finalCacheKey = cacheKey || this.generateCacheKey(folderUri, folderId);
    
    // 取消之前的后台刷新任务
    const existingController = this.backgroundRefreshAbortController.get(finalCacheKey);
    if (existingController) {
      existingController.abort();
    }
    
    // 创建新的中止控制器
    const abortController = new AbortController();
    this.backgroundRefreshAbortController.set(finalCacheKey, abortController);
    
    try {
      const freshFiles = await this.loadFiles(folderUri, folderId);
      
      // 检查操作是否被中止
      if (abortController.signal.aborted) {
        console.log('🚫 后台刷新被中止:', finalCacheKey);
        return;
      }

      // 🔥 智能差异检测和增量更新
      const cachedFiles = this.cache.get(finalCacheKey, false);
      if (cachedFiles && cachedFiles.length > 0) {
        const changes = this.detectFileChanges(cachedFiles, freshFiles);
        
        if (changes.added.length > 0 || changes.modified.length > 0 || changes.deleted.length > 0) {
          // 清理删除文件的缓存
          if (changes.deleted.length > 0 && this.thumbnailManager) {
            this.thumbnailManager.removeThumbnailCaches(changes.deleted);
          }
          
          // 更新缓存
          this.cache.update(finalCacheKey, freshFiles, true);
          console.log('🔄 增量更新:', {
            新增: changes.added.length,
            修改: changes.modified.length, 
            删除: changes.deleted.length,
            未变: changes.unchanged.length
          });
          
          this.notifyFilesLoaded(freshFiles);
        } else {
          console.log('✅ 文件无变化，跳过更新');
        }
      } else {
        // 首次加载
        this.cache.update(finalCacheKey, freshFiles, true);
        console.log('🔄 首次加载缓存:', freshFiles.length);
        this.notifyFilesLoaded(freshFiles);
      }
    } catch (error) {
      if (!abortController.signal.aborted) {
        console.warn('⚠️ 后台刷新失败:', error);
      }
    } finally {
      // 清理中止控制器
      this.backgroundRefreshAbortController.delete(finalCacheKey);
    }
  }

  private async getAuthorizedFolders(): Promise<FileItem[]> {
    if (!this.foldersContext) {
      throw new Error('FoldersContext未初始化');
    }

    const { authorizedFolders, isLoading } = this.foldersContext;
    
    if (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return authorizedFolders.map(folder => {
      // 🔥 根据存储位置选择不同图标
      const storageId = folder.originalKey ? folder.originalKey.split(':')[0] : 'unknown';
      let storageIcon = '📁'; // 默认文件夹图标
      
      if (storageId === 'primary') {
        storageIcon = '📱'; // 手机内置存储图标
      } else if (storageId.startsWith('4A21') || storageId.includes('-')) {
        storageIcon = '💾'; // SD卡/外部存储图标
      }
      
      return {
        name: folder.name,
        type: 'directory' as const,
        uri: folder.uri,
        path: undefined,
        size: folder.itemCount ? `${folder.itemCount} 项` : undefined,
        modified: folder.lastAccessed.toLocaleDateString(),
        icon: storageIcon, // 🔥 使用存储类型对应的图标
      };
    });
  }

  private async readFolderContents(folderUri: string): Promise<FileItem[]> {
    try {
      // 🔥 新增：检查是否为应用内部目录
      if (folderUri.startsWith('/data/user/0/com.mobilecode')) {
        return this.readAppInternalDirectory(folderUri);
      }
      
      const { listFiles } = require('react-native-scoped-storage');
      const rawFiles = await listFiles(folderUri);
      
      const files: FileItem[] = rawFiles.map((file: any) => ({
        name: file.name || '未知文件',
        type: file.type === 'directory' ? 'directory' : 'file',
        uri: file.uri,
        path: undefined,
        size: file.type === 'file' && file.size ? FileUtils.formatFileSize(file.size) : undefined,
        modified: file.lastModified ? new Date(file.lastModified).toLocaleDateString() : undefined,
        icon: FileUtils.getFileIcon(file.name || '', file.type === 'directory' ? 'directory' : 'file'),
      }));
      
      return this.sortFiles(files);
      
    } catch (error) {
      console.error('读取文件夹失败:', error);
      
      if (error instanceof Error && error.message.includes('permission')) {
        throw new Error('没有权限访问此文件夹，请重新授权');
      }
      
      throw new Error(`读取文件夹失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  private async readAppInternalDirectory(dirPath: string): Promise<FileItem[]> {
    try {
      // 尝试使用 react-native-fs
      let RNFS;
      try {
        RNFS = require('react-native-fs');
      } catch (requireError) {
        console.error('react-native-fs模块不可用:', requireError);
        throw new Error('文件系统模块未安装，无法访问应用内部目录');
      }
      
      const items = await RNFS.readDir(dirPath);
      
      const files: FileItem[] = items.map((item: any) => ({
        name: item.name,
        type: item.isDirectory() ? 'directory' : 'file',
        path: item.path,
        size: item.isFile() && item.size ? FileUtils.formatFileSize(item.size) : undefined,
        modified: item.mtime ? item.mtime.toLocaleDateString() : undefined,
        icon: FileUtils.getFileIcon(item.name, item.isDirectory() ? 'directory' : 'file'),
      }));
      
      return this.sortFiles(files);
      
    } catch (error) {
      console.error('读取应用内部目录失败:', error);
      if (error instanceof Error && error.message.includes('模块未安装')) {
        throw error; // 重新抛出模块相关错误
      }
      throw new Error(`无法读取应用内部目录: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  private sortFiles(files: FileItem[]): FileItem[] {
    return files.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name, 'zh-CN', { numeric: true });
    });
  }

  areFileListsEqual(list1: FileItem[], list2: FileItem[]): boolean {
    if (list1.length !== list2.length) return false;
    
    for (let i = 0; i < list1.length; i++) {
      const item1 = list1[i];
      const item2 = list2[i];
      
      if (item1.name !== item2.name || 
          item1.type !== item2.type || 
          item1.uri !== item2.uri ||
          item1.size !== item2.size) {
        return false;
      }
    }
    
    return true;
  }

  // 检测文件变化并返回差异信息
  private detectFileChanges(oldFiles: FileItem[], newFiles: FileItem[]): {
    added: FileItem[];
    modified: FileItem[];
    deleted: FileItem[];
    unchanged: FileItem[];
  } {
    const oldMap = new Map<string, FileItem>();
    const newMap = new Map<string, FileItem>();
    
    // 建立映射
    oldFiles.forEach(file => {
      const key = FileUtils.getItemKey(file);
      oldMap.set(key, file);
    });
    
    newFiles.forEach(file => {
      const key = FileUtils.getItemKey(file);
      newMap.set(key, file);
    });
    
    const added: FileItem[] = [];
    const modified: FileItem[] = [];
    const deleted: FileItem[] = [];
    const unchanged: FileItem[] = [];
    
    // 检测新增和修改的文件
    newFiles.forEach(newFile => {
      const key = FileUtils.getItemKey(newFile);
      const oldFile = oldMap.get(key);
      
      if (!oldFile) {
        added.push(newFile);
      } else if (this.isFileModified(oldFile, newFile)) {
        modified.push(newFile);
      } else {
        unchanged.push(newFile);
      }
    });
    
    // 检测删除的文件
    oldFiles.forEach(oldFile => {
      const key = FileUtils.getItemKey(oldFile);
      if (!newMap.has(key)) {
        deleted.push(oldFile);
      }
    });
    
    console.log('📊 文件变化检测:', {
      added: added.length,
      modified: modified.length,
      deleted: deleted.length,
      unchanged: unchanged.length
    });
    
    return { added, modified, deleted, unchanged };
  }

  // 检查单个文件是否被修改
  private isFileModified(oldFile: FileItem, newFile: FileItem): boolean {
    if (oldFile.modified !== newFile.modified) return true;
    if (oldFile.size !== newFile.size) return true;
    if (oldFile.sizeBytes !== newFile.sizeBytes) return true;
    return false;
  }

  private invalidateCache(folderUri: string): void {
    const cacheKey = this.generateCacheKey(folderUri);
    this.cache.delete(cacheKey);
    
    // 🔥 同时清理根目录缓存（如果是添加/删除文件夹）
    if (folderUri.includes('/document/')) {
      this.cache.delete('root');
    }
    
    console.log('🗑️ 清理缓存:', cacheKey);
  }

  private invalidateCacheForFile(fileUri: string): void {
    const parentUri = fileUri.substring(0, fileUri.lastIndexOf('/'));
    this.invalidateCache(parentUri);
  }

  // ================================
  // 清理方法
  // ================================
  cleanup(): void {
    // 中止所有后台刷新任务
    this.backgroundRefreshAbortController.forEach(controller => {
      controller.abort();
    });
    this.backgroundRefreshAbortController.clear();
    
    // 清理事件监听器
    this.callbacks.clear();
    
    // 清理缩略图管理器引用
    this.thumbnailManager = null;
    
    console.log('🧹 FileDataService已清理');
  }

  private notifyFilesLoaded(files: FileItem[]): void {
    const callbacks = this.callbacks.get('files_loaded') || [];
    callbacks.forEach(callback => {
      try {
        callback(files);
      } catch (error) {
        console.warn('Files loaded callback error:', error);
      }
    });
  }
}