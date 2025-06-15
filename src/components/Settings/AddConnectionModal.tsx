// src/components/Settings/AddConnectionModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SSHConnection } from '../../types/ssh';

interface AddConnectionModalProps {
  visible: boolean;
  onClose: () => void;
  onConnectionCreated: (connection: SSHConnection) => void;
}

type Step = 'name' | 'host' | 'port' | 'username' | 'auth' | 'password' | 'privateKey';
type AuthType = 'password' | 'privateKey';

const AddConnectionModal: React.FC<AddConnectionModalProps> = ({
  visible,
  onClose,
  onConnectionCreated,
}) => {
  const [currentStep, setCurrentStep] = useState<Step>('name');
  const [authType, setAuthType] = useState<AuthType>('password');
  
  // 连接信息状态
  const [connectionData, setConnectionData] = useState({
    name: '',
    host: '',
    port: '22',
    username: '',
    password: '',
    privateKey: '',
  });

  // 重置状态
  const resetForm = () => {
    setCurrentStep('name');
    setAuthType('password');
    setConnectionData({
      name: '',
      host: '',
      port: '22',
      username: '',
      password: '',
      privateKey: '',
    });
  };

  // 当Modal关闭时重置
  useEffect(() => {
    if (!visible) {
      resetForm();
    }
  }, [visible]);

  const validateAndNext = () => {
    switch (currentStep) {
      case 'name':
        if (!connectionData.name.trim()) {
          Alert.alert('错误', '连接名称不能为空');
          return;
        }
        setCurrentStep('host');
        break;
      case 'host':
        if (!connectionData.host.trim()) {
          Alert.alert('错误', '主机地址不能为空');
          return;
        }
        setCurrentStep('port');
        break;
      case 'port':
        const port = parseInt(connectionData.port);
        if (isNaN(port) || port < 1 || port > 65535) {
          Alert.alert('错误', '请输入有效的端口号 (1-65535)');
          return;
        }
        setCurrentStep('username');
        break;
      case 'username':
        if (!connectionData.username.trim()) {
          Alert.alert('错误', '用户名不能为空');
          return;
        }
        setCurrentStep('auth');
        break;
      case 'auth':
        if (authType === 'password') {
          setCurrentStep('password');
        } else {
          setCurrentStep('privateKey');
        }
        break;
      case 'password':
        if (!connectionData.password) {
          Alert.alert('错误', '密码不能为空');
          return;
        }
        createConnection();
        break;
      case 'privateKey':
        if (!connectionData.privateKey || !connectionData.privateKey.includes('BEGIN')) {
          Alert.alert('错误', '请输入有效的私钥');
          return;
        }
        createConnection();
        break;
    }
  };

  const goBack = () => {
    switch (currentStep) {
      case 'host':
        setCurrentStep('name');
        break;
      case 'port':
        setCurrentStep('host');
        break;
      case 'username':
        setCurrentStep('port');
        break;
      case 'auth':
        setCurrentStep('username');
        break;
      case 'password':
      case 'privateKey':
        setCurrentStep('auth');
        break;
      default:
        onClose();
    }
  };

  const createConnection = () => {
    const connection: SSHConnection = {
      id: `conn-${Date.now()}`,
      name: connectionData.name.trim(),
      host: connectionData.host.trim(),
      port: parseInt(connectionData.port),
      username: connectionData.username.trim(),
      password: authType === 'password' ? connectionData.password : undefined,
      privateKey: authType === 'privateKey' ? connectionData.privateKey : undefined,
      isConnected: false,
      lastUsed: new Date(),
      createdAt: new Date(),
    };

    onConnectionCreated(connection);
  };

  const updateConnectionData = (key: keyof typeof connectionData, value: string) => {
    setConnectionData(prev => ({ ...prev, [key]: value }));
  };

  const getStepInfo = () => {
    const steps = ['name', 'host', 'port', 'username', 'auth', authType === 'password' ? 'password' : 'privateKey'];
    const currentIndex = steps.indexOf(currentStep);
    return `${currentIndex + 1}/${steps.length}`;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'name':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>连接名称</Text>
            <Text style={styles.stepDescription}>为此连接起一个容易识别的名称</Text>
            <TextInput
              style={styles.textInput}
              value={connectionData.name}
              onChangeText={(text) => updateConnectionData('name', text)}
              placeholder="例如：我的服务器"
              placeholderTextColor="#666"
              autoFocus
            />
          </View>
        );

      case 'host':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>主机地址</Text>
            <Text style={styles.stepDescription}>输入服务器的IP地址或域名</Text>
            <TextInput
              style={styles.textInput}
              value={connectionData.host}
              onChangeText={(text) => updateConnectionData('host', text)}
              placeholder="例如：192.168.1.100"
              placeholderTextColor="#666"
              keyboardType="url"
              autoCapitalize="none"
              autoFocus
            />
          </View>
        );

      case 'port':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>端口号</Text>
            <Text style={styles.stepDescription}>SSH服务的端口号，通常是22</Text>
            <TextInput
              style={styles.textInput}
              value={connectionData.port}
              onChangeText={(text) => updateConnectionData('port', text)}
              placeholder="22"
              placeholderTextColor="#666"
              keyboardType="numeric"
              autoFocus
            />
          </View>
        );

      case 'username':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>用户名</Text>
            <Text style={styles.stepDescription}>登录服务器的用户名</Text>
            <TextInput
              style={styles.textInput}
              value={connectionData.username}
              onChangeText={(text) => updateConnectionData('username', text)}
              placeholder="例如：root"
              placeholderTextColor="#666"
              autoCapitalize="none"
              autoFocus
            />
          </View>
        );

      case 'auth':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>认证方式</Text>
            <Text style={styles.stepDescription}>选择登录认证方式</Text>
            
            <TouchableOpacity
              style={[styles.authOption, authType === 'password' && styles.authOptionSelected]}
              onPress={() => setAuthType('password')}
            >
              <Text style={[styles.authOptionText, authType === 'password' && styles.authOptionTextSelected]}>
                🔑 密码认证
              </Text>
              <Text style={styles.authOptionDesc}>使用用户名和密码登录</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.authOption, authType === 'privateKey' && styles.authOptionSelected]}
              onPress={() => setAuthType('privateKey')}
            >
              <Text style={[styles.authOptionText, authType === 'privateKey' && styles.authOptionTextSelected]}>
                🗝️ 密钥认证
              </Text>
              <Text style={styles.authOptionDesc}>使用SSH私钥登录</Text>
            </TouchableOpacity>
          </View>
        );

      case 'password':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>密码</Text>
            <Text style={styles.stepDescription}>输入登录密码</Text>
            <TextInput
              style={styles.textInput}
              value={connectionData.password}
              onChangeText={(text) => updateConnectionData('password', text)}
              placeholder="请输入密码"
              placeholderTextColor="#666"
              secureTextEntry
              autoFocus
            />
          </View>
        );

      case 'privateKey':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>私钥</Text>
            <Text style={styles.stepDescription}>粘贴SSH私钥内容</Text>
            <TextInput
              style={[styles.textInput, styles.textInputMultiline]}
              value={connectionData.privateKey}
              onChangeText={(text) => updateConnectionData('privateKey', text)}
              placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
              placeholderTextColor="#666"
              multiline
              numberOfLines={8}
              autoFocus
            />
          </View>
        );

      default:
        return null;
    }
  };

  const getNextButtonText = () => {
    if (currentStep === 'password' || currentStep === 'privateKey') {
      return '创建连接';
    }
    if (currentStep === 'auth') {
      return '下一步';
    }
    return '下一步';
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity 
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={styles.modalContent}>
                {/* 头部 */}
                <View style={styles.header}>
                  <Text style={styles.headerTitle}>新建SSH连接</Text>
                  <Text style={styles.headerProgress}>步骤 {getStepInfo()}</Text>
                </View>

                {/* 内容区域 */}
                <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
                  {renderStepContent()}
                </ScrollView>

                {/* 底部按钮 */}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={goBack}
                  >
                    <Text style={styles.backButtonText}>
                      {currentStep === 'name' ? '取消' : '上一步'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.nextButton}
                    onPress={validateAndNext}
                  >
                    <Text style={styles.nextButtonText}>{getNextButtonText()}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalContent: {
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerProgress: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  contentContainer: {
    maxHeight: 300,
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  stepDescription: {
    color: '#999',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  textInput: {
    backgroundColor: '#3d3d3d',
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  textInputMultiline: {
    height: 120,
    textAlignVertical: 'top',
  },
  authOption: {
    backgroundColor: '#3d3d3d',
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  authOptionSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#2d4d2d',
  },
  authOptionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  authOptionTextSelected: {
    color: '#4CAF50',
  },
  authOptionDesc: {
    color: '#999',
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  backButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingVertical: 12,
    marginRight: 8,
  },
  backButtonText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    marginLeft: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default AddConnectionModal;