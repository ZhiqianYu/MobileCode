// src/contexts/CrossModuleContext.tsx
// 跨模块状态管理器 - 负责协调文件管理器和编辑器之间的交互
// 
// 主要功能：
// 1. 管理跨模块操作模式（打开文件、保存文件）
// 2. 维护选中文件列表和待保存文件信息
// 3. 提供模块间状态同步方法
//
// 使用场景：
// - 编辑器请求打开文件 -> 文件管理器选择 -> 返回编辑器
// - 编辑器保存文件 -> 文件管理器选择位置 -> 确认保存

import React, { createContext, useContext, useState, ReactNode } from 'react';

// ================================
// 类型定义部分
// ================================

// 文件项数据结构 - 统一的文件信息格式
interface FileItem {
  name: string;                 // 文件名
  type: 'file' | 'directory';   // 文件类型
  path?: string;                // 应用内文件路径
  uri?: string;                 // 系统文件URI（SAF）
  size?: string;                // 文件大小（格式化后的字符串）
  modified?: string;            // 修改时间
  icon: string;                 // 显示图标
}

// 待保存文件信息 - 编辑器传递给文件管理器的保存数据
interface PendingSave {
  content: string;              // 文件内容
  fileName: string;             // 文件名
  tabId: string;                // 编辑器标签页ID
  originalName?: string;        // 原始文件名（用于区分新建/修改）
  originalPath?: string;        // 原始文件路径（已有文件的情况）
}

// 跨模块操作状态
interface CrossModuleState {
  // 当前操作模式
  mode: 'none' | 'openFile' | 'saveFile';
  
  // 文件选择相关
  selectedFiles: FileItem[];    // 当前选中的文件列表
  
  // 文件保存相关  
  pendingSave?: PendingSave;    // 待保存的文件信息
  
  // 当前活跃模块
  activeModule: 'file' | 'editor' | 'forward' | 'terminal';
  
  // 操作来源模块（用于操作完成后的回调）
  sourceModule?: 'file' | 'editor' | 'forward' | 'terminal';
}

// Context接口定义
interface CrossModuleContextType {
  // 状态访问
  state: CrossModuleState;
  
  // ================================
  // 模式控制方法
  // ================================
  
  // 设置操作模式
  setMode: (mode: CrossModuleState['mode']) => void;
  
  // 启动打开文件流程
  startOpenFile: (sourceModule: CrossModuleState['activeModule']) => void;
  
  // 启动保存文件流程  
  startSaveFile: (saveInfo: PendingSave, sourceModule: CrossModuleState['activeModule']) => void;
  
  // ================================
  // 文件选择管理
  // ================================
  
  // 设置选中文件列表
  setSelectedFiles: (files: FileItem[]) => void;
  
  // 添加单个选中文件
  addSelectedFile: (file: FileItem) => void;
  
  // 清除选中文件
  clearSelectedFiles: () => void;
  
  // 获取第一个选中的文件
  getFirstSelectedFile: () => FileItem | null;
  
  // ================================
  // 保存文件管理
  // ================================
  
  // 设置待保存文件信息
  setPendingSave: (saveInfo: PendingSave) => void;
  
  // 清除待保存信息
  clearPendingSave: () => void;
  
  // 更新待保存文件的文件名
  updatePendingSaveFileName: (newFileName: string) => void;
  
  // ================================
  // 模块管理
  // ================================
  
  // 设置当前活跃模块
  setActiveModule: (module: CrossModuleState['activeModule']) => void;
  
  // ================================
  // 状态重置
  // ================================
  
  // 重置所有状态
  reset: () => void;
  
  // 完成当前操作（重置模式但保留其他状态）
  completeOperation: () => void;
}

// ================================
// 默认状态配置
// ================================

const defaultState: CrossModuleState = {
  mode: 'none',
  selectedFiles: [],
  activeModule: 'file',
};

