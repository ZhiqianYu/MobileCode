// src/services/EnhancedMockSSHService.ts
// 功能：增强版模拟SSH服务，提供更真实的终端体验来测试XTerm集成
// 临时文件：等WebSocket代理实现完成后替换
// 依赖：SSHConnection类型, TerminalOutput类型
// 被使用：useSSH.ts

import { SSHConnection, TerminalOutput, ConnectionStatus } from '../types/ssh';

class EnhancedMockSSHService {
  private isConnected: boolean = false;
  private currentConfig: SSHConnection | null = null;
  private outputCallbacks: ((output: TerminalOutput) => void)[] = [];
  private statusCallbacks: ((status: ConnectionStatus) => void)[] = [];
  private currentStatus: ConnectionStatus = {
    isConnecting: false,
    isConnected: false,
  };
  private idCounter: number = 0;
  private currentDirectory: string = '/home';
  private username: string = 'user';

  // 模拟文件系统
  private fileSystem: { [key: string]: any } = {
    '/home': {
      type: 'directory',
      files: ['Documents', 'Downloads', 'Pictures', 'Desktop', 'test.txt']
    },
    '/home/Documents': {
      type: 'directory', 
      files: ['project1', 'notes.txt', 'README.md']
    },
    '/home/Downloads': {
      type: 'directory',
      files: ['setup.sh', 'data.csv', 'image.png']
    },
    '/etc': {
      type: 'directory',
      files: ['hosts', 'passwd', 'hostname']
    }
  };

  // 生成唯一ID
  private generateId(): string {
    return `enhanced-mock-${Date.now()}-${++this.idCounter}`;
  }

  // 模拟连接
  async connect(config: SSHConnection): Promise<boolean> {
    console.log('EnhancedMockSSHService connecting to:', config.host);
    
    // 更新连接状态
    this.updateStatus({ isConnecting: true, isConnected: false, error: undefined });
    
    // 模拟连接延迟
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 模拟连接成功率 (95% 成功)
    const success = Math.random() > 0.05;
    
    if (success) {
      this.isConnected = true;
      this.currentConfig = config;
      this.username = config.username;
      this.currentDirectory = `/home/${this.username}`;
      
      this.updateStatus({
        isConnecting: false,
        isConnected: true,
        error: undefined,
        lastPing: Math.floor(Math.random() * 50) + 20, // 20-70ms
      });

      // 模拟SSH登录过程
      setTimeout(() => {
        this.emitRawOutput('Last login: ' + new Date().toLocaleString() + ' from 192.168.1.100\r\n');
      }, 100);

      setTimeout(() => {
        this.emitRawOutput(`Welcome to Ubuntu 22.04 LTS (GNU/Linux 5.15.0-generic x86_64)\r\n\r\n`);
      }, 300);

      setTimeout(() => {
        this.emitRawOutput(' * Documentation:  https://help.ubuntu.com\r\n');
        this.emitRawOutput(' * Management:     https://landscape.canonical.com\r\n');
        this.emitRawOutput(' * Support:        https://ubuntu.com/advantage\r\n\r\n');
      }, 500);

      setTimeout(() => {
        this.showPrompt();
      }, 800);
      
      console.log('EnhancedMockSSHService connected successfully');
    } else {
      this.updateStatus({
        isConnecting: false,
        isConnected: false,
        error: 'Authentication failed',
      });
      console.log('EnhancedMockSSHService connection failed');
    }
    
    return success;
  }

  // 断开连接
  async disconnect(): Promise<void> {
    console.log('EnhancedMockSSHService disconnecting');
    this.isConnected = false;
    this.currentConfig = null;
    this.currentDirectory = '/home';
    this.username = 'user';
    
    this.updateStatus({
      isConnecting: false,
      isConnected: false,
      error: undefined,
    });
  }

