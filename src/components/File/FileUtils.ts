// src/components/File/FileUtils.ts
// 文件工具类 - 提供文件类型判断、URI处理、格式化等纯函数工具
// 职责：文件类型检测、URI标准化、文件大小格式化、图标映射
// 依赖：无
// 被使用：所有文件管理器相关组件

export class FileUtils {
  // ================================
  // 文件类型常量
  // ================================
  static readonly IMAGE_EXTENSIONS = [
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico', 'tiff', 'tif'
  ];
  
  static readonly CODE_EXTENSIONS = [
    'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'hpp',
    'css', 'html', 'htm', 'json', 'xml', 'yml', 'yaml', 'sh', 'bash',
    'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'sql', 'r', 'pl',
    'lua', 'vim', 'conf', 'cfg', 'ini', 'log', 'md', 'txt'
  ];
  
  static readonly ARCHIVE_EXTENSIONS = [
    'zip', '7z', 'rar', 'tar', 'gz', 'bz2', 'xz', '7zip'
  ];

  static readonly COMPOUND_EXTENSIONS = [
    'tar.gz', 'tar.bz2', 'tar.xz'
  ];

  // ================================
  // 文件类型判断
  // ================================

  static isImageFile(fileName: string): boolean {
    const ext = this.getExtension(fileName);
    return this.IMAGE_EXTENSIONS.includes(ext);
  }

  static isCodeFile(fileName: string): boolean {
    const ext = this.getExtension(fileName);
    return this.CODE_EXTENSIONS.includes(ext);
  }

  static isArchiveFile(fileName: string): boolean {
    const lowerName = fileName.toLowerCase();
    
    const hasCompoundExtension = this.COMPOUND_EXTENSIONS.some(compoundExt => 
      lowerName.endsWith(`.${compoundExt}`)
    );
    
    if (hasCompoundExtension) {
      return true;
    }
    
    const ext = this.getExtension(fileName);
    return this.ARCHIVE_EXTENSIONS.includes(ext);
  }

  static isTextFile(fileName: string): boolean {
    return this.isCodeFile(fileName);
  }

  static isVideoFile(fileName: string): boolean {
    const ext = this.getExtension(fileName);
    const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
    return videoExtensions.includes(ext);
  }

  static isAudioFile(fileName: string): boolean {
    const ext = this.getExtension(fileName);
    const audioExtensions = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'];
    return audioExtensions.includes(ext);
  }

  static isDocumentFile(fileName: string): boolean {
    const ext = this.getExtension(fileName);
    const documentExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
    return documentExtensions.includes(ext);
  }

  // ================================
  // 文件扩展名处理
  // ================================

  static getExtension(fileName: string): string {
    if (!fileName) return '';
    
    const lowerName = fileName.toLowerCase();
    
    for (const compoundExt of this.COMPOUND_EXTENSIONS) {
      if (lowerName.endsWith(`.${compoundExt}`)) {
        return compoundExt;
      }
    }
    
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
  }

  static getBaseName(fileName: string): string {
    if (!fileName) return '';
    
    const lowerName = fileName.toLowerCase();
    
    for (const compoundExt of this.COMPOUND_EXTENSIONS) {
      if (lowerName.endsWith(`.${compoundExt}`)) {
        return fileName.slice(0, -(compoundExt.length + 1));
      }
    }
    
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex > 0 ? fileName.slice(0, lastDotIndex) : fileName;
  }

  // ================================
  // 文件图标映射
  // ================================

  static getFileIcon(fileName: string, type: 'file' | 'directory', mimeType?: string): string {
    if (type === 'directory') {
      return '📁';
    }
    
    if (mimeType) {
      if (mimeType.startsWith('image/')) return '🖼️';
      if (mimeType.startsWith('video/')) return '🎬';
      if (mimeType.startsWith('audio/')) return '🎵';
      if (mimeType.startsWith('text/')) return '📄';
      if (mimeType === 'application/pdf') return '📕';
      if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦';
    }
    
    if (this.isImageFile(fileName)) return '🖼️';
    if (this.isVideoFile(fileName)) return '🎬';
    if (this.isAudioFile(fileName)) return '🎵';
    if (this.isArchiveFile(fileName)) return '📦';
    if (this.isDocumentFile(fileName)) return '📄';
    
    const ext = this.getExtension(fileName);
    const iconMap: Record<string, string> = {
      'js': '📜', 'jsx': '⚛️', 'ts': '📘', 'tsx': '⚛️',
      'py': '🐍', 'java': '☕', 'html': '🌐', 'css': '🎨',
      'json': '📋', 'md': '📝', 'txt': '📄',
      'pdf': '📕', 'doc': '📘', 'docx': '📘',
      'xls': '📗', 'xlsx': '📗', 'ppt': '📙', 'pptx': '📙',
      'apk': '📱', 'exe': '⚙️', 'dmg': '💿',
    };
    
    return iconMap[ext] || '📄';
  }

  // ================================
  // URI处理
  // ================================

  static normalizeUri(uri: string): string {
    if (!uri) return '';
    
    try {
      // 🔥 保持完整路径，只做基本的编码处理
      let normalized = uri.replace(/%3A/g, ':').replace(/%2F/g, '/');
      return normalized;
    } catch (error) {
      return uri;
    }
  }

