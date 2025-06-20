// src/utils/FileCache.ts
// 功能：文件列表缓存管理，提升大文件夹加载性能 - 重构适配版本
// 依赖：无
// 被使用：FileDataService、SimpleFileManager

// 🔥 新增：与重构架构的类型适配
import type { FileItem } from '../components/File/FileTypes';

interface CacheEntry {
  data: FileItem[]; // 🔥 使用具体的FileItem类型
  timestamp: number;
  hasLoaded: boolean; // true=详细信息已完全加载，false=仅基础列表
  version: number; // 缓存版本，用于强制刷新
}

class FileCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private ttl: number; // Time to live in milliseconds
  private currentVersion: number;

  constructor(maxSize = 100, ttl = 10 * 60 * 1000) { // 默认10分钟过期
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.currentVersion = 1;
  }

  // 获取缓存 - 改进版本
  get(key: string, requireFullyLoaded: boolean = false): FileItem[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // 检查是否过期
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      console.log('🗑️ 缓存过期，删除:', key);
      return null;
    }

    // 🔥 检查是否需要完全加载的数据
    if (requireFullyLoaded && !entry.hasLoaded) {
      console.log('⏳ 缓存存在但未完全加载:', key);
      return null;
    }

    // 更新访问顺序（LRU）
    this.cache.delete(key);
    this.cache.set(key, entry);
    console.log('✅ 缓存命中:', key, '完全加载:', entry.hasLoaded);
    return entry.data;
  }

  // 设置缓存 - 改进版本
  set(key: string, data: FileItem[], hasLoaded: boolean = true): void {
    // 如果缓存已满，删除最旧的项
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      console.log('🗑️ 缓存已满，删除最旧项:', firstKey);
    }

    this.cache.set(key, {
      data: [...data], // 深拷贝，避免引用问题
      timestamp: Date.now(),
      hasLoaded,
      version: this.currentVersion,
    });
    console.log('💾 缓存更新:', key, '完全加载:', hasLoaded, '数据量:', data.length);
  }

  // 更新缓存（保留时间戳）- 改进版本
  update(key: string, data: FileItem[], hasLoaded: boolean = true): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.data = [...data]; // 深拷贝
      entry.hasLoaded = hasLoaded;
      console.log('🔄 缓存数据更新:', key, '完全加载:', hasLoaded);
    } else {
      this.set(key, data, hasLoaded);
    }
  }

  // 🔥 新增：检查缓存是否完全加载
  isFullyLoaded(key: string): boolean {
    const entry = this.cache.get(key);
    return entry ? entry.hasLoaded : false;
  }

  // 🔥 新增：强制刷新缓存版本
  invalidateAll(): void {
    this.currentVersion++;
    this.cache.clear();
    console.log('🔄 强制刷新所有缓存，新版本:', this.currentVersion);
  }

  // 🔥 新增：获取缓存统计信息
  getStats(): { 
    total: number; 
    fullyLoaded: number; 
    partialLoaded: number;
    totalItems: number; // 🔥 新增：总文件数统计
    memoryUsage: string; // 🔥 新增：内存使用估算
  } {
    let fullyLoaded = 0;
    let partialLoaded = 0;
    let totalItems = 0;

    this.cache.forEach(entry => {
      totalItems += entry.data.length;
      if (entry.hasLoaded) {
        fullyLoaded++;
      } else {
        partialLoaded++;
      }
    });

    // 简单的内存使用估算
    const estimatedMemory = this.cache.size * 50 + totalItems * 200; // 估算每个条目50字节，每个文件200字节
    const memoryUsage = this.formatBytes(estimatedMemory);

    return {
      total: this.cache.size,
      fullyLoaded,
      partialLoaded,
      totalItems,
      memoryUsage,
    };
  }

  // 🔥 新增：内存使用格式化
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // 清除特定缓存
  delete(key: string): void {
    const deleted = this.cache.delete(key);
    if (deleted) {
      console.log('🗑️ 手动删除缓存:', key);
    }
  }

  // 清除所有缓存
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log('🗑️ 清除所有缓存，共', size, '项');
  }

  // 检查是否有缓存
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // 检查是否过期
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  // 获取缓存大小
  size(): number {
    return this.cache.size;
  }

  // 🔥 清理过期缓存
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log('🧹 清理过期缓存:', cleaned, '项');
    }
  }

  // 🔥 新增：缓存预热（为重构架构优化）
  preload(key: string, data: FileItem[]): void {
    this.set(key, data, false); // 标记为未完全加载
    console.log('🔥 缓存预热:', key, '基础数据量:', data.length);
  }

  // 🔥 新增：批量更新（为重构架构优化）
  batchUpdate(updates: Array<{ key: string; data: FileItem[]; hasLoaded?: boolean }>): void {
    updates.forEach(({ key, data, hasLoaded = true }) => {
      this.update(key, data, hasLoaded);
    });
    console.log('📦 批量更新缓存:', updates.length, '项');
  }

  // 🔥 新增：获取所有缓存键（调试用）
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  // 🔥 新增：导出缓存状态（调试用）
  exportState(): Record<string, { size: number; hasLoaded: boolean; age: number }> {
    const state: Record<string, { size: number; hasLoaded: boolean; age: number }> = {};
    const now = Date.now();
    
    this.cache.forEach((entry, key) => {
      state[key] = {
        size: entry.data.length,
        hasLoaded: entry.hasLoaded,
        age: now - entry.timestamp,
      };
    });
    
    return state;
  }
}

export default new FileCache();