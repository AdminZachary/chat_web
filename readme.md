
# 即时通讯 Web 应用 (Real-time Web Chat Application)

这是一个功能完善、基于 Flask-SocketIO 和现代前端技术构建的实时 Web 聊天应用程序。它支持用户注册、好友系统、持久化聊天记录、文件与表情发送，并为桌面和移动端提供了响应式布局和暗黑模式支持。

本项目从一个简单的构想开始，逐步迭代，最终成为一个稳定、功能丰富的全栈应用。

## ✨ 主要功能 (Features)

  - **用户系统**: 支持新用户注册和登录。
  - **持久化存储**: 使用 SQLite 数据库永久保存用户数据、好友关系和聊天记录。
  - **好友系统**:
      - 通过用户名精确查找用户。
      - 发送和接收好友请求。
      - 接受/拒绝好友请求。
  - **实时通讯**:
      - 基于 WebSocket 的私聊消息。
      - 实时显示好友的在线/离线状态。
  - **丰富的消息类型**:
      - 发送文本和 Emoji 表情。
      - 发送图片、文档等任意类型的文件，并提供下载。
  - **优秀的用户体验**:
      - 支持浅色/暗黑模式一键切换，并记忆用户的选择。
      - 响应式布局，完美适配桌面和移动设备。
      - 在移动端，聊天界面会自动适配，防止输入框被键盘或浏览器导航栏遮挡。
      - 关键操作的实时通知（如收到好友请求）。

## 🛠️ 技术栈 (Technology Stack)

  - **后端 (Backend)**:

      - **Python 3**: 主要编程语言。
      - **Flask**: 轻量级 Web 框架，用于处理 HTTP 请求。
      - **Flask-SocketIO**: 实现 WebSocket 实时双向通信。
      - **Eventlet**: 高性能的并发网络库，作为应用的 WSGI 服务器。
      - **Werkzeug**: 提供密码安全哈希和文件上传处理。
      - **SQLite**: 轻量级文件数据库，用于数据持久化。

  - **前端 (Frontend)**:

      - **HTML5**: 网页结构。
      - **CSS3**: 页面样式，广泛使用 CSS 变量实现主题切换和媒体查询实现响应式布局。
      - **JavaScript (ES6+)**: 处理所有前端交互逻辑、DOM 操作和与后端的 WebSocket 通信。

## 📁 项目结构 (Project Structure)

```
/chat_project
|
|-- app.py               # 主应用后端逻辑 (Flask & Socket.IO)
|-- database.py          # 数据库初始化与所有操作函数
|
|-- /templates
|   |-- auth.html        # 登录与注册页面
|   |-- chat.html        # 主聊天界面
|
|-- /static
|   |-- /css
|   |   |-- style.css    # 所有CSS样式
|   |-- /js
|       |-- auth.js      # 登录/注册页面的脚本
|       |-- main.js      # 聊天主页面的脚本
|
|-- chat.db              # (首次运行时自动创建)
|-- /uploads             # (首次运行时自动创建，用于存放上传的文件)
|
`-- README.md            # (本文档)
```

-----

## 🚀 部署指南 (Deployment Guide)

您可以将此应用部署在局域网内供团队使用，或部署到云服务器上供公网访问。

### (一) 在本地或局域网内部署

这种方式非常适合本地开发、测试，或在公司/家庭局域网内快速搭建一个内部通讯工具。

1.  **环境准备**:
    确保您的电脑上已安装 Python 3 和 pip。

2.  **获取项目**:
    将项目所有文件下载并解压到您电脑的任意位置（例如 `D:\projects\chat_project`）。

3.  **创建虚拟环境 (推荐)**:
    打开终端（Windows上是`CMD`或`PowerShell`，macOS/Linux上是`终端`），进入项目根目录，然后运行：

    ```bash
    # 创建一个名为 venv 的虚拟环境
    python -m venv venv

    # 激活虚拟环境
    # Windows:
    venv\Scripts\activate
    # macOS/Linux:
    source venv/bin/activate
    ```

4.  **安装依赖**:
    在激活的虚拟环境中，运行以下命令安装所有必需的库：

    ```bash
    
    pip install flask-socketio
    pip install eventlet
    pip install werkzeug
    ```

5.  **运行应用**:
    确保您仍在项目根目录下，然后运行主程序：

    ```bash
    python app.py
    ```

6.  **访问应用**:
    服务器启动后，终端会显示访问地址：

      - **在本机访问**: 打开浏览器，输入 `http://127.0.0.1:5000/auth`。
      - **在局域网内其他设备访问**: 查看终端输出的局域网地址（如 `http://192.168.1.10:5000/auth`），在连接到**同一个WiFi或路由器**的其他电脑或手机上访问此地址。

    > **防火墙注意**: 如果其他设备无法访问，请检查运行服务器的电脑的防火墙设置，确保它允许其他设备访问 `5000` 端口。

### (二) 部署到 Azure App Service (生产环境)

这种方式利用 Azure 的平台即服务（PaaS），无需手动管理服务器、Nginx 等，部署流程更简单、自动化。

#### 1\. 准备工作 (Prerequisites)

