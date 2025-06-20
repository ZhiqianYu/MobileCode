// src/components/File/ThumbnailManager.ts
// 缩略图管理器（简化版） - 处理文件缩略图的生成、缓存和管理
// 职责：缩略图请求、内存缓存、队列处理、图片和代码预览生成
// 依赖：FileUtils、FileTypes、react-native组件
// 被使用：SimpleFileManager、FileGridView

import { FileUtils } from './FileUtils';
import { FileItem, ThumbnailCache } from './FileTypes';

export class ThumbnailManager {
  // ================================
  // 状态管理
  // ================================
  private memoryCache: ThumbnailCache = {};
  private loadingSet = new Set<string>();
  private queue: FileItem[] = [];
  private processing = 0;
  private readonly maxConcurrent = 2;
  private listeners = new Map<string, ((thumbnail: string | null) => void)[]>();

  // ================================
  // 缓存键管理
  // ================================
  private generateThumbnailKey(file: FileItem): string {
    // 生成更精确的缓存键，避免冲突
    const basePath = file.uri || file.path || '';
    const fileName = file.name;
    const modified = file.modified || '';
    const sizeInfo = file.sizeBytes?.toString() || file.size || '';
    
    // 如果有完整路径，使用路径+文件名
    if (basePath) {
      return `${basePath}::${fileName}::${modified}::${sizeInfo}`;
    }
    
    // 如果没有路径，使用文件名+时间戳+随机数确保唯一性
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `nopath::${fileName}::${modified}::${sizeInfo}::${timestamp}::${random}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // ================================
  // 公共接口
  // ================================
  async requestThumbnail(file: FileItem): Promise<string | null> {
    const key = this.generateThumbnailKey(file);
    console.log('🖼️ 请求缩略图，文件:', file.name, '缓存键:', key);
    
    if (file.type !== 'file') {
      return null;
    }
    
    if (!this.isSupportedFile(file.name)) {
      return null;
    }
    
    // 检查缓存
    if (this.memoryCache[key] !== undefined) {
      console.log('✅ 缓存命中:', file.name, '结果:', this.memoryCache[key] ? '有缩略图' : '无缩略图');
      return this.memoryCache[key];
    }
    
    // 防止重复请求
    if (this.loadingSet.has(key)) {
      console.log('⏳ 正在加载中，等待结果:', file.name);
      // 等待现有的Promise
      return new Promise((resolve) => {
        if (!this.listeners.has(key)) {
          this.listeners.set(key, []);
        }
        this.listeners.get(key)!.push(resolve);
      });
    }
    
    // 检查队列中是否已存在（使用新的键比较）
    const queueIndex = this.queue.findIndex(item => this.generateThumbnailKey(item) === key);
    if (queueIndex === -1) {
      console.log('📝 添加到队列:', file.name);
      this.queue.push(file);
      this.processQueue();
    } else {
      console.log('📋 队列中已存在:', file.name);
    }
    
    return new Promise((resolve, reject) => {
      if (!this.listeners.has(key)) {
        this.listeners.set(key, []);
      }
      
      // 添加超时机制防止内存泄漏
      const timeoutId = setTimeout(() => {
        console.warn('⏰ 缩略图生成超时:', file.name);
        const listeners = this.listeners.get(key);
        if (listeners) {
          const index = listeners.findIndex(listener => listener === wrappedResolve);
          if (index > -1) {
            listeners.splice(index, 1);
          }
          if (listeners.length === 0) {
            this.listeners.delete(key);
          }
        }
        resolve(null);
      }, 30000);
      
      const wrappedResolve = (result: string | null) => {
        clearTimeout(timeoutId);
        resolve(result);
      };
      
      this.listeners.get(key)!.push(wrappedResolve);
    });
  }

  getCachedThumbnail(file: FileItem): string | null | undefined {
    const key = this.generateThumbnailKey(file);
    const result = this.memoryCache[key];
    
    // 添加详细的缓存值调试
    if (result) {
      const shortValue = result.length > 100 ? result.substring(0, 100) + '...' : result;
      console.log('🔍 获取缓存缩略图:', file.name, '键末尾:', key.substring(key.length - 30), '值:', shortValue);
    } else {
      console.log('🔍 获取缓存缩略图:', file.name, '键末尾:', key.substring(key.length - 30), '结果:', result === null ? 'null' : '无缓存');
    }
    
    return result;
  }

  // 添加调试方法
  debugCacheState(): void {
    console.log('🔍 缓存状态调试:');
    Object.keys(this.memoryCache).forEach(key => {
      console.log('  键:', key, '值:', this.memoryCache[key] ? '有数据' : '空');
    });
  }

  isLoading(file: FileItem): boolean {
    const key = this.generateThumbnailKey(file);
    return this.loadingSet.has(key);
  }

  clearCache(): void {
    this.memoryCache = {};
    this.queue = [];
    this.loadingSet.clear();
    this.listeners.clear();
  }

  // 删除特定文件的缓存
  removeThumbnailCache(file: FileItem): void {
    const key = this.generateThumbnailKey(file);
    if (this.memoryCache[key] !== undefined) {
      delete this.memoryCache[key];
      console.log('🗑️ 删除缩略图缓存:', file.name);
    }
    
    // 从队列中移除
    const queueIndex = this.queue.findIndex(item => this.generateThumbnailKey(item) === key);
    if (queueIndex > -1) {
      this.queue.splice(queueIndex, 1);
      console.log('📋 从队列移除:', file.name);
    }
    
    // 停止正在加载的任务
    if (this.loadingSet.has(key)) {
      this.loadingSet.delete(key);
      console.log('⏹️ 停止加载任务:', file.name);
    }
  }

  // 批量删除缓存
  removeThumbnailCaches(files: FileItem[]): void {
    console.log('🗑️ 批量删除缩略图缓存，数量:', files.length);
    files.forEach(file => this.removeThumbnailCache(file));
  }

  // 检查文件是否需要重新生成缩略图
  needsRegeneration(file: FileItem, cachedFile?: FileItem): boolean {
    if (!cachedFile) return true;
    
    // 比较修改时间和大小
    if (file.modified !== cachedFile.modified) return true;
    if (file.size !== cachedFile.size) return true;
    if (file.sizeBytes !== cachedFile.sizeBytes) return true;
    
    return false;
  }

  requestVisibleThumbnails(files: FileItem[]): void {
    console.log('📋 批量请求缩略图，文件数量:', files.length);
    
    // 🔥 更严格的过滤：只处理文件类型且支持缩略图的文件
    const supportedFiles = files.filter(file => 
      file.type === 'file' && // 必须是文件，不是文件夹
      this.isSupportedFile(file.name) && // 必须是支持的文件类型
      (file.uri || file.path) // 必须有有效的URI或路径
    );
    
    console.log('📋 支持缩略图的文件数量:', supportedFiles.length);
    console.log('📋 支持缩略图的文件:', supportedFiles.map(f => f.name));
    
    // 🔥 新增：按显示顺序优先级添加到队列
    // 清理队列中不再需要的文件（不在当前可见列表中）
    const currentKeys = new Set(supportedFiles.map(f => this.generateThumbnailKey(f)));
    this.queue = this.queue.filter(queuedFile => {
      const queuedKey = this.generateThumbnailKey(queuedFile);
      return currentKeys.has(queuedKey);
    });
    
    console.log('📋 队列清理后剩余文件数:', this.queue.length);
    
    // 🔥 按传入顺序（即排序后的显示顺序）重建队列
    const newQueueFiles: FileItem[] = [];
    
    supportedFiles.forEach((file, index) => {
      const key = this.generateThumbnailKey(file);
      
      // 跳过已缓存和正在处理的文件
      if (this.memoryCache[key] !== undefined || this.loadingSet.has(key)) {
        console.log('📋 跳过已处理文件:', file.name);
        return;
      }
      
      // 检查是否已在队列中
      const queueIndex = this.queue.findIndex(item => this.generateThumbnailKey(item) === key);
      if (queueIndex === -1) {
        console.log('📋 按顺序添加到队列:', file.name, '显示位置:', index);
        newQueueFiles.push(file);
      } else {
        // 🔥 如果已在队列中，保持其在新队列中的正确位置
        const existingFile = this.queue[queueIndex];
        newQueueFiles.push(existingFile);
        console.log('📋 保持队列中文件:', file.name, '新位置:', index);
      }
    });
    
    // 🔥 重建队列，确保按显示顺序处理
    this.queue = newQueueFiles;
    
    console.log('📋 最终队列文件数:', this.queue.length);
    console.log('📋 队列顺序:', this.queue.slice(0, 5).map(f => f.name));
    
    // 开始处理队列
    this.processQueue();
  }

  // ================================
  // 私有方法
  // ================================

  private async processQueue(): Promise<void> {
    if (this.processing >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const file = this.queue.shift()!;
    const key = this.generateThumbnailKey(file);
    
    // 双重检查：如果缓存中已经有了，直接跳过
    if (this.memoryCache[key] !== undefined) {
      console.log('⚡ 队列处理时发现缓存已存在:', file.name);
      setTimeout(() => this.processQueue(), 10);
      return;
    }
    
    // 防止重复处理同一个文件
    if (this.loadingSet.has(key)) {
      console.log('🔄 文件已在处理中，跳过:', file.name);
      setTimeout(() => this.processQueue(), 10);
      return;
    }
    
    console.log('🚀 开始处理缩略图:', file.name, '键:', key);
    
    this.processing++;
    this.loadingSet.add(key);

    try {
      const thumbnail = await this.generateThumbnail(file);
      
      // 验证结果并存储
      console.log('✅ 缩略图生成完成:', file.name, '结果:', thumbnail ? '成功' : '失败', '键:', key);
      
      // 双重检查：确保没有被其他线程覆盖
      if (this.memoryCache[key] === undefined) {
        this.memoryCache[key] = thumbnail;
        console.log('💾 缓存已存储:', file.name);
      } else {
        console.warn('⚠️ 缓存冲突检测:', file.name, '已存在的值:', this.memoryCache[key]);
      }
      
      const fileListeners = this.listeners.get(key) || [];
      console.log('📢 通知监听器:', file.name, '监听器数量:', fileListeners.length);
      
      fileListeners.forEach((listener, index) => {
        try {
          listener(thumbnail);
          console.log(`📤 监听器 ${index} 已通知:`, file.name);
        } catch (error) {
          console.warn('缩略图监听器执行失败:', error);
        }
      });
      this.listeners.delete(key);
      
    } catch (error) {
      console.error('❌ 缩略图生成失败:', file.name, error);
      this.memoryCache[key] = null;
      
      const fileListeners = this.listeners.get(key) || [];
      fileListeners.forEach(listener => {
        try {
          listener(null);
        } catch (error) {
          console.warn('缩略图监听器执行失败:', error);
        }
      });
      this.listeners.delete(key);

    } finally {
      this.processing--;
      this.loadingSet.delete(key);
      setTimeout(() => this.processQueue(), 10);
    }
  }

  private async generateThumbnail(file: FileItem): Promise<string | null> {
    try {
      if (FileUtils.isImageFile(file.name)) {
        return this.generateImageThumbnail(file);
      } else if (FileUtils.isCodeFile(file.name)) {
        return this.generateCodeThumbnail(file);
      }
      return null;
    } catch (error) {
      console.warn('缩略图生成失败:', error);
      return null;
    }
  }

  private generateImageThumbnail(file: FileItem): string | null {
    const sourceUri = file.uri || file.path;
    console.log('🖼️ 生成图片缩略图:', file.name);
    console.log('🖼️ 源URI:', sourceUri);
    
    if (!sourceUri) {
      console.warn('⚠️ 图片文件没有URI或路径:', file.name);
      return null;
    }
    
    // 确保返回正确的文件URI
    console.log('🖼️ 返回缩略图URI:', sourceUri);
    return sourceUri;
  }

  private async generateCodeThumbnail(file: FileItem): Promise<string | null> {
    console.log('📄 生成代码缩略图:', file.name, 'URI:', file.uri, 'Path:', file.path);
    
    try {
      let content = '';
      
      if (file.uri) {
        try {
          const { readFile } = require('react-native-scoped-storage');
          console.log('📖 读取文件通过URI:', file.uri);
          content = await readFile(file.uri, 'utf8');
        } catch (requireError) {
          console.warn('react-native-scoped-storage模块不可用:', requireError);
          return null;
        }
      } else if (file.path) {
        try {
          const RNFS = require('react-native-fs');
          console.log('📖 读取文件通过Path:', file.path);
          content = await RNFS.readFile(file.path, 'utf8');
        } catch (requireError) {
          console.warn('react-native-fs模块不可用:', requireError);
          return null;
        }
      } else {
        console.warn('⚠️ 代码文件没有URI或路径:', file.name);
        return null;
      }
      
      if (!content) {
        console.warn('⚠️ 文件内容为空:', file.name);
        return null;
      }

      console.log('✅ 读取文件成功:', file.name, '内容长度:', content.length);

      const lines = content.split('\n').slice(0, 5);
      let preview = lines.join('\n');
      
      if (preview.length > 200) {
        preview = preview.substring(0, 200) + '...';
      }

      console.log('📝 生成预览:', file.name, '预览长度:', preview.length);
      return `code:${preview}`;

    } catch (error) {
      console.warn('代码缩略图生成失败:', file.name, error);
      return null;
    }
  }

  isSupportedFile(fileName: string): boolean {
    // 明确只支持图片和代码文件，排除文件夹
    return FileUtils.isImageFile(fileName) || FileUtils.isCodeFile(fileName);
  }
}