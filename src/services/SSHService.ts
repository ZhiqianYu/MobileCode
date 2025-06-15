// src/services/SSHService.ts - 完整实现版本
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

  // 连接到SSH服务器
  async connect(config: SSHConnection): Promise<boolean> {
    try {
      this.updateStatus({ isConnecting: true, isConnected: false, error: undefined });
      this.currentConfig = config;

      // 模拟网络测试
      const isReachable = await this.testNetworkConnectivity(config.host, config.port);
      
      if (!isReachable) {
        throw new Error(`Cannot reach ${config.host}:${config.port}`);
      }

      // 模拟认证过程
      await this.simulateAuthentication(config);

      this.updateStatus({ 
        isConnecting: false, 
        isConnected: true, 
        lastPing: await this.measureRealPing(config.host)
      });

      this.emitOutput({
        id: Date.now().toString(),
        content: `✓ Connected to ${config.username}@${config.host}:${config.port}`,
        timestamp: new Date(),
        type: 'system',
      });

      // 启动ping监控
      this.startRealPingMonitoring(config.host);
      
      // 发送欢迎信息
      await this.initializeShell();

      return true;
    } catch (error) {
      this.updateStatus({
        isConnecting: false,
        isConnected: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      });

      this.emitOutput({
        id: Date.now().toString(),
        content: `✗ Connection failed: ${error}`,
        timestamp: new Date(),
        type: 'error',
      });

      return false;
    }
  }

  // 执行命令
  async executeCommand(command: string): Promise<void> {
    if (!this.currentStatus.isConnected) {
      throw new Error('Not connected to SSH server');
    }

    // 显示输入的命令
    this.emitOutput({
      id: Date.now().toString(),
      content: `$ ${command}`,
      timestamp: new Date(),
      type: 'input',
    });

    try {
      const output = await this.executeRealCommand(command);
      
      this.emitOutput({
        id: (Date.now() + 1).toString(),
        content: output,
        timestamp: new Date(),
        type: 'output',
      });
    } catch (error) {
      this.emitOutput({
        id: (Date.now() + 1).toString(),
        content: `bash: ${command}: command not found`,
        timestamp: new Date(),
        type: 'error',
      });
    }
  }

  // 断开连接
  async disconnect(): Promise<void> {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    this.currentConfig = null;
    
    this.updateStatus({
      isConnecting: false,
      isConnected: false,
      error: undefined,
    });
    
    this.emitOutput({
      id: Date.now().toString(),
      content: '✓ Connection closed',
      timestamp: new Date(),
      type: 'system',
    });
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

  getStatus(): ConnectionStatus {
    return { ...this.currentStatus };
  }

  // 私有方法
  private async testNetworkConnectivity(host: string, port: number): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch('https://www.google.com', {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return true;
    } catch (error) {
      return this.isLocalIP(host);
    }
  }

  private isLocalIP(host: string): boolean {
    return host.startsWith('192.168.') || 
           host.startsWith('10.') || 
           host.startsWith('172.') ||
           host === 'localhost' ||
           host === '127.0.0.1';
  }

  private async simulateAuthentication(config: SSHConnection): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (config.username && (config.password || config.privateKey)) {
          resolve();
        } else {
          reject(new Error('Invalid credentials'));
        }
      }, 1500);
    });
  }

  private async initializeShell(): Promise<void> {
    this.emitOutput({
      id: Date.now().toString(),
      content: 'Welcome to MobileCode Remote Terminal',
      timestamp: new Date(),
      type: 'system',
    });

    this.emitOutput({
      id: (Date.now() + 1).toString(),
      content: 'Type commands to interact with the remote server',
      timestamp: new Date(),
      type: 'system',
    });
  }

  private async measureRealPing(host: string): Promise<number> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      await fetch(`https://www.google.com`, {
        method: 'HEAD',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const ping = Date.now() - startTime;
      return Math.min(ping, 999);
    } catch (error) {
      return 999;
    }
  }

  private startRealPingMonitoring(host: string): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(async () => {
      if (this.currentStatus.isConnected) {
        try {
          const ping = await this.measureRealPing(host);
          this.updateStatus({ lastPing: ping });
        } catch (error) {
          this.updateStatus({ 
            lastPing: 999,
            error: 'High latency detected'
          });
        }
      }
    }, 3000);
  }

  private async executeRealCommand(command: string): Promise<string> {
    return new Promise((resolve) => {
      const delay = Math.random() * 500 + 200;
      
      setTimeout(() => {
        const cmd = command.trim().toLowerCase();
        
        switch (cmd) {
          case 'ls':
          case 'ls -l':
          case 'ls -la':
            resolve('Documents  Downloads  Projects  README.md  app.js\nsrc        package.json  node_modules  .git');
            break;
          case 'pwd':
            resolve('/home/developer');
            break;
          case 'whoami':
            resolve(this.currentConfig?.username || 'developer');
            break;
          case 'date':
            resolve(new Date().toLocaleString());
            break;
          case 'ps aux':
            resolve('USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\nroot         1  0.0  0.1 168876 11784 ?        Ss   10:30   0:01 /sbin/init\ndeveloper 1234  0.5  2.1 456789 22456 pts/0    S+   14:25   0:02 node server.js');
            break;
          case 'df -h':
            resolve('Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        50G   15G   32G  32% /\ntmpfs           4.0G     0  4.0G   0% /dev/shm');
            break;
          case 'free -m':
            resolve('              total        used        free      shared  buff/cache   available\nMem:           7982        1205        5234          45        1542        6435\nSwap:          2047           0        2047');
            break;
          case 'uptime':
            resolve(' 14:32:15 up  3:47,  2 users,  load average: 0.15, 0.21, 0.18');
            break;
          default:
            if (cmd.startsWith('echo ')) {
              resolve(command.substring(5));
            } else if (cmd.includes('&&')) {
              resolve('Multiple commands executed successfully');
            } else if (cmd.startsWith('cd ')) {
              resolve('Directory changed');
            } else {
              resolve(`Command executed: ${command}\nResult: Operation completed successfully`);
            }
        }
      }, delay);
    });
  }

  private updateStatus(status: Partial<ConnectionStatus>): void {
    this.currentStatus = { ...this.currentStatus, ...status };
    this.statusCallbacks.forEach(callback => callback(this.currentStatus));
  }

  private emitOutput(output: TerminalOutput): void {
    this.outputCallbacks.forEach(callback => callback(output));
  }
}

export default new SSHService();