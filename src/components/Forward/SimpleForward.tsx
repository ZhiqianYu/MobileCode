// src/components/Forward/SimpleForward.tsx
// 功能：简化版端口转发和浏览器组件
// 依赖：React Native基础组件
// 被使用：MainContentComponent

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';

interface PortForward {
  id: string;
  localPort: number;
  remotePort: number;
  host: string;
  status: 'active' | 'inactive';
}

interface BookmarkItem {
  id: string;
  title: string;
  url: string;
}

const SimpleForward = React.forwardRef<any, {}>((props, ref) => {
  const [currentUrl, setCurrentUrl] = useState('http://localhost:3000');
  const [isLoading, setIsLoading] = useState(false);
  const [showPortManager, setShowPortManager] = useState(false);
  const [history, setHistory] = useState<string[]>(['http://localhost:3000']); // 新增：浏览历史
  const [historyIndex, setHistoryIndex] = useState(0); // 新增：历史索引
  const [bookmarkList, setBookmarkList] = useState<BookmarkItem[]>([]);

  // 模拟端口转发列表
  const [portForwards, setPortForwards] = useState<PortForward[]>([
    { id: '1', localPort: 3000, remotePort: 3000, host: 'localhost', status: 'active' },
    { id: '2', localPort: 8080, remotePort: 80, host: 'example.com', status: 'inactive' },
    { id: '3', localPort: 5432, remotePort: 5432, host: 'db.server.com', status: 'active' },
  ]);

  // 模拟书签
  const [bookmarks] = useState<BookmarkItem[]>([
    { id: '1', title: 'Local Dev Server', url: 'http://localhost:3000' },
    { id: '2', title: 'Admin Panel', url: 'http://localhost:8080/admin' },
    { id: '3', title: 'API Docs', url: 'http://localhost:3000/docs' },
  ]);

  // 导航操作
  const handleBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCurrentUrl(history[newIndex]);
    } else {
      Alert.alert('提示', '已经是第一页了');
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCurrentUrl(history[newIndex]);
    } else {
      Alert.alert('提示', '已经是最后一页了');
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert('刷新', `页面 ${currentUrl} 已刷新`);
    }, 1000);
  };

  const handleStop = () => {
    setIsLoading(false);
    Alert.alert('停止', '已停止加载页面');
  };

  const handleGo = () => {
    if (currentUrl.trim()) {
      // 添加到历史记录
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(currentUrl);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        Alert.alert('导航', `已访问 ${currentUrl}`);
      }, 1000);
    }
  };

  // 端口转发操作
  const togglePortForward = (id: string) => {
    setPortForwards(prev => 
      prev.map(port => 
        port.id === id 
          ? { ...port, status: port.status === 'active' ? 'inactive' : 'active' }
          : port
      )
    );
  };

  const addPortForward = () => {
    Alert.alert(
      '添加端口转发',
      '这里将打开添加端口转发的表单',
      [{ text: '知道了' }]
    );
  };

  // 书签操作
  const navigateToBookmark = (url: string) => {
    setCurrentUrl(url);
    handleGo();
  };

  const renderPortManager = () => (
    <View style={styles.portManagerContainer}>
      <View style={styles.portManagerHeader}>
        <Text style={styles.portManagerTitle}>端口转发管理</Text>
        <TouchableOpacity style={styles.addButton} onPress={addPortForward}>
          <Text style={styles.addButtonText}>+ 添加</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.portList}>
        {portForwards.map((port) => (
          <View key={port.id} style={styles.portItem}>
            <View style={styles.portInfo}>
              <Text style={styles.portTitle}>
                {port.host}:{port.remotePort} → :{port.localPort}
              </Text>
              <Text style={[
                styles.portStatus,
                { color: port.status === 'active' ? '#4CAF50' : '#999' }
              ]}>
                {port.status === 'active' ? '● 活动' : '○ 停止'}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                { backgroundColor: port.status === 'active' ? '#d32f2f' : '#4CAF50' }
              ]}
              onPress={() => togglePortForward(port.id)}
            >
              <Text style={styles.toggleButtonText}>
                {port.status === 'active' ? '停止' : '启动'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderBrowser = () => (
    <View style={styles.browserContainer}>
      {/* 地址栏 */}
      <View style={styles.addressBar}>
        <TextInput
          style={styles.urlInput}
          value={currentUrl}
          onChangeText={setCurrentUrl}
          placeholder="输入URL地址..."
          placeholderTextColor="#666"
          onSubmitEditing={handleGo}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.goButton} onPress={handleGo}>
          <Text style={styles.goButtonText}>访问</Text>
        </TouchableOpacity>
      </View>

      {/* 书签栏 */}
      <View style={styles.bookmarkBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {/* 显示默认书签 */}
          {bookmarks.map((bookmark) => (
            <TouchableOpacity
              key={bookmark.id}
              style={styles.bookmark}
              onPress={() => navigateToBookmark(bookmark.url)}
            >
              <Text style={styles.bookmarkText}>{bookmark.title}</Text>
            </TouchableOpacity>
          ))}
          {/* 显示用户添加的书签 */}
          {bookmarkList.map((bookmark) => (
            <TouchableOpacity
              key={bookmark.id}
              style={[styles.bookmark, styles.userBookmark]}
              onPress={() => navigateToBookmark(bookmark.url)}
            >
              <Text style={styles.bookmarkText}>{bookmark.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 网页内容区域 */}
      <View style={styles.webContent}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>正在加载 {currentUrl}...</Text>
          </View>
        ) : (
          <View style={styles.mockWebpage}>
            <Text style={styles.mockTitle}>📄 模拟网页内容</Text>
            <Text style={styles.mockUrl}>URL: {currentUrl}</Text>
            <Text style={styles.mockDescription}>
              这里将显示真实的网页内容{'\n'}
              • 本地开发服务器预览{'\n'}
              • 远程网站访问{'\n'}
              • 端口转发的服务{'\n'}
              • 开发工具和调试信息
            </Text>
            
            <TouchableOpacity style={styles.screenshotButton}>
              <Text style={styles.screenshotButtonText}>📷 截图</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  // 暴露方法给父组件
  React.useImperativeHandle(ref, () => ({
    goBack: () => {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentUrl(history[newIndex]);
        Alert.alert('导航', `后退到: ${history[newIndex]}`);
      } else {
        Alert.alert('提示', '已经是第一页了');
      }
    },
    goForward: () => {
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCurrentUrl(history[newIndex]);
        Alert.alert('导航', `前进到: ${history[newIndex]}`);
      } else {
        Alert.alert('提示', '已经是最后一页了');
      }
    },
    refresh: () => {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        Alert.alert('刷新', `页面 ${currentUrl} 已刷新`);
      }, 1000);
    },
    stop: () => {
      setIsLoading(false);
      Alert.alert('停止', '已停止加载页面');
    },
    screenshot: () => {
      Alert.alert('截图', `已保存 ${currentUrl} 的截图`);
    },
    bookmark: () => {
      const newBookmark: BookmarkItem = {
        id: Date.now().toString(),
        title: `Page ${bookmarkList.length + 1}`,
        url: currentUrl,
      };
      setBookmarkList(prev => [...prev, newBookmark]);
      Alert.alert('收藏', `已收藏: ${currentUrl}`);
    },
    navigate: (url: string) => {
      if (url && url.trim()) {
        // 确保URL格式正确
        let formattedUrl = url.trim();
        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
          formattedUrl = 'http://' + formattedUrl;
        }
        
        setCurrentUrl(formattedUrl);
        
        // 添加到历史记录
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(formattedUrl);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        
        // 开始加载
        setIsLoading(true);
        setTimeout(() => {
          setIsLoading(false);
          Alert.alert('导航', `已访问: ${formattedUrl}`);
        }, 1000);
      } else {
        Alert.alert('错误', '请输入有效的URL地址');
      }
    },
  }));

  return (
    <View style={styles.container}>
      {/* 模式切换按钮 */}
      <View style={styles.modeSwitch}>
        <TouchableOpacity
          style={[styles.modeButton, !showPortManager && styles.activeModeButton]}
          onPress={() => setShowPortManager(false)}
        >
          <Text style={[styles.modeButtonText, !showPortManager && styles.activeModeButtonText]}>
            🌐 浏览器
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.modeButton, showPortManager && styles.activeModeButton]}
          onPress={() => setShowPortManager(true)}
        >
          <Text style={[styles.modeButtonText, showPortManager && styles.activeModeButtonText]}>
            🔄 端口转发
          </Text>
        </TouchableOpacity>
      </View>

      {/* 内容区域 */}
      {showPortManager ? renderPortManager() : renderBrowser()}
    </View>
  );
});