  static areUrisEqual(uri1?: string, uri2?: string): boolean {
    if (!uri1 || !uri2) return uri1 === uri2;
    
    try {
      const normalized1 = this.normalizeUri(uri1);
      const normalized2 = this.normalizeUri(uri2);
      return normalized1 === normalized2;
    } catch (error) {
      console.warn('URI比较失败:', error);
      return uri1 === uri2;
    }
  }

  static getItemKey(item: { uri?: string; path?: string; name: string }): string {
    if (item.uri) {
      return this.normalizeUri(item.uri);
    }
    return item.path || item.name;
  }

  static extractOriginalPath(normalizedUri: string): string {
    try {
      const treeMatch = normalizedUri.match(/\/tree\/([^\/]+)/);
      if (treeMatch) {
        const treePart = decodeURIComponent(treeMatch[1]);
        const colonIndex = treePart.indexOf(':');
        return colonIndex === -1 ? treePart : treePart.slice(colonIndex + 1);
      }
      return normalizedUri;
    } catch (error) {
      console.warn('提取原始路径失败:', error);
      return normalizedUri;
    }
  }

  static isValidUri(uri: string): boolean {
    if (!uri) return false;
    
    try {
      return uri.startsWith('content://') || 
             uri.startsWith('file://') || 
             uri.startsWith('/');
    } catch (error) {
      return false;
    }
  }

  // ================================
  // 文件大小格式化
  // ================================

  static formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    if (i >= sizes.length) {
      return `${(bytes / Math.pow(k, sizes.length - 1)).toFixed(1)} ${sizes[sizes.length - 1]}`;
    }
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  static parseFileSize(sizeString: string): number {
    if (!sizeString) return 0;
    
    const units: Record<string, number> = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024,
      'TB': 1024 * 1024 * 1024 * 1024,
    };
    
    const match = sizeString.match(/^([\d.]+)\s*([A-Z]+)$/i);
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2].toUpperCase();
      return value * (units[unit] || 1);
    }
    
    return 0;
  }

  // ================================
  // 路径处理
  // ================================

  static getParentPath(path: string): string {
    if (!path || path === '/') return '';
    
    const lastSlashIndex = path.lastIndexOf('/');
    return lastSlashIndex > 0 ? path.slice(0, lastSlashIndex) : '/';
  }

  static joinPath(...parts: string[]): string {
    const filtered = parts.filter(part => part && part !== '/');
    if (filtered.length === 0) return '/';
    
    const joined = filtered.join('/').replace(/\/+/g, '/');
    return joined.startsWith('/') ? joined : `/${joined}`;
  }

  static getFileName(path: string): string {
    if (!path) return '';
    
    const lastSlashIndex = path.lastIndexOf('/');
    return lastSlashIndex >= 0 ? path.slice(lastSlashIndex + 1) : path;
  }

  // ================================
  // 压缩文件处理
  // ================================

  static getArchiveType(fileName: string): string {
    const lowerName = fileName.toLowerCase();
    
    for (const compoundExt of this.COMPOUND_EXTENSIONS) {
      if (lowerName.endsWith(`.${compoundExt}`)) {
        return compoundExt;
      }
    }
    
    const ext = this.getExtension(fileName);
    return ext || 'unknown';
  }

  static isCompressedArchive(fileName: string): boolean {
    const archiveType = this.getArchiveType(fileName);
    const compressedTypes = ['zip', '7z', 'rar', 'gz', 'bz2', 'xz', 'tar.gz', 'tar.bz2', 'tar.xz'];
    return compressedTypes.includes(archiveType);
  }

  // ================================
  // 文件名验证
  // ================================

  static isValidFileName(fileName: string): boolean {
    if (!fileName || fileName.trim() === '') return false;
    
    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    
    if (invalidChars.test(fileName)) return false;
    if (reservedNames.includes(fileName.toUpperCase())) return false;
    if (fileName.endsWith('.') || fileName.endsWith(' ')) return false;
    
    return true;
  }

  static sanitizeFileName(fileName: string): string {
    if (!fileName) return 'untitled';
    
    let sanitized = fileName.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
    sanitized = sanitized.replace(/^\.+/, '').replace(/\.+$/, '');
    sanitized = sanitized.replace(/\s+$/, '');
    
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    if (reservedNames.includes(sanitized.toUpperCase())) {
      sanitized = `${sanitized}_file`;
    }
    
    return sanitized || 'untitled';
  }

  // ================================
  // MIME类型推测
  // ================================

  static getMimeType(fileName: string): string {
    const ext = this.getExtension(fileName);
    
    const mimeMap: Record<string, string> = {
      // 图片
      'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
      'gif': 'image/gif', 'webp': 'image/webp', 'svg': 'image/svg+xml',
      
      // 视频
      'mp4': 'video/mp4', 'avi': 'video/x-msvideo', 'mov': 'video/quicktime',
      'wmv': 'video/x-ms-wmv', 'webm': 'video/webm',
      
      // 音频
      'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'flac': 'audio/flac',
      'aac': 'audio/aac', 'ogg': 'audio/ogg',
      
      // 文档
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      
      // 代码和文本
      'txt': 'text/plain', 'html': 'text/html', 'css': 'text/css',
      'js': 'text/javascript', 'json': 'application/json',
      'xml': 'application/xml', 'md': 'text/markdown',
      
      // 压缩
      'zip': 'application/zip', '7z': 'application/x-7z-compressed',
      'rar': 'application/vnd.rar', 'tar': 'application/x-tar',
      'gz': 'application/gzip', 'bz2': 'application/x-bzip2',
    };
    
    return mimeMap[ext] || 'application/octet-stream';
  }
}