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
          ({isConnected && ping > 0 ? `${ping}ms` : 'disconnected'})
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
    marginTop: StatusBar.currentHeight || 0,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  menuButton: {
    padding: 0,
    marginTop: 0,
    justifyContent: 'center',
  },
  menuIcon: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
  },
  connectionInfo: {
    flex: 1,
    marginLeft: 8,
  },
  connectionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  pingText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
  },
  quickButton: {
    padding: 5,
    marginLeft: 0,
  },
  quickIcon: {
    fontSize: 20,
  },
});

export default TopBar;