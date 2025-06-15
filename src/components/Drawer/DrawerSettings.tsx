// src/components/Drawer/DrawerSettings.tsx
// 功能：抽屉式应用设置，从右侧滑出的设置界面
// 依赖：Modal, Animated, React Native组件
// 被使用：MainScreen

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  StatusBar,
  ScrollView,
  Switch,
} from 'react-native';

interface DrawerSettingsProps {
  visible: boolean;
  onClose: () => void;
}

const DRAWER_WIDTH = Dimensions.get('window').width * 0.85; // 抽屉宽度为屏幕的85%

const DrawerSettings: React.FC<DrawerSettingsProps> = ({
  visible,
  onClose,
}) => {
  // 设置状态
  const [darkMode, setDarkMode] = useState(true);
  const [terminalBell, setTerminalBell] = useState(false);
  const [autoConnect, setAutoConnect] = useState(true);
  const [showPing, setShowPing] = useState(true);
  const [fontSize, setFontSize] = useState('medium');
  const [theme, setTheme] = useState('dark');
  
  // 动画值
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // 处理抽屉显示/隐藏动画
  useEffect(() => {
    if (visible) {
      // 显示动画 - 从右侧滑入
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // 隐藏动画 - 滑出到右侧
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: DRAWER_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, opacityAnim]);

  // 字体大小选项
  const fontSizes = [
    { key: 'small', label: '小', value: 12 },
    { key: 'medium', label: '中', value: 14 },
    { key: 'large', label: '大', value: 16 },
    { key: 'xlarge', label: '特大', value: 18 },
  ];

  // 主题选项
  const themes = [
    { key: 'dark', label: '深色', primary: '#4CAF50', bg: '#1a1a1a' },
    { key: 'blue', label: '蓝色', primary: '#2196F3', bg: '#1a1a2e' },
    { key: 'purple', label: '紫色', primary: '#9C27B0', bg: '#1a1a2e' },
    { key: 'orange', label: '橙色', primary: '#FF9800', bg: '#2e1a1a' },
  ];

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const renderSwitchItem = (label: string, value: boolean, onValueChange: (value: boolean) => void, description?: string) => (
    <View style={styles.settingItem}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#666', true: '#4CAF50' }}
        thumbColor={value ? '#fff' : '#ccc'}
      />
    </View>
  );

  const renderSelectItem = (label: string, options: any[], currentValue: string, onSelect: (value: string) => void) => (
    <View style={styles.settingItem}>
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.optionButton,
              currentValue === option.key && styles.optionButtonSelected
            ]}
            onPress={() => onSelect(option.key)}
          >
            <Text style={[
              styles.optionText,
              currentValue === option.key && styles.optionTextSelected
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <StatusBar backgroundColor="rgba(0,0,0,0.5)" barStyle="light-content" translucent />
        
        {/* 遮罩层 */}
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View 
            style={[
              styles.overlay,
              { opacity: opacityAnim }
            ]} 
          />
        </TouchableWithoutFeedback>

        {/* 抽屉内容 */}
        <Animated.View 
          style={[
            styles.drawer,
            {
              transform: [{ translateX: slideAnim }],
            }
          ]}
        >
          {/* 抽屉头部 */}
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>设置</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* 设置内容 */}
          <ScrollView style={styles.drawerContent} showsVerticalScrollIndicator={false}>
            {/* 外观设置 */}
            {renderSection('外观', (
              <>
                {renderSelectItem('字体大小', fontSizes, fontSize, setFontSize)}
                {renderSelectItem('主题颜色', themes, theme, setTheme)}
                {renderSwitchItem('深色模式', darkMode, setDarkMode, '使用深色界面主题')}
              </>
            ))}

            {/* 终端设置 */}
            {renderSection('终端', (
              <>
                {renderSwitchItem('终端铃声', terminalBell, setTerminalBell, '命令完成时播放提示音')}
                {renderSwitchItem('显示延迟', showPing, setShowPing, '在状态栏显示连接延迟')}
              </>
            ))}

            {/* 连接设置 */}
            {renderSection('连接', (
              <>
                {renderSwitchItem('自动重连', autoConnect, setAutoConnect, '连接断开时自动尝试重连')}
              </>
            ))}

            {/* 关于 */}
            {renderSection('关于', (
              <View style={styles.aboutContainer}>
                <Text style={styles.appName}>MobileCode</Text>
                <Text style={styles.appVersion}>版本 1.0.0</Text>
                <Text style={styles.appDescription}>
                  移动端SSH终端和代码编辑器
                </Text>
                
                <TouchableOpacity style={styles.linkButton}>
                  <Text style={styles.linkText}>📝 用户手册</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.linkButton}>
                  <Text style={styles.linkText}>🐛 反馈问题</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.linkButton}>
                  <Text style={styles.linkText}>⭐ 给我们评分</Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* 底部留白 */}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: (StatusBar.currentHeight || 0) + 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 16,
  },
  drawerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#999',
    fontSize: 18,
    fontWeight: 'bold',
  },
  drawerContent: {
    flex: 1,
  },
  section: {
    marginTop: 20,
    marginHorizontal: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    paddingLeft: 4,
  },
  settingItem: {
    backgroundColor: '#2d2d2d',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#444',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    color: '#999',
    fontSize: 12,
    lineHeight: 16,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  optionButton: {
    backgroundColor: '#3d3d3d',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#555',
  },
  optionButtonSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  optionText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  aboutContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#2d2d2d',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  appName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  appVersion: {
    color: '#999',
    fontSize: 14,
    marginBottom: 8,
  },
  appDescription: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  linkButton: {
    backgroundColor: '#3d3d3d',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#555',
    width: '100%',
  },
  linkText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
});

export default DrawerSettings;