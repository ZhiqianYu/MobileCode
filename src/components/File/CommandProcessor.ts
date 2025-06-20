// src/components/File/CommandProcessor.ts
// 命令处理器 - 解析和执行Linux风格的文件管理命令
// 职责：命令解析、参数验证、操作分发、结果反馈
// 依赖：FileDataService、NavigationManager、SelectionManager
// 被使用：SimpleFileManager

import { Alert } from 'react-native';
import { FileDataService } from './FileDataService';
import { NavigationManager } from './NavigationManager';
import { SelectionManager } from './SelectionManager';
import { FileItem } from './FileTypes';

interface CommandContext {
  dataService: FileDataService;
  navigationManager: NavigationManager;
  selectionManager: SelectionManager;
  currentFiles: FileItem[];
  onResult?: (result: CommandResult) => void;
}

interface CommandResult {
  success: boolean;
  message: string;
  details?: string;
}

export class CommandProcessor {
  // ================================
  // 核心命令执行
  // ================================

  static async execute(command: string, context: CommandContext): Promise<CommandResult> {
    const trimmedCommand = command.trim();
    if (!trimmedCommand) {
      return { success: false, message: '空命令' };
    }

    const parts = trimmedCommand.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    try {
      switch (cmd) {
        case 'ls':
          return this.handleLs(args, context);
        case 'cd':
          return this.handleCd(args, context);
        case 'pwd':
          return this.handlePwd(context);
        case 'mkdir':
          return this.handleMkdir(args, context);
        case 'touch':
          return this.handleTouch(args, context);
        case 'rm':
          return this.handleRm(args, context);
        case 'cp':
          return this.handleCp(args, context);
        case 'mv':
          return this.handleMv(args, context);
        case 'find':
          return this.handleFind(args, context);
        case 'clear':
          return this.handleClear(context);
        default:
          return { 
            success: false, 
            message: `未知命令: ${cmd}`,
            details: '可用命令: ls, cd, pwd, mkdir, touch, rm, cp, mv, find, clear'
          };
      }
    } catch (error) {
      return {
        success: false,
        message: '命令执行失败',
        details: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  // ================================
  // 具体命令处理
  // ================================

  private static handleLs(args: string[], context: CommandContext): CommandResult {
    const { currentFiles } = context;
    const fileCount = currentFiles.filter(f => f.type === 'file').length;
    const dirCount = currentFiles.filter(f => f.type === 'directory').length;
    
    return {
      success: true,
      message: '目录列表已刷新',
      details: `${fileCount} 个文件, ${dirCount} 个文件夹`
    };
  }

  private static handleCd(args: string[], context: CommandContext): CommandResult {
    const { navigationManager, currentFiles } = context;
    
    if (args.length === 0) {
      navigationManager.goToRoot();
      return {
        success: true,
        message: '返回根目录'
      };
    }

    const targetPath = args.join(' ');
    
    if (targetPath === '..' || targetPath === '../') {
      const result = navigationManager.goBack();
      return {
        success: result.shouldRefresh,
        message: result.shouldRefresh ? '返回上级目录' : '已在根目录'
      };
    }

    const matchingDir = currentFiles.find(file => 
      file.name === targetPath && file.type === 'directory'
    );

    if (matchingDir) {
      navigationManager.enterFolder(matchingDir.uri || matchingDir.path || '', matchingDir.name);
      return {
        success: true,
        message: `进入目录: ${targetPath}`
      };
    }

    return {
      success: false,
      message: `目录不存在: ${targetPath}`
    };
  }

  private static handlePwd(context: CommandContext): CommandResult {
    const { navigationManager } = context;
    const currentPath = navigationManager.getCurrentPath();
    
    return {
      success: true,
      message: '当前路径',
      details: currentPath || '/root'
    };
  }

  private static async handleMkdir(args: string[], context: CommandContext): Promise<CommandResult> {
    if (args.length === 0) {
      return {
        success: false,
        message: 'mkdir: 缺少目录名参数'
      };
    }

    const { dataService, navigationManager } = context;
    const dirName = args.join(' ');
    const currentPath = navigationManager.getCurrentPath();

    try {
      if (currentPath) {
        await dataService.createDirectory(currentPath, dirName);
        return {
          success: true,
          message: '目录创建成功',
          details: `已创建目录: ${dirName}`
        };
      } else {
        throw new Error('无法在根目录创建文件夹');
      }
    } catch (error) {
      return {
        success: false,
        message: '创建目录失败',
        details: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  private static async handleTouch(args: string[], context: CommandContext): Promise<CommandResult> {
    if (args.length === 0) {
      return {
        success: false,
        message: 'touch: 缺少文件名参数'
      };
    }

    const { dataService, navigationManager } = context;
    const fileName = args.join(' ');
    const currentPath = navigationManager.getCurrentPath();

    try {
      if (currentPath) {
        await dataService.createFile(currentPath, fileName, '');
        return {
          success: true,
          message: '文件创建成功',
          details: `已创建文件: ${fileName}`
        };
      } else {
        throw new Error('无法在根目录创建文件');
      }
    } catch (error) {
      return {
        success: false,
        message: '创建文件失败',
        details: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  private static async handleRm(args: string[], context: CommandContext): Promise<CommandResult> {
    const { selectionManager, currentFiles } = context;
    
    if (args.length === 0) {
      const selectedFiles = selectionManager.getSelectedFiles(currentFiles);
      if (selectedFiles.length === 0) {
        return {
          success: false,
          message: 'rm: 请指定要删除的文件或先选择文件'
        };
      }
      
      return this.confirmAndDeleteFiles(selectedFiles, context);
    }

    const fileName = args.join(' ');
    const targetFile = currentFiles.find(file => file.name === fileName);
    
    if (!targetFile) {
      return {
        success: false,
        message: `rm: 找不到文件 "${fileName}"`
      };
    }

    return this.confirmAndDeleteFiles([targetFile], context);
  }

  private static handleCp(args: string[], context: CommandContext): CommandResult {
    const { selectionManager, currentFiles } = context;
    const selectedFiles = selectionManager.getSelectedFiles(currentFiles);
    
    if (selectedFiles.length === 0) {
      return {
        success: false,
        message: 'cp: 请先选择要复制的文件'
      };
    }

    return {
      success: true,
      message: `已复制 ${selectedFiles.length} 个文件到剪贴板`
    };
  }

  private static handleMv(args: string[], context: CommandContext): CommandResult {
    const { selectionManager, currentFiles } = context;
    const selectedFiles = selectionManager.getSelectedFiles(currentFiles);
    
    if (selectedFiles.length === 0) {
      return {
        success: false,
        message: 'mv: 请先选择要移动的文件'
      };
    }

    return {
      success: true,
      message: `已剪切 ${selectedFiles.length} 个文件到剪贴板`
    };
  }

  private static handleFind(args: string[], context: CommandContext): CommandResult {
    if (args.length === 0) {
      return {
        success: false,
        message: 'find: 请输入搜索关键词'
      };
    }

    const { dataService, currentFiles } = context;
    const searchQuery = args.join(' ');
    const results = dataService.searchFiles(currentFiles, searchQuery);
    
    return {
      success: true,
      message: `搜索 "${searchQuery}"`,
      details: `找到 ${results.length} 个匹配项`
    };
  }

  private static handleClear(context: CommandContext): CommandResult {
    return {
      success: true,
      message: '清屏命令',
      details: '清除操作结果提示'
    };
  }

  // ================================
  // 辅助方法
  // ================================

  private static async confirmAndDeleteFiles(files: FileItem[], context: CommandContext): Promise<CommandResult> {
    return new Promise((resolve) => {
      Alert.alert(
        '删除确认',
        `确定要删除这 ${files.length} 个项目吗？此操作无法撤销。`,
        [
          { 
            text: '取消', 
            style: 'cancel',
            onPress: () => resolve({
              success: false,
              message: '删除操作已取消'
            })
          },
          { 
            text: '删除', 
            style: 'destructive', 
            onPress: async () => {
              try {
                const { dataService } = context;
                let successCount = 0;
                
                for (const file of files) {
                  if (file.uri) {
                    await dataService.deleteFile(file.uri);
                    successCount++;
                  }
                }
                
                resolve({
                  success: true,
                  message: `已删除 ${successCount} 个项目`,
                  details: files.map(f => f.name).join(', ')
                });
              } catch (error) {
                resolve({
                  success: false,
                  message: '删除失败',
                  details: error instanceof Error ? error.message : '未知错误'
                });
              }
            }
          },
        ]
      );
    });
  }
}