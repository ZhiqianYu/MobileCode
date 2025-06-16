// src/services/SimpleSSHService.ts
// 功能：简化版SSH服务，只提供基本连接状态管理
// 依赖：SSHConnection类型, TerminalOutput类型
// 被使用：useSSH.ts

import { SSHConnection, TerminalOutput, ConnectionStatus } from '../types/ssh';

class SimpleSSHService {
  private isConnected: boolean = false;
  private currentConfig: SSHConnection | null = null;
  private outputCallbacks: ((output: TerminalOutput) => void)[] = [];
  private statusCallbacks: ((status: ConnectionStatus) => void)[] = [];
  private currentStatus: ConnectionStatus = {
    isConnecting: false,
    isConnected: false,
  };
  private idCounter: number = 0;

  // 生成唯一ID
  private generateId(): string {
    return `simple-mock-${Date.now()}-${++this.idCounter}`;
  }

  // 模拟连接
  async connect(config: SSHConnection): Promise<boolean> {
    console.log('SimpleSSHService connecting to:', config.host);
    
    // 更新连接状态
    this.updateStatus({ isConnecting: true, isConnected: false, error: undefined });
    
    // 模拟连接延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 模拟连接成功率 (90% 成功)
    const success = Math.random() > 0.1;
    
    if (success) {
      this.isConnected = true;
      this.currentConfig = config;
      
      this.updateStatus({
        isConnecting: false,
        isConnected: true,
        error: undefined,
        lastPing: Math.floor(Math.random() * 50) + 20, // 20-70ms
      });

      // 发送简单的连接成功消息
      this.emitOutput(`Connected to ${config.host}\n`);
      this.emitOutput(`Welcome to ${config.username}@${config.host}\n`);
      this.emitOutput(`$ `);
      
      console.log('SimpleSSHService connected successfully');
    } else {
      this.updateStatus({
        isConnecting: false,
        isConnected: false,
        error: 'Connection failed',
      });
      console.log('SimpleSSHService connection failed');
    }
    
    return success;
  }

  // 断开连接
  async disconnect(): Promise<void> {
    console.log('SimpleSSHService disconnecting');
    
    if (this.isConnected) {
      this.emitOutput('Connection closed.\n');
    }
    
    this.isConnected = false;
    this.currentConfig = null;
    
    this.updateStatus({
      isConnecting: false,
      isConnected: false,
      error: undefined,
    });
  }

  // 写入数据到SSH (简化版，只回显)
  writeToSSH(data: string): void {
    if (!this.isConnected) {
      console.warn('Cannot write to SSH: not connected');
      return;
    }

    console.log('User input:', JSON.stringify(data));
    
    // 简单回显输入
    this.emitOutput(data);
    
    // 如果是回车，显示新的提示符
    if (data === '\r' || data === '\n') {
      this.emitOutput('\n$ ');
    }
  }

  // 监听输出
  onOutput(callback: (output: TerminalOutput) => void): () => void {
    this.outputCallbacks.push(callback);
    return () => {
      const index = this.outputCallbacks.indexOf(callback);
      if (index > -1) {
        this.outputCallbacks.splice(index, 1);
      }
    };
  }

  // 监听状态变化
  onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    callback(this.currentStatus);
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  // 获取连接状态
  getStatus(): ConnectionStatus {
    return { ...this.currentStatus };
  }

  // 获取当前连接配置
  getCurrentConnection(): SSHConnection | null {
    return this.currentConfig;
  }

  // 私有方法
  private updateStatus(status: Partial<ConnectionStatus>): void {
    this.currentStatus = { ...this.currentStatus, ...status };
    this.statusCallbacks.forEach(callback => callback(this.currentStatus));
  }

  private emitOutput(content: string): void {
    const output: TerminalOutput = {
      id: this.generateId(),
      content,
      timestamp: new Date(),
      type: 'output',
    };
    this.outputCallbacks.forEach(callback => callback(output));
  }
}

// 导出单例
export default new SimpleSSHService();