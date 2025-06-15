// src/services/SSHService.ts - 真实终端行为版本
import { SSHConnection, TerminalOutput, ConnectionStatus } from '../types/ssh';

class SSHService {
  private outputCallbacks: ((output: TerminalOutput) => void)[] = [];
  private statusCallbacks: ((status: ConnectionStatus) => void)[] = [];
  private currentStatus: ConnectionStatus = {
    isConnecting: false,
    isConnected: false,
  };
  private pingInterval: NodeJS.Timeout | null = null;
  private currentConfig: SSHConnection | null = null;
  private idCounter: number = 0;
  private persistentHistory: TerminalOutput[] = [];
  
  // SSH相关
  private sshClient: any = null;
  private isShellActive: boolean = false;
  
  // 密码处理
  private waitingForPassword: boolean = false;
  private lastPasswordTime: number = 0;
  
  // 输出缓冲和提示符处理
  private outputBuffer: string = '';
  private flushTimer: NodeJS.Timeout | null = null;
  private currentPrompt: string = '';
  private promptPattern = /([a-zA-Z0-9@\-_.]+[#$])\s*$/;

  // 生成唯一ID
  private generateUniqueId(): string {
    return `${Date.now()}-${++this.idCounter}`;
  }

  // 获取当前完整历史记录
  getFullHistory(): TerminalOutput[] {
    return [...this.persistentHistory];
  }

  // 连接到SSH服务器
  async connect(config: SSHConnection): Promise<boolean> {
    try {
      this.updateStatus({ isConnecting: true, isConnected: false, error: undefined });
      this.currentConfig = config;
      this.idCounter = 0;

      // 清空历史记录
      this.clearHistory();

      // 创建真实的SSH连接
      const SSHClient = (await import('@dylankenneally/react-native-ssh-sftp')).default;
      
      if (config.privateKey) {
        this.sshClient = await SSHClient.connectWithKey(
          config.host,
          config.port,
          config.username,
          config.privateKey,
          config.password
        );
      } else {
        this.sshClient = await SSHClient.connectWithPassword(
          config.host,
          config.port,
          config.username,
          config.password
        );
      }

      this.updateStatus({ 
        isConnecting: false, 
        isConnected: true, 
        lastPing: 50
      });

      // 启动shell和监控
      await this.startInteractiveShell();
      this.startPingMonitoring();

      return true;
    } catch (error) {
      this.updateStatus({
        isConnecting: false,
        isConnected: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      });

      const errorOutput: TerminalOutput = {
        id: this.generateUniqueId(),
        content: `✗ Connection failed: ${error}`,
        timestamp: new Date(),
        type: 'error',
      };

      this.addToPersistentHistory(errorOutput);
      this.emitOutput(errorOutput);

      return false;
    }
  }

  // 启动交互式shell
  private async startInteractiveShell(): Promise<void> {
    try {
      // 启动shell
      await new Promise<void>((resolve, reject) => {
        this.sshClient.startShell('xterm', (error: any) => {
          if (error) {
            reject(error);
            return;
          }
          this.isShellActive = true;
          resolve();
        });
      });

      // 监听shell输出
      this.sshClient.on('Shell', (event: any) => {
        if (event) {
          this.bufferShellOutput(event);
        }
      });

    } catch (error) {
      throw new Error(`Failed to start shell: ${error}`);
    }
  }

  // 缓冲shell输出处理
  private bufferShellOutput(data: string): void {
    this.outputBuffer += data;
    
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }
    
    // 如果收到换行符或可能的提示符，立即处理
    if (data.includes('\n') || this.promptPattern.test(data)) {
      this.flushOutputBuffer();
    } else {
      // 短延迟处理密码提示等不带换行的输出
      this.flushTimer = setTimeout(() => {
        this.flushOutputBuffer();
      }, 150);
    }
  }

  // 刷新输出缓冲区
  private flushOutputBuffer(): void {
    if (this.outputBuffer.trim()) {
      this.handleShellOutput(this.outputBuffer);
      this.outputBuffer = '';
    }
    
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  // 处理shell输出
  private handleShellOutput(data: string): void {
    // 清理ANSI转义序列
    let cleanData = data
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '')
      .replace(/\u001b\]0;[^\u0007]*\u0007/g, '')
      .replace(/\u001b\[\?[0-9]+[hl]/g, '')
      .replace(/\u001b\[[0-9;]*[JKm]/g, '');

    // 检测密码提示
    const isPasswordPrompt = cleanData.includes('密码：') || 
                            cleanData.includes('[sudo] password for') || 
                            cleanData.includes('Password:');
    
    // 处理密码提示
    if (isPasswordPrompt) {
      this.handlePasswordPrompt();
      
      // 显示密码提示
      const output: TerminalOutput = {
        id: this.generateUniqueId(),
        content: cleanData.trim(),
        timestamp: new Date(),
        type: 'system',
      };
      this.addToPersistentHistory(output);
      this.emitOutput(output);
      return;
    }

    // 检测并处理提示符
    const promptMatch = cleanData.match(this.promptPattern);
    if (promptMatch && cleanData.trim().endsWith(promptMatch[1])) {
      this.currentPrompt = promptMatch[1];
      this.waitingForPassword = false;
      
      // 发送提示符更新事件
      const promptOutput: TerminalOutput = {
        id: this.generateUniqueId(),
        content: `__PROMPT_UPDATE__${this.currentPrompt}`,
        timestamp: new Date(),
        type: 'system',
      };
      this.emitOutput(promptOutput);
      return;
    }

    // 隐藏密码输入
    if (this.waitingForPassword && 
        cleanData.trim() === this.currentConfig?.password) {
      const hiddenOutput: TerminalOutput = {
        id: this.generateUniqueId(),
        content: '',  // 密码完全不显示
        timestamp: new Date(),
        type: 'system',
      };
      this.addToPersistentHistory(hiddenOutput);
      this.emitOutput(hiddenOutput);
      return;
    }

    // 处理普通输出
    if (cleanData.trim()) {
      // 分行处理输出
      const lines = cleanData.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          const output: TerminalOutput = {
            id: this.generateUniqueId(),
            content: line,
            timestamp: new Date(),
            type: 'output',
          };
          this.addToPersistentHistory(output);
          this.emitOutput(output);
        }
      }
    }
  }

