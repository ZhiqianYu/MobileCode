// src/components/File/SimpleFileManager.tsx
// 功能：真实文件管理器，访问手机文件系统
// 依赖：ReactNativeBlobUtil, PermissionsAndroid
// 被使用：MainContentComponent

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  PermissionsAndroid,
  Platform,
  Linking,
} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { useSSHContext } from '../../contexts/SSHContext';

interface FileItem {
  name: string;
  type: 'file' | 'directory';
  size?: string;
  modified?: string;
  icon: string;
  path: string;
}

interface SimpleFileManagerProps {
  onOpenInEditor?: (file: FileItem) => void;
  onSwitchToEditor?: (filePath: string, fileName: string) => void;
}

const SimpleFileManager = React.forwardRef<any, SimpleFileManagerProps>((props, ref) => {
  const [currentPath, setCurrentPath] = useState('');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [fileOperation, setFileOperation] = useState<'copy' | 'cut' | null>(null);
  const [currentFiles, setCurrentFiles] = useState<FileItem[]>([]);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileMode, setFileMode] = useState<'none' | 'phone' | 'app' | 'ssh'>('none');

  // SSH相关
  const { isConnected, currentConnection } = useSSHContext();

  // 常用目录
  const phoneDirectories = [
    { name: '文档', path: '/storage/emulated/0/Documents', icon: '📄' },
    { name: '下载', path: '/storage/emulated/0/Download', icon: '📥' },
    { name: '图片', path: '/storage/emulated/0/Pictures', icon: '🖼️' },
    { name: '音乐', path: '/storage/emulated/0/Music', icon: '🎵' },
    { name: '视频', path: '/storage/emulated/0/Movies', icon: '🎬' },
    { name: '内部存储根目录', path: '/storage/emulated/0', icon: '📱' },
  ];

  const appDirectories = [
    { name: '应用文档', path: ReactNativeBlobUtil.fs.dirs.DocumentDir, icon: '📄' },
    { name: '应用缓存', path: ReactNativeBlobUtil.fs.dirs.CacheDir, icon: '🗂️' },
  ];

  // 请求文件访问权限（延迟执行，确保Activity准备好）
  const requestFilePermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        // 延迟一下，确保Activity准备好
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 先检查基本的READ_EXTERNAL_STORAGE权限
        const hasReadPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
        );
        
        if (hasReadPermission) {
          setHasPermission(true);
          return true;
        }

        // 请求READ_EXTERNAL_STORAGE权限
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: '文件访问权限',
            message: '需要访问存储权限来浏览文件',
            buttonNeutral: '稍后询问',
            buttonNegative: '拒绝',
            buttonPositive: '允许',
          }
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setHasPermission(true);
          return true;
        } else {
          // 如果权限被拒绝，显示更友好的提示
          Alert.alert(
            '需要文件访问权限',
            '为了浏览手机文件，需要存储权限。您可以：\n\n• 重新尝试授权\n• 在手机设置中手动开启权限\n• 使用应用内文件功能',
            [
              { text: '取消', style: 'cancel' },
              { 
                text: '重试', 
                onPress: () => requestFilePermission()
              },
              { 
                text: '打开设置', 
                onPress: () => Linking.openSettings()
              }
            ]
          );
          return false;
        }
      } catch (error) {
        console.error('权限请求失败:', error);
        
        // 权限请求失败，提供备选方案
        Alert.alert(
          '权限请求失败',
          '无法请求文件权限。您可以：\n\n• 在手机设置中手动开启存储权限\n• 使用应用内文件功能',
          [
            { text: '了解', style: 'cancel' },
            { 
              text: '打开设置', 
              onPress: () => Linking.openSettings()
            }
          ]
        );
        return false;
      }
    } else {
      // iOS 默认有沙盒访问权限
      setHasPermission(true);
      return true;
    }
  };

  // 获取文件图标
  const getFileIcon = (fileName: string, isDirectory: boolean = false): string => {
    if (isDirectory) return '📁';
    
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js': case 'jsx': case 'ts': case 'tsx': return '📜';
      case 'py': return '🐍';
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
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // 读取目录
  const readDirectory = async (path: string): Promise<FileItem[]> => {
    try {
      console.log('Reading directory:', path);
      
      const exists = await ReactNativeBlobUtil.fs.exists(path);
      if (!exists) {
        throw new Error('路径不存在');
      }

      const items = await ReactNativeBlobUtil.fs.ls(path);
      const files: FileItem[] = [];
      
      // 添加返回上级目录
      const isRootPath = path === '/storage/emulated/0' || 
                        path === ReactNativeBlobUtil.fs.dirs.DocumentDir ||
                        phoneDirectories.some(dir => dir.path === path) ||
                        appDirectories.some(dir => dir.path === path);
      
      if (!isRootPath) {
        files.push({
          name: '..',
          type: 'directory',
          icon: '📁',
          path: path.substring(0, path.lastIndexOf('/')) || '/',
        });
      }

      // 处理每个文件/目录
      for (const item of items) {
        const fullPath = `${path}/${item}`;
        
        try {
          const stat = await ReactNativeBlobUtil.fs.stat(fullPath);
          const isDirectory = stat.type === 'directory';
          
          files.push({
            name: item,
            type: isDirectory ? 'directory' : 'file',
            icon: getFileIcon(item, isDirectory),
            size: isDirectory ? undefined : formatFileSize(stat.size),
            modified: new Date(stat.lastModified).toLocaleDateString(),
            path: fullPath,
          });
        } catch (statError) {
          console.warn('无法获取文件信息:', item, statError);
          // 如果无法获取stat，跳过该文件
          continue;
        }
      }

      // 排序：目录在前，文件在后，都按名称排序
      files.sort((a, b) => {
        if (a.name === '..') return -1;
        if (b.name === '..') return 1;
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });

      return files;
    } catch (error) {
      console.error('读取目录失败:', error);
      throw error;
    }
  };

  // 浏览指定路径
  const browsePath = async (path: string) => {
    setIsLoading(true);
    console.log('Browsing path:', path);
    
    try {
      const files = await readDirectory(path);
      setCurrentPath(path);
      setCurrentFiles(files);
      setSelectedItem(null);
      console.log('成功读取', files.length, '个项目');
    } catch (error) {
      console.error('浏览路径失败:', error);
      Alert.alert('访问失败', `无法访问路径 "${path}"\n${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 选择手机文件
  const handleSelectPhoneFiles = async () => {
    const hasPermissionNow = await requestFilePermission();
    if (hasPermissionNow) {
      setFileMode('phone');
    }
  };

  // 选择应用文件
  const handleSelectAppFiles = () => {
    setFileMode('app');
    setHasPermission(true);
    // 直接进入应用文档目录
    browsePath(ReactNativeBlobUtil.fs.dirs.DocumentDir);
  };

  // 选择SSH文件
  const handleSelectSSHFiles = () => {
    if (isConnected && currentConnection) {
      setFileMode('ssh');
      browseSSHPath('/');
    } else {
      Alert.alert(
        '需要SSH连接',
        '请先连接SSH服务器才能浏览远程文件。\n\n点击主界面左上角的连接按钮进行SSH连接。',
        [{ text: '知道了' }]
      );
    }
  };

  // 生成SSH模拟文件（待替换为真实SSH实现）
  const generateSSHFiles = (path: string): FileItem[] => {
    const files: FileItem[] = [];
    
    if (path !== '/') {
      files.push({
        name: '..',
        type: 'directory',
        icon: '📁',
        path: path.split('/').slice(0, -1).join('/') || '/',
      });
    }

    // SSH模拟文件结构
    if (path === '/') {
      files.push(
        { name: 'home', type: 'directory', icon: '📁', path: '/home', modified: '2024-01-15' },
        { name: 'var', type: 'directory', icon: '📁', path: '/var', modified: '2024-01-14' },
        { name: 'etc', type: 'directory', icon: '📁', path: '/etc', modified: '2024-01-13' },
        { name: 'tmp', type: 'directory', icon: '📁', path: '/tmp', modified: '2024-01-12' },
        { name: 'usr', type: 'directory', icon: '📁', path: '/usr', modified: '2024-01-11' },
      );
    } else if (path === '/home') {
      files.push(
        { name: 'user', type: 'directory', icon: '📁', path: '/home/user', modified: '2024-01-15' },
        { name: 'admin', type: 'directory', icon: '📁', path: '/home/admin', modified: '2024-01-14' },
      );
    } else if (path === '/home/user') {
      files.push(
        { name: 'Documents', type: 'directory', icon: '📁', path: '/home/user/Documents', modified: '2024-01-15' },
        { name: 'Downloads', type: 'directory', icon: '📁', path: '/home/user/Downloads', modified: '2024-01-14' },
        { name: 'projects', type: 'directory', icon: '📁', path: '/home/user/projects', modified: '2024-01-13' },
        { name: '.bashrc', type: 'file', icon: '📄', size: '1.2 KB', modified: '2024-01-15', path: '/home/user/.bashrc' },
        { name: 'config.json', type: 'file', icon: '📋', size: '2.4 KB', modified: '2024-01-14', path: '/home/user/config.json' },
        { name: 'script.py', type: 'file', icon: '🐍', size: '5.1 KB', modified: '2024-01-13', path: '/home/user/script.py' },
      );
    } else {
      // 默认的一些示例文件
      files.push(
        { name: 'sample.txt', type: 'file', icon: '📄', size: '1.5 KB', modified: '2024-01-10', path: `${path}/sample.txt` },
        { name: 'README.md', type: 'file', icon: '📝', size: '3.2 KB', modified: '2024-01-09', path: `${path}/README.md` },
      );
    }

    return files;
  };

  // SSH文件浏览
  const browseSSHPath = (path: string) => {
    setIsLoading(true);
    console.log('Browsing SSH path:', path);
    
    try {
      const files = generateSSHFiles(path);
      setCurrentPath(path);
      setCurrentFiles(files);
      setSelectedItem(null);
      console.log('成功读取SSH文件', files.length, '个项目');
    } catch (error) {
      console.error('浏览SSH路径失败:', error);
      Alert.alert('访问失败', `无法访问SSH路径 "${path}"`);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理快捷目录点击
  const handleQuickDirectoryPress = async (dir: any) => {
    try {
      await browsePath(dir.path);
    } catch (error) {
      Alert.alert('访问失败', `无法访问 "${dir.name}"`);
    }
  };

  // 处理文件项点击
  const handleItemPress = (item: FileItem) => {
    if (item.name === selectedItem) {
      // 双击效果
      if (item.type === 'directory') {
        if (fileMode === 'ssh') {
          browseSSHPath(item.path);
        } else {
          browsePath(item.path);
        }
      } else {
        handleOpenFile(item);
      }
      setSelectedItem(null);
    } else {
      // 单击选中
      setSelectedItem(item.name);
    }
  };

  // 处理文件长按
  const handleLongPress = (item: FileItem) => {
    const actions = item.type === 'file' 
      ? ['打开', '复制', '删除']
      : ['进入', '新建文件'];
      
    Alert.alert(
      '文件操作',
      `选择对 "${item.name}" 的操作：`,
      [
        { text: '取消', style: 'cancel' },
        ...actions.map(action => ({
          text: action,
          onPress: () => handleFileAction(action, item),
          style: action === '删除' ? 'destructive' : 'default'
        }))
      ]
    );
  };

  // 处理文件操作
  const handleFileAction = (action: string, item: FileItem) => {
    switch (action) {
      case '打开':
        handleOpenFile(item);
        break;
      case '进入':
        browsePath(item.path);
        break;
      case '复制':
        Alert.alert('复制', `复制 "${item.name}" （功能开发中）`);
        break;
      case '删除':
        Alert.alert('删除确认', `确定要删除 "${item.name}" 吗？`, [
          { text: '取消', style: 'cancel' },
          { text: '删除', style: 'destructive', onPress: () => {
            console.log('删除文件:', item.path);
            Alert.alert('删除成功', `已删除 ${item.name}`);
          }}
        ]);
        break;
      case '新建文件':
        Alert.alert('新建文件', '在此目录创建新文件（功能开发中）');
        break;
    }
  };

  // 打开文件
  const handleOpenFile = (item: FileItem) => {
    Alert.alert(
      '打开文件',
      `文件: ${item.name}\n路径: ${item.path}`,
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '在编辑器中打开', 
          onPress: async () => {
            try {
              console.log('Opening file in editor:', item);
              
              // 调用父组件方法切换到编辑器模块
              if (props.onSwitchToEditor) {
                props.onSwitchToEditor(item.path, item.name);
              } else if (props.onOpenInEditor) {
                props.onOpenInEditor(item);
              } else {
                // 备用方案：显示文件内容预览
                if (fileMode === 'ssh') {
                  Alert.alert('提示', `SSH文件编辑功能需要先下载到本地\n文件: ${item.name}`);
                } else {
                  // 尝试读取文件内容
                  const content = await ReactNativeBlobUtil.fs.readFile(item.path, 'utf8');
                  const preview = content.length > 200 ? content.substring(0, 200) + '...' : content;
                  Alert.alert(
                    '文件内容预览', 
                    `文件: ${item.name}\n\n${preview}`,
                    [
                      { text: '关闭', style: 'cancel' },
                      { text: '在编辑器中编辑', onPress: () => {
                        Alert.alert('提示', '请设置 onSwitchToEditor 回调来切换到编辑器模块');
                      }}
                    ]
                  );
                }
              }
            } catch (error) {
              console.error('Error opening file:', error);
              if (error instanceof Error && error.message.includes('ENOENT')) {
                Alert.alert('错误', '文件不存在或已被删除');
              } else if (error instanceof Error && error.message.includes('EACCES')) {
                Alert.alert('错误', '没有权限访问此文件');
              } else {
                Alert.alert('错误', `无法打开文件: ${error instanceof Error ? error.message : '未知错误'}`);
              }
            }
          }
        },
        { 
          text: '查看信息', 
          onPress: () => {
            const sizeInfo = item.size ? `大小: ${item.size}` : '大小: 未知';
            const modifiedInfo = item.modified ? `修改时间: ${item.modified}` : '修改时间: 未知';
            const typeInfo = `类型: ${item.type === 'file' ? '文件' : '文件夹'}`;
            Alert.alert(
              '文件信息', 
              `名称: ${item.name}\n${typeInfo}\n${sizeInfo}\n${modifiedInfo}\n路径: ${item.path}`
            );
          }
        },
      ]
    );
  };

  // 返回上级目录
  const handleGoBack = () => {
    if (currentPath && currentPath !== '/') {
      const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
      
      // 防止退到应用目录之外
      if (fileMode === 'app') {
        const appRoot = ReactNativeBlobUtil.fs.dirs.DocumentDir;
        if (parentPath.length < appRoot.length) {
          return; // 不允许退出应用目录
        }
      }
      
      if (fileMode === 'ssh') {
        browseSSHPath(parentPath);
      } else {
        browsePath(parentPath);
      }
    }
  };

  // 返回当前模式的主目录
  const handleGoHome = () => {
    if (fileMode === 'app') {
      browsePath(ReactNativeBlobUtil.fs.dirs.DocumentDir);
    } else if (fileMode === 'phone') {
      browsePath('/storage/emulated/0');
    } else if (fileMode === 'ssh') {
      browseSSHPath('/');
    }
  };

  // 截断路径显示
  const truncatePath = (path: string, maxLength: number = 30): string => {
    if (path.length <= maxLength) {
      return path;
    }
    return '...' + path.substring(path.length - maxLength + 3);
  };

  // 返回到选择界面
  const handleBackToSelection = () => {
    setFileMode('none');
    setCurrentFiles([]);
    setCurrentPath('');
    setSelectedItem(null);
  };

  // 截断文件名显示
  const truncateFileName = (fileName: string, maxLength: number = 15) => {
    if (fileName.length <= maxLength) {
      return fileName;
    }
    return fileName.substring(0, maxLength - 3) + '...';
  };

  // 暴露方法给父组件
  React.useImperativeHandle(ref, () => ({
    copy: () => {
      if (selectedItem) {
        setCopiedItem(selectedItem);
        setFileOperation('copy');
        Alert.alert('复制', `已复制: ${selectedItem}`);
      } else {
        Alert.alert('提示', '请先选择一个文件或文件夹');
      }
    },
    paste: () => {
      if (copiedItem && fileOperation) {
        const operationType = fileOperation === 'copy' ? '复制' : '移动';
        Alert.alert('粘贴', `${operationType} "${copiedItem}" 到当前目录（功能开发中）`);
        if (fileOperation === 'cut') {
          setCopiedItem(null);
          setFileOperation(null);
        }
      } else {
        Alert.alert('提示', '没有可粘贴的文件');
      }
    },
    cut: () => {
      if (selectedItem) {
        setCopiedItem(selectedItem);
        setFileOperation('cut');
        Alert.alert('剪切', `已剪切: ${selectedItem}`);
      } else {
        Alert.alert('提示', '请先选择一个文件或文件夹');
      }
    },
    delete: () => {
      if (selectedItem) {
        const selectedFile = currentFiles.find(f => f.name === selectedItem);
        if (selectedFile) {
          handleFileAction('删除', selectedFile);
        }
      } else {
        Alert.alert('提示', '请先选择一个文件或文件夹');
      }
    },
    newFile: () => {
      Alert.alert('新建文件', '创建新文件（功能开发中）');
    },
    newDir: () => {
      Alert.alert('新建目录', '创建新目录（功能开发中）');
    },
    refresh: () => {
      if (currentPath) {
        browsePath(currentPath);
      }
      setSelectedItem(null);
      setCopiedItem(null);
      setFileOperation(null);
    },
  }));

  // 渲染文件项
  const renderFileItem = (item: FileItem, index: number) => {
    const isSelected = selectedItem === item.name;
    
    return (
      <TouchableOpacity
        key={index}
        style={[styles.fileItem, isSelected && styles.fileItemSelected]}
        onPress={() => handleItemPress(item)}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.fileInfo}>
          <Text style={styles.fileIcon}>{item.icon}</Text>
          <View style={styles.fileDetails}>
            <Text style={[styles.fileName, isSelected && styles.fileNameSelected]}>
              {item.name}
            </Text>
            <Text style={styles.fileMetadata}>
              {item.size && `${item.size} • `}{item.modified}
            </Text>
          </View>
        </View>
        
        {item.type === 'directory' && (
          <Text style={styles.chevron}>›</Text>
        )}
      </TouchableOpacity>
    );
  };

  // 选择界面
  if (fileMode === 'none') {
    return (
      <View style={styles.container}>
        <View style={styles.selectionContainer}>
          <Text style={styles.selectionTitle}>选择文件源</Text>
          
          <TouchableOpacity
            style={styles.selectionOption}
            onPress={handleSelectAppFiles}
          >
            <Text style={styles.selectionIcon}>📄</Text>
            <Text style={styles.selectionText}>应用文件</Text>
            <Text style={styles.selectionDescription}>
              访问应用内的文档和缓存文件
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.selectionOption}
            onPress={handleSelectPhoneFiles}
          >
            <Text style={styles.selectionIcon}>📱</Text>
            <Text style={styles.selectionText}>手机文件</Text>
            <Text style={styles.selectionDescription}>
              访问文档、下载、图片等系统文件夹
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.selectionOption}
            onPress={handleSelectSSHFiles}
          >
            <Text style={styles.selectionIcon}>🌐</Text>
            <Text style={styles.selectionText}>SSH文件</Text>
            <Text style={styles.selectionDescription}>
              连接远程服务器浏览文件
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 快捷目录选择界面（仅手机文件需要）
  if (fileMode === 'phone' && !currentPath) {
    return (
      <View style={styles.container}>
        <View style={styles.directoryContainer}>
          <View style={styles.directoryHeader}>
            <TouchableOpacity onPress={handleBackToSelection}>
              <Text style={styles.backButton}>← 返回</Text>
            </TouchableOpacity>
            <Text style={styles.directoryTitle}>选择系统目录</Text>
          </View>
          
          <ScrollView style={styles.directoryList}>
            {phoneDirectories.map((dir, index) => (
              <TouchableOpacity
                key={index}
                style={styles.directoryItem}
                onPress={() => handleQuickDirectoryPress(dir)}
              >
                <Text style={styles.directoryIcon}>{dir.icon}</Text>
                <View style={styles.directoryInfo}>
                  <Text style={styles.directoryName}>{dir.name}</Text>
                  <Text style={styles.directoryPath}>{dir.path}</Text>
                </View>
                <Text style={styles.directoryChevron}>›</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  }

  // 文件浏览界面
  return (
    <View style={styles.container}>
      {/* 路径栏 */}
      <View style={styles.pathBar}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleGoBack}
          disabled={!currentPath || currentPath === '/' || 
                   (fileMode === 'app' && currentPath === ReactNativeBlobUtil.fs.dirs.DocumentDir)}
        >
          <Text style={[styles.backButtonText, 
                       (!currentPath || currentPath === '/' || 
                        (fileMode === 'app' && currentPath === ReactNativeBlobUtil.fs.dirs.DocumentDir)) 
                        && styles.backButtonDisabled]}>
            ←
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.pathText}>
          {fileMode === 'phone' ? '📱' : fileMode === 'app' ? '📄' : '🌐'} {truncatePath(currentPath)}
        </Text>
        
        <View style={styles.pathButtons}>
          <TouchableOpacity 
            style={styles.homeButton}
            onPress={handleGoHome}
          >
            <Text style={styles.homeButtonText}>🏠</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.exitButton}
            onPress={handleBackToSelection}
          >
            <Text style={styles.exitButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 文件列表 */}
      <ScrollView style={styles.fileList} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>正在加载文件...</Text>
          </View>
        ) : currentFiles.length > 0 ? 
          currentFiles.map((item, index) => renderFileItem(item, index)) :
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>目录为空</Text>
          </View>
        }
      </ScrollView>

      {/* 状态栏 */}
      <View style={styles.statusBar}>
        <View style={styles.statusLeft}>
          <Text style={styles.statusText}>
            {currentFiles.filter(f => f.type === 'directory').length} 文件夹, {' '}
            {currentFiles.filter(f => f.type === 'file').length} 文件
            <Text style={styles.modeIndicator}> • {fileMode === 'phone' ? '手机文件' : fileMode === 'app' ? '应用文件' : 'SSH文件'}</Text>
          </Text>
        </View>
        
        <View style={styles.statusRight}>
          {selectedItem && (
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>已选择:</Text>
              <Text style={styles.selectedText} numberOfLines={1} ellipsizeMode="middle">
                {truncateFileName(selectedItem)}
              </Text>
            </View>
          )}
          
          {copiedItem && (
            <View style={styles.statusItem}>
              <Text style={styles.operationIcon}>
                {fileOperation === 'copy' ? '📋' : '✂️'}
              </Text>
              <Text style={styles.operationText} numberOfLines={1} ellipsizeMode="middle">
                {truncateFileName(copiedItem)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
});

// 设置display name用于调试  
SimpleFileManager.displayName = 'SimpleFileManager';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  
  // 选择界面样式
  selectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  selectionTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 32,
  },
  selectionOption: {
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  selectionIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  selectionText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  selectionDescription: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
  
  // 目录选择界面样式
  directoryContainer: {
    flex: 1,
  },
  directoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d2d',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  backButton: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '500',
    marginRight: 16,
  },
  directoryTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  directoryList: {
    flex: 1,
  },
  directoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  directoryIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  directoryInfo: {
    flex: 1,
  },
  directoryName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  directoryPath: {
    color: '#999',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  directoryChevron: {
    color: '#666',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // 文件浏览界面样式
  pathBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d2d',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  backButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 12,
  },
  backButtonText: {
    color: '#4CAF50',
    fontSize: 20,
    fontWeight: 'bold',
  },
  backButtonDisabled: {
    color: '#666',
  },
  pathText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    fontFamily: 'monospace',
  },
  pathButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  homeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#4CAF50',
    borderRadius: 6,
    marginRight: 8,
  },
  homeButtonText: {
    fontSize: 16,
  },
  exitButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#d32f2f',
    borderRadius: 6,
  },
  exitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  fileList: {
    flex: 1,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  fileItemSelected: {
    backgroundColor: '#2d4a3d',
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  fileNameSelected: {
    color: '#4CAF50',
  },
  fileMetadata: {
    color: '#999',
    fontSize: 12,
  },
  chevron: {
    color: '#666',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // 状态样式
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    color: '#4CAF50',
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
  },
  
  // 状态栏样式
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2d2d2d',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#444',
    minHeight: 40,
  },
  statusLeft: {
    flex: 1,
  },
  statusText: {
    color: '#999',
    fontSize: 12,
  },
  modeIndicator: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  statusRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  statusLabel: {
    color: '#999',
    fontSize: 11,
    marginRight: 4,
  },
  selectedText: {
    color: '#4CAF50',
    fontSize: 11,
    fontWeight: '500',
    maxWidth: 80,
  },
  operationIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  operationText: {
    color: '#2196F3',
    fontSize: 11,
    fontWeight: '500',
    maxWidth: 80,
  },
});

export default SimpleFileManager;