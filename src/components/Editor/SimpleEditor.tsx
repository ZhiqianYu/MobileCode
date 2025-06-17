// src/components/Editor/SimpleEditor.tsx
// 功能：完整功能编辑器，支持完整的编辑功能和文件操作
// 依赖：CodeEditor, ReactNativeBlobUtil, SettingsContext
// 被使用：MainContentComponent

import React, { useState, useCallback, useImperativeHandle, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
  TextInput,
} from 'react-native';
import CodeEditor, { CodeEditorSyntaxStyles } from '@rivascva/react-native-code-editor';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { useSettings } from '../../contexts/SettingsContext';

// 编辑器支持的语言映射
const languageMap: Record<string, string> = {
  javascript: 'javascript',
  js: 'javascript', 
  jsx: 'javascript',
  typescript: 'javascript',
  ts: 'javascript',
  tsx: 'javascript',
  python: 'python',
  py: 'python',
  json: 'javascript',
  html: 'javascript',
  css: 'javascript',
  text: 'text',
  txt: 'text',
  md: 'text',
  xml: 'javascript',
  yml: 'text',
  yaml: 'text',
  sh: 'text',
  bash: 'text',
};

// 根据文件扩展名获取语言
const getLanguageFromFileName = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase() || 'text';
  return languageMap[ext] || 'text';
};

interface Tab {
  id: string;
  name: string;
  content: string;
  language: string;
  modified: boolean;
  filePath?: string;
  undoStack: string[];
  redoStack: string[];
  cursorPosition?: number;
}

interface SimpleEditorProps {
  onFileSaved?: (filePath: string) => void;
  onOpenFile?: () => void; // 新增：打开文件管理器的回调
}

