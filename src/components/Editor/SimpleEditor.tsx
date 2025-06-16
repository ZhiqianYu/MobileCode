// src/components/Editor/SimpleEditor.tsx
// 功能：增强版编辑器，支持从文件管理器打开文件
// 依赖：CodeEditor, ReactNativeBlobUtil, SettingsContext
// 被使用：MainContentComponent

import React, { useState, useCallback, useImperativeHandle } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
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
  filePath?: string; // 新增：文件路径
}

interface SimpleEditorProps {
  onFileSaved?: (filePath: string) => void;
}

const SimpleEditor = React.forwardRef<any, SimpleEditorProps>((props, ref) => {
  const { settings } = useSettings();
  const [activeTabId, setActiveTabId] = useState('tab1');

  const [tabs, setTabs] = useState<Tab[]>([
    {
      id: 'tab1',
      name: 'welcome.js',
      content: `// 欢迎使用 MobileCode 编辑器！
// 
// 功能特性：
// • 语法高亮
// • 多标签页编辑
// • 文件保存
// • 从文件管理器打开文件
//
// 支持的语言：JavaScript, Python, JSON, HTML, CSS, Markdown 等

function welcome() {
  console.log("Hello, MobileCode!");
  console.log("双击文件管理器中的文件来在编辑器中打开");
}

welcome();`,
      language: 'javascript',
      modified: false,
    },
  ]);

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  // 处理代码变更
  const handleChange = useCallback((newCode: string) => {
    if (!activeTab || newCode === activeTab.content) return;
    setTabs(prev =>
      prev.map(tab =>
        tab.id === activeTabId
          ? { ...tab, content: newCode, modified: true }
          : tab
      )
    );
  }, [activeTab, activeTabId]);

  // 保存文件
  const saveFile = async () => {
    if (!activeTab) return;

    try {
      if (activeTab.filePath) {
        // 保存到原文件路径
        await ReactNativeBlobUtil.fs.writeFile(activeTab.filePath, activeTab.content, 'utf8');
        console.log('File saved to:', activeTab.filePath);
        
        // 通知文件已保存
        if (props.onFileSaved) {
          props.onFileSaved(activeTab.filePath);
        }
      } else {
        // 如果没有文件路径，保存到应用文档目录
        const fileName = activeTab.name;
        const filePath = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/${fileName}`;
        await ReactNativeBlobUtil.fs.writeFile(filePath, activeTab.content, 'utf8');
        console.log('File saved to app directory:', filePath);
        
        // 更新tab的文件路径
        setTabs(prev =>
          prev.map(tab =>
            tab.id === activeTabId
              ? { ...tab, filePath: filePath }
              : tab
          )
        );
        
        if (props.onFileSaved) {
          props.onFileSaved(filePath);
        }
      }

      // 标记为已保存
      setTabs(prev =>
        prev.map(tab =>
          tab.id === activeTabId ? { ...tab, modified: false } : tab
        )
      );

      Alert.alert('保存成功', `文件 "${activeTab.name}" 已保存`);
    } catch (error) {
      console.error('Save file error:', error);
      Alert.alert('保存失败', `无法保存文件: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 从文件系统打开文件
  const openFile = async (filePath: string, fileName?: string) => {
    try {
      console.log('Opening file:', filePath);
      
      // 检查文件是否已经在标签页中打开
      const existingTab = tabs.find(tab => tab.filePath === filePath);
      if (existingTab) {
        setActiveTabId(existingTab.id);
        Alert.alert('文件已打开', `文件 "${existingTab.name}" 已在编辑器中打开`);
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
      };

      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
      
      Alert.alert('文件已打开', `文件 "${name}" 已在编辑器中打开`);
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

  // 切换标签页
  const switchTab = (tabId: string) => {
    setActiveTabId(tabId);
  };

  // 关闭标签页
  const closeTab = (tabId: string) => {
    if (tabs.length === 1) {
      Alert.alert('提示', '至少保留一个标签');
      return;
    }

    const tab = tabs.find(t => t.id === tabId);
    if (tab?.modified) {
      Alert.alert('未保存的更改', `关闭 "${tab.name}"？`, [
        { text: '取消', style: 'cancel' },
        { text: '保存并关闭', onPress: async () => {
          await saveFile();
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
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    save: saveFile,
    openFile: openFile, // 新增：打开文件方法
    newFile: newFile,   // 新增：新建文件方法
    insertText: (text: string) => {
      if (!activeTab) return;
      const newContent = activeTab.content + text;
      handleChange(newContent);
    },
    undo: () => {
      // TODO: 实现撤销功能
      Alert.alert('功能开发中', '撤销功能即将实现');
    },
    copy: () => {
      // TODO: 实现复制功能
      Alert.alert('功能开发中', '复制功能即将实现');
    },
    paste: () => {
      // TODO: 实现粘贴功能
      Alert.alert('功能开发中', '粘贴功能即将实现');
    },
    cut: () => {
      // TODO: 实现剪切功能
      Alert.alert('功能开发中', '剪切功能即将实现');
    },
    indent: () => {
      // TODO: 实现缩进功能
      Alert.alert('功能开发中', '缩进功能即将实现');
    },
    toggleLineNumbers: () => {
      // TODO: 实现行号切换
      Alert.alert('功能开发中', '行号切换功能即将实现');
    },
    refocus: () => {},
    isEditingMode: true,
  }));

  if (!activeTab) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>没有打开的文件</Text>
        <TouchableOpacity style={styles.newFileButton} onPress={newFile}>
          <Text style={styles.newFileButtonText}>新建文件</Text>
        </TouchableOpacity>
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
          
          {/* 新建文件按钮 */}
          <TouchableOpacity style={styles.newTabButton} onPress={newFile}>
            <Text style={styles.newTabButtonText}>+</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* 中间编辑器区域 */}
      <View style={styles.editorArea}>
        <CodeEditor
          style={styles.editor}
          language={languageMap[activeTab.language] || 'text'}
          syntaxStyle={CodeEditorSyntaxStyles.monokai}
          initialValue={activeTab.content}
          showLineNumbers
          onChange={handleChange}
        />
      </View>

      {/* 底部状态栏 */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {activeTab.language.toUpperCase()} • {activeTab.modified ? '未保存' : '已保存'}
          {activeTab.filePath && ' • ' + (activeTab.filePath.length > 30 ? '...' + activeTab.filePath.substring(activeTab.filePath.length - 30) : activeTab.filePath)}
        </Text>
        <Text style={styles.statusText}>
          {activeTab.content.split('\n').length} 行
        </Text>
      </View>
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
  newTabButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#4CAF50',
    marginLeft: 8,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newTabButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
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
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    marginBottom: 16,
  },
  newFileButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  newFileButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SimpleEditor; 