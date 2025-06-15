// src/contexts/SSHContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { useSSH } from '../hooks/useSSH';

// 创建Context
const SSHContext = createContext<ReturnType<typeof useSSH> | null>(null);

// Provider组件
export const SSHProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const sshState = useSSH();
  
  return (
    <SSHContext.Provider value={sshState}>
      {children}
    </SSHContext.Provider>
  );
};

// 自定义hook来使用Context
export const useSSHContext = () => {
  const context = useContext(SSHContext);
  if (!context) {
    throw new Error('useSSHContext must be used within SSHProvider');
  }
  return context;
};