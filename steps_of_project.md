# 1. 创建React Native项目
npx @react-native-community/cli@latest init MobileCode

# 2. 进入项目目录
cd MobileCode

# 3. 创建源码目录结构
mkdir -p src/{components,screens,services,hooks,types,utils}
mkdir -p src/components/{Layout,FileExplorer,Terminal,Editor,Settings,Sidebar}

# 基础依赖
npm install @react-native-async-storage/async-storage
npm install react-native-vector-icons
npm install react-native-gesture-handler
npm install react-native-safe-area-context
npm install react-native-screens

# SSH相关（先用网络库模拟）
npm install react-native-netinfo

# 开发依赖
npm install --save-dev @types/react @types/react-native

# 1. 安装Android工具
sudo apt update
sudo apt install openjdk-11-jdk android-tools-adb

# 创建必要的目录结构
mkdir -p ~/Android/Sdk/platform-tools

# 将系统的 adb 链接到 SDK 目录
ln -s /usr/bin/adb ~/Android/Sdk/platform-tools/adb

# 验证链接是否成功
ls -la ~/Android/Sdk/platform-tools/

# 2. 设置环境变量（添加到 ~/.bashrc）
echo 'export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64' >> ~/.bashrc
echo 'export ANDROID_HOME=$HOME/Android/Sdk' >> ~/.bashrc
echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools' >> ~/.bashrc
source ~/.bashrc

# 3. 连接手机准备测试
adb devices

# 运行应用
npx react-native run-android

# 如果Metro没有自动启动
npx react-native start