1.  **Azure 账户**: 您需要一个有效的 Microsoft Azure 订阅。
2.  **Azure CLI**: 在您的本地电脑上安装并登录 Azure CLI。这是通过命令行与 Azure 交互的工具。您可以参照 [官方文档](https://docs.microsoft.com/cli/azure/install-azure-cli) 进行安装。安装后，在终端运行 `az login` 登录您的账户。
3.  **Git 仓库**: 将您的整个项目代码（包括所有 `.py`, `.html`, `.css`, `.js` 文件）上传到一个 Git 仓库，例如 **GitHub** 或 **Azure Repos**。Azure App Service 非常擅长从 Git 仓库自动拉取代码进行部署。
4.  **创建 `requirements.txt`**: Azure 需要知道您的 Python 项目依赖哪些库。在您本地项目的虚拟环境中，运行以下命令生成依赖文件：
    ```bash
    pip freeze > requirements.txt
    ```
    确保 `requirements.txt` 文件已创建并包含了 `Flask`, `Flask-SocketIO`, `eventlet`, `gunicorn`, `werkzeug` 等内容。然后将这个文件也提交到您的 Git 仓库。

#### 2\. 使用 Azure CLI 创建和配置资源

我们将通过一系列命令来创建所需的所有 Azure 资源。请在本地终端中执行这些命令，并将 `<...>` 替换为您自己的名称。

1.  **创建资源组 (Resource Group)**:
    资源组是用于管理一组相关资源的容器。

    ```bash
    az group create --name MyChatAppResourceGroup --location "East Asia"
    ```

      * `MyChatAppResourceGroup`: 您可以自定义的资源组名称。
      * `East Asia`: 推荐选择离您或您的用户最近的区域。

2.  **创建应用服务计划 (App Service Plan)**:
    服务计划定义了应用的计算资源（类似服务器的配置）。`B1` (Basic) 是支持“始终在线”和 WebSockets 功能的经济选择。

    ```bash
    az appservice plan create --name MyChatAppServicePlan --resource-group MyChatAppResourceGroup --sku B1 --is-linux
    ```

      * `MyChatAppServicePlan`: 您可以自定义的计划名称。
      * `--is-linux`: **必须**指定为 Linux 环境，以便运行 Gunicorn。

3.  **创建 Web 应用 (Web App)**:
    这是我们的应用主体。

    ```bash
    az webapp create --name <您的应用唯一名称> --plan MyChatAppServicePlan --resource-group MyChatAppResourceGroup --runtime "PYTHON|3.11"
    ```

      * `<您的应用唯一名称>`: **必须是全局唯一的**，因为它将成为您 URL 的一部分（例如 `my-unique-chat-app.azurewebsites.net`）。请替换为您自己的名称。

#### 3\. 配置应用以支持 Socket.IO (关键步骤)

默认配置无法运行我们的应用，必须进行以下两项关键设置。

1.  **开启 Web Sockets**:
    Azure App Service 默认不开启 WebSocket，需要手动启用。

    ```bash
    az webapp config set --name <您的应用唯一名称> --resource-group MyChatAppResourceGroup --web-sockets-enabled true
    ```

2.  **设置启动命令**:
    我们需要告诉 Azure 使用 Gunicorn 并指定 `eventlet` 工作模式来启动我们的应用。

    ```bash
    az webapp config set --name <您的应用唯一名称> --resource-group MyChatAppResourceGroup --startup-command "gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:8000 app:app"
    ```

      * 这里的 `app:app` 指的是 `app.py` 文件中的 `app` 实例。`0.0.0.0:8000` 是 App Service 推荐的内部绑定端口。

#### 4\. 部署代码

现在，我们将 Web App 与您的 Git 仓库连接起来，实现持续部署。

```bash
# 将 <...> 替换为您的 GitHub 仓库 URL
az webapp deployment source config --name <您的应用唯一名称> --resource-group MyChatAppResourceGroup --repo-url https://github.com/your-username/your-repo.git --branch main --manual-integration
```

  * `--repo-url`: 您的 Git 仓库地址。
  * `--branch`: 您希望部署的分支，通常是 `main` 或 `master`。

执行此命令后，Azure App Service 会从您的仓库拉取代码，自动安装 `requirements.txt` 中的依赖，并使用您设置的启动命令来运行应用。首次部署可能需要几分钟时间。

#### 5\. 访问和排查问题

1.  **访问应用**:
    部署成功后，您可以通过 `https://<您的应用唯一名称>.azurewebsites.net/auth` 来访问您的应用。

2.  **查看日志**:
    如果应用无法启动或运行出错，查看实时日志是排查问题的最佳方式：

    ```bash
    az webapp log tail --name <您的应用唯一名称> --resource-group MyChatAppResourceGroup
    ```

#### 6\. 关于数据库和文件存储的重要说明

  * **数据库 (SQLite)**:
    Azure App Service 的文件系统是**非持久化**的。这意味着当应用重启、更新或扩展时，保存在本地的 `chat.db` 文件**可能会被重置或丢失**。对于这个项目作为演示是可行的，但对于真正的生产环境，您应该将数据库迁移到 **Azure Database for PostgreSQL** 或 **Azure Database for MySQL** 等托管数据库服务。

  * **文件上传 (`/uploads` 目录)**:
    同理，用户上传的文件也存储在非持久化的文件系统中，存在丢失风险。在生产环境中，强烈建议使用 **Azure Blob Storage** 来存储用户上传的文件。这需要修改 `app.py` 中的文件处理逻辑，使用 Azure SDK for Python 进行上传和提供下载链接。