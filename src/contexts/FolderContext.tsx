// src/contexts/FolderContext.tsx
// 功能：管理已授权的文件夹列表，提供持久化存储，支持从系统权限恢复
// 依赖：AsyncStorage, react-native-scoped-storage
// 被使用：SimpleFileManager

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPersistedUriPermissions, releasePersistableUriPermission } from 'react-native-scoped-storage';

const AUTHORIZED_FOLDERS_KEY = '@authorized_folders';

export interface AuthorizedFolder {
  id: string;
  name: string;        // 用户显示名称
  uri: string;         // 系统权限key
  originalKey: string; // 提取的原始key用于包含关系判断
  lastAccessed: Date;
  createdAt: Date;
  itemCount?: number;
  isParentFolder?: boolean; // 标记是否为父文件夹（包含子权限）
}

interface FolderContextState {
  authorizedFolders: AuthorizedFolder[];
  addFolder: (folder: Omit<AuthorizedFolder, 'id' | 'createdAt' | 'originalKey'>) => Promise<AuthorizedFolder>;
  removeFolder: (id: string) => Promise<void>;
  revokePermission: (uri: string) => Promise<void>; // 新增：撤销权限
  updateFolder: (id: string, updates: Partial<AuthorizedFolder>) => Promise<void>;
  getFolder: (id: string) => AuthorizedFolder | undefined;
  syncWithSystemPermissions: () => Promise<void>;
  isLoading: boolean;
}

const FolderContext = createContext<FolderContextState | null>(null);

