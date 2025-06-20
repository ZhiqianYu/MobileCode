// src/components/File/FileInfoModal.tsx
// 文件信息弹框组件 - 显示文件详细信息和预览
// 职责：文件信息展示、预览渲染、操作按钮、模态框控制
// 依赖：FileUtils、React Native基础组件
// 被使用：SimpleFileManager

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { FileUtils } from './FileUtils';
import { FileItem } from './FileTypes';

// ================================
// 组件属性接口
// ================================

interface FileInfoModalProps {
  visible: boolean;
  file: FileItem | null;
  thumbnail?: string | null;
  onClose: () => void;
  onOpen: () => void;
}

// ================================
// 主组件实现
// ================================

const FileInfoModal: React.FC<FileInfoModalProps> = ({
  visible,
  file,
  thumbnail,
  onClose,
  onOpen,
}) => {

  // ================================
  // 工具函数
  // ================================

  const getFileTypeText = () => {
    if (!file) return '';
    
    if (file.type === 'directory') return '文件夹';
    if (FileUtils.isImageFile(file.name)) return '图片文件';
    if (FileUtils.isCodeFile(file.name)) return '代码文件';
    if (FileUtils.isArchiveFile(file.name)) return '压缩文件';
    
    return '文件';
  };

  const getFileExtension = () => {
    if (!file) return '';
    return FileUtils.getExtension(file.name) || '无';
  };

  // ================================
  // 渲染函数
  // ================================

  const renderPreview = () => {
    if (!file) return null;

    if (thumbnail) {
      if (thumbnail.startsWith('code:')) {
        const code = thumbnail.substring(5);
        return (
          <View style={styles.codePreview}>
            <Text style={styles.codeText}>{code}</Text>
          </View>
        );
      } else {
        return (
          <Image 
            source={{ uri: thumbnail }} 
            style={styles.imagePreview}
            resizeMode="cover"
          />
        );
      }
    }
    
    return (
      <View style={styles.iconPreview}>
        <Text style={styles.largeIcon}>{file.icon}</Text>
      </View>
    );
  };

  if (!file) return null;

  // ================================
  // 渲染组件
  // ================================

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.fileName} numberOfLines={2}>
            {file.name}
          </Text>
          
          <View style={styles.previewContainer}>
            {renderPreview()}
          </View>
          
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>类型:</Text>
              <Text style={styles.infoValue}>{getFileTypeText()}</Text>
            </View>
            
            {file.size && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>大小:</Text>
                <Text style={styles.infoValue}>{file.size}</Text>
              </View>
            )}
            
            {file.modified && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>修改时间:</Text>
                <Text style={styles.infoValue}>{file.modified}</Text>
              </View>
            )}
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>扩展名:</Text>
              <Text style={styles.infoValue}>{getFileExtension()}</Text>
            </View>

            {file.path && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>路径:</Text>
                <Text style={styles.infoValue} numberOfLines={2}>
                  {file.path}
                </Text>
              </View>
            )}

            {file.uri && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>URI:</Text>
                <Text style={styles.infoValue} numberOfLines={2}>
                  {file.uri}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>关闭</Text>
            </TouchableOpacity>
            
            {file.type === 'file' && (
              <TouchableOpacity style={styles.openButton} onPress={onOpen}>
                <Text style={styles.openButtonText}>
                  {FileUtils.isCodeFile(file.name) ? '编辑' : '打开'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ================================
// 样式定义
// ================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#2d2d2d',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#444',
  },
  fileName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  previewContainer: {
    height: 120,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  codePreview: {
    padding: 12,
    backgroundColor: '#0c0c0c',
    height: '100%',
  },
  codeText: {
    color: '#4CAF50',
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 14,
  },
  iconPreview: {
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  largeIcon: {
    fontSize: 48,
  },
  infoSection: {
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  infoLabel: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
    minWidth: 80,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    backgroundColor: '#666',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 12,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  openButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 12,
  },
  openButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default FileInfoModal;