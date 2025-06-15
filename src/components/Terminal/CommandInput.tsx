// src/components/Terminal/CommandInput.tsx - 清理版本
import React, { useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';

interface CommandInputProps {
  command: string;
  onCommandChange: (command: string) => void;
  onExecuteCommand: () => void;
  canExecuteCommands: boolean;
  showQuickCommands: boolean;
  onShowQuickCommands: () => void;
  placeholder?: string;
}

const CommandInput: React.FC<CommandInputProps> = ({
  command,
  onCommandChange,
  onExecuteCommand,
  canExecuteCommands,
  showQuickCommands,
  onShowQuickCommands,
  placeholder = '输入命令...',
}) => {
  const textInputRef = useRef<TextInput>(null);

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <Text style={styles.promptText}>$ </Text>
        <TextInput
          ref={textInputRef}
          style={styles.commandInput}
          value={command}
          onChangeText={onCommandChange}
          onSubmitEditing={onExecuteCommand}
          placeholder={placeholder}
          placeholderTextColor="#666"
          editable={canExecuteCommands}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        
        {/* 快捷命令提示按钮 */}
        {!showQuickCommands && (
          <TouchableOpacity
            style={styles.quickTipButton}
            onPress={onShowQuickCommands}
          >
            <Text style={styles.quickTipText}>⬆</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[
            styles.sendButton,
            !canExecuteCommands && styles.sendButtonDisabled
          ]}
          onPress={onExecuteCommand}
          disabled={!canExecuteCommands}
        >
          <Text style={styles.sendButtonText}>发送</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 50,
  },
  promptText: {
    color: '#00ff00',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: 'bold',
  },
  commandInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginLeft: 8,
    marginRight: 12,
    height: 36,
    paddingVertical: 4,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    height: 32,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#666',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  quickTipButton: {
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 4,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#555',
  },
  quickTipText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default CommandInput;