  // 写入数据到SSH (处理用户输入)
  writeToSSH(data: string): void {
    if (!this.isConnected) {
      console.warn('Cannot write to SSH: not connected');
      return;
    }

    console.log('User input:', JSON.stringify(data));

    // 处理特殊按键
    if (data === '\r' || data === '\n') {
      // 回车键 - 执行当前命令
      this.executeCurrentCommand();
      return;
    }

    if (data === '\u007f' || data === '\b') {
      // 退格键
      this.emitRawOutput('\b \b');
      return;
    }

    if (data === '\u0003') {
      // Ctrl+C
      this.emitRawOutput('^C\r\n');
      this.showPrompt();
      return;
    }

    if (data === '\u0004') {
      // Ctrl+D (EOF)
      this.emitRawOutput('logout\r\n');
      this.disconnect();
      return;
    }

    // 处理方向键等ANSI序列
    if (data.startsWith('\u001b[')) {
      // 忽略方向键等，或者实现历史命令功能
      return;
    }

    // 回显普通字符
    this.emitRawOutput(data);
  }

  // 当前正在输入的命令
  private currentCommand: string = '';

  // 执行当前命令
  private executeCurrentCommand(): void {
    const command = this.currentCommand.trim();
    this.currentCommand = '';

    this.emitRawOutput('\r\n');

    if (command) {
      this.executeCommand(command);
    } else {
      this.showPrompt();
    }
  }

  // 执行命令
  private async executeCommand(command: string): Promise<void> {
    console.log('Executing command:', command);

    // 模拟命令执行延迟
    await new Promise(resolve => setTimeout(resolve, 100));

    const args = command.split(' ');
    const cmd = args[0];

    switch (cmd) {
      case 'ls':
        this.handleLs(args);
        break;
      case 'pwd':
        this.emitRawOutput(this.currentDirectory + '\r\n');
        break;
      case 'whoami':
        this.emitRawOutput(this.username + '\r\n');
        break;
      case 'date':
        this.emitRawOutput(new Date().toString() + '\r\n');
        break;
      case 'uptime':
        this.emitRawOutput(' 15:42:33 up 5 days,  2:18,  1 user,  load average: 0.15, 0.20, 0.18\r\n');
        break;
      case 'uname':
        if (args.includes('-a')) {
          this.emitRawOutput('Linux ubuntu 5.15.0-generic #72-Ubuntu SMP x86_64 GNU/Linux\r\n');
        } else {
          this.emitRawOutput('Linux\r\n');
        }
        break;
      case 'ps':
        this.handlePs(args);
        break;
      case 'cd':
        this.handleCd(args);
        break;
      case 'cat':
        this.handleCat(args);
        break;
      case 'echo':
        this.emitRawOutput(args.slice(1).join(' ') + '\r\n');
        break;
      case 'clear':
        this.emitRawOutput('\x1b[2J\x1b[H');
        break;
      case 'exit':
      case 'logout':
        this.emitRawOutput('logout\r\n');
        this.disconnect();
        return;
      case 'help':
        this.showHelp();
        break;
      default:
        this.emitRawOutput(`bash: ${cmd}: command not found\r\n`);
    }

    this.showPrompt();
  }

  // 处理ls命令
  private handleLs(args: string[]): void {
    const showHidden = args.includes('-a');
    const longFormat = args.includes('-l');
    
    let path = this.currentDirectory;
    const pathArg = args.find(arg => !arg.startsWith('-') && arg !== 'ls');
    if (pathArg) {
      if (pathArg.startsWith('/')) {
        path = pathArg;
      } else {
        path = this.currentDirectory === '/' ? `/${pathArg}` : `${this.currentDirectory}/${pathArg}`;
      }
    }

    const dirInfo = this.fileSystem[path];
    if (!dirInfo) {
      this.emitRawOutput(`ls: cannot access '${path}': No such file or directory\r\n`);
      return;
    }

    let files = [...dirInfo.files];
    if (showHidden) {
      files = ['.', '..', ...files];
    }

    if (longFormat) {
      files.forEach(file => {
        const isDir = file === '.' || file === '..' || this.fileSystem[`${path}/${file}`]?.type === 'directory';
        const perms = isDir ? 'drwxr-xr-x' : '-rw-r--r--';
        const size = isDir ? '4096' : Math.floor(Math.random() * 10000).toString();
        const date = 'Jun 15 15:42';
        this.emitRawOutput(`${perms} 1 ${this.username} ${this.username} ${size.padStart(8)} ${date} ${file}\r\n`);
      });
    } else {
      // 简单格式，每行4个文件
      for (let i = 0; i < files.length; i += 4) {
        const line = files.slice(i, i + 4).map(f => f.padEnd(15)).join('').trimEnd();
        this.emitRawOutput(line + '\r\n');
      }
    }
  }

