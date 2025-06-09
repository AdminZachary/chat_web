
# 即时通讯 Web 应用 (Real-time Web Chat Application)

这是一个基于 Flask-SocketIO 和现代前端技术构建的实时 Web 聊天应用。支持用户注册、好友系统、持久化聊天记录、文件与表情发送，并为桌面和移动端提供响应式布局及暗黑模式。

本项目从简单构想逐步迭代，最终成为稳定、功能丰富的全栈应用。

---

## ✨ 主要功能 (Features)

- **用户系统**：支持注册与登录
- **持久化存储**：SQLite 数据库保存用户、好友关系和聊天记录
- **好友系统**：
    - 用户名精确查找
    - 发送/接收/接受/拒绝好友请求
- **实时通讯**：
    - 基于 WebSocket 的私聊
    - 实时显示好友在线/离线状态
- **丰富的消息类型**：
    - 文本、Emoji 表情
    - 图片、文档等文件发送与下载
- **优秀的用户体验**：
    - 浅色/暗黑模式一键切换，自动记忆
    - 响应式布局，适配桌面与移动端
    - 移动端输入框防遮挡
    - 关键操作实时通知（如好友请求）

---

## 🛠️ 技术栈 (Technology Stack)

- **后端 (Backend)**：
    - Python 3
    - Flask
    - Flask-SocketIO
    - Eventlet
    - Werkzeug
    - SQLite

- **前端 (Frontend)**：
    - HTML5
    - CSS3（CSS 变量与媒体查询）
    - JavaScript (ES6+)

---

## 📁 项目结构 (Project Structure)

```
/chat_project
│
├── app.py             # 主应用后端逻辑 (Flask & Socket.IO)
├── database.py        # 数据库初始化与操作
│
├── /templates
│   ├── auth.html      # 登录与注册页面
│   └── chat.html      # 主聊天界面
│
├── /static
│   ├── /css
│   │   └── style.css  # 所有CSS样式
│   └── /js
│       ├── auth.js    # 登录/注册脚本
│       └── main.js    # 聊天主页面脚本
│
├── chat.db            # (首次运行自动创建)
├── /uploads           # (首次运行自动创建，存放上传文件)
└── README.md          # (本文档)
```

---

## 🚀 部署指南 (Deployment Guide)

应用可部署于局域网或云服务器。

### 1. 本地或局域网部署

适合开发、测试或内部通讯。

1. **环境准备**：需安装 Python 3 和 pip
2. **获取项目**：下载并解压项目文件
3. **创建虚拟环境（推荐）**：
        ```bash
        python -m venv venv
        # Windows:
        venv\Scripts\activate
        # macOS/Linux:
        source venv/bin/activate
        ```
4. **安装依赖**：
        ```bash
        pip install flask-socketio eventlet werkzeug
        ```
5. **运行应用**：
        ```bash
        python app.py
        ```
6. **访问应用**：
        - 本机：`http://127.0.0.1:5000/auth`
        - 局域网：终端输出的局域网地址（如 `http://192.168.x.x:5000/auth`）

> **注意**：如局域网访问失败，请检查防火墙设置，允许 5000 端口。

---

### 2. 部署到 Azure App Service

利用 Azure PaaS，无需手动管理服务器。

#### 步骤一：准备工作

1. Azure 账户
2. 安装并登录 Azure CLI（[官方文档](https://docs.microsoft.com/cli/azure/install-azure-cli)）
3. 项目代码上传至 Git 仓库（如 GitHub）
4. 生成 `requirements.txt`：
        ```bash
        pip freeze > requirements.txt
        ```
     确保包含 Flask、Flask-SocketIO、eventlet、gunicorn、werkzeug 等依赖。

#### 步骤二：创建 Azure 资源

1. 创建资源组：
        ```bash
        az group create --name MyChatAppResourceGroup --location "East Asia"
        ```
2. 创建服务计划（Linux）：
        ```bash
        az appservice plan create --name MyChatAppServicePlan --resource-group MyChatAppResourceGroup --sku B1 --is-linux
        ```
3. 创建 Web 应用：
        ```bash
        az webapp create --name <唯一应用名> --plan MyChatAppServicePlan --resource-group MyChatAppResourceGroup --runtime "PYTHON|3.11"
        ```

#### 步骤三：配置 Socket.IO 支持

1. 开启 Web Sockets：
        ```bash
        az webapp config set --name <唯一应用名> --resource-group MyChatAppResourceGroup --web-sockets-enabled true
        ```
2. 设置启动命令（Gunicorn + eventlet）：
        ```bash
        az webapp config set --name <唯一应用名> --resource-group MyChatAppResourceGroup --startup-command "gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:8000 app:app"
        ```

#### 步骤四：部署代码

```bash
az webapp deployment source config --name <唯一应用名> --resource-group MyChatAppResourceGroup --repo-url https://github.com/your-username/your-repo.git --branch main --manual-integration
```

#### 步骤五：访问与日志

- 访问：`https://<唯一应用名>.azurewebsites.net/auth`
- 查看日志：
        ```bash
        az webapp log tail --name <唯一应用名> --resource-group MyChatAppResourceGroup
        ```

#### 步骤六：数据库与文件存储说明

- **数据库（SQLite）**：Azure 文件系统非持久化，生产环境建议迁移至 Azure Database for PostgreSQL/MySQL。
- **文件上传（/uploads）**：同理，建议生产环境使用 Azure Blob Storage，并修改 `app.py` 文件上传逻辑。

---

## 测试账户

共 4 个测试账号，可直接登录：

- user1 / pass123
- user2 / pass123
- user3 / pass123
- user4 / pass123

