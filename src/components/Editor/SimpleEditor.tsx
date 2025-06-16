// src/components/Editor/SimpleEditor.tsx
// 功能：简化版代码编辑器，支持行号显示和基础语法高亮
// 依赖：React Native基础组件
// 被使用：MainContentComponent

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';

interface FileTab {
  id: string;
  name: string;
  content: string;
  language: 'javascript' | 'python' | 'text';
  modified: boolean;
}

const SimpleEditor: React.FC = () => {
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [activeTabId, setActiveTabId] = useState('tab1');
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);

  // 模拟打开的文件标签
  const [tabs, setTabs] = useState<FileTab[]>([
    {
      id: 'tab1',
      name: 'app.js',
      language: 'javascript',
      modified: false,
      content: `// Welcome to Simple Editor
function greetUser(name) {
  console.log(\`Hello, \${name}!\`);
  return \`Welcome \${name} to our app\`;
}

const user = {
  name: 'Developer',
  role: 'Frontend'
};

// Main application logic
greetUser(user.name);

export default greetUser;`
    },
    {
      id: 'tab2',
      name: 'script.py',
      language: 'python',
      modified: true,
      content: `# Python Script Example
import os
import sys

def main():
    """Main function"""
    print("Hello from Python!")
    
    # List current directory
    files = os.listdir('.')
    for file in files:
        print(f"File: {file}")

if __name__ == "__main__":
    main()`
    },
  ]);

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  // 获取行号数组
  const getLineNumbers = (content: string): number[] => {
    const lines = content.split('\n');
    return Array.from({ length: lines.length }, (_, i) => i + 1);
  };

  // 简单的语法高亮样式
  const getSyntaxStyle = (language: string) => {
    const baseStyle = { ...styles.codeText };
    switch (language) {
      case 'javascript':
        return { ...baseStyle, color: '#f8f8f2' };
      case 'python':
        return { ...baseStyle, color: '#e6db74' };
      default:
        return baseStyle;
    }
  };

  // 切换标签
  const switchTab = (tabId: string) => {
    setActiveTabId(tabId);
  };

  // 关闭标签
  const closeTab = (tabId: string) => {
    if (tabs.length === 1) {
      Alert.alert('提示', '至少需要保留一个标签');
      return;
    }
    
    const tab = tabs.find(t => t.id === tabId);
    if (tab?.modified) {
      Alert.alert(
        '未保存的更改',
        `文件 "${tab.name}" 有未保存的更改，确定要关闭吗？`,
        [
          { text: '取消', style: 'cancel' },
          { text: '关闭', style: 'destructive', onPress: () => doCloseTab(tabId) },
        ]
      );
    } else {
      doCloseTab(tabId);
    }
  };

  const doCloseTab = (tabId: string) => {
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(newTabs);
    
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0]?.id || '');
    }
  };

  // 更新文件内容
  const updateContent = (content: string) => {
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, content, modified: true }
          : tab
      )
    );
  };

  // 保存文件
  const saveFile = () => {
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, modified: false }
          : tab
      )
    );
    Alert.alert('保存成功', `文件 "${activeTab?.name}" 已保存`);
  };

  if (!activeTab) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>没有打开的文件</Text>
      </View>
    );
  }

  const lineNumbers = getLineNumbers(activeTab.content);

  return (
    <View style={styles.container}>
      {/* 文件标签栏 */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                activeTabId === tab.id && styles.activeTab
              ]}
              onPress={() => switchTab(tab.id)}
            >
              <Text style={[
                styles.tabText,
                activeTabId === tab.id && styles.activeTabText
              ]}>
                {tab.name}
                {tab.modified && <Text style={styles.modifiedDot}> ●</Text>}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => closeTab(tab.id)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 工具按钮 - 移除，将功能移到快捷工具栏 */}
      </View>

      {/* 编辑器主体 - 可滚动区域 */}
      <View style={styles.editorContainer}>
        <View style={styles.editorContent}>
          {/* 行号列 */}
          {showLineNumbers && (
            <ScrollView
              style={styles.lineNumberColumn}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            >
              {lineNumbers.map((lineNum) => (
                <Text key={lineNum} style={styles.lineNumber}>
                  {lineNum}
                </Text>
              ))}
            </ScrollView>
          )}

          {/* 代码编辑区域 */}
          <View style={styles.codeColumn}>
            <ScrollView
              ref={scrollViewRef}
              style={styles.codeScrollView}
              showsVerticalScrollIndicator={true}
              showsHorizontalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              <TextInput
                ref={textInputRef}
                style={[
                  styles.codeInput,
                  getSyntaxStyle(activeTab.language),
                  !showLineNumbers && styles.codeInputFullWidth
                ]}
                value={activeTab.content}
                onChangeText={updateContent}
                multiline
                textAlignVertical="top"
                scrollEnabled={false}
                autoCorrect={false}
                autoCapitalize="none"
                keyboardType="default"
                placeholder="开始编写代码..."
                placeholderTextColor="#666"
              />
            </ScrollView>
          </View>
        </View>
      </View>

      {/* 状态栏 */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {activeTab.language.toUpperCase()} • 第 1 行，第 1 列
        </Text>
        <Text style={styles.statusText}>
          {activeTab.content.split('\n').length} 行
        </Text>
      </View>
    </View>
  );
};

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
  editorContainer: {
    flex: 1,
  },
  editorContent: {
    flexDirection: 'row',
    flex: 1,
  },
  lineNumberColumn: {
    backgroundColor: '#252525',
    paddingHorizontal: 3,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: '#444',
    maxWidth: 35,
    maxHeight: '100%',
  },
  lineNumber: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 18,
    textAlign: 'right',
  },
  codeColumn: {
    flex: 1,
  },
  codeScrollView: {
    flex: 1,
  },
  codeInput: {
    padding: 12,
    fontSize: 14,
    fontFamily: 'monospace',
    lineHeight: 18,
    minHeight: 300, // 最小高度，确保有足够空间
  },
  codeInputFullWidth: {
    paddingLeft: 20,
  },
  codeText: {
    color: '#f8f8f2',
    fontSize: 14,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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