  // 处理密码提示
  private handlePasswordPrompt(): void {
    const now = Date.now();
    
    // 防止重复发送密码
    if (now - this.lastPasswordTime > 2000) {
      this.waitingForPassword = true;
      this.lastPasswordTime = now;
      
      // 自动发送密码
      if (this.currentConfig?.password) {
        setTimeout(() => {
          this.sshClient.writeToShell(`${this.currentConfig.password}\n`, (error: any) => {
            if (error) {
              console.error('Error sending password:', error);
            }
          });
        }, 100);
      }
    }
  }

  // 执行命令
  async executeCommand(command: string): Promise<void> {
    if (!this.currentStatus.isConnected || !this.sshClient) {
      throw new Error('Not connected to SSH server');
    }

    try {
      if (command.trim() === 'clear') {
        this.clearHistory();
        return;
      }

      if (this.isShellActive) {
        // 发送命令到shell，让shell自然显示
        await new Promise<void>((resolve, reject) => {
          this.sshClient.writeToShell(`${command}\n`, (error: any) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
        });
      } else {
        // 备用方案：使用普通execute
        await new Promise<void>((resolve, reject) => {
          this.sshClient.execute(command, (error: any, output: any) => {
            if (error) {
              const errorOutput: TerminalOutput = {
                id: this.generateUniqueId(),
                content: `Error: ${error}`,
                timestamp: new Date(),
                type: 'error',
              };
              this.addToPersistentHistory(errorOutput);
              this.emitOutput(errorOutput);
              reject(error);
              return;
            }

            if (output) {
              const resultOutput: TerminalOutput = {
                id: this.generateUniqueId(),
                content: output,
                timestamp: new Date(),
                type: 'output',
              };
              this.addToPersistentHistory(resultOutput);
              this.emitOutput(resultOutput);
            }
            resolve();
          });
        });
      }
    } catch (error) {
      const errorOutput: TerminalOutput = {
        id: this.generateUniqueId(),
        content: `Command failed: ${error}`,
        timestamp: new Date(),
        type: 'error',
      };

      this.addToPersistentHistory(errorOutput);
      this.emitOutput(errorOutput);
      throw error;
    }
  }

  // 断开连接
  async disconnect(): Promise<void> {
    try {
      // 清理定时器
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }
      
      if (this.flushTimer) {
        clearTimeout(this.flushTimer);
        this.flushTimer = null;
      }

      // 关闭SSH连接
      if (this.sshClient) {
        try {
          if (this.isShellActive) {
            this.sshClient.closeShell();
            this.isShellActive = false;
          }
        } catch (error) {
          // 忽略shell关闭错误
        }

        try {
          await this.sshClient.disconnect();
        } catch (error) {
          // 忽略断开连接错误
        }
        
        this.sshClient = null;
      }

      // 重置状态
      this.currentConfig = null;
      this.outputBuffer = '';
      this.currentPrompt = '';
      this.waitingForPassword = false;
      
      this.updateStatus({
        isConnecting: false,
        isConnected: false,
        error: undefined,
      });

    } catch (error) {
      // 强制重置
      this.sshClient = null;
      this.isShellActive = false;
      this.currentConfig = null;
      this.updateStatus({
        isConnecting: false,
        isConnected: false,
        error: undefined,
      });
    }
  }

  // 清空终端历史
  clearHistory(): void {
    this.persistentHistory = [];
    this.emitOutput({
      id: this.generateUniqueId(),
      content: '__CLEAR_HISTORY__',
      timestamp: new Date(),
      type: 'system',
    });
  }

  // 添加到持久化历史记录
  private addToPersistentHistory(output: TerminalOutput): void {
    this.persistentHistory.push(output);
    if (this.persistentHistory.length > 1000) {
      this.persistentHistory = this.persistentHistory.slice(-500);
    }
  }

  // 启动ping监控
  private startPingMonitoring(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(async () => {
      if (this.currentStatus.isConnected && this.sshClient) {
        try {
          const startTime = Date.now();
          
          await new Promise<void>((resolve, reject) => {
            this.sshClient.execute('echo', (error: any, output: any) => {
              if (error) {
                reject(error);
              } else {
                resolve();
              }
            });
          });
          
          const ping = Date.now() - startTime;
          this.updateStatus({ lastPing: Math.min(ping, 999) });
          
        } catch (error) {
          this.updateStatus({ 
            lastPing: 999,
            error: 'Connection may be unstable'
          });
        }
      }
    }, 5000);
  }

  // 监听输出
  onOutput(callback: (output: TerminalOutput) => void): () => void {
    this.outputCallbacks.push(callback);
    
    this.persistentHistory.forEach(output => {
      callback(output);
    });
    
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

  getStatus(): ConnectionStatus {
    return { ...this.currentStatus };
  }

  getCurrentPrompt(): string {
    return this.currentPrompt;
  }

  // 私有方法
  private updateStatus(status: Partial<ConnectionStatus>): void {
    this.currentStatus = { ...this.currentStatus, ...status };
    this.statusCallbacks.forEach(callback => callback(this.currentStatus));
  }

  private emitOutput(output: TerminalOutput): void {
    this.outputCallbacks.forEach(callback => callback(output));
  }
}

export default new SSHService();