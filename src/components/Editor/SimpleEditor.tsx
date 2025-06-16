// src/components/Editor/SimpleEditor.tsx

import React, { useState, useRef, useImperativeHandle } from 'react';
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
import { useSettings } from '../../contexts/SettingsContext';

// 编辑器支持的语言映射
const languageMap: Record<string, string> = {
  javascript: 'javascript',
  python: 'python',
  text: 'text',
};

const SimpleEditor = React.forwardRef((_, ref) => {
  const { settings } = useSettings();
  const [activeTabId, setActiveTabId] = useState('tab1');

  const [tabs, setTabs] = useState([
    {
      id: 'tab1',
      name: 'app.js',
      content: `function greet(name) {\n  console.log("Hello " + name);\n}`,
      language: 'javascript',
      modified: false,
    },
    {
      id: 'tab2',
      name: 'script.py',
      content: `def hello(name):\n    print("Hello", name)`,
      language: 'python',
      modified: true,
    },
  ]);

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  const handleChange = (newCode: string) => {
    if (!activeTab) return;
    setTabs(prev =>
      prev.map(tab =>
        tab.id === activeTabId
          ? { ...tab, content: newCode, modified: true }
          : tab
      )
    );
  };

  const saveFile = () => {
    if (!activeTab) return;
    setTabs(prev =>
      prev.map(tab =>
        tab.id === activeTabId ? { ...tab, modified: false } : tab
      )
    );
    Alert.alert('保存成功', `文件 "${activeTab.name}" 已保存`);
  };

  const switchTab = (tabId: string) => {
    setActiveTabId(tabId);
  };

  const closeTab = (tabId: string) => {
    if (tabs.length === 1) {
      Alert.alert('提示', '至少保留一个标签');
      return;
    }

    const tab = tabs.find(t => t.id === tabId);
    if (tab?.modified) {
      Alert.alert('未保存的更改', `关闭 "${tab.name}"？`, [
        { text: '取消', style: 'cancel' },
        { text: '关闭', style: 'destructive', onPress: () => doCloseTab(tabId) },
      ]);
    } else {
      doCloseTab(tabId);
    }
  };

  const doCloseTab = (tabId: string) => {
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    if (activeTabId === tabId && newTabs.length > 0) {
      setActiveTabId(newTabs[0].id);
    }
  };

  useImperativeHandle(ref, () => ({
    save: saveFile,
    insertText: (text: string) => {
      if (!activeTab) return;
      const newContent = activeTab.content + text;
      handleChange(newContent);
    },
    refocus: () => {},
    isEditingMode: true,
  }));

  if (!activeTab) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>没有打开的文件</Text>
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
        <CodeEditor
          style={styles.editor}
          language={languageMap[activeTab.language]}
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
        </Text>
        <Text style={styles.statusText}>
          {activeTab.content.split('\n').length} 行
        </Text>
      </View>
    </View>
  );
});

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
  },
});

export default SimpleEditor;