// 设置display name用于调试
SimpleForward.displayName = 'SimpleForward';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: '#2d2d2d',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#3d3d3d',
  },
  activeModeButton: {
    backgroundColor: '#1a1a1a',
  },
  modeButtonText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '500',
  },
  activeModeButtonText: {
    color: '#fff',
  },

  // 浏览器样式
  browserContainer: {
    flex: 1,
  },
  addressBar: {
    flexDirection: 'row',
    backgroundColor: '#2d2d2d',
    paddingHorizontal: 12,
    paddingVertical: 2,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  urlInput: {
    flex: 1,
    backgroundColor: '#3d3d3d',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  goButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  goButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bookmarkBar: {
    backgroundColor: '#2d2d2d',
    paddingHorizontal: 12,
    paddingTop: 2,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  bookmark: {
    backgroundColor: '#3d3d3d',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  bookmarkText: {
    color: '#ccc',
    fontSize: 10,
  },
  webContent: {
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
  },
  mockWebpage: {
    flex: 1,
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  mockUrl: {
    color: '#4CAF50',
    fontSize: 14,
    fontFamily: 'monospace',
    marginBottom: 16,
  },
  mockDescription: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  screenshotButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  screenshotButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // 端口管理样式
  portManagerContainer: {
    flex: 1,
  },
  portManagerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2d2d2d',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  portManagerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  portList: {
    flex: 1,
    padding: 16,
  },
  portItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2d2d2d',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  portInfo: {
    flex: 1,
  },
  portTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  portStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  toggleButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  userBookmark: {
    backgroundColor: '#4CAF50',
    borderWidth: 1,
    borderColor: '#45a049',
  },
});

export default SimpleForward;