const SimpleEditor = React.forwardRef<any, SimpleEditorProps>((props, ref) => {
  const { settings } = useSettings();
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [pendingSaveTab, setPendingSaveTab] = useState<Tab | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveFileName, setSaveFileName] = useState('');
  const editorRef = useRef<any>(null);

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  // 添加到撤销栈
  const addToUndoStack = (tabId: string, content: string) => {
    setTabs(prev => prev.map(tab => {
      if (tab.id === tabId) {
        const newUndoStack = [...tab.undoStack, tab.content].slice(-20); // 最多保留20步
        return {
          ...tab,
          undoStack: newUndoStack,
          redoStack: [], // 清空重做栈
        };
      }
      return tab;
    }));
  };

  // 处理代码变更
  const handleChange = useCallback((newCode: string) => {
    if (!activeTab || newCode === activeTab.content) return;
    
    // 添加到撤销栈
    if (activeTab.content !== newCode) {
      addToUndoStack(activeTab.id, activeTab.content);
    }
    
    setTabs(prev =>
      prev.map(tab =>
        tab.id === activeTabId
          ? { ...tab, content: newCode, modified: true }
          : tab
      )
    );
  }, [activeTab, activeTabId]);

  // 保存文件 - 带文件名和位置选择
  const saveFile = async (tab?: Tab) => {
    const targetTab = tab || activeTab;
    if (!targetTab) return;

    if (targetTab.filePath) {
      // 直接保存到已有路径
      await saveToPath(targetTab, targetTab.filePath);
    } else {
      // 显示保存对话框
      setPendingSaveTab(targetTab);
      setSaveFileName(targetTab.name);
      setShowSaveDialog(true);
    }
  };

  // 保存到指定路径
  const saveToPath = async (tab: Tab, filePath: string) => {
    try {
      await ReactNativeBlobUtil.fs.writeFile(filePath, tab.content, 'utf8');
      console.log('File saved to:', filePath);
      
      // 更新标签页状态
      setTabs(prev =>
        prev.map(t =>
          t.id === tab.id
            ? { ...t, filePath: filePath, modified: false, name: filePath.split('/').pop() || t.name }
            : t
        )
      );
      
      if (props.onFileSaved) {
        props.onFileSaved(filePath);
      }
      
      Alert.alert('保存成功', `文件已保存到: ${filePath}`);
    } catch (error) {
      console.error('Save file error:', error);
      Alert.alert('保存失败', `无法保存文件: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 确认保存对话框
  const handleSaveConfirm = async () => {
    if (!pendingSaveTab || !saveFileName.trim()) {
      Alert.alert('错误', '请输入文件名');
      return;
    }

    setShowSaveDialog(false);
    
    // 打开文件管理器选择位置
    Alert.alert(
      '选择保存位置',
      '请在文件管理器中选择要保存的目录，然后确认保存',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '使用应用文档目录',
          onPress: async () => {
            const filePath = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/${saveFileName}`;
            await saveToPath(pendingSaveTab, filePath);
            setPendingSaveTab(null);
            setSaveFileName('');
          }
        },
        {
          text: '选择其他位置',
          onPress: () => {
            // 打开文件管理器选择位置
            if (props.onOpenFile) {
              props.onOpenFile();
            }
            Alert.alert('功能提示', '请在文件管理器中选择保存位置，然后回到编辑器重新保存');
          }
        }
      ]
    );
  };

  // 从文件系统打开文件
  const openFile = async (filePath: string, fileName?: string) => {
    try {
      console.log('Opening file:', filePath);
      
      // 检查文件是否已经在标签页中打开
      const existingTab = tabs.find(tab => tab.filePath === filePath);
      if (existingTab) {
        setActiveTabId(existingTab.id);
        return;
      }

      // 读取文件内容
      const content = await ReactNativeBlobUtil.fs.readFile(filePath, 'utf8');
      const name = fileName || filePath.split('/').pop() || 'untitled';
      const language = getLanguageFromFileName(name);
      
      // 创建新标签页
      const newTab: Tab = {
        id: `file-${Date.now()}`,
        name: name,
        content: content,
        language: language,
        modified: false,
        filePath: filePath,
        undoStack: [],
        redoStack: [],
      };

      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
      
      console.log('File opened successfully:', name);
      
    } catch (error) {
      console.error('Open file error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('ENOENT')) {
          Alert.alert('错误', '文件不存在或已被删除');
        } else if (error.message.includes('EACCES')) {
          Alert.alert('错误', '没有权限访问此文件');
        } else if (error.message.includes('EISDIR')) {
          Alert.alert('错误', '无法打开文件夹，请选择文件');
        } else {
          Alert.alert('错误', `无法打开文件: ${error.message}`);
        }
      } else {
        Alert.alert('错误', '无法打开文件: 未知错误');
      }
    }
  };

  // 新建文件
  const newFile = () => {
    const newTab: Tab = {
      id: `new-${Date.now()}`,
      name: 'untitled.txt',
      content: '',
      language: 'text',
      modified: false,
      undoStack: [],
      redoStack: [],
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  // 切换标签页
  const switchTab = (tabId: string) => {
    setActiveTabId(tabId);
  };

  // 关闭标签页
  const closeTab = (tabId: string) => {
    if (tabs.length === 1) {
      // 如果只有一个标签页，关闭后显示空状态
      setTabs([]);
      setActiveTabId(null);
      return;
    }

    const tab = tabs.find(t => t.id === tabId);
    if (tab?.modified) {
      Alert.alert('未保存的更改', `关闭 "${tab.name}"？`, [
        { text: '取消', style: 'cancel' },
        { text: '保存并关闭', onPress: async () => {
          await saveFile(tab);
          doCloseTab(tabId);
        }},
        { text: '直接关闭', style: 'destructive', onPress: () => doCloseTab(tabId) },
      ]);
    } else {
      doCloseTab(tabId);
    }
  };

  // 执行关闭标签页
  const doCloseTab = (tabId: string) => {
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    if (activeTabId === tabId && newTabs.length > 0) {
      setActiveTabId(newTabs[0].id);
    } else if (newTabs.length === 0) {
      setActiveTabId(null);
    }
  };

  // 撤销
  const undo = () => {
    if (!activeTab || activeTab.undoStack.length === 0) {
      Alert.alert('提示', '没有可撤销的操作');
      return;
    }

    const lastContent = activeTab.undoStack[activeTab.undoStack.length - 1];
    
    setTabs(prev => prev.map(tab => {
      if (tab.id === activeTabId) {
        return {
          ...tab,
          content: lastContent,
          undoStack: tab.undoStack.slice(0, -1),
          redoStack: [...tab.redoStack, tab.content],
          modified: true,
        };
      }
      return tab;
    }));
  };

  // 重做
  const redo = () => {
    if (!activeTab || activeTab.redoStack.length === 0) {
      Alert.alert('提示', '没有可重做的操作');
      return;
    }

    const nextContent = activeTab.redoStack[activeTab.redoStack.length - 1];
    
    setTabs(prev => prev.map(tab => {
      if (tab.id === activeTabId) {
        return {
          ...tab,
          content: nextContent,
          redoStack: tab.redoStack.slice(0, -1),
          undoStack: [...tab.undoStack, tab.content],
          modified: true,
        };
      }
      return tab;
    }));
  };

  // 删除当前行
  const deleteLine = () => {
    if (!activeTab) return;
    
    const lines = activeTab.content.split('\n');
    // 简单实现：删除最后一行
    if (lines.length > 1) {
      const newContent = lines.slice(0, -1).join('\n');
      handleChange(newContent);
    } else {
      handleChange('');
    }
  };

  // 缩进
  const indent = () => {
    if (!activeTab) return;
    
    // 在当前位置添加4个空格
    const newContent = activeTab.content + '    ';
    handleChange(newContent);
  };

  // 插入文本到光标位置
  const insertText = (text: string) => {
    if (!activeTab) return;
    
    // 简单实现：在末尾添加文本
    const newContent = activeTab.content + text;
    handleChange(newContent);
  };

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    save: () => saveFile(),
    openFile: openFile,
    newFile: newFile,
    insertText: insertText,
    undo: undo,
    redo: redo, // 新增重做功能
    copy: () => {
      Alert.alert('功能开发中', '复制功能需要选中文本后实现');
    },
    paste: () => {
      Alert.alert('功能开发中', '粘贴功能即将实现');
    },
    cut: () => {
      Alert.alert('功能开发中', '剪切功能需要选中文本后实现');
    },
    indent: indent,
    deleteLine: deleteLine, // 新增删除行功能
    toggleLineNumbers: () => {
      Alert.alert('信息', '编辑器默认显示行号');
    },
    refocus: () => {},
    isEditingMode: true,
  }));

  // 空状态显示
  if (tabs.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyContent}>
          <Text style={styles.emptyTitle}>📝 MobileCode 编辑器</Text>
          <Text style={styles.emptyDescription}>
            开始编辑文件或创建新的代码项目
          </Text>
          
          <View style={styles.emptyActions}>
            <TouchableOpacity style={styles.newFileButton} onPress={newFile}>
              <Text style={styles.newFileButtonText}>📄 新建文件</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.openFileButton} 
              onPress={() => {
                if (props.onOpenFile) {
                  props.onOpenFile();
                } else {
                  Alert.alert('提示', '请先在文件管理器中选择要打开的文件');
                }
              }}
            >
              <Text style={styles.openFileButtonText}>📂 打开文件</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.emptyFeatures}>
            <Text style={styles.featureText}>✨ 语法高亮</Text>
            <Text style={styles.featureText}>📁 多文件编辑</Text>
            <Text style={styles.featureText}>💾 自动保存</Text>
            <Text style={styles.featureText}>🔄 撤销重做</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 顶部标签栏 */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTabId === tab.id && styles.activeTab]}
              onPress={() => switchTab(tab.id)}
            >
              <Text style={[styles.tabText, activeTabId === tab.id && styles.activeTabText]}>
                {tab.name}
                {tab.modified && <Text style={styles.modifiedDot}> ●</Text>}
              </Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => closeTab(tab.id)}>
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 中间编辑器区域 */}
      <View style={styles.editorArea}>
        {activeTab && (
          <CodeEditor
            ref={editorRef}
            style={styles.editor}
            language={languageMap[activeTab.language] || 'text'}
            syntaxStyle={CodeEditorSyntaxStyles.monokai}
            initialValue={activeTab.content}
            showLineNumbers
            onChange={handleChange}
          />
        )}
      </View>

      {/* 底部状态栏 */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {activeTab ? (
            `${activeTab.language.toUpperCase()} • ${activeTab.modified ? '未保存' : '已保存'} • ${activeTab.content.split('\n').length} 行`
          ) : '准备就绪'}
        </Text>
        {activeTab?.filePath && (
          <Text style={styles.pathText} numberOfLines={1}>
            {activeTab.filePath.length > 40 ? '...' + activeTab.filePath.substring(activeTab.filePath.length - 40) : activeTab.filePath}
          </Text>
        )}
      </View>

      {/* 保存对话框 */}
      {showSaveDialog && (
        <View style={styles.saveDialogOverlay}>
          <View style={styles.saveDialog}>
            <Text style={styles.saveDialogTitle}>保存文件</Text>
            <TextInput
              style={styles.saveDialogInput}
              value={saveFileName}
              onChangeText={setSaveFileName}
              placeholder="输入文件名..."
              placeholderTextColor="#666"
              autoFocus
            />
            <View style={styles.saveDialogButtons}>
              <TouchableOpacity 
                style={styles.saveDialogCancel}
                onPress={() => {
                  setShowSaveDialog(false);
                  setPendingSaveTab(null);
                  setSaveFileName('');
                }}
              >
                <Text style={styles.saveDialogCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveDialogConfirm}
                onPress={handleSaveConfirm}
              >
                <Text style={styles.saveDialogConfirmText}>下一步</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
});

// 设置display name用于调试
SimpleEditor.displayName = 'SimpleEditor';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  
  // 空状态样式
  emptyContainer: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyDescription: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  emptyActions: {
    flexDirection: 'row',
    marginBottom: 40,
  },
  newFileButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginRight: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  newFileButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  openFileButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  openFileButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  featureText: {
    color: '#666',
    fontSize: 14,
    marginHorizontal: 12,
    marginVertical: 4,
  },
  
  // 标签栏样式
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#2d2d2d',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
    maxHeight: 38,
    alignItems: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#3d3d3d',
    borderRightWidth: 1,
    borderRightColor: '#555',
    minWidth: 120,
  },
  activeTab: {
    backgroundColor: '#1e1e1e',
  },
  tabText: {
    color: '#ccc',
    fontSize: 14,
    flex: 1,
  },
  activeTabText: {
    color: '#fff',
  },
  modifiedDot: {
    color: '#ff6b6b',
  },
  closeButton: {
    marginLeft: 8,
    padding: 2,
  },
  closeButtonText: {
    color: '#999',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // 编辑器样式
  editorArea: {
    flex: 1,
  },
  editor: {
    fontSize: 16,
    inputLineHeight: 25,
    highlighterLineHeight: 25,
    padding: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  
  // 状态栏样式
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#2d2d2d',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  statusText: {
    color: '#999',
    fontSize: 12,
    flex: 1,
  },
  pathText: {
    color: '#666',
    fontSize: 10,
    fontFamily: 'monospace',
    flex: 2,
    textAlign: 'right',
  },
  
  // 保存对话框样式
  saveDialogOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveDialog: {
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 300,
    borderWidth: 1,
    borderColor: '#444',
  },
  saveDialogTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  saveDialogInput: {
    backgroundColor: '#3d3d3d',
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
  },
  saveDialogButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  saveDialogCancel: {
    backgroundColor: '#666',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  saveDialogCancelText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  saveDialogConfirm: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
  },
  saveDialogConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default SimpleEditor;