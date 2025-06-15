export interface SSHConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  isConnected: boolean;
  lastUsed: Date;
  createdAt: Date;
}

export interface TerminalOutput {
  id: string;
  content: string;
  timestamp: Date;
  type: 'input' | 'output' | 'error' | 'system';
}

export interface ConnectionStatus {
  isConnecting: boolean;
  isConnected: boolean;
  error?: string;
  lastPing?: number;
}