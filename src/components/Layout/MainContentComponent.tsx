// src/components/Layout/MainContentComponent.tsx
// 功能：2号组件 - 主内容区，根据模块显示不同内容，支持模块间通信
// 依赖：模块类型定义, 各模块组件
// 被使用：MainContainer

import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import SimpleTerminal from '../Terminal/SimpleTerminal';
import SimpleFileManager from '../File/SimpleFileManager';
import SimpleEditor from '../Editor/SimpleEditor';
import SimpleForward from '../Forward/SimpleForward';

export type ModuleType = 'file' | 'editor' | 'forward' | 'terminal';

interface MainContentComponentProps {
  activeModule: ModuleType;
  height: number;
  width: number;
  onModuleAction?: (action: string, data?: any) => void;
  onModuleSwitch?: (module: ModuleType) => void; // 新增：模块切换回调
}

const MainContentComponent = React.forwardRef<any, MainContentComponentProps>(({
  activeModule,
  height,
  width,
  onModuleAction,
  onModuleSwitch,
}, ref) => {
  const fileManagerRef = useRef<any>(null);
  const editorRef = useRef<any>(null);
  const forwardRef = useRef<any>(null);
  const terminalRef = useRef<any>(null);

  // 处理文件管理器切换到编辑器
  const handleSwitchToEditor = async (filePath: string, fileName: string) => {
    console.log('Switching to editor with file:', fileName, filePath);
    
    try {
      // 1. 切换到编辑器模块
      if (onModuleSwitch) {
        onModuleSwitch('editor');
      }
      
      // 2. 延迟一下确保编辑器已渲染
      setTimeout(() => {
        // 3. 告诉编辑器打开文件
        if (editorRef.current && editorRef.current.openFile) {
          editorRef.current.openFile(filePath, fileName);
        } else {
          console.warn('Editor openFile method not available');
          // 备用方案：通过模块动作通信
          if (onModuleAction) {
            onModuleAction('openFile', { filePath, fileName });
          }
        }
      }, 100);
      
    } catch (error) {
      console.error('Error switching to editor:', error);
    }
  };

  // 处理编辑器保存文件后刷新文件管理器
  const handleEditorFileSaved = (filePath: string) => {
    console.log('File saved, refreshing file manager:', filePath);
    
    // 如果当前在文件管理模块，刷新列表
    if (activeModule === 'file' && fileManagerRef.current && fileManagerRef.current.refresh) {
      fileManagerRef.current.refresh();
    }
  };

  // 暴露各模块的方法给父组件
  React.useImperativeHandle(ref, () => ({
    // 文件管理器方法
    fileManager: {
      copy: () => fileManagerRef.current?.copy(),
      paste: () => fileManagerRef.current?.paste(),
      cut: () => fileManagerRef.current?.cut(),
      delete: () => fileManagerRef.current?.delete(),
      newFile: () => fileManagerRef.current?.newFile(),
      newDir: () => fileManagerRef.current?.newDir(),
      refresh: () => fileManagerRef.current?.refresh(),
    },
    // 编辑器方法
    editor: {
      save: () => editorRef.current?.save?.() || editorRef.current?.saveFile?.(),
      openFile: (filePath: string, fileName: string) => editorRef.current?.openFile?.(filePath, fileName),
      toggleLineNumbers: () => editorRef.current?.toggleLineNumbers?.(),
      insertText: (text: string) => editorRef.current?.insertText?.(text),
      undo: () => editorRef.current?.undo?.(),
      copy: () => editorRef.current?.copy?.(),
      paste: () => editorRef.current?.paste?.(),
      cut: () => editorRef.current?.cut?.(),
      indent: () => editorRef.current?.indent?.(),
    },
    // 转发浏览器方法
    forward: {
      goBack: () => forwardRef.current?.goBack?.(),
      goForward: () => forwardRef.current?.goForward?.(),
      refresh: () => forwardRef.current?.refresh?.(),
      stop: () => forwardRef.current?.stop?.(),
      screenshot: () => forwardRef.current?.screenshot?.(),
      bookmark: () => forwardRef.current?.bookmark?.(),
      navigate: (url: string) => forwardRef.current?.navigate?.(url),
    },
    // 终端方法
    terminal: {
      clearTerminal: () => terminalRef.current?.clearTerminal?.(),
    },
    
    // 新增：模块间通信方法
    switchToEditor: handleSwitchToEditor,
    notifyFileSaved: handleEditorFileSaved,
  }));
  
  // 模块内容渲染
  const renderModuleContent = () => {
    switch (activeModule) {
      case 'file':
        return (
          <View style={styles.moduleContainer}>
            <SimpleFileManager 
              ref={fileManagerRef}
              onSwitchToEditor={handleSwitchToEditor}
            />
          </View>
        );
        
      case 'editor':
        return (
          <View style={styles.moduleContainer}>
            <SimpleEditor 
              ref={editorRef}
              onFileSaved={handleEditorFileSaved}
            />
          </View>
        );
        
      case 'forward':
        return (
          <View style={styles.moduleContainer}>
            <SimpleForward ref={forwardRef} />
          </View>
        );
        
      case 'terminal':
        return (
          <View style={styles.terminalContainer}>
            <SimpleTerminal ref={terminalRef} />
          </View>
        );
        
      default:
        return (
          <View style={styles.moduleContent}>
            <Text style={styles.moduleTitle}>❓ 未知模块</Text>
            <Text style={styles.moduleDescription}>
              模块 "{activeModule}" 尚未实现
            </Text>
          </View>
        );
    }
  };

  return (
    <View style={[
      styles.container,
      { height, width },
    ]}>
      {/* 3D效果的内容区域 */}
      <View style={styles.contentArea}>
        {renderModuleContent()}
      </View>
    </View>
  );
});

// 设置display name用于调试
MainContentComponent.displayName = 'MainContentComponent';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    position: 'relative',
  },
  
  // 3D效果的内容区域
  contentArea: {
    flex: 1,
    margin: 4, // 为3D效果留出空间
    backgroundColor: '#222',
    borderRadius: 8,
    // 3D突起效果
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6, // Android阴影
    // 内部阴影效果（通过边框模拟）
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: '#333',
    borderLeftColor: '#333',
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderBottomColor: '#111',
    borderRightColor: '#111',
    overflow: 'hidden', // 确保子组件不超出边界
  },
  
  // 通用模块容器样式
  moduleContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  
  // 终端容器样式
  terminalContainer: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  
  // 默认模块内容样式（用于未实现的模块）
  moduleContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#1a1a1a',
  },
  moduleTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  moduleDescription: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'monospace',
  },
});

export default MainContentComponent;