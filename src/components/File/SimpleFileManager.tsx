// src/components/File/SimpleFileManager.tsx
// 文件管理器主容器（重构版） - 轻量化容器，专注于UI协调和组件通信
// 职责：管理器初始化、UI状态管理、事件协调、对外接口暴露
// 依赖：各个管理器、UI组件、Context
// 被使用：MainContentComponent

import React, { useState, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useFolders } from '../../contexts/FolderContext';

// 管理器导入
import { FileDataService } from './FileDataService';
import { NavigationManager } from './NavigationManager';
import { SelectionManager } from './SelectionManager';
import { ThumbnailManager } from './ThumbnailManager';
import { CommandProcessor } from './CommandProcessor';

// UI组件导入
import FileListView from './FileListView';
import FileGridView from './FileGridView';
import BreadcrumbNav from './BreadcrumbNav';
import FileInfoModal from './FileInfoModal';

// 类型导入
import { FileItem, SelectionState, OperationResult, ViewMode } from './FileTypes';
import { FileUtils } from './FileUtils';

// ================================
// 组件属性接口
// ================================

interface SimpleFileManagerProps {
  onSwitchToEditor?: (filePath: string, fileName: string) => void;
}

// ================================
// 主组件实现
// ================================

const SimpleFileManager = forwardRef<any, SimpleFileManagerProps>(({ 
  onSwitchToEditor 
}, ref) => {
  
  // ================================
  // Context和Hook
  // ================================
  const foldersContext = useFolders();
  
  // ================================
  // 管理器初始化
  // ================================
  const dataService = useMemo(() => {
    const service = new FileDataService();
    service.setFoldersContext(foldersContext);
    return service;
  }, [foldersContext]);

  const navigationManager = useMemo(() => new NavigationManager(), []);
  const selectionManager = useMemo(() => new SelectionManager(), []);
  const thumbnailManager = useMemo(() => new ThumbnailManager(), []);

  // 建立管理器之间的关联
  useEffect(() => {
    dataService.setThumbnailManager(thumbnailManager);
  }, [dataService, thumbnailManager]);

  // ================================
  // UI状态管理
  // ================================
  const [navigationState, setNavigationState] = useState(() => navigationManager.getCurrentState());
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectionState, setSelectionState] = useState<SelectionState>(() => selectionManager.getSelectionState());
  const [operationResult, setOperationResult] = useState<OperationResult | null>(null);
  const [isLoadingFolder, setIsLoadingFolder] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  const [isSlowLoading, setIsSlowLoading] = useState(false);
  const [loadingTimeoutRef, setLoadingTimeoutRef] = useState<NodeJS.Timeout | null>(null); 

  // 🔥 新增：使用ref追踪实际加载状态，避免异步状态更新问题
  const isActuallyLoadingRef = useRef(false);

  // 模态框状态
  const [showFileInfo, setShowFileInfo] = useState(false);
  const [fileInfoItem, setFileInfoItem] = useState<FileItem | null>(null);
  const [createDialog, setCreateDialog] = useState({
    visible: false,
    type: 'file' as 'file' | 'directory',
    title: '',
    placeholder: '',
    defaultName: ''
  });
  const [createName, setCreateName] = useState('');

  // ================================
  // 事件监听设置
  // ================================
  useEffect(() => {
    // 立即同步当前状态
    setSelectionState(selectionManager.getSelectionState());
    
    const unsubscribeSelection = selectionManager.on('selection_changed', (newState) => {
      console.log('🔄 选择状态变化:', newState);
      setSelectionState(newState);
    });
    
    const unsubscribeNavigation = navigationManager.on('navigation_changed', handleNavigationChange);
    const unsubscribeFiles = dataService.on('files_loaded', setFiles);

    return () => {
      unsubscribeSelection();
      unsubscribeNavigation();
      unsubscribeFiles();
    };
  }, [selectionManager, navigationManager, dataService, handleNavigationChange]);

  // 组件卸载时清理资源
  useEffect(() => {
    return () => {
      console.log('🧹 SimpleFileManager组件卸载，清理资源');
      dataService.cleanup();
      thumbnailManager.clearCache();
      selectionManager.clearSelection();
    };
  }, [dataService, thumbnailManager, selectionManager]);

  // 🔥 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef) {
        clearTimeout(loadingTimeoutRef);
      }
    };
  }, [loadingTimeoutRef]);

  // ================================
  // 核心数据加载
  // ================================
  const loadFiles = useCallback(async (folderUri?: string, folderId?: string) => {
      const currentNavState = navigationManager.getCurrentState();
      console.log('🔄 开始分批加载文件，当前导航状态:', currentNavState);
      
      // 🔥 状态清理辅助函数（普通函数，避免Hook嵌套）
      const clearLoadingState = () => {
        console.log('🧹 清理加载状态...');
        
        // 🔥 立即更新ref状态
        isActuallyLoadingRef.current = false;
        
        setIsLoadingFolder(false);
        setIsSlowLoading(false);
        setLoadingTimeoutRef(currentRef => {
          if (currentRef) {
            console.log('⏰ 清理超时定时器');
            clearTimeout(currentRef);
          }
          return null;
        });
      };

      // 🔥 SAF目录渐进式加载函数
      const loadSAFDirectoryProgressively = async (folderUri: string): Promise<FileItem[]> => {
        console.log('📂 开始SAF渐进式加载:', folderUri);
        
        try {
          const { listFiles } = require('react-native-scoped-storage');
          
          console.log('📂 调用底层listFiles API...');
          const rawFiles = await listFiles(folderUri);
          console.log('📂 底层API返回文件数量:', rawFiles.length);
          
          // 🔥 转换并排序所有文件
          const allFiles: FileItem[] = rawFiles.map((file: any) => ({
            name: file.name || '未知文件',
            type: file.type === 'directory' ? 'directory' : 'file',
            uri: file.uri,
            path: undefined,
            size: file.type === 'file' && file.size ? FileUtils.formatFileSize(file.size) : undefined,
            sizeBytes: file.size,
            modified: file.lastModified ? new Date(file.lastModified).toLocaleDateString() : undefined,
            icon: FileUtils.getFileIcon(file.name || '', file.type === 'directory' ? 'directory' : 'file'),
          }));
          
          // 排序：文件夹在前，然后按名称排序
          allFiles.sort((a, b) => {
            if (a.type !== b.type) {
              return a.type === 'directory' ? -1 : 1;
            }
            return a.name.localeCompare(b.name, 'zh-CN', { numeric: true });
          });
          
          // 🔥 分批显示给用户
          const batchSize = 20;
          const totalBatches = Math.ceil(allFiles.length / batchSize);
          
          console.log('📂 开始分批显示，总批次:', totalBatches, '每批:', batchSize);
          
          // 立即显示第一批
          const firstBatch = allFiles.slice(0, batchSize);
          setFiles(firstBatch);
          setLoadingProgress({ current: firstBatch.length, total: allFiles.length });
          console.log('📂 第一批已显示:', firstBatch.length, '个文件');
          
          // 如果文件不多，就不需要分批了
          if (allFiles.length <= batchSize) {
            console.log('📂 文件较少，单批完成');
            return allFiles;
          }
          
          // 🔥 逐批显示剩余文件
          for (let i = 1; i < totalBatches; i++) {
            // 添加小延迟，让UI有响应时间
            await new Promise(resolve => setTimeout(resolve, 50));
            
            const endIndex = Math.min((i + 1) * batchSize, allFiles.length);
            const currentDisplayFiles = allFiles.slice(0, endIndex);
            
            setFiles([...currentDisplayFiles]);
            setLoadingProgress({ current: currentDisplayFiles.length, total: allFiles.length });
            
            console.log('📂 批次', i + 1, '已显示累计:', currentDisplayFiles.length, '个文件');
          }
          
          console.log('📂 SAF渐进式加载完成');
          return allFiles;
          
        } catch (error) {
          console.error('SAF目录读取失败:', error);
          throw new Error(`无法读取文件夹: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      };
      
      // 🔥 应用目录渐进式加载函数  
      const loadAppDirectoryProgressively = async (dirPath: string): Promise<FileItem[]> => {
        console.log('📱 开始应用目录渐进式加载:', dirPath);
        
        try {
          const RNFS = require('react-native-fs');
          console.log('📱 调用RNFS.readDir...');
          const items = await RNFS.readDir(dirPath);
          console.log('📱 RNFS返回项目数量:', items.length);
          
          const allFiles: FileItem[] = items.map((item: any) => ({
            name: item.name,
            type: item.isDirectory() ? 'directory' : 'file',
            path: item.path,
            size: item.isFile() && item.size ? FileUtils.formatFileSize(item.size) : undefined,
            sizeBytes: item.size,
            modified: item.mtime ? item.mtime.toLocaleDateString() : undefined,
            icon: FileUtils.getFileIcon(item.name, item.isDirectory() ? 'directory' : 'file'),
          }));
          
          // 排序
          allFiles.sort((a, b) => {
            if (a.type !== b.type) {
              return a.type === 'directory' ? -1 : 1;
            }
            return a.name.localeCompare(b.name, 'zh-CN', { numeric: true });
          });
          
          // 分批显示逻辑与SAF相同
          const batchSize = 20;
          const totalBatches = Math.ceil(allFiles.length / batchSize);
          
          console.log('📱 开始分批显示，总批次:', totalBatches);
          
          const firstBatch = allFiles.slice(0, batchSize);
          setFiles(firstBatch);
          setLoadingProgress({ current: firstBatch.length, total: allFiles.length });
          console.log('📱 第一批已显示:', firstBatch.length, '个文件');
          
          if (allFiles.length <= batchSize) {
            return allFiles;
          }
          
          for (let i = 1; i < totalBatches; i++) {
            await new Promise(resolve => setTimeout(resolve, 50));
            
            const endIndex = Math.min((i + 1) * batchSize, allFiles.length);
            const currentDisplayFiles = allFiles.slice(0, endIndex);
            
            setFiles([...currentDisplayFiles]);
            setLoadingProgress({ current: currentDisplayFiles.length, total: allFiles.length });
            
            console.log('📱 批次', i + 1, '已显示累计:', currentDisplayFiles.length, '个文件');
          }
          
          console.log('📱 应用目录渐进式加载完成');
          return allFiles;
          
        } catch (error) {
          console.error('应用目录读取失败:', error);
          throw error;
        }
      };
      
      try {
        let allFiles: FileItem[] = [];
        
        // 根据导航状态决定加载什么
        if (currentNavState.level === 'function_root') {
          // 功能根目录加载逻辑保持不变
          if (currentNavState.functionType === 'app') {
            const appDir = '/data/user/0/com.mobilecode';
            allFiles = await dataService.getFiles(appDir);
          } else if (currentNavState.functionType === 'phone') {
            allFiles = await dataService.getFiles();
          } else if (currentNavState.functionType === 'network') {
            allFiles = [];
          }
          
          setFiles(allFiles);
          // 🔥 立即清理状态
          clearLoadingState();
          
        } else if (currentNavState.level === 'folder') {
          // 🔥 真正的渐进式加载：直接调用底层API，不等待全部完成
          console.log('📁 开始渐进式加载文件夹内容');
          
          try {
            const targetPath = folderUri || currentNavState.currentPath;
            console.log('📁 目标路径:', targetPath);
            
            // 🔥 检查是否有完整缓存，如果有就直接使用
            const cacheKey = dataService.generateCacheKey ? dataService.generateCacheKey(targetPath) : targetPath;
            const cachedFiles = dataService.cache?.get?.(cacheKey, true); // 要求完全加载的缓存
            
            if (cachedFiles && cachedFiles.length > 0) {
              console.log('📋 使用完整缓存，文件数量:', cachedFiles.length);
              setFiles(cachedFiles);
              clearLoadingState();
              return;
            }
            
            console.log('📁 开始底层文件读取...');
            
            // 🔥 直接调用底层API进行渐进式加载
            if (targetPath?.startsWith('/data/user/0/com.mobilecode')) {
              // 应用内部目录的渐进式加载
              allFiles = await loadAppDirectoryProgressively(targetPath);
            } else {
              // SAF文件的渐进式加载
              allFiles = await loadSAFDirectoryProgressively(targetPath);
            }
            
            // 🔥 加载完成后更新缓存
            if (dataService.cache?.set) {
              dataService.cache.set(cacheKey, allFiles, true);
            }
            
            clearLoadingState();
            console.log('📁 渐进式加载全部完成，总文件数:', allFiles.length);
            
          } catch (error) {
            console.error('渐进式加载失败:', error);
            setFiles([]);
            clearLoadingState();
            Alert.alert('加载失败', error instanceof Error ? error.message : '未知错误');
          }
        }
        
        // 文件列表变化时，确保选择状态正确同步
        setSelectionState(selectionManager.getSelectionState());
        
        // 网格视图缩略图请求（只为可见文件）
        if (viewMode === 'grid' && !isActuallyLoadingRef.current && allFiles.length > 0) {
          setTimeout(() => {
            // 🔥 确保按排序顺序请求缩略图，优先处理前面的文件
            const visibleFiles = allFiles.slice(0, 20);
            console.log('🎨 请求前20个文件的缩略图，按顺序:', visibleFiles.map(f => f.name).slice(0, 5));
            thumbnailManager.requestVisibleThumbnails(visibleFiles);
          }, 100);
        }
        
      } catch (error) {
        console.error('加载文件失败:', error);
        Alert.alert('加载失败', error instanceof Error ? error.message : '未知错误');
        setFiles([]);
        // 🔥 错误时立即清理状态
        clearLoadingState();
      }
    }, [dataService, thumbnailManager, viewMode, selectionManager, navigationManager]);

  const handleNavigationChange = useCallback(async (navState: NavigationState) => {
      console.log('🧭 导航状态变化:', navState);
      
      // 更新本地导航状态
      setNavigationState(navState);
      
      // 强制清除选择状态
      selectionManager.clearSelection();
      setSelectionState(selectionManager.getSelectionState());
      
      // 根据导航级别加载相应内容
      setIsLoading(true);
      try {
        switch (navState.level) {
          case 'app_home':
            // 回到首页，清空文件列表
            setFiles([]);
            break;
            
          case 'function_root':
            // 进入功能根目录，加载根级文件
            console.log('🏠 加载功能根目录:', navState.functionType);
            await loadFiles();
            break;
            
          case 'folder':
            // 进入具体文件夹
            console.log('📁 加载文件夹:', navState.currentPath);
            await loadFiles(navState.currentPath, navState.currentFolderId);
            break;
        }
      } catch (error) {
        console.error('导航加载失败:', error);
      } finally {
        setIsLoading(false);
      }
    }, [loadFiles, selectionManager]);
    
  // ================================
  // 交互事件处理
  // ================================
  const handleItemInteraction = useCallback(async (item: FileItem) => {
    console.log('🎯 处理文件交互:', item.name, '当前导航状态:', navigationState);
    
    // 如果正在加载文件夹，阻止重复点击
    // 🔥 使用ref检查实际加载状态，避免异步状态更新问题
    if (isActuallyLoadingRef.current && item.type === 'directory') {
      console.log('⚠️ 正在加载中，忽略重复点击:', item.name);
      return;
    }
    
    const result = selectionManager.handlePress(item);
    
    // 立即同步选择状态
    setSelectionState(selectionManager.getSelectionState());
    
    switch (result.type) {
      case 'single':
        // 单击目录：立即进入并开始加载
        if (item.type === 'directory') {
          console.log('🚀 立即进入文件夹:', item.name);
          
          // 🔥 设置加载状态
          setIsLoadingFolder(true);
          isActuallyLoadingRef.current = true;  // 🔥 新增：立即更新ref
          setIsSlowLoading(false); // 重置慢加载状态
          setFiles([]); // 清空当前文件列表
          setLoadingProgress({ current: 0, total: 0 });
          
          // 🔥 启动2秒超时检测
          const timeoutId = setTimeout(() => {
            console.log('⏰ 检测到慢加载，显示提示');
            setIsSlowLoading(true);
          }, 2000);
          setLoadingTimeoutRef(timeoutId);
          
          // 立即更新导航
          navigationManager.enterFolder(item.uri || item.path || '', item.name);
          // handleNavigationChange 会被自动调用，开始加载文件
        }
        break;
          
      case 'double':
        // 双击逻辑
        if (item.type === 'file') {
          if (FileUtils.isCodeFile(item.name)) {
            if (onSwitchToEditor) {
              const filePath = item.uri || item.path || '';
              onSwitchToEditor(filePath, item.name);
            }
          } else {
            setFileInfoItem(item);
            setShowFileInfo(true);
          }
        } else {
          console.log('🚀 双击立即进入文件夹:', item.name);
          setIsLoadingFolder(true);
          setIsSlowLoading(false);
          setFiles([]);
          setLoadingProgress({ current: 0, total: 0 });
          
          // 🔥 双击也启动超时检测
          const timeoutId = setTimeout(() => {
            setIsSlowLoading(true);
          }, 2000);
          setLoadingTimeoutRef(timeoutId);
          
          navigationManager.enterFolder(item.uri || item.path || '', item.name);
        }
        break;
        
      case 'select':
      case 'deselect':
        // 多选模式下的选择/取消选择，不需要额外操作
        break;
        
      case 'multiselect_enter':
        console.log('进入多选模式');
        break;
        
      case 'multiselect_exit':
        console.log('退出多选模式');
        break;
        
      default:
        break;
    }
  }, [selectionManager, navigationManager, onSwitchToEditor, navigationState]);

  const handleItemLongPress = useCallback((item: FileItem) => {
    console.log('🔄 长按文件事件触发:', item.name);
    console.log('🔄 长按前选择状态:', selectionManager.getSelectionState());
    
    const result = selectionManager.handleLongPress(item);
    
    // 立即同步选择状态
    const newState = selectionManager.getSelectionState();
    setSelectionState(newState);
    
    console.log('🔄 长按后选择状态:', newState);
    console.log('🔄 长按结果类型:', result.type);
  }, [selectionManager]);

  // ================================
  // 页面切换处理
  // ================================
  const handleEnterPhoneFiles = useCallback(async () => {
    console.log('🚀 进入手机文件功能');
    navigationManager.enterFunction('phone');
    
    // 进入手机文件后，智能更新文件夹项目数量
    setTimeout(async () => {
      try {
        await foldersContext.smartUpdateFolderItemCounts();
      } catch (error) {
        console.warn('文件夹项目数量更新失败:', error);
      }
    }, 1000); // 延迟1秒执行，避免阻塞UI
    
    // loadFiles将在handleNavigationChange中被调用
  }, [navigationManager, foldersContext]);

  const handleEnterNetworkFiles = useCallback(() => {
    console.log('🚀 进入网络文件功能');
    navigationManager.enterFunction('network');
    // TODO: 网络文件功能
  }, [navigationManager]);

  const handleEnterAppFiles = useCallback(async () => {
    console.log('🚀 进入应用文件功能');
    
    try {
      // 确保应用目录存在
      const appDir = '/data/user/0/com.mobilecode';
      const RNFS = require('react-native-fs');
      const exists = await RNFS.exists(appDir);
      if (!exists) {
        await RNFS.mkdir(appDir);
        console.log('创建应用目录:', appDir);
      }
      
      navigationManager.enterFunction('app');
      
      console.log('✅ 成功进入应用文件功能');
      
    } catch (error) {
      console.error('进入应用文件失败:', error);
      Alert.alert(
        '访问失败', 
        `无法访问应用文件目录\n\n错误: ${error instanceof Error ? error.message : '未知错误'}`,
        [{ text: '确定' }]
      );
    }
  }, [navigationManager]);

  const handleBackToHome = useCallback(() => {
    console.log('🏠 返回应用首页');
    
    // 清理所有状态
    selectionManager.clearSelection();
    dataService.cleanup();
    
    // 导航管理器处理返回首页
    navigationManager.goToAppHome();
    // UI状态将在handleNavigationChange中更新
  }, [navigationManager, selectionManager, dataService]);

  const handleAddFolderPermission = useCallback(async () => {
    try {
      const { openDocumentTree } = require('react-native-scoped-storage');
      const result = await openDocumentTree(true);
      
      if (result?.uri) {
        console.log('📁 添加文件夹权限:', result.name, result.uri);
        
        const newFolder = await foldersContext.addFolder({
          name: result.name || '新文件夹',
          uri: result.uri,
          lastAccessed: new Date(),
        });
        
        console.log('📁 文件夹已添加到Context:', newFolder);
        
        // 🔥 等待Context状态更新完成
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // 🔥 重新获取最新的Context状态
        const latestFolders = foldersContext.authorizedFolders;
        console.log('📁 获取最新Context状态，文件夹数量:', latestFolders.length);
        
        // 🔥 如果状态还没更新，手动构建最新列表
        let currentFolders = latestFolders;
        if (latestFolders.length === 0 || !latestFolders.find(f => f.id === newFolder.id)) {
          console.log('📁 Context状态延迟，手动构建列表');
          currentFolders = [...latestFolders, newFolder];
        }
        
        console.log('📁 最终文件夹列表数量:', currentFolders.length);
        
        const folderItems = currentFolders.map(folder => {
          // 根据存储位置选择图标
          const storageId = folder.originalKey ? folder.originalKey.split(':')[0] : 'unknown';
          let storageIcon = '📁';
          if (storageId === 'primary') {
            storageIcon = '📱';
          } else if (storageId.startsWith('4A21') || storageId.includes('-')) {
            storageIcon = '💾';
          }
          
          return {
            name: folder.name,
            type: 'directory' as const,
            uri: folder.uri,
            path: undefined,
            size: folder.itemCount ? `${folder.itemCount} 项` : undefined,
            modified: folder.lastAccessed.toLocaleDateString(),
            icon: storageIcon,
          };
        });
        
        // 🔥 立即更新界面显示
        setFiles(folderItems);
        console.log('📁 界面已立即更新，显示文件数量:', folderItems.length);
        
        // 🔥 更新缓存，标记为完全加载
        dataService.cache.set('root', folderItems, true);
        console.log('📁 缓存已同步更新');
        
        Alert.alert('成功', `文件夹 "${newFolder.name}" 权限已添加`);
      }
    } catch (error) {
      console.error('添加文件夹权限失败:', error);
      if (!error.message?.includes('cancelled')) {
        Alert.alert('错误', '添加文件夹权限失败');
      }
    }
  }, [foldersContext, dataService, setFiles]);

  const handleBackgroundPress = useCallback(() => {
    console.log('🎯 背景点击，当前选择状态:', selectionState);
    const result = selectionManager.handleBackgroundPress();
    
    // 立即同步状态
    setSelectionState(selectionManager.getSelectionState());
    
    if (result?.type === 'multiselect_exit') {
      console.log('✅ 退出多选模式');
    }
  }, [selectionManager, selectionState]);

  // ================================
  // 文件操作处理
  // ================================
  const handleFileInfoOpen = useCallback(() => {
    if (fileInfoItem && onSwitchToEditor) {
      const filePath = fileInfoItem.uri || fileInfoItem.path || '';
      onSwitchToEditor(filePath, fileInfoItem.name);
    }
    setShowFileInfo(false);
    setFileInfoItem(null);
  }, [fileInfoItem, onSwitchToEditor]);

  const handleCreateConfirm = useCallback(async () => {
    if (!createName.trim()) {
      Alert.alert('错误', '请输入有效的名称');
      return;
    }

    try {
      setIsLoading(true);
      const currentPath = navigationManager.getCurrentPath();
      
      if (createDialog.type === 'file') {
        await dataService.createFile(currentPath, createName);
        
        // 等待文件列表刷新完成，确保文件已创建
        await loadFiles(currentPath);
        
        if (onSwitchToEditor) {
          // 验证文件是否真正创建成功
          const filePath = `${currentPath}/${createName}`;
          try {
            // 小延迟确保文件系统操作完成
            await new Promise(resolve => setTimeout(resolve, 100));
            onSwitchToEditor(filePath, createName);
          } catch (editorError) {
            console.warn('切换到编辑器失败:', editorError);
            Alert.alert('提示', '文件已创建，但无法立即打开编辑器');
          }
        }
      } else {
        await dataService.createDirectory(currentPath, createName);
        await loadFiles(currentPath);
      }
      
      setCreateDialog(prev => ({ ...prev, visible: false }));
      setCreateName('');
      
    } catch (error) {
      Alert.alert('创建失败', error instanceof Error ? error.message : '未知错误');
    } finally {
      setIsLoading(false);
    }
  }, [createName, createDialog, navigationManager, dataService, loadFiles, onSwitchToEditor]);

  // ================================
  // 对外接口实现
  // ================================
  useImperativeHandle(ref, () => ({
    // 基础操作
  refresh: async () => {
    console.log('🔄 智能刷新开始');
    
    // 刷新时清除选择状态
    selectionManager.clearSelection();
    setSelectionState(selectionManager.getSelectionState());
    
    const currentPath = navigationManager.getCurrentPath();
    const navState = navigationManager.getCurrentState();
    
    // 🔥 先尝试智能刷新（检查变化）
    try {
      const cachedFiles = dataService.cache?.get(currentPath || 'root', false);
      console.log('🔄 当前缓存文件数量:', cachedFiles?.length || 0);
      
      // 获取最新数据
      const freshFiles = await dataService.getFiles(currentPath, navState.currentFolderId);
      console.log('🔄 最新文件数量:', freshFiles.length);
      
      // 🔥 检查是否真的有变化
      if (cachedFiles && dataService.areFileListsEqual && 
          dataService.areFileListsEqual(cachedFiles, freshFiles)) {
        console.log('✅ 文件无变化，跳过更新');
        
        // 如果在手机文件根目录，仍然智能更新文件夹数量
        if (navState.level === 'function_root' && navState.functionType === 'phone') {
          try {
            await foldersContext.smartUpdateFolderItemCounts();
          } catch (error) {
            console.warn('刷新时更新文件夹项目数失败:', error);
          }
        }
        return;
      }
      
      // 🔥 有变化时才更新
      console.log('🔄 检测到变化，更新界面');
      setFiles(freshFiles);
      
      // 如果在手机文件根目录，更新文件夹项目数量
      if (navState.level === 'function_root' && navState.functionType === 'phone') {
        try {
          await foldersContext.smartUpdateFolderItemCounts();
        } catch (error) {
          console.warn('刷新时更新文件夹项目数失败:', error);
        }
      }
      
      // 如果是网格视图，重新请求可见缩略图
      if (viewMode === 'grid' && freshFiles.length > 0) {
        setTimeout(() => {
          thumbnailManager.requestVisibleThumbnails(freshFiles.slice(0, 20));
        }, 100);
      }
      
      console.log('✅ 智能刷新完成');
      
    } catch (error) {
      console.warn('智能刷新失败，使用强制刷新:', error);
      // 🔥 只有智能刷新失败时才强制删除缓存
      dataService.refreshFiles(currentPath);
      await loadFiles(currentPath);
    }
  },
    
    // 🔥 新增：缓存管理功能
    getCacheStats: () => dataService.getCacheStats(),
    cleanupCache: () => dataService.cleanupCache(),
    clearCache: () => dataService.clearAllCache(),
    invalidateCache: () => dataService.invalidateAllCache(),
    
    toggleView: () => {
      setViewMode(prev => {
        const newMode = prev === 'list' ? 'grid' : 'list';
        
        // 同步选择状态，确保视图切换后状态一致
        setSelectionState(selectionManager.getSelectionState());
        
        if (newMode === 'grid' && files.length > 0) {
          console.log('🔄 切换到网格视图，调试缩略图管理器');
          thumbnailManager.debugCacheState();
          
          setTimeout(() => {
            console.log('🔄 请求可见缩略图，文件数量:', files.slice(0, 20).length);
            thumbnailManager.requestVisibleThumbnails(files.slice(0, 20));
          }, 100);
        }
        return newMode;
      });
    },

    getViewMode: () => viewMode,
    
    // 导航操作
    navigateBack: () => {
      if (navigationManager.canGoBack()) {
        navigationManager.goBack();
        // UI更新将在handleNavigationChange中处理
      } else {
        handleBackToHome();
      }
    },
    canNavigateBack: () => navigationManager.canGoBack(),
    getCurrentPath: () => navigationManager.getCurrentPath(),
    getCurrentFunction: () => navigationManager.getCurrentFunctionType(),
    getNavigationLevel: () => navigationState.level,

    // 添加强制刷新导航的方法
    forceRefreshNavigation: () => {
      console.log('🔄 强制刷新导航状态');
      const navState = navigationManager.getCurrentState();
      handleNavigationChange(navState);
    },

    canNavigateBack: () => navigationManager.canGoBack(),
    getCurrentPath: () => navigationManager.getCurrentPath(),
    
    // 选择操作
    selectAll: () => selectionManager.selectAll(files),
    clearSelection: () => selectionManager.clearSelection(),
    getSelectedCount: () => selectionState.selectedCount,
    getSelectedFiles: () => selectionManager.getSelectedFiles(files),
    
    // 文件操作
    copy: () => {
      const selected = selectionManager.getSelectedFiles(files);
      if (selected.length === 0) {
        Alert.alert('提示', '请先选择文件');
        return;
      }
      Alert.alert('复制', `已复制 ${selected.length} 个文件`);
    },
    
    paste: () => Alert.alert('粘贴', '粘贴功能即将实现'),
    cut: () => Alert.alert('剪切', '剪切功能即将实现'),
    
    delete: async () => {
      const selected = selectionManager.getSelectedFiles(files);
      if (selected.length === 0) {
        Alert.alert('提示', '请先选择要删除的文件');
        return;
      }
      
      try {
        for (const file of selected) {
          if (file.uri) {
            await dataService.deleteFile(file.uri);
          }
        }
        selectionManager.clearSelection();
        const currentPath = navigationManager.getCurrentPath();
        await loadFiles(currentPath);
        Alert.alert('删除成功', `已删除 ${selected.length} 个文件`);
      } catch (error) {
        Alert.alert('删除失败', error instanceof Error ? error.message : '未知错误');
      }
    },
    
    newFile: () => {
      setCreateDialog({
        visible: true,
        type: 'file',
        title: '新建文件',
        placeholder: '请输入文件名',
        defaultName: 'new file'
      });
      setCreateName('new file');
    },
    
    newDir: () => {
      setCreateDialog({
        visible: true,
        type: 'directory',
        title: '新建文件夹',
        placeholder: '请输入文件夹名',
        defaultName: '新建文件夹'
      });
      setCreateName('新建文件夹');
    },

    // 命令执行
    executeCommand: async (command: string) => {
      const result = await CommandProcessor.execute(command, {
        dataService,
        navigationManager,
        selectionManager,
        currentFiles: files
      });
      
      if (result.success) {
        setOperationResult({
          id: `cmd-${Date.now()}`,
          type: 'create',
          message: result.message,
          details: result.details || '',
          canUndo: false
        });
        
        if (command.startsWith('cd') || command === 'mkdir' || command === 'touch' || command.startsWith('rm')) {
          const currentPath = navigationManager.getCurrentPath();
          await loadFiles(currentPath);
        }
      } else {
        Alert.alert('命令失败', result.message);
      }
    },

    search: (query: string) => {
      setSearchQuery(query);
    },

    // 兼容性接口
    extract_here: () => Alert.alert('解压', '解压功能即将实现'),
    extract_named: () => Alert.alert('解压', '解压到文件夹功能即将实现'),
    extract_custom: () => Alert.alert('解压', '自定义解压功能即将实现'),
  }), [
    viewMode, files, selectionState, navigationManager, dataService, 
    selectionManager, thumbnailManager, loadFiles, navigationState
  ]);

  // ================================
  // 初始化
  // ================================
  useEffect(() => {
  }, [loadFiles]);

  // ================================
  // 渲染逻辑
  // ================================
  const displayFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;
    return dataService.searchFiles(files, searchQuery);
  }, [files, searchQuery, dataService]);

  const renderHomePage = () => (
    <View style={styles.homeContainer}>
      <Text style={styles.homeTitle}>选择文件位置</Text>
      
      <TouchableOpacity style={styles.homeOption} onPress={handleEnterAppFiles}>
        <View style={styles.homeOptionIcon}>
          <Text style={styles.homeOptionEmoji}>📱</Text>
        </View>
        <View style={styles.homeOptionContent}>
          <Text style={styles.homeOptionTitle}>应用文件</Text>
          <Text style={styles.homeOptionDesc}>访问应用内部存储的文件</Text>
        </View>
        <Text style={styles.homeOptionArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.homeOption} onPress={handleEnterPhoneFiles}>
        <View style={styles.homeOptionIcon}>
          <Text style={styles.homeOptionEmoji}>📂</Text>
        </View>
        <View style={styles.homeOptionContent}>
          <Text style={styles.homeOptionTitle}>手机文件</Text>
          <Text style={styles.homeOptionDesc}>访问已授权的文件夹</Text>
        </View>
        <Text style={styles.homeOptionArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.homeOption} onPress={handleEnterNetworkFiles}>
        <View style={styles.homeOptionIcon}>
          <Text style={styles.homeOptionEmoji}>🌐</Text>
        </View>
        <View style={styles.homeOptionContent}>
          <Text style={styles.homeOptionTitle}>网络文件</Text>
          <Text style={styles.homeOptionDesc}>通过SSH访问远程文件</Text>
        </View>
        <Text style={styles.homeOptionArrow}>›</Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    // 根据导航状态渲染不同内容
    switch (navigationState.level) {
      case 'app_home':
        return renderHomePage();
      case 'function_root':
        if (navigationState.functionType === 'phone') {
          // 🔥 手机文件功能：无论是否有文件夹都显示头部和添加按钮
          return (
            <View style={styles.functionRootContainer}>
              <View style={styles.functionRootHeader}>
                <Text style={styles.functionRootTitle}>
                  {foldersContext.isUpdatingCounts ? '更新中...' : 
                  files.length > 0 ? '已授权文件夹' : '未授权任何文件夹'}
                </Text>
                <View style={styles.headerActions}>
                  {foldersContext.isUpdatingCounts && (
                    <ActivityIndicator size="small" color="#4CAF50" style={styles.headerLoader} />
                  )}
                  <TouchableOpacity 
                    style={styles.addFolderButton} 
                    onPress={handleAddFolderPermission}
                    disabled={foldersContext.isUpdatingCounts}
                  >
                    <Text style={styles.addFolderButtonText}>+ 添加文件夹</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {renderFileContent()}
            </View>
          );
        }
        // 其他功能根目录直接显示文件
        return renderFileContent();
        
      case 'folder':
        return renderFileContent();
        
      default:
        return renderHomePage();
    }
  };

  const renderFileContent = () => {
    // 🔥 显示加载状态
    if (isLoadingFolder) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>
            {loadingProgress.total > 0 
              ? `加载中... ${loadingProgress.current}/${loadingProgress.total}`
              : '正在加载...'}
          </Text>
          {/* 🔥 慢加载提示 */}
          {isSlowLoading && (
            <Text style={styles.slowLoadingHint}>
              文件夹内容较多，加载需要更长时间
            </Text>
          )}
          {loadingProgress.total > 0 && (
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }
                ]} 
              />
            </View>
          )}
        </View>
      );
    }
    
    // 原有的渲染逻辑
  if (displayFiles.length === 0 && !isLoading) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {searchQuery ? '没有找到匹配的文件' : 
          // 🔥 修复：只在手机文件功能根目录且无授权文件夹时显示添加提示
          (navigationState.level === 'function_root' && navigationState.functionType === 'phone') ? 
            '点击上方"+ 添加文件夹"按钮来授权访问文件夹' : 
            '文件夹为空'}
        </Text>
      </View>
    );
  }

    const commonProps = {
      items: displayFiles,
      onItemPress: handleItemInteraction,
      onItemLongPress: handleItemLongPress,
      selectedItems: selectionState.selectedItems,
      showCheckboxes: selectionState.multiSelectMode,
      onBackgroundPress: handleBackgroundPress,
    };

    if (viewMode === 'grid') {
      return (
        <FileGridView
          {...commonProps}
          numColumns={4}
          thumbnailManager={thumbnailManager}
        />
      );
    } else {
      return <FileListView {...commonProps} />;
    }
  };

  return (
      <View style={styles.container}>
        {navigationState.level !== 'app_home' && (
          <View style={styles.breadcrumbContainer}>
            <View style={styles.topBarHeader}>
              <View style={styles.topBarLeft}>
                {/* 统一的面包屑显示 */}
                <BreadcrumbNav 
                  items={navigationManager.getBreadcrumbItems()} 
                  maxVisibleItems={3} 
                />
              </View>
              <TouchableOpacity style={styles.topBarCloseButton} onPress={handleBackToHome}>
                <Text style={styles.topBarCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.contentContainer}>
          {renderContent()}
        </View>

        {navigationState.level !== 'app_home' && (
          <View style={styles.botBar}>
            <View style={styles.botBarLeft}>
              <Text style={styles.botBarText}>
                {(() => {
                  if (files.length === 0) return '';
                  
                  const fileCount = files.filter(f => f.type === 'file').length;
                  const dirCount = files.filter(f => f.type === 'directory').length;
                  
                  if (navigationState.level === 'function_root' && navigationState.functionType === 'phone') {
                    return `${dirCount} 个已授权文件夹`;
                  } else {
                    const parts = [];
                    if (fileCount > 0) parts.push(`${fileCount} 个文件`);
                    if (dirCount > 0) parts.push(`${dirCount} 个文件夹`);
                    return parts.join(', ');
                  }
                })()}
              </Text>
            </View>
            
            <View style={styles.botBarCenter}>
              <Text style={styles.botBarText}>
                {selectionState.multiSelectMode 
                  ? `已选择 ${selectionState.selectedCount} 项`
                  : selectionState.highlightedItem 
                  ? '已选中文件'
                  : ''}
              </Text>
            </View>
            
            <View style={styles.botBarRight}>
              <Text style={styles.botBarText}>
                {(() => {
                  const selectedFiles = selectionManager.getSelectedFiles(files);
                  if (selectedFiles.length === 1) {
                    const file = selectedFiles[0];
                    return `${file.name}${file.size ? ` (${file.size})` : ''}`;
                  } else if (selectedFiles.length > 1) {
                    return `${selectedFiles.length} 项已选择`;
                  }
                  return navigationState.functionType ? `当前：${navigationManager.getCurrentFunctionType() === 'app' ? '应用文件' : navigationManager.getCurrentFunctionType() === 'phone' ? '手机文件' : '网络文件'}` : '';
                })()}
              </Text>
            </View>
          </View>
        )}

        {operationResult && (
        <View style={styles.operationResultContainer}>
          <View style={styles.operationResult}>
            <View style={styles.operationInfo}>
              <Text style={styles.operationMessage}>{operationResult.message}</Text>
              <Text style={styles.operationDetails}>{operationResult.details}</Text>
            </View>
            <TouchableOpacity style={styles.confirmButton} onPress={() => setOperationResult(null)}>
              <Text style={styles.confirmButtonText}>确定</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FileInfoModal
        visible={showFileInfo}
        file={fileInfoItem}
        thumbnail={fileInfoItem ? thumbnailManager.getCachedThumbnail(fileInfoItem) : undefined}
        onClose={() => setShowFileInfo(false)}
        onOpen={handleFileInfoOpen}
      />

      <Modal
        visible={createDialog.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateDialog(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{createDialog.title}</Text>
            <TextInput
              style={styles.modalInput}
              value={createName}
              onChangeText={setCreateName}
              placeholder={createDialog.placeholder}
              placeholderTextColor="#666"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => {
                  setCreateDialog(prev => ({ ...prev, visible: false }));
                  setCreateName('');
                }}
              >
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalConfirmButton}
                onPress={handleCreateConfirm}
              >
                <Text style={styles.modalConfirmText}>创建</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
});

SimpleFileManager.displayName = 'SimpleFileManager';

// ================================
// 样式定义
// ================================

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLoader: {
    marginRight: 8,
  },
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  breadcrumbContainer: {
    height: 40,
    backgroundColor: '#2d2d2d',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#999',
    fontSize: 16,
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
  },
  operationResultContainer: {
    backgroundColor: '#2d2d2d',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  operationResult: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a3a1a',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  operationInfo: {
    flex: 1,
    marginRight: 12,
  },
  operationMessage: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  operationDetails: {
    color: '#81C784',
    fontSize: 12,
  },
  confirmButton: {
    backgroundColor: '#666',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 300,
    borderWidth: 1,
    borderColor: '#444',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#3d3d3d',
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    backgroundColor: '#666',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  modalCancelText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  modalConfirmButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
  },
modalConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // 首页样式
  homeContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 20,
    justifyContent: 'center',
  },
  homeTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
  },
  homeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  homeOptionIcon: {
    marginRight: 16,
  },
  homeOptionEmoji: {
    fontSize: 32,
  },
  homeOptionContent: {
    flex: 1,
  },
  homeOptionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  homeOptionDesc: {
    color: '#999',
    fontSize: 14,
  },
  homeOptionArrow: {
    color: '#4CAF50',
    fontSize: 24,
    fontWeight: 'bold',
  },
  // 手机文件头部样式
  phoneFilesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 40,
  },
  phoneFilesTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  phoneFilesActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneFilesButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 8,
  },
  phoneFilesButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  phoneFilesCloseButton: {
    backgroundColor: '#666',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  phoneFilesCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // 通用topbar样式
  topBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 40,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  topBarTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  topBarSeparator: {
    color: '#666',
    fontSize: 14,
  },
  topBarCloseButton: {
    backgroundColor: '#666',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  topBarCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // 底部状态栏样式
  botBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d2d',
    borderTopWidth: 1,
    borderTopColor: '#444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
  },
  botBarLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  botBarCenter: {
    flex: 1,
    alignItems: 'center',
  },
  botBarRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  botBarText: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
  },
  clickableTitle: {
    color: '#4CAF50',
    textDecorationLine: 'underline',
  },
  // 功能根目录样式
  functionRootContainer: {
    flex: 1,
  },
  functionRootHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2d2d2d',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  functionRootTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addFolderButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addFolderButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressBar: {
    width: '80%',
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  slowLoadingHint: {
    color: '#FFA726', // 橙色提示
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
export default SimpleFileManager;