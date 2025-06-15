import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { ViewMode } from '../../types/ui';

interface BottomTabsProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

interface TabItem {
  key: ViewMode;
  label: string;
  icon: string;
}

const tabs: TabItem[] = [
  { key: 'file', label: '文件', icon: '📁' },
  { key: 'forward', label: '转发', icon: '🔄' },
  { key: 'editor', label: '编辑', icon: '📝' },
  { key: 'terminal', label: '终端', icon: '💻' },
];

const BottomTabs: React.FC<BottomTabsProps> = ({
  currentView,
  onViewChange,
}) => {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tab,
            currentView === tab.key && styles.activeTab,
          ]}
          onPress={() => onViewChange(tab.key)}
        >
          <Text style={styles.icon}>{tab.icon}</Text>
          <Text
            style={[
              styles.label,
              currentView === tab.key && styles.activeLabel,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#2d2d2d',
    borderTopWidth: 1,
    borderTopColor: '#444',
    paddingBottom: 8,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  activeTab: {
    backgroundColor: '#404040',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  icon: {
    fontSize: 20,
    marginBottom: 4,
  },
  label: {
    color: '#999',
    fontSize: 12,
    fontWeight: '500',
  },
  activeLabel: {
    color: '#4CAF50',
  },
});

export default BottomTabs;