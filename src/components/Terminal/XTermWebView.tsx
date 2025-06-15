// src/components/Terminal/XTermWebView.tsx
// 功能：使用WebView集成xterm.js，提供真正的终端体验
// 依赖：react-native-webview, xterm.js
// 被使用：Terminal组件

import React, { useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface XTermWebViewProps {
  onTerminalReady: () => void;
  onInput: (data: string) => void;
  isConnected: boolean;
}

const XTermWebView = React.forwardRef<any, XTermWebViewProps>(({
  onTerminalReady,
  onInput,
  isConnected,
}, ref) => {
  const webViewRef = useRef<WebView>(null);

  // 向终端写入数据
  const writeToTerminal = useCallback((data: string) => {
    if (webViewRef.current) {
      const jsCode = `
        if (window.terminal) {
          window.terminal.write(${JSON.stringify(data)});
        }
      `;
      webViewRef.current.postMessage(jsCode);
    }
  }, []);

  // 清空终端
  const clearTerminal = useCallback(() => {
    if (webViewRef.current) {
      const jsCode = `
        if (window.terminal) {
          window.terminal.clear();
        }
      `;
      webViewRef.current.postMessage(jsCode);
    }
  }, []);

  // 设置终端大小
  const resizeTerminal = useCallback((cols: number, rows: number) => {
    if (webViewRef.current) {
      const jsCode = `
        if (window.terminal && window.fitAddon) {
          window.terminal.resize(${cols}, ${rows});
          window.fitAddon.fit();
        }
      `;
      webViewRef.current.postMessage(jsCode);
    }
  }, []);

  // 处理WebView消息
  const handleMessage = useCallback((event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      
      switch (message.type) {
        case 'ready':
          console.log('Terminal ready');
          onTerminalReady();
          break;
        case 'input':
          console.log('Terminal input:', message.data);
          onInput(message.data);
          break;
        case 'resize':
          console.log('Terminal resized:', message.cols, 'x', message.rows);
          break;
        default:
          console.log('Unknown terminal message:', message);
      }
    } catch (error) {
      console.error('Failed to parse terminal message:', error);
    }
  }, [onTerminalReady, onInput]);

  // HTML内容，包含xterm.js
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>XTerm Terminal</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #000;
          font-family: 'Courier New', monospace;
          overflow: hidden;
        }
        #terminal {
          width: 100vw;
          height: 100vh;
        }
        .xterm {
          font-feature-settings: "liga" 0;
          position: relative;
          user-select: none;
          -ms-user-select: none;
          -webkit-user-select: none;
        }
        .xterm.focus,
        .xterm:focus {
          outline: none;
        }
        .xterm .xterm-helpers {
          position: absolute;
          top: 0;
          z-index: 5;
        }
        .xterm .xterm-helper-textarea {
          position: absolute;
          opacity: 0;
          left: -9999em;
          top: 0;
          width: 0;
          height: 0;
          z-index: -5;
          white-space: nowrap;
          overflow: hidden;
          resize: none;
        }
        .xterm .composition-view {
          background: #000;
          color: #FFF;
          display: none;
          position: absolute;
          white-space: nowrap;
          z-index: 1;
        }
        .xterm .composition-view.active {
          display: block;
        }
        .xterm .xterm-viewport {
          background-color: #000;
          overflow-y: scroll;
          cursor: default;
          position: absolute;
          right: 0;
          left: 0;
          top: 0;
          bottom: 0;
        }
        .xterm .xterm-screen {
          position: relative;
        }
        .xterm .xterm-screen canvas {
          position: absolute;
          left: 0;
          top: 0;
        }
        .xterm .xterm-scroll-area {
          visibility: hidden;
        }
        .xterm-char-measure-element {
          display: inline-block;
          visibility: hidden;
          position: absolute;
          top: 0;
          left: -9999em;
          line-height: normal;
        }
        .xterm.enable-mouse-events {
          cursor: default;
        }
        .xterm.xterm-cursor-pointer {
          cursor: pointer;
        }
        .xterm.column-select.focus {
          cursor: crosshair;
        }
        .xterm .xterm-accessibility,
        .xterm .xterm-message {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          right: 0;
          z-index: 10;
          color: transparent;
        }
        .xterm .live-region {
          position: absolute;
          left: -9999px;
          width: 1px;
          height: 1px;
          overflow: hidden;
        }
        .xterm-dim {
          opacity: 0.5;
        }
        .xterm-underline {
          text-decoration: underline;
        }
        .xterm-strikethrough {
          text-decoration: line-through;
        }
        .xterm-screen .xterm-decoration-container .xterm-decoration {
          z-index: 6;
          position: absolute;
        }
      </style>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/xterm/5.3.0/xterm.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/xterm/5.3.0/addons/fit/fit.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/xterm/5.3.0/addons/web-links/web-links.min.js"></script>
    </head>
    <body>
      <div id="terminal"></div>
      <script>
        // 初始化xterm.js
        const terminal = new Terminal({
          cursorBlink: true,
          cursorStyle: 'block',
          fontFamily: 'Courier New, courier, monospace',
          fontSize: 14,
          fontWeight: 'normal',
          lineHeight: 1.2,
          rows: 24,
          cols: 80,
          theme: {
            background: '#0c0c0c',
            foreground: '#ffffff',
            cursor: '#ffffff',
            cursorAccent: '#000000',
            selection: '#ffffff40',
            black: '#000000',
            red: '#e54b4b',
            green: '#9ece58',
            yellow: '#faed70',
            blue: '#396fe2',
            magenta: '#bb68a9',
            cyan: '#2ddadd',
            white: '#d0d0d0',
            brightBlack: '#686868',
            brightRed: '#ff5370',
            brightGreen: '#c3e88d',
            brightYellow: '#ffcb6b',
            brightBlue: '#82aaff',
            brightMagenta: '#c792ea',
            brightCyan: '#89ddff',
            brightWhite: '#ffffff'
          },
          allowTransparency: false,
          bellSound: undefined,
          bellStyle: 'none',
          convertEol: false,
          disableStdin: false,
          fastScrollModifier: 'alt',
          fastScrollSensitivity: 5,
          macOptionIsMeta: false,
          macOptionClickForcesSelection: false,
          minimumContrastRatio: 1,
          screenReaderMode: false,
          scrollback: 1000,
          scrollSensitivity: 1,
          tabStopWidth: 8,
          windowsMode: false
        });

        // 加载插件
        const fitAddon = new FitAddon.FitAddon();
        const webLinksAddon = new WebLinksAddon.WebLinksAddon();
        
        terminal.loadAddon(fitAddon);
        terminal.loadAddon(webLinksAddon);

        // 打开终端
        terminal.open(document.getElementById('terminal'));
        
        // 适配大小
        fitAddon.fit();

        // 全局暴露
        window.terminal = terminal;
        window.fitAddon = fitAddon;

        // 监听输入
        terminal.onData((data) => {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'input',
            data: data
          }));
        });

        // 监听大小变化
        terminal.onResize((size) => {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'resize',
            cols: size.cols,
            rows: size.rows
          }));
        });

        // 处理React Native消息
        document.addEventListener('message', function(event) {
          try {
            eval(event.data);
          } catch (error) {
            console.error('Error executing command:', error);
          }
        });

        // 通知准备就绪
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'ready'
        }));

        // 显示欢迎信息
        terminal.writeln('\\x1b[1;32m█▄█ ▀█▀ █▀▀ █▀█ █▀▄▀█   ▀█▀ █▀▀ █▀█ █▀▄▀█ █ █▄░█ █▀█ █░░\\x1b[0m');
        terminal.writeln('\\x1b[1;32m░█░ ░█░ █▄▄ █▀▄ █░▀░█   ░█░ █▄▄ █▀▄ █░▀░█ █ █░▀█ █▄█ █▄▄\\x1b[0m');
        terminal.writeln('');
        terminal.writeln('\\x1b[33mReady for SSH connection...\\x1b[0m');
        terminal.writeln('');

        // 窗口大小变化时重新适配
        window.addEventListener('resize', () => {
          fitAddon.fit();
        });
      </script>
    </body>
    </html>
  `;

  // 暴露方法给父组件
  React.useImperativeHandle(ref, () => ({
    writeToTerminal,
    clearTerminal,
    resizeTerminal,
  }));

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        scalesPageToFit={false}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        bounces={false}
        keyboardDisplayRequiresUserAction={false}
        hideKeyboardAccessoryView={true}
        allowsBackForwardNavigationGestures={false}
      />
    </View>
  );
});

// 设置display name用于调试
XTermWebView.displayName = 'XTermWebView';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
});

export default XTermWebView;