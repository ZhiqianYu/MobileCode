// src/components/Connection/AddConnectionForm.tsx
// 功能：重新设计的添加SSH连接表单，优化布局和交互
// 依赖：ConnectionContext, SSHConnection类型
// 被使用：DrawerConnectionManager

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { SSHConnection } from '../../types/ssh';
import { useConnections } from '../../contexts/ConnectionContext';

interface AddConnectionFormProps {
  visible: boolean;
  onClose: () => void;
  onConnectionAdded?: (connection: SSHConnection) => void;
}

const AddConnectionForm: React.FC<AddConnectionFormProps> = ({
  visible,
  onClose,
  onConnectionAdded,
}) => {
  const { addConnection } = useConnections();
  
  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: '',
    username: '',
    password: '',
    privateKey: '',
  });
  
  const [authType, setAuthType] = useState<'password' | 'privateKey'>('password');
  const [saveCredentials, setSaveCredentials] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: '',
      host: '',
      port: '',
      username: '',
      password: '',
      privateKey: '',
    });
    setAuthType('password');
    setSaveCredentials(true);
    setIsSubmitting(false);
  };

  // 关闭表单
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // 更新表单字段
  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 切换认证类型
  const toggleAuthType = () => {
    setAuthType(authType === 'password' ? 'privateKey' : 'password');
  };

  // 选择密钥文件（目前用Alert提示，将来可以集成文件选择器）
  const handleSelectKeyFile = () => {
    Alert.alert(
      '选择密钥文件',
      '请手动复制密钥文件内容到输入框中\n\n支持的文件类型：\n• .pem (Privacy Enhanced Mail)\n• .key (Private Key)\n• .rsa (RSA Private Key)\n• .openssh (OpenSSH Private Key)',
      [
        { text: '知道了', style: 'default' }
      ]
    );
  };

  // 验证表单
  const validateForm = (): string | null => {
    if (!formData.name.trim()) return '连接名称不能为空';
    if (!formData.host.trim()) return '主机地址不能为空';
    if (!formData.username.trim()) return '用户名不能为空';
    
    // 端口号验证（如果填写了）
    if (formData.port) {
      const port = parseInt(formData.port);
      if (isNaN(port) || port < 1 || port > 65535) {
        return '请输入有效的端口号 (1-65535)';
      }
    }
    
    if (authType === 'password' && !formData.password) {
      return '密码不能为空';
    }
    
    if (authType === 'privateKey' && !formData.privateKey.trim()) {
      return '私钥不能为空';
    }
    
    return null;
  };

  // 提交表单
  const handleSubmit = async () => {
    const error = validateForm();
    if (error) {
      Alert.alert('验证失败', error);
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Creating new connection...');
      
      const newConnection: SSHConnection = {
        id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: formData.name.trim(),
        host: formData.host.trim(),
        port: formData.port ? parseInt(formData.port) : 22,
        username: formData.username.trim(),
        password: authType === 'password' && saveCredentials ? formData.password : undefined,
        privateKey: authType === 'privateKey' && saveCredentials ? formData.privateKey : undefined,
        isConnected: false,
        lastUsed: new Date(),
        createdAt: new Date(),
      };

      console.log('Saving connection:', newConnection.name);
      await addConnection(newConnection);
      console.log('Connection saved successfully');

      onConnectionAdded?.(newConnection);
      handleClose();
      
    } catch (error) {
      console.error('Failed to save connection:', error);
      Alert.alert('保存失败', '无法保存连接信息，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* 头部 */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>添加 SSH 连接</Text>
              <TouchableOpacity onPress={handleClose}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* 表单内容 */}
            <ScrollView 
              style={styles.formContainer} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* 连接名称 - 整行 */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>连接名称</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.name}
                  onChangeText={(text) => updateField('name', text)}
                  placeholder="例如：我的服务器"
                  placeholderTextColor="#666"
                />
              </View>

              {/* 主机地址和端口 - 左右分布 */}
              <View style={styles.row}>
                <View style={styles.leftColumn}>
                  <Text style={styles.label}>主机地址</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.host}
                    onChangeText={(text) => updateField('host', text)}
                    placeholder="192.168.1.100"
                    placeholderTextColor="#666"
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                </View>
                
                <View style={styles.rightColumn}>
                  <Text style={styles.label}>端口</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.port}
                    onChangeText={(text) => updateField('port', text)}
                    placeholder="22"
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* 用户名和密码 - 左右分布，高度一致 */}
              <View style={styles.row}>
                <View style={styles.leftColumn}>
                  <Text style={styles.label}>用户名</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.username}
                    onChangeText={(text) => updateField('username', text)}
                    placeholder="root"
                    placeholderTextColor="#666"
                    autoCapitalize="none"
                  />
                </View>
                
                <View style={styles.rightColumn}>
                  <View style={styles.passwordLabelRow}>
                    <Text style={styles.label}>密码</Text>
                    {authType === 'privateKey' && (
                      <TouchableOpacity 
                        style={styles.usePasswordButton}
                        onPress={toggleAuthType}
                      >
                        <Text style={styles.usePasswordButtonText}>🔑 使用密码</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput
                    style={[
                      styles.textInput,
                      authType === 'privateKey' && styles.textInputDisabled
                    ]}
                    value={formData.password}
                    onChangeText={(text) => updateField('password', text)}
                    placeholder={authType === 'password' ? "请输入密码" : "使用密钥认证"}
                    placeholderTextColor="#666"
                    secureTextEntry={authType === 'password'}
                    editable={authType === 'password'}
                  />
                </View>
              </View>

              {/* 密钥输入区域（条件显示） */}
              {authType === 'privateKey' && (
                <View style={styles.formGroup}>
                  <TextInput
                    style={[styles.textInput, styles.textInputMultiline]}
                    value={formData.privateKey}
                    onChangeText={(text) => updateField('privateKey', text)}
                    placeholder="粘贴SSH私钥内容..."
                    placeholderTextColor="#666"
                    multiline
                    numberOfLines={4}
                  />
                  <Text style={styles.fileHint}>
                    💡 支持的文件类型：.pem、.key、.rsa、.openssh
                  </Text>
                </View>
              )}

              {/* 操作按钮行 */}
              <View style={styles.actionRow}>
                <TouchableOpacity 
                  style={styles.keyButton}
                  onPress={authType === 'password' ? toggleAuthType : handleSelectKeyFile}
                >
                  <Text style={styles.keyButtonText}>
                    {authType === 'password' ? '使用密钥' : '选取密钥'}
                  </Text>
                </TouchableOpacity>
                
                <View style={styles.saveOptionCompact}>
                  <Text style={styles.saveLabel}>
                    {authType === 'password' ? '保存密码' : '保存密钥'}
                  </Text>
                  <Switch
                    value={saveCredentials}
                    onValueChange={setSaveCredentials}
                    trackColor={{ false: '#666', true: '#4CAF50' }}
                    thumbColor={saveCredentials ? '#fff' : '#ccc'}
                  />
                </View>
              </View>
            </ScrollView>

            {/* 底部按钮 */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? '保存中...' : '保存连接'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 370,
    justifyContent: 'center',
    maxHeight: '90%',
  },
  modalContent: {
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#444',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    color: '#999',
    fontSize: 18,
    fontWeight: 'bold',
  },
  formContainer: {
    paddingHorizontal: 15,
    paddingVertical: 5, // 减少上下内边距
    flexShrink: 1, // 允许在需要时收缩
  },
  formGroup: {
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  leftColumn: {
    flex: 1,
    marginRight: 8,
  },
  rightColumn: {
    flex: 1,
    marginLeft: 8,
  },
  label: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 6,
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: '#3d3d3d',
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    height: 48, // 统一高度
  },
  textInputDisabled: {
    backgroundColor: '#2a2a2a',
    borderColor: '#444',
    color: '#666',
  },
  textInputMultiline: {
    height: 100,
    textAlignVertical: 'top',
  },
  fileHint: {
    color: '#888',
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  keyButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 0,
    paddingVertical: 13,
    borderRadius: 8,
    marginRight: 20,
    flex: 1, // 让按钮稍微宽一些
  },
  keyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  saveOptionCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3d3d3d',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#555',
    flex: 1,
  },
  saveLabel: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingVertical: 12,
    marginRight: 40,
  },
  cancelButtonText: {
    color: '#999',
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '500',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    marginLeft: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#666',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  keyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  usePasswordButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 0,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1976D2',
  },
  usePasswordButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0, // 改为和 label 一样的间距
  },
});

export default AddConnectionForm;