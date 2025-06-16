// src/components/Drawer/CleanDrawerSettings.tsx
// 功能：简洁版设置抽屉，60%屏幕高度，靠右上下居中，集成全屏设置
// 依赖：Modal, Animated, React Native组件, SettingsContext
// 被使用：MainContainer

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  ScrollView,
  Switch,
} from 'react-native';
import { useSettings } from '../../contexts/SettingsContext';

interface CleanDrawerSettingsProps {
  visible: boolean;
  onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DRAWER_HEIGHT = SCREEN_HEIGHT * 0.6; // 60% 屏幕高度
const DRAWER_WIDTH = SCREEN_WIDTH * 0.72; // 72% 屏幕宽度
const VERTICAL_MARGIN = (SCREEN_HEIGHT - DRAWER_HEIGHT) / 2; // 上下居中

const CleanDrawerSettings: React.FC<CleanDrawerSettingsProps> = ({
  visible,
  onClose,
}) => {
  // 使用设置Context
  const { settings, updateSetting } = useSettings();
  
  // 动画值
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // 重置动画值
  const resetAnimations = () => {
    slideAnim.setValue(DRAWER_WIDTH);
    opacityAnim.setValue(0);
  };

  // 动画处理
  useEffect(() => {
    if (visible) {
      resetAnimations();
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
      ]).start(() => {
        if (!visible) resetAnimations();
      });
    }
  }, [visible]);

  // 字体大小选项
  const fontSizes = [
    { key: 'small', label: '小' },
    { key: 'medium', label: '中' },
    { key: 'large', label: '大' },
    { key: 'xlarge', label: '特大' },
  ];

  // 主题选项
  const themes = [
    { key: 'dark', label: '深色' },
    { key: 'blue', label: '蓝色' },
    { key: 'purple', label: '紫色' },
    { key: 'orange', label: '橙色' },
  ];

  // 设置项组件
  const SettingSwitch = ({ label, value, onValueChange, description }: {
    label: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    description?: string;
  }) => (
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

  // 选择项组件
  const SettingSelect = ({ label, options, currentValue, onSelect }: {
    label: string;
    options: { key: string; label: string }[];
    currentValue: string;
    onSelect: (value: string) => void;
  }) => (
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
        {/* 背景遮罩 */}
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.overlay, { opacity: opacityAnim }]} />
        </TouchableWithoutFeedback>

        {/* 0号容器 - 抽屉主体 */}
        <Animated.View 
          style={[
            styles.drawerContainer,
            {
              transform: [{ translateX: slideAnim }],
            }
          ]}
        >
          {/* 1号 - 标题栏 */}
          <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>设置</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* 2号 - 内容区域 */}
          <View style={styles.contentContainer}>
            <ScrollView 
              style={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* 2-1 外观设置 */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>外观</Text>
                
                <SettingSwitch
                  label="全屏模式"
                  value={settings.fullScreen}
                  onValueChange={(value) => updateSetting('fullScreen', value)}
                  description="隐藏状态栏和导航栏，获得更大显示空间"
                />
                
                <SettingSelect
                  label="字体大小"
                  options={fontSizes}
                  currentValue={settings.fontSize}
                  onSelect={(value) => updateSetting('fontSize', value)}
                />
                <SettingSelect
                  label="主题颜色"
                  options={themes}
                  currentValue={settings.theme}
                  onSelect={(value) => updateSetting('theme', value)}
                />
                <SettingSwitch
                  label="深色模式"
                  value={settings.darkMode}
                  onValueChange={(value) => updateSetting('darkMode', value)}
                  description="使用深色界面主题"
                />
              </View>

              {/* 2-2 终端设置 */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>终端</Text>
                <SettingSwitch
                  label="终端铃声"
                  value={settings.terminalBell}
                  onValueChange={(value) => updateSetting('terminalBell', value)}
                  description="命令完成时播放提示音"
                />
                <SettingSwitch
                  label="显示延迟"
                  value={settings.showPing}
                  onValueChange={(value) => updateSetting('showPing', value)}
                  description="在状态栏显示连接延迟"
                />
              </View>

              {/* 2-3 连接设置 */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>连接</Text>
                <SettingSwitch
                  label="自动重连"
                  value={settings.autoConnect}
                  onValueChange={(value) => updateSetting('autoConnect', value)}
                  description="连接断开时自动尝试重连"
                />
              </View>

              {/* 2-4 关于部分 */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>关于</Text>
                <View style={styles.aboutContent}>
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
              </View>
            </ScrollView>
          </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  
  // 0号容器 - 抽屉主体
  drawerContainer: {
    position: 'absolute',
    left: SCREEN_WIDTH - DRAWER_WIDTH, 
    top: VERTICAL_MARGIN,
    width: DRAWER_WIDTH,
    height: DRAWER_HEIGHT,
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: -5, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  
  // 1号 - 标题栏（居中，较小高度）
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 0,
    backgroundColor: '#2d2d2d',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
    height: 50,
    position: 'relative',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#ccc',
    fontSize: 20,
    fontWeight: 'bold',
  },
  
  // 2号 - 内容区域（可伸缩）
  contentContainer: {
    flex: 1,
    backgroundColor: '#222',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 10,
    paddingBottom: 0,
  },
  
  // 2-1, 2-2, 2-3, 2-4 - 各个设置部分
  sectionContainer: {
    marginBottom: 10,
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 0,
  },
  
  // 设置项样式
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    color: '#999',
    fontSize: 11,
    lineHeight: 12,
  },
  
  // 选择项样式
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  optionButton: {
    backgroundColor: '#3d3d3d',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: '#555',
  },
  optionButtonSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  optionText: {
    color: '#ccc',
    fontSize: 13,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  
  // 关于部分样式
  aboutContent: {
    alignItems: 'center',
    paddingTop: 8,
  },
  appName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  appVersion: {
    color: '#999',
    fontSize: 13,
    marginBottom: 8,
  },
  appDescription: {
    color: '#ccc',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  linkButton: {
    backgroundColor: '#3d3d3d',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#555',
    width: '100%',
  },
  linkText: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default CleanDrawerSettings;