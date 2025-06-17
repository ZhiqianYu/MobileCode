// src/components/File/SimpleFileManager.tsx
// 功能：基于SAF的文件管理器，树状结构显示，上下bar布局，支持文件夹权限管理
// 依赖：@react-native-documents/picker, react-native-blob-util, AsyncStorage, FolderContext
// 被使用：MainContentComponent

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import { openDocumentTree, listFiles, readFile, stat, getPersistedUriPermissions } from 'react-native-scoped-storage';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { useSSHContext } from '../../contexts/SSHContext';
import { useFolders } from '../../contexts/FolderContext';

interface TreeNode {
  name: string;
  type: 'file' | 'directory';
  path?: string;
  uri?: string;
  size?: string;
  modified?: string;
  icon: string;
  level: number;
  isExpanded?: boolean;
  children?: TreeNode[];
  parentPath?: string;
}

interface SimpleFileManagerProps {
  mode?: 'file' | 'folder' | 'browse';
  onFileSelected?: (uri: string, fileName: string) => void;
  onFolderSelected?: (uri: string) => void;
  onCancel?: () => void;
}

const SimpleFileManager = React.forwardRef<any, SimpleFileManagerProps>((props, ref) => {
  const { 
    mode = 'browse', 
    onFileSelected, 
    onFolderSelected, 
    onCancel 
  } = props;

  // 文件夹Context
  const { 
    authorizedFolders, 
    addFolder, 
    updateFolder, 
    revokePermission,
    syncWithSystemPermissions,
    isLoading: foldersLoading 
  } = useFolders();

  // 状态管理
  const [fileMode, setFileMode] = useState<'none' | 'app' | 'folderList' | 'browseFolder'>('none');
  const [currentFolder, setCurrentFolder] = useState<any>(null);
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [rootPath, setRootPath] = useState('');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMoreFiles, setHasMoreFiles] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fileOffset, setFileOffset] = useState(0);
  const FILES_PER_PAGE = 20;
  const [recentUris, setRecentUris] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [systemRoots, setSystemRoots] = useState<TreeNode[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set()); // 新增：展开的分组

  const cleanUri = (uri: string): string => {
    if (!uri) return '';
    
    // 处理content://开头的完整URI
    if (uri.startsWith('content://')) {
      // 提取tree部分
      const treeMatch = uri.match(/\/tree\/[^\/]+/);
      if (treeMatch) {
        const treePart = treeMatch[0];
        // 统一编码和格式
        return `content://com.android.externalstorage.documents${treePart}/`
          .replace(/%3A/g, ':')
          .replace(/%2F/g, '/');
      }
    }
    
    // 处理已清理的短格式URI
    if (uri.startsWith('/tree/')) {
      return `content://com.android.externalstorage.documents${uri}`
        .replace(/%3A/g, ':')
        .replace(/%2F/g, '/');
    }
    
    return uri;
  };

  // SSH相关
  const { isConnected, currentConnection } = useSSHContext();

  // 组件挂载时检查权限，并初始化分组展开状态
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const persistedUris = await getPersistedUriPermissions();
        console.log('当前持久化权限:', persistedUris.length, '个');
      } catch (error) {
        console.warn('检查权限失败:', error);
      }
    };
    
    checkPermissions();
  }, []);

  // 当文件夹列表变化时，自动展开常见分组
  useEffect(() => {
    if (authorizedFolders.length > 0) {
      const { groups } = parseIntoGroups(authorizedFolders);
      const commonGroups = ['Download', 'Documents', 'Pictures', 'Music', 'Videos'];
      
      setExpandedGroups(prev => {
        const newSet = new Set(prev);
        // 自动展开常见分组
        Object.keys(groups).forEach(groupName => {
          if (commonGroups.includes(groupName) || groups[groupName].length <= 3) {
            newSet.add(groupName);
          }
        });
        return newSet;
      });
    }
  }, [authorizedFolders, parseIntoGroups]);

  // 获取文件图标
  const getFileIcon = useCallback((fileName: string, isDirectory: boolean = false, mimeType?: string): string => {
    if (isDirectory) return '📁';
    
    if (mimeType) {
      if (mimeType.startsWith('image/')) return '🖼️';
      if (mimeType.startsWith('video/')) return '🎬';
      if (mimeType.startsWith('audio/')) return '🎵';
      if (mimeType.startsWith('text/')) return '📄';
      if (mimeType === 'application/pdf') return '📕';
      if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦';
      if (mimeType.includes('json')) return '📋';
    }
    
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js': case 'jsx': case 'ts': case 'tsx': return '📜';
      case 'py': return '🐍';
      case 'java': return '☕';
      case 'json': return '📋';
      case 'md': return '📝';
      case 'txt': return '📄';
      case 'html': case 'htm': return '🌐';
      case 'css': return '🎨';
      case 'png': case 'jpg': case 'jpeg': case 'gif': case 'webp': return '🖼️';
      case 'mp4': case 'avi': case 'mov': return '🎬';
      case 'mp3': case 'wav': case 'flac': return '🎵';
      case 'pdf': return '📕';
      case 'zip': case 'rar': case '7z': return '📦';
      case 'apk': return '📱';
      default: return '📄';
    }
  }, []);

  // 格式化文件大小
  const formatFileSize = useCallback((bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

  // 构建SAF文件树（支持分页加载）
  const buildSystemFileTree = useCallback(async (
    uri: string, 
    level: number = 0, 
    offset: number = 0, 
    loadFilesLimit?: number
  ): Promise<{ nodes: TreeNode[], hasMore: boolean }> => {
    try {
      console.log('构建SAF文件树:', uri, 'level:', level, 'offset:', offset);
      
      // 权限检查（简化）
      try {
        const persistedUris = await getPersistedUriPermissions();
        if (persistedUris.length === 0 && level > 0) {
          return { nodes: [], hasMore: false };
        }
      } catch (permError) {
        console.warn('权限检查失败，继续尝试访问:', permError);
      }
      
      // 使用react-native-scoped-storage读取目录
      const items = await listFiles(uri);
      console.log('SAF目录内容:', items.length, '个项目');
      
      // 分离文件夹和文件
      const directories = items.filter(item => item.type === 'directory');
      const files = items.filter(item => item.type === 'file');
      
      const nodes: TreeNode[] = [];
      let hasMore = false;

      // 所有文件夹都加载
      for (const item of directories) {
        try {
          const node: TreeNode = {
            name: item.name,
            type: 'directory',
            uri: item.uri,
            icon: '📁',
            level,
            isExpanded: false,
            children: [],
            parentPath: uri,
          };
          nodes.push(node);
        } catch (itemError) {
          console.warn('处理SAF文件夹失败:', item.name, itemError);
        }
      }

      // 文件分页加载
      if (loadFilesLimit && files.length > 0) {
        const filesToLoad = files.slice(offset, offset + loadFilesLimit);
        hasMore = offset + loadFilesLimit < files.length;
        
        for (const item of filesToLoad) {
          try {
            let fileSize: string | undefined;
            let modifiedTime: string | undefined;
            
            // 获取文件详情
            if (item.uri) {
              try {
                const statInfo = await stat(item.uri);
                if (statInfo.size) {
                  fileSize = formatFileSize(statInfo.size);
                }
                if (statInfo.lastModified) {
                  modifiedTime = new Date(statInfo.lastModified).toLocaleDateString();
                }
              } catch (statError) {
                console.warn('无法获取文件状态:', item.name);
              }
            }
            
            const node: TreeNode = {
              name: item.name,
              type: 'file',
              uri: item.uri,
              icon: getFileIcon(item.name, false, item.mime),
              size: fileSize,
              modified: modifiedTime || (item.lastModified ? new Date(item.lastModified).toLocaleDateString() : undefined),
              level,
              parentPath: uri,
            };
            nodes.push(node);
          } catch (itemError) {
            console.warn('处理SAF文件失败:', item.name, itemError);
          }
        }
      } else {
        // 不分页时加载所有文件
        for (const item of files) {
          try {
            let fileSize: string | undefined;
            let modifiedTime: string | undefined;
            
            if (item.uri) {
              try {
                const statInfo = await stat(item.uri);
                if (statInfo.size) {
                  fileSize = formatFileSize(statInfo.size);
                }
                if (statInfo.lastModified) {
                  modifiedTime = new Date(statInfo.lastModified).toLocaleDateString();
                }
              } catch (statError) {
                console.warn('无法获取文件状态:', item.name);
              }
            }
            
            const node: TreeNode = {
              name: item.name,
              type: 'file',
              uri: item.uri,
              icon: getFileIcon(item.name, false, item.mime),
              size: fileSize,
              modified: modifiedTime,
              level,
              parentPath: uri,
            };
            nodes.push(node);
          } catch (itemError) {
            console.warn('处理SAF文件失败:', item.name, itemError);
          }
        }
      }

      // 排序：目录在前，文件在后
      nodes.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      console.log('SAF文件树构建完成:', nodes.length, '个节点', hasMore ? '(有更多)' : '(全部)');
      return { nodes, hasMore };
    } catch (error) {
      console.error('构建SAF文件树失败:', error);
      Alert.alert('访问失败', `无法访问文件夹内容: ${error.message}`);
      return { nodes: [], hasMore: false };
    }
  }, [getFileIcon, formatFileSize]);

  // 构建应用内文件树
  const buildAppFileTree = useCallback(async (path: string, level: number = 0): Promise<TreeNode[]> => {
    try {
      const exists = await ReactNativeBlobUtil.fs.exists(path);
      if (!exists) return [];

      const items = await ReactNativeBlobUtil.fs.ls(path);
      const nodes: TreeNode[] = [];

      for (const item of items) {
        const fullPath = `${path}/${item}`;
        
        try {
          const stat = await ReactNativeBlobUtil.fs.stat(fullPath);
          const isDirectory = stat.type === 'directory';
          
          const node: TreeNode = {
            name: item,
            type: isDirectory ? 'directory' : 'file',
            path: fullPath,
            icon: getFileIcon(item, isDirectory),
            size: isDirectory ? undefined : formatFileSize(stat.size),
            modified: new Date(stat.lastModified).toLocaleDateString(),
            level,
            isExpanded: false,
            children: [],
            parentPath: path,
          };

          nodes.push(node);
        } catch (statError) {
          console.warn('无法获取文件状态:', item);
        }
      }

      // 排序：目录在前，文件在后
      nodes.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      return nodes;
    } catch (error) {
      console.error('构建文件树失败:', error);
      return [];
    }
  }, [getFileIcon, formatFileSize]);

  // 解析文件夹分组结构（支持父文件夹标记）
  const parseIntoGroups = useCallback((folders: any[]) => {
    const groups: { [key: string]: any[] } = {};
    const standaloneItems: any[] = [];

    folders.forEach(folder => {
      const name = folder.name || '';
      
      if (name.includes('/')) {
        // 有子路径的文件夹，如 "Download/netease"
        const [parentName, ...childParts] = name.split('/');
        const groupKey = parentName;
        
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        
        groups[groupKey].push({
          ...folder,
          displayName: childParts.join('/'), // 显示子路径部分
          parentGroup: groupKey,
        });
      } else {
        // 独立文件夹，如 "Documents", "DCIM"
        const displayFolder = {
          ...folder,
          displayName: name,
          parentGroup: null,
        };
        
        // 如果是父文件夹，添加标记
        if (folder.isParentFolder) {
          displayFolder.displayName = `${name} (包含子文件夹)`;
        }
        
        standaloneItems.push(displayFolder);
      }
    });

    return { groups, standaloneItems };
  }, []);

  // 长按删除权限
  const handleLongPress = useCallback((folder: any) => {
    Alert.alert(
      '文件夹权限管理',
      `文件夹: ${folder.name}\n${folder.isParentFolder ? '(包含子文件夹权限)' : ''}`,
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '撤销权限', 
          style: 'destructive',
          onPress: async () => {
            try {
              if (!baseUri) {
                Alert.alert('错误', '无法识别该文件夹 URI');
                return;
              }

              const baseUri = cleanUri(folder.uri);
              await revokePermission(baseUri);
              await syncWithSystemPermissions();
              await syncWithSystemPermissions(); // 撤销后同步刷新
              Alert.alert('权限已撤销', `已撤销对 "${folder.name}" 的访问权限`);
            } catch (error) {
              Alert.alert('撤销失败', '无法撤销权限，请重试');
            }
          }
        },
        {
          text: '浏览文件夹',
          onPress: () => handleBrowseFolder(folder)
        }
      ]
    );
  }, [revokePermission, handleBrowseFolder]);
  const toggleGroup = useCallback((groupName: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  }, []);
  const toggleFolder = useCallback(async (node: TreeNode, nodeIndex: number) => {
    if (node.type !== 'directory') return;

    const newTreeNodes = [...treeNodes];
    const targetNode = newTreeNodes[nodeIndex];

    if (targetNode.isExpanded) {
      // 收起：移除子节点
      targetNode.isExpanded = false;
      const nextLevelNodes = [];
      for (let i = nodeIndex + 1; i < newTreeNodes.length; i++) {
        if (newTreeNodes[i].level <= node.level) break;
        nextLevelNodes.push(i);
      }
      // 从后往前删除，避免索引变化
      for (let i = nextLevelNodes.length - 1; i >= 0; i--) {
        newTreeNodes.splice(nextLevelNodes[i], 1);
      }
    } else {
      // 展开：添加子节点
      targetNode.isExpanded = true;
      let children: TreeNode[] = [];
      
      if (fileMode === 'app' && node.path) {
        children = await buildAppFileTree(node.path, node.level + 1);
      } else if ((fileMode === 'folderList' || fileMode === 'browseFolder') && node.uri) {
        children = await buildSystemFileTree(node.uri, node.level + 1);
      }
      
      newTreeNodes.splice(nodeIndex + 1, 0, ...children);
    }

    setTreeNodes(newTreeNodes);
  }, [treeNodes, fileMode, buildAppFileTree, buildSystemFileTree]);

  // 渲染已授权文件夹列表（支持分组）
  const renderFolderList = useCallback(() => {
    if (foldersLoading) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>加载文件夹列表...</Text>
        </View>
      );
    }

    if (authorizedFolders.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>还没有已授权的文件夹</Text>
          <Text style={styles.emptyHint}>点击上方📁按钮选择文件夹</Text>
          <Text style={styles.emptyHint}>获得访问权限后将显示在这里</Text>
        </View>
      );
    }

    const { groups, standaloneItems } = parseIntoGroups(authorizedFolders);

    return (
      <ScrollView showsVerticalScrollIndicator={false} style={styles.folderListContainer}>
        {/* 渲染分组 */}
        {Object.entries(groups).map(([groupName, groupFolders]) => (
          <View key={`group-${groupName}`}>
            {/* 分组标题 */}
            <TouchableOpacity
              style={styles.groupHeader}
              onPress={() => toggleGroup(groupName)}
              activeOpacity={0.7}
            >
              <Text style={styles.groupIcon}>📁</Text>
              <View style={styles.groupDetails}>
                <Text style={styles.groupName}>{groupName}</Text>
                <Text style={styles.groupInfo}>
                  {groupFolders.length} 个子文件夹
                </Text>
              </View>
              <Text style={styles.groupArrow}>
                {expandedGroups.has(groupName) ? '▼' : '▶'}
              </Text>
            </TouchableOpacity>

            {/* 分组内容（展开时显示） */}
            {expandedGroups.has(groupName) && (
              <View style={styles.groupContent}>
                {groupFolders.map((folder) => (
                  <TouchableOpacity
                    key={folder.id}
                    style={styles.groupItem}
                    onPress={() => handleBrowseFolder(folder)}
                    onLongPress={() => handleLongPress(folder)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.groupItemContent}>
                      <Text style={styles.groupItemIcon}>📂</Text>
                      <View style={styles.groupItemDetails}>
                        <Text style={styles.groupItemName} numberOfLines={1}>
                          {folder.displayName}
                        </Text>
                        <Text style={styles.groupItemInfo}>
                          上次访问: {folder.lastAccessed.toLocaleDateString()}
                          {folder.itemCount && ` • ${folder.itemCount} 项`}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* 渲染独立文件夹 */}
        {standaloneItems.map((folder) => (
          <TouchableOpacity
            key={folder.id}
            style={styles.folderListItem}
            onPress={() => handleBrowseFolder(folder)}
            onLongPress={() => handleLongPress(folder)}
            activeOpacity={0.7}
          >
            <View style={styles.folderListContent}>
              <Text style={styles.folderListIcon}>
                {folder.isParentFolder ? '📁' : '📁'}
              </Text>
              <View style={styles.folderListDetails}>
                <Text style={styles.folderListName} numberOfLines={1}>
                  {folder.displayName}
                </Text>
                <Text style={styles.folderListInfo}>
                  上次访问: {folder.lastAccessed.toLocaleDateString()}
                  {folder.itemCount && ` • ${folder.itemCount} 项`}
                </Text>
              </View>
            </View>
            <Text style={styles.folderListArrow}>▶</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }, [authorizedFolders, foldersLoading, parseIntoGroups, expandedGroups, toggleGroup, handleBrowseFolder]);

  // 原来的 renderFolderList 函数删除，用上面的替换

  // 浏览特定文件夹（支持分页）
  const handleBrowseFolder = useCallback(async (folder: AuthorizedFolder) => {
    try {
      setCurrentFolder(folder);
      setFileMode('browseFolder');
      setIsLoading(true);

      // 构建文件树
      const { nodes } = await buildSystemFileTree(folder.uri);
      setTreeNodes(nodes);

      // 只有在文件夹ID有效时才更新
      if (folder.id) {
        console.log('准备更新文件夹:', folder.id);
        await updateFolder(folder.id, { 
          lastAccessed: new Date(),
          itemCount: nodes.length 
        });
      } else {
        console.warn('文件夹缺少ID，跳过更新:', folder);
      }
    } catch (error) {
      console.error('浏览文件夹失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [buildSystemFileTree, updateFolder]);
  
  // 加载更多文件
  const loadMoreFiles = useCallback(async () => {
    if (!hasMoreFiles || loadingMore || !currentFolder) return;
    
    try {
      setLoadingMore(true);
      console.log('加载更多文件，offset:', fileOffset);
      
      const { nodes: moreFiles } = await buildSystemFileTree(
        currentFolder.uri, 
        1, 
        fileOffset, 
        FILES_PER_PAGE
      );
      
      if (moreFiles.length > 0) {
        const newTreeNodes = [...treeNodes, ...moreFiles];
        setTreeNodes(newTreeNodes);
        setFileOffset(prev => prev + FILES_PER_PAGE);
        
        // 检查是否还有更多
        const { hasMore } = await buildSystemFileTree(
          currentFolder.uri, 
          1, 
          fileOffset + FILES_PER_PAGE, 
          1 // 只检查一个文件
        );
        setHasMoreFiles(hasMore);
      } else {
        setHasMoreFiles(false);
      }
      
      console.log('加载更多完成，新增:', moreFiles.length, '个');
    } catch (error) {
      console.error('加载更多失败:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMoreFiles, loadingMore, currentFolder, fileOffset, treeNodes, buildSystemFileTree]);

  // 使用系统API打开文件
  const openFileWithSystem = useCallback(async (node: TreeNode) => {
    if (!node.uri) return;
    
    try {
      console.log('使用系统打开文件:', node.name);
      
      const supported = await Linking.canOpenURL(node.uri);
      if (supported) {
        await Linking.openURL(node.uri);
      } else {
        Alert.alert(
          '无法打开文件',
          `系统无法打开此类型的文件: ${node.name}`,
          [
            { text: '知道了' },
            { text: '预览内容', onPress: () => handlePreviewFile(node) }
          ]
        );
      }
    } catch (error) {
      console.error('打开文件失败:', error);
      Alert.alert('打开失败', `无法打开文件: ${error.message}`);
    }
  }, []);
  const handleSelectAppFiles = useCallback(async () => {
    setFileMode('app');
    setIsLoading(true);
    setShowHistory(false);
    
    const appRoot = ReactNativeBlobUtil.fs.dirs.DocumentDir;
    setRootPath(appRoot);
    
    try {
      const rootNodes = await buildAppFileTree(appRoot, 0);
      setTreeNodes(rootNodes);
    } catch (error) {
      Alert.alert('错误', '无法访问应用文档目录');
    } finally {
      setIsLoading(false);
    }
  }, [buildAppFileTree]);

  // 选择系统文件
  const handleSelectSystemFiles = useCallback(async () => {
    setFileMode('folderList'); // 改为显示文件夹列表
    setShowHistory(false);
    setTreeNodes([]);
    setSystemRoots([]);
    setRootPath('');
    
    // 同步权限
    await syncWithSystemPermissions();
  }, [syncWithSystemPermissions]);

  // 系统文件夹选择
  const handlePickSystemFolder = async () => {
    try {
      setIsLoading(true);
      const result = await openDocumentTree(true);
      
      if (result?.uri) {
        const folderData = {
          name: result.name || '文件夹',
          uri: result.uri,
          lastAccessed: new Date(),
          itemCount: 0,
        };
        
        // 直接添加文件夹，不处理包含关系
        const addedFolder = await addFolder(folderData);
        await handleBrowseFolder(addedFolder);
      }
    } catch (error) {
      console.error('文件夹选择失败:', error);
      Alert.alert('错误', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 回到文件夹列表
  const handleBackToFolderList = useCallback(() => {
    setFileMode('folderList');
    setCurrentFolder(null);
    setTreeNodes([]);
    setSystemRoots([]);
    setRootPath('');
    setShowHistory(false);
  }, []);

  // 回到主页
  const handleGoHome = useCallback(async () => {
    if (fileMode === 'app') {
      // 应用内文件：回到根目录
      setIsLoading(true);
      try {
        const rootNodes = await buildAppFileTree(rootPath, 0);
        setTreeNodes(rootNodes);
      } finally {
        setIsLoading(false);
      }
    } else if (fileMode === 'browseFolder') {
      // 浏览文件夹模式：回到文件夹列表
      handleBackToFolderList();
    } else if (fileMode === 'folderList') {
      // 已在文件夹列表：同步权限
      await syncWithSystemPermissions();
    }
  }, [fileMode, rootPath, buildAppFileTree, handleBackToFolderList, syncWithSystemPermissions]);

  // 返回模式选择
  const handleBackToSelection = useCallback(() => {
    setFileMode('none');
    setTreeNodes([]);
    setRootPath('');
    setSelectedItem(null);
    setSystemRoots([]);
    setCurrentFolder(null);
    setFileOffset(0);
    setHasMoreFiles(true);
  }, []);

  // 处理节点点击
  const handleNodePress = useCallback((node: TreeNode, index: number) => {
    if (node.type === 'directory') {
      toggleFolder(node, index);
    } else {
      // 文件点击
      if (mode === 'file' && onFileSelected) {
        onFileSelected(node.uri!, node.name);
      } else if (mode === 'folder' && onFolderSelected && node.uri) {
        onFolderSelected(node.uri);
      } else {
        // 浏览模式：直接用系统打开文件
        openFileWithSystem(node);
      }
    }
  }, [mode, onFileSelected, onFolderSelected, toggleFolder, openFileWithSystem]);

  // 预览文件内容
  const handlePreviewFile = useCallback(async (node: TreeNode) => {
    if (!node.uri) return;
    
    try {
      console.log('预览文件:', node.name, node.uri);
      
      // 检查文件大小，避免读取过大的文件
      const fileSize = node.size ? parseInt(node.size.replace(/[^\d]/g, '')) : 0;
      if (fileSize > 1024) { // 超过1KB的文件询问是否预览
        Alert.alert(
          '文件较大',
          `文件大小: ${node.size}\n是否继续预览？`,
          [
            { text: '取消', style: 'cancel' },
            { text: '预览', onPress: () => doPreviewFile(node) }
          ]
        );
      } else {
        await doPreviewFile(node);
      }
    } catch (error) {
      console.error('预览文件失败:', error);
      Alert.alert('预览失败', `无法预览文件: ${error.message}`);
    }
  }, []);

  // 执行文件预览
  const doPreviewFile = useCallback(async (node: TreeNode) => {
    try {
      const content = await readFile(node.uri!, 'utf8');
      const preview = content.length > 500 ? content.substring(0, 500) + '\n\n... (文件内容已截断)' : content;
      
      Alert.alert(
        `文件预览 - ${node.name}`,
        preview,
        [
          { text: '关闭', style: 'cancel' },
          { text: '在编辑器中打开', onPress: () => {
            onFileSelected?.(node.uri!, node.name);
          }}
        ]
      );
    } catch (error) {
      Alert.alert('读取失败', `无法读取文件内容: ${error.message}`);
    }
  }, [onFileSelected]);

  // 渲染树节点
  const renderTreeNode = useCallback((node: TreeNode, index: number) => {
    const indentWidth = node.level * 20;
    const fontSize = Math.max(14 - node.level * 2, 10);
    const iconSize = Math.max(18 - node.level * 2, 12);
    
    return (
      <TouchableOpacity
        key={`${node.name}-${index}-${node.level}`}
        style={[
          styles.treeNode,
          { paddingLeft: 16 + indentWidth },
          selectedItem === node.name && styles.selectedNode
        ]}
        onPress={() => handleNodePress(node, index)}
        activeOpacity={0.7}
      >
        <View style={styles.nodeContent}>
          <Text style={[styles.nodeIcon, { fontSize: iconSize }]}>
            {node.type === 'directory' ? (node.isExpanded ? '📂' : '📁') : node.icon}
          </Text>
          <View style={styles.nodeDetails}>
            <Text style={[styles.nodeName, { fontSize }]} numberOfLines={1}>
              {node.name}
            </Text>
            {node.size && (
              <Text style={[styles.nodeSize, { fontSize: fontSize - 2 }]}>
                {node.size}
              </Text>
            )}
          </View>
        </View>
        
        {node.type === 'directory' && (
          <Text style={[styles.expandIcon, { fontSize: iconSize }]}>
            {node.isExpanded ? '▼' : '▶'}
          </Text>
        )}
      </TouchableOpacity>
    );
  }, [selectedItem, handleNodePress]);

  // 主选择界面
  if (fileMode === 'none') {
    return (
      <View style={styles.container}>
        <View style={styles.modeSelector}>
          <Text style={styles.title}>
            {mode === 'file' ? '选择文件' : mode === 'folder' ? '选择文件夹' : '文件管理'}
          </Text>
          
          <TouchableOpacity
            style={[styles.modeOption, styles.primaryOption]}
            onPress={handleSelectSystemFiles}
          >
            <Text style={styles.modeIcon}>🌐</Text>
            <Text style={styles.modeText}>系统文件</Text>
            <Text style={styles.modeDescription}>
              访问设备存储、下载目录、Github项目等
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modeOption}
            onPress={handleSelectAppFiles}
          >
            <Text style={styles.modeIcon}>📱</Text>
            <Text style={styles.modeText}>应用内文件</Text>
            <Text style={styles.modeDescription}>
              应用专属存储（测试用）
            </Text>
          </TouchableOpacity>

          {onCancel && (
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>取消</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // 应用内文件界面
  if (fileMode === 'app') {
    return (
      <View style={styles.container}>
        {/* 顶部栏 */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleBackToSelection} style={styles.topBarButton}>
            <Text style={styles.topBarButtonText}>←</Text>
          </TouchableOpacity>
          
          <Text style={styles.topBarTitle}>应用文档</Text>
          
          <View style={styles.topBarRight}>
            <TouchableOpacity onPress={handleGoHome} style={styles.topBarButton}>
              <Text style={styles.topBarButtonText}>🏠</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleBackToSelection} style={styles.topBarButton}>
              <Text style={styles.topBarButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 内容区域 */}
        <View style={styles.contentArea}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>正在加载...</Text>
            </View>
          ) : treeNodes.length > 0 ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              {treeNodes.map((node, index) => renderTreeNode(node, index))}
            </ScrollView>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>目录为空</Text>
            </View>
          )}
        </View>

        {/* 底部状态栏 */}
        <View style={styles.bottomBar}>
          <Text style={styles.statusText}>
            {treeNodes.filter(n => n.type === 'directory').length} 文件夹, {' '}
            {treeNodes.filter(n => n.type === 'file').length} 文件
          </Text>
        </View>
      </View>
    );
  }

  // 系统文件界面（文件夹列表 + 文件浏览）
  if (fileMode === 'folderList' || fileMode === 'browseFolder') {
    return (
      <View style={styles.container}>
        {/* 顶部栏 */}
        <View style={styles.topBar}>
          <TouchableOpacity 
            onPress={fileMode === 'browseFolder' ? handleBackToFolderList : handleBackToSelection} 
            style={styles.topBarButton}
          >
            <Text style={styles.topBarButtonText}>←</Text>
          </TouchableOpacity>
          
          {fileMode === 'folderList' && (
            <TouchableOpacity onPress={handlePickSystemFolder} style={styles.topBarButton}>
              <Text style={styles.topBarButtonText}>📁</Text>
            </TouchableOpacity>
          )}
          
          <Text style={styles.topBarTitle}>
            {fileMode === 'folderList' ? '系统文件' : currentFolder?.name || '文件夹'}
          </Text>
          
          <View style={styles.topBarRight}>
            {fileMode === 'folderList' && (
              <TouchableOpacity onPress={handleGoHome} style={styles.topBarButton}>
                <Text style={styles.topBarButtonText}>🔄</Text>
              </TouchableOpacity>
            )}
            {fileMode === 'browseFolder' && (
              <TouchableOpacity onPress={handleGoHome} style={styles.topBarButton}>
                <Text style={styles.topBarButtonText}>🏠</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleBackToSelection} style={styles.topBarButton}>
              <Text style={styles.topBarButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 内容区域 */}
        <View style={styles.contentArea}>
          {fileMode === 'folderList' ? (
            // 文件夹列表模式
            renderFolderList()
          ) : (
            // 文件树浏览模式
            <View style={styles.browseContainer}>
              <ScrollView 
                showsVerticalScrollIndicator={false} 
                style={styles.treeContainer}
                onScrollEndDrag={(e) => {
                  // 检测滚动到底部，加载更多
                  const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
                  const paddingToBottom = 20;
                  if (layoutMeasurement.height + contentOffset.y >= 
                      contentSize.height - paddingToBottom) {
                    loadMoreFiles();
                  }
                }}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>正在加载...</Text>
                  </View>
                ) : treeNodes.length > 0 ? (
                  <>
                    {treeNodes.map((node, index) => renderTreeNode(node, index))}
                    
                    {/* 加载更多按钮 */}
                    {hasMoreFiles && (
                      <TouchableOpacity 
                        style={styles.loadMoreButton}
                        onPress={loadMoreFiles}
                        disabled={loadingMore}
                      >
                        <Text style={styles.loadMoreText}>
                          {loadingMore ? '加载中...' : '加载更多文件'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>文件夹为空</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}
        </View>

        {/* 底部状态栏 */}
        <View style={styles.bottomBar}>
          <Text style={styles.statusText}>
            {fileMode === 'folderList' 
              ? (() => {
                  const { groups, standaloneItems } = parseIntoGroups(authorizedFolders);
                  const groupCount = Object.keys(groups).length;
                  const standaloneCount = standaloneItems.length;
                  const totalItems = Object.values(groups).reduce((sum, items) => sum + items.length, standaloneCount);
                  return groupCount > 0 
                    ? `${totalItems} 个文件夹 (${groupCount} 个分组, ${standaloneCount} 个独立)`
                    : `${totalItems} 个已授权文件夹`;
                })()
              : `${treeNodes.length} 个项目${hasMoreFiles ? ' (还有更多)' : ''}`
            }
          </Text>
        </View>
      </View>
    );
  }

  return null;
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  
  // 模式选择
  modeSelector: {
    flex: 1,
    padding: 32,
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  modeOption: {
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  primaryOption: {
    backgroundColor: '#1a2e1a',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  modeIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  modeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modeDescription: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  
  // 顶部栏
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d2d',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
    height: 50,
    minHeight: 50,
  },
  topBarButton: {
    padding: 6,
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  topBarTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 4,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // 内容区域
  contentArea: {
    flex: 1,
  },
  
  // 浏览容器
  browseContainer: {
    flex: 1,
  },
  
  // 加载更多按钮
  loadMoreButton: {
    backgroundColor: '#2d2d2d',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
    alignItems: 'center',
  },
  loadMoreText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // 文件夹列表样式
  folderListContainer: {
    flex: 1,
  },
  folderListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#2d2d2d',
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 8,
  },
  folderListContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  folderListIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  folderListDetails: {
    flex: 1,
  },
  folderListName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  folderListInfo: {
    color: '#999',
    fontSize: 12,
  },
  folderListArrow: {
    color: '#666',
    fontSize: 16,
    marginLeft: 8,
  },
  
  // 新增：分组样式
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#1a3a1a',
    borderWidth: 1,
    borderColor: '#4CAF50',
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 8,
  },
  groupIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  groupDetails: {
    flex: 1,
  },
  groupName: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  groupInfo: {
    color: '#81C784',
    fontSize: 12,
  },
  groupArrow: {
    color: '#4CAF50',
    fontSize: 14,
    marginLeft: 8,
  },
  groupContent: {
    paddingLeft: 8,
  },
  groupItem: {
    marginBottom: 4,
    marginHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#262626',
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  groupItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  groupItemIcon: {
    fontSize: 16,
    marginRight: 10,
    opacity: 0.8,
  },
  groupItemDetails: {
    flex: 1,
  },
  groupItemName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  groupItemInfo: {
    color: '#999',
    fontSize: 11,
  },
  
  // 树状结构
  treeContainer: {
    flex: 1,
  },
  treeNode: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingRight: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  selectedNode: {
    backgroundColor: '#2d4a3d',
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  nodeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  nodeIcon: {
    marginRight: 8,
  },
  nodeDetails: {
    flex: 1,
  },
  nodeName: {
    color: '#fff',
    fontWeight: '500',
  },
  nodeSize: {
    color: '#999',
    marginTop: 2,
  },
  expandIcon: {
    color: '#666',
    marginLeft: 8,
  },
  
  // 历史记录
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    padding: 16,
    backgroundColor: '#2d2d2d',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  historyDate: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
  
  // 状态
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#999',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyHint: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  
  // 底部栏
  bottomBar: {
    backgroundColor: '#2d2d2d',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#444',
    height: 40,
    justifyContent: 'center',
  },
  statusText: {
    color: '#999',
    fontSize: 12,
  },
});

SimpleFileManager.displayName = 'SimpleFileManager';

export default SimpleFileManager;