export const FolderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authorizedFolders, setAuthorizedFolders] = useState<AuthorizedFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const cleanUri = (uri: string) => {
    if (!uri) return '';
    
    // 1. 统一编码：将%3A转换为冒号
    let cleaned = uri.replace(/%3A/g, ':');
    
    // 2. 移除/document/后面的所有内容
    cleaned = cleaned.split('/document/')[0];
    
    // 3. 确保以/结尾（SAF标准格式）
    if (!cleaned.endsWith('/')) {
      cleaned += '/';
    }
    
    // 4. 统一tree路径格式
    const treeMatch = cleaned.match(/\/tree\/[^\/]+\//);
    if (treeMatch) {
      return treeMatch[0];
    }
    
    return cleaned;
  };

  // 从URI提取原始key用于包含关系判断
  const extractOriginalKey = (uri: string): string => {
    try {
      // 提取tree部分作为key
      const treeMatch = uri.match(/\/tree\/([^\/]+)/);
      if (!treeMatch) return uri;
      
      return decodeURIComponent(treeMatch[1]);
    } catch (error) {
      console.warn('提取原始key失败:', error);
      return uri;
    }
  };

  // 检查是否为包含关系（parentKey是否包含childKey）
  const isContainedIn = (childKey: string, parentKey: string): boolean => {
    // 移除设备ID前缀进行比较
    const getPath = (key: string) => {
      const colonIndex = key.indexOf(':');
      return colonIndex >= 0 ? key.substring(colonIndex + 1) : key;
    };
    
    const childPath = getPath(childKey);
    const parentPath = getPath(parentKey);
    
    // 检查子路径是否以父路径开头
    return childPath.startsWith(parentPath + '/') || childPath === parentPath;
  };

  const extractFolderNameFromUri = (uri: string): string => {
    const cleaned = cleanUri(uri);
    const treeMatch = cleaned.match(/\/tree\/([^\/]+)/);
    if (!treeMatch) return '文件夹';
    
    const treePart = treeMatch[1];
    const colonIndex = treePart.indexOf(':');
    return colonIndex === -1 ? treePart : treePart.slice(colonIndex + 1);
  };

  // 保存到存储
  const saveFoldersToStorage = async (folders: AuthorizedFolder[]) => {
    try {
      const jsonValue = JSON.stringify(folders);
      await AsyncStorage.setItem(AUTHORIZED_FOLDERS_KEY, jsonValue);
      console.log('✓ 已保存文件夹列表:', folders.length);
    } catch (error) {
      console.error('✗ 保存文件夹列表失败:', error);
      throw error;
    }
  };

  // 从存储加载
  const loadFoldersFromStorage = async () => {
    try {
      setIsLoading(true);
      console.log('加载已授权文件夹...');
      
      const jsonValue = await AsyncStorage.getItem(AUTHORIZED_FOLDERS_KEY);
      
      if (jsonValue != null) {
        const folders: AuthorizedFolder[] = JSON.parse(jsonValue);
        
        // 恢复Date对象
        const restoredFolders = folders.map(folder => ({
          ...folder,
          lastAccessed: new Date(folder.lastAccessed),
          createdAt: new Date(folder.createdAt),
        }));
        
        setAuthorizedFolders(restoredFolders);
        console.log('✓ 从存储加载了', restoredFolders.length, '个已授权文件夹');
        return restoredFolders;
      } else {
        console.log('没有已保存的文件夹，检查系统权限...');
        setAuthorizedFolders([]);
        return [];
      }
    } catch (error) {
      console.error('✗ 加载文件夹列表失败:', error);
      setAuthorizedFolders([]);
      return [];
    }
  };

  // 从系统权限恢复文件夹列表
  const restoreFoldersFromSystemPermissions = async (existingFolders: AuthorizedFolder[] = []) => {
    try {
      console.log('从系统权限恢复文件夹列表...');
      const persistedUris = (await getPersistedUriPermissions()).map(cleanUri);
      console.log('发现系统权限:', persistedUris);

      if (persistedUris.length === 0) {
        console.log('没有系统权限，跳过恢复');
        return existingFolders;
      }

      // 使用Set去重
      const persistedUriSet = new Set(persistedUris);
      const existingUriSet = new Set(existingFolders.map(f => cleanUri(f.uri)));

      // 找出需要恢复的URI（系统有权限但本地没有记录的）
      const urisToRestore = persistedUris.filter(uri => !existingUriSet.has(uri));
      
      if (urisToRestore.length === 0) {
        console.log('所有权限都已有对应文件夹记录');
        return existingFolders;
      }

      console.log('需要恢复', urisToRestore.length, '个文件夹');

      // 为每个URI创建文件夹记录
      const restoredFolders: AuthorizedFolder[] = urisToRestore.map(uri => ({
        id: `restored-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: extractFolderNameFromUri(uri),
        uri: uri,
        originalKey: extractOriginalKey(uri),
        lastAccessed: new Date(),
        createdAt: new Date(),
        itemCount: 0,
        isParentFolder: false // 明确标记不是父文件夹
      }));

      const allFolders = [...existingFolders, ...restoredFolders];
      
      // 保存到存储（不再合并）
      await saveFoldersToStorage(allFolders);
      setAuthorizedFolders(allFolders);
      
      console.log('✓ 恢复完成，总计', allFolders.length, '个文件夹');
      return allFolders;
    } catch (error) {
      console.error('从系统权限恢复失败:', error);
      return existingFolders;
    }
  };

  // 添加文件夹
  const addFolder = async (folderData: Omit<AuthorizedFolder, 'id' | 'createdAt' | 'originalKey'>) => {
    try {
      const cleanedUri = cleanUri(folderData.uri);
      const existingIndex = authorizedFolders.findIndex(f => cleanUri(f.uri) === cleanedUri);
      
      if (existingIndex >= 0) {
        // 更新现有文件夹
        const updatedFolder = { 
          ...authorizedFolders[existingIndex], 
          lastAccessed: new Date() 
        };
        const newFolders = [...authorizedFolders];
        newFolders[existingIndex] = updatedFolder;
        
        setAuthorizedFolders(newFolders);
        await saveFoldersToStorage(newFolders);
        return updatedFolder;
      }
      
      // 添加新文件夹
      const newFolder: AuthorizedFolder = {
        ...folderData,
        id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        originalKey: extractOriginalKey(folderData.uri),
        createdAt: new Date(),
        lastAccessed: new Date(),
      };
      
      const newFolders = [...authorizedFolders, newFolder];
      setAuthorizedFolders(newFolders);
      await saveFoldersToStorage(newFolders);
      return newFolder;
    } catch (error) {
      console.error('添加文件夹失败:', error);
      throw error;
    }
  };

  const revokePermission = async (uri: string) => {
    const baseUri = cleanUri(uri);

    try {
      console.log('撤销权限:', baseUri);
      await releasePersistableUriPermission(baseUri);

      const newFolders = authorizedFolders.filter(f => cleanUri(f.uri) !== baseUri);
      setAuthorizedFolders(newFolders);
      await saveFoldersToStorage(newFolders);

      console.log('✓ 权限已撤销:', baseUri);
    } catch (error) {
      console.error('✗ 撤销权限失败:', error);
      throw error;
    }
  };


  const removeFolder = async (id: string) => {
    try {
      const newFolders = authorizedFolders.filter(f => f.id !== id);
      setAuthorizedFolders(newFolders);
      await saveFoldersToStorage(newFolders);
      console.log('✓ 删除文件夹:', id);
    } catch (error) {
      console.error('✗ 删除文件夹失败:', error);
      throw error;
    }
  };

  // 更新文件夹
  const updateFolder = async (id: string, updates: Partial<AuthorizedFolder>) => {
    try {
      if (!id) {
        console.error('✗ updateFolder: id不能为空');
        return;
      }

      const folderIndex = authorizedFolders.findIndex(f => f.id === id);
      if (folderIndex === -1) {
        console.warn('✗ updateFolder: 找不到文件夹', id);
        return;
      }

      const newFolders = [...authorizedFolders];
      newFolders[folderIndex] = { 
        ...newFolders[folderIndex], 
        ...updates, 
        lastAccessed: new Date() 
      };
      
      setAuthorizedFolders(newFolders);
      await saveFoldersToStorage(newFolders);
      console.log('✓ 更新文件夹:', id);
    } catch (error) {
      console.error('✗ 更新文件夹失败:', error);
      throw error;
    }
  };

  // 获取单个文件夹
  const getFolder = (id: string) => {
    return authorizedFolders.find(f => f.id === id);
  };

  // 与系统权限同步
  const syncWithSystemPermissions = async () => {
    setIsLoading(true);
    try {
      // 获取系统权限并统一格式
      const systemUris = (await getPersistedUriPermissions()).map(cleanUri);
      console.log('系统权限(清理后):', systemUris);
      
      // 加载现有文件夹
      const currentFolders = await loadFoldersFromStorage();
      const currentUris = currentFolders.map(f => cleanUri(f.uri));
      
      // 找出需要删除的文件夹（本地有但系统无权限）
      const foldersToKeep = currentFolders.filter(folder => 
        systemUris.includes(cleanUri(folder.uri))
      );
      
      // 找出需要添加的新权限
      const newUris = systemUris.filter(uri => 
        !currentUris.includes(uri)
      );
      
      // 添加新文件夹
      const newFolders = newUris.map(uri => ({
        id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: extractFolderNameFromUri(uri),
        uri: uri,
        originalKey: extractOriginalKey(uri),
        lastAccessed: new Date(),
        createdAt: new Date(),
        itemCount: 0
      }));
      
      const finalFolders = [...foldersToKeep, ...newFolders];
      await saveFoldersToStorage(finalFolders);
      setAuthorizedFolders(finalFolders);
      
      console.log('同步完成. 总数:', finalFolders.length);
      return finalFolders;
    } finally {
      setIsLoading(false);
    }
  };

  // 组件挂载时加载数据并恢复
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      try {
        // 先同步系统权限，忽略本地存储的旧数据
        await syncWithSystemPermissions();
      } finally {
        setIsLoading(false);
      }
    };
    initialize();
  }, []);



  return (
    <FolderContext.Provider value={{
      authorizedFolders,
      addFolder,
      removeFolder,
      revokePermission,
      updateFolder,
      getFolder,
      syncWithSystemPermissions,
      isLoading,
    }}>
      {children}
    </FolderContext.Provider>
  );
};

export const useFolders = () => {
  const context = useContext(FolderContext);
  if (!context) {
    throw new Error('useFolders must be used within FolderProvider');
  }
  return context;
};