// ================================
// Context创建
// ================================

const CrossModuleContext = createContext<CrossModuleContextType | null>(null);

// ================================
// Provider组件实现
// ================================

export const CrossModuleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 主状态管理
  const [state, setState] = useState<CrossModuleState>(defaultState);

  // ================================
  // 模式控制方法实现
  // ================================
  
  const setMode = (mode: CrossModuleState['mode']) => {
    setState(prev => ({ ...prev, mode }));
  };

  const startOpenFile = (sourceModule: CrossModuleState['activeModule']) => {
    setState(prev => ({ 
      ...prev, 
      mode: 'openFile',
      sourceModule,
      selectedFiles: [], // 清空之前的选择
    }));
  };

  const startSaveFile = (saveInfo: PendingSave, sourceModule: CrossModuleState['activeModule']) => {
    setState(prev => ({ 
      ...prev, 
      mode: 'saveFile',
      sourceModule,
      pendingSave: saveInfo,
      selectedFiles: [], // 清空文件选择
    }));
  };

  // ================================
  // 文件选择管理实现
  // ================================
  
  const setSelectedFiles = (files: FileItem[]) => {
    setState(prev => ({ ...prev, selectedFiles: files }));
  };

  const addSelectedFile = (file: FileItem) => {
    setState(prev => ({
      ...prev,
      selectedFiles: [...prev.selectedFiles.filter(f => 
        (f.uri || f.path || f.name) !== (file.uri || file.path || file.name)
      ), file]
    }));
  };

  const clearSelectedFiles = () => {
    setState(prev => ({ ...prev, selectedFiles: [] }));
  };

  const getFirstSelectedFile = (): FileItem | null => {
    return state.selectedFiles.length > 0 ? state.selectedFiles[0] : null;
  };

  // ================================
  // 保存文件管理实现
  // ================================
  
  const setPendingSave = (saveInfo: PendingSave) => {
    setState(prev => ({ ...prev, pendingSave: saveInfo }));
  };

  const clearPendingSave = () => {
    setState(prev => ({ ...prev, pendingSave: undefined }));
  };

  const updatePendingSaveFileName = (newFileName: string) => {
    setState(prev => ({
      ...prev,
      pendingSave: prev.pendingSave ? {
        ...prev.pendingSave,
        fileName: newFileName
      } : undefined
    }));
  };

  // ================================
  // 模块管理实现
  // ================================
  
  const setActiveModule = (module: CrossModuleState['activeModule']) => {
    setState(prev => ({ ...prev, activeModule: module }));
  };

  // ================================
  // 状态重置实现
  // ================================
  
  const reset = () => {
    setState(defaultState);
  };

  const completeOperation = () => {
    setState(prev => ({ 
      ...prev, 
      mode: 'none',
      sourceModule: undefined,
      // 保留其他状态，让用户可以看到操作结果
    }));
  };

  // ================================
  // Context值组装
  // ================================
  
  const contextValue: CrossModuleContextType = {
    state,
    
    // 模式控制
    setMode,
    startOpenFile,
    startSaveFile,
    
    // 文件选择管理
    setSelectedFiles,
    addSelectedFile,
    clearSelectedFiles,
    getFirstSelectedFile,
    
    // 保存文件管理
    setPendingSave,
    clearPendingSave,
    updatePendingSaveFileName,
    
    // 模块管理
    setActiveModule,
    
    // 状态重置
    reset,
    completeOperation,
  };

  return (
    <CrossModuleContext.Provider value={contextValue}>
      {children}
    </CrossModuleContext.Provider>
  );
};

// ================================
// Hook导出
// ================================

export const useCrossModule = () => {
  const context = useContext(CrossModuleContext);
  if (!context) {
    throw new Error('useCrossModule必须在CrossModuleProvider内部使用');
  }
  return context;
};

// ================================
// 类型导出
// ================================

export type { FileItem, PendingSave, CrossModuleState };