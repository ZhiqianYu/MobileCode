import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { ViewMode } from '../../types/ui';

interface TopBarProps {
  user: string;
  host: string;
  ping: number;
  isConnected: boolean;
  onMenuPress: () => void;
  onSettingsPress: () => void;
  onQuickViewChange: (view: ViewMode) => void;
}

const TopBar: React.FC<TopBarProps> = ({
  user,
  host,
  ping,
  isConnected,
  onMenuPress,
  onSettingsPress,
  onQuickViewChange,
}) => {
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1e1e1e" barStyle="light-content" />
      
      <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
        <Text style={styles.menuIcon}>≡</Text>
      </TouchableOpacity>

      <View style={styles.connectionInfo}>
        <Text style={styles.connectionText}>
          {user}@{host}
        </Text>
        <Text style={[styles.pingText, { color: isConnected ? '#4CAF50' : '#F44336' }]}>
          ({isConnected ? `${ping}ms` : 'disconnected'})
        </Text>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity 
          onPress={() => onQuickViewChange('file')}
          style={styles.quickButton}
        >
          <Text style={styles.quickIcon}>🗂️</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => onQuickViewChange('forward')}
          style={styles.quickButton}
        >
          <Text style={styles.quickIcon}>🔄</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => onQuickViewChange('editor')}
          style={styles.quickButton}
        >
          <Text style={styles.quickIcon}>📝</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => onQuickViewChange('terminal')}
          style={styles.quickButton}
        >
          <Text style={styles.quickIcon}>💻</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={onSettingsPress}
          style={styles.quickButton}
        >
          <Text style={styles.quickIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  connectionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  connectionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  pingText: {
    fontSize: 12,
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
  },
  quickButton: {
    padding: 8,
    marginLeft: 4,
  },
  quickIcon: {
    fontSize: 18,
  },
});

export default TopBar;