  // 处理ps命令
  private handlePs(args: string[]): void {
    this.emitRawOutput('  PID TTY          TIME CMD\r\n');
    this.emitRawOutput(' 1234 pts/0    00:00:00 bash\r\n');
    this.emitRawOutput(' 5678 pts/0    00:00:00 ps\r\n');
  }

  // 处理cd命令
  private handleCd(args: string[]): void {
    if (args.length < 2) {
      this.currentDirectory = `/home/${this.username}`;
      return;
    }

    let newPath = args[1];
    if (newPath === '..') {
      const parts = this.currentDirectory.split('/').filter(p => p);
      parts.pop();
      this.currentDirectory = '/' + parts.join('/');
      if (this.currentDirectory === '/') this.currentDirectory = '';
      this.currentDirectory = this.currentDirectory || '/';
    } else if (newPath.startsWith('/')) {
      if (this.fileSystem[newPath]) {
        this.currentDirectory = newPath;
      } else {
        this.emitRawOutput(`cd: ${newPath}: No such file or directory\r\n`);
      }
    } else {
      const fullPath = this.currentDirectory === '/' ? `/${newPath}` : `${this.currentDirectory}/${newPath}`;
      if (this.fileSystem[fullPath]) {
        this.currentDirectory = fullPath;
      } else {
        this.emitRawOutput(`cd: ${newPath}: No such file or directory\r\n`);
      }
    }
  }

  // 处理cat命令
  private handleCat(args: string[]): void {
    if (args.length < 2) {
      this.emitRawOutput('cat: missing file operand\r\n');
      return;
    }

    const filename = args[1];
    // 模拟文件内容
    switch (filename) {
      case 'test.txt':
        this.emitRawOutput('This is a test file.\r\nHello from SSH terminal!\r\n');
        break;
      case 'README.md':
        this.emitRawOutput('# Project README\r\n\r\nThis is a sample project.\r\n');
        break;
      default:
        this.emitRawOutput(`cat: ${filename}: No such file or directory\r\n`);
    }
  }

  // 显示帮助
  private showHelp(): void {
    this.emitRawOutput('Available commands:\r\n');
    this.emitRawOutput('  ls [-l] [-a] [path]  - list directory contents\r\n');
    this.emitRawOutput('  cd [path]            - change directory\r\n');
    this.emitRawOutput('  pwd                  - print working directory\r\n');
    this.emitRawOutput('  cat [file]           - display file contents\r\n');
    this.emitRawOutput('  ps                   - show processes\r\n');
    this.emitRawOutput('  whoami               - current user\r\n');
    this.emitRawOutput('  date                 - current date\r\n');
    this.emitRawOutput('  uptime               - system uptime\r\n');
    this.emitRawOutput('  uname [-a]           - system info\r\n');
    this.emitRawOutput('  echo [text]          - print text\r\n');
    this.emitRawOutput('  clear                - clear screen\r\n');
    this.emitRawOutput('  exit/logout          - disconnect\r\n');
    this.emitRawOutput('  help                 - show this help\r\n');
  }

  // 显示命令提示符
  private showPrompt(): void {
    const prompt = `\x1b[32m${this.username}@${this.currentConfig?.host || 'localhost'}\x1b[0m:\x1b[34m${this.currentDirectory}\x1b[0m$ `;
    this.emitRawOutput(prompt);
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

  private emitRawOutput(data: string): void {
    const output: TerminalOutput = {
      id: this.generateId(),
      content: data,
      timestamp: new Date(),
      type: 'output',
    };
    this.outputCallbacks.forEach(callback => callback(output));
  }
}

// 导出单例
export default new EnhancedMockSSHService();