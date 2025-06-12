# 实时 Web 聊天应用 (Real-time Web Chat Application)

一个功能完善、基于 Flask-SocketIO 和现代前端技术构建的实时 Web 聊天应用。它支持用户注册、完整的好友系统、持久化聊天记录、文件共享及国际化。应用采用响应式布局，并提供浅色与深色两种主题模式，以提供卓越的用户体验。

本项目从一个简单的概念逐步迭代，最终成为一个稳定且功能丰富的全栈应用。

---

## ✨ 主要功能 (Key Features)

* **用户认证**: 提供安全的用户注册与登录系统。
* **持久化存储**: 使用 SQLite 数据库来保存用户信息、好友关系和聊天历史记录。
* **国际化 (i18n)**:
    * **多语言支持**: 界面支持中文（默认）、英文和日文。
    * **语言自动检测**: 能根据用户浏览器的语言设置，自动选择并切换到最匹配的语言。
* **完善的好友系统**:
    * 通过用户名精确查找用户。
    * 支持发送、接收、接受或拒绝好友请求。
* **实时通讯**:
    * 基于 WebSocket 的一对一私聊功能。
    * 实时显示好友的在线/离线状态。
* **丰富的消息类型**:
    * 发送文本消息和 Emoji 表情。
    * 上传和分享图片、视频及其他文件，并带有上传进度条和取消选项。
    * 新消息和好友请求的实时通知。
* **现代化的用户体验**:
    * **浅色/深色模式**: 一键切换主题，并自动记忆用户的选择。
    * **响应式设计**: 完美适配桌面和移动设备。
    * **自定义头像**: 用户可以上传并更换自己的头像。

---

## 🛠️ 技术栈 (Technology Stack)

* **后端 (Backend)**:
    * Python 3
    * Flask
    * Flask-SocketIO
    * Flask-Babel (用于国际化)
    * Eventlet (作为 WSGI 服务器)
    * Werkzeug
    * Gunicorn (用于生产环境部署)
    * SQLite (用于数据库)

* **前端 (Frontend)**:
    * HTML5
    * CSS3 (使用 CSS 变量实现主题化，使用媒体查询实现响应式布局)
    * JavaScript (ES6+)

---

## 📁 项目结构 (Project Structure)

```
/chat_web
│
├── app.py             # 主 Flask 应用，包含 Socket.IO 和 i18n 逻辑
├── database.py        # 数据库初始化与数据操作函数
├── requirements.txt   # Python 包依赖文件
├── startup.sh         # 用于 Gunicorn 部署的启动脚本
├── babel.cfg          # Babel 配置文件，用于提取翻译字符串
├── messages.pot       # 翻译模板文件
│
├── /translations      # 存放所有语言的翻译文件
│   ├── /en/LC_MESSAGES
│   │   ├── messages.po  # 英文翻译源文件
│   │   └── messages.mo  # 编译后的英文翻译文件
│   ├── /ja/LC_MESSAGES
│   │   └── ...          # 日文翻译文件
│   └── /zh/LC_MESSAGES
│       └── ...          # 中文翻译文件
│
├── /templates
│   └── index.html     # 单页面应用的主模板
│
├── /static
│   ├── /css
│   │   └── style.css  # 应用的所有样式
│   └── /js
│       └── app.js     # 前端应用逻辑
│
└── /uploads           # (首次运行时自动创建) 用于存放上传文件的目录
```

---

## 🚀 快速开始 (Getting Started)

### 1. 环境准备

* Python 3.x
* `pip` 包管理工具

### 2. 本地开发设置

1.  **克隆或下载项目代码。**

2.  **创建并激活一个虚拟环境 (推荐)**:
    ```bash
    python -m venv venv
    # Windows:
    venv\Scripts\activate
    # macOS/Linux:
    source venv/bin/activate
    ```

3.  **安装所有依赖**:
    ```bash
    pip install -r requirements.txt
    ```

4.  **(仅首次或更新翻译时) 编译翻译文件**:
    如果您修改了 `.po` 翻译文件，需要重新编译它们。
    ```bash
    pybabel compile -d translations
    ```

5.  **运行应用**:
    应用在开发模式下使用 Eventlet 服务器以支持 WebSocket。
    ```bash
    python app.py
    ```

6.  **访问应用**:

    **a) 从运行代码的本机访问：**

    打开浏览器，输入以下任意地址：

    - `http://127.0.0.1:5000`
    - `http://localhost:5000`

    **b) 从局域网内的其他设备（如手机、平板）访问：**

    您需要先找到运行代码电脑的局域网IP地址。

    - **如何查找您的局域网IP？**
    
        - **Windows:** 打开“命令提示符(cmd)”，输入 `ipconfig`，在“IPv4 地址”一行查找，通常以 `192.168.` 开头。
        - **macOS:** 打开“终端”，输入 `ifconfig | grep "inet "`，找到非 `127.0.0.1` 的那个地址。或直接在“系统设置” -> “网络”中查看。
        - **Linux:** 打开终端，输入 `ip addr show`，在主网卡（如 `eth0` 或 `wlan0`）下找到 `inet` 地址。
    - 访问方法：
    
        假设您查到的IP地址是 192.168.1.10，那么就在手机或另一台电脑的浏览器中输入 http://192.168.1.10:5000。
    

### 3. 测试账户

我们预置了4个测试账户，它们之间已互为好友，可用于直接登录测试。
* **用户名**: `user1`, **密码**: `pass123`
* **用户名**: `user2`, **密码**: `pass123`
* **用户名**: `user3`, **密码**: `pass123`
* **用户名**: `user4`, **密码**: `pass123`
 
---

## 🌐 部署 (Deployment)

该应用已为在 Linux 环境下（例如云服务器或 Azure App Service 等 PaaS 平台）使用 Gunicorn 和 Eventlet 部署做好了配置。

### 生产环境启动命令

`startup.sh` 文件包含了在生产环境中运行本应用的推荐 Gunicorn 命令：

```bash
gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:8000 app:app
```

此命令使用 `eventlet` 工作模式启动 Gunicorn，这对 Socket.IO 的正常工作至关重要。

### 生产环境注意事项

* **数据库**: 默认的 SQLite 数据库对于开发非常方便，但在生产环境中，尤其是在文件系统非持久化的平台（如某些 PaaS），它并不是最佳选择。强烈建议在生产环境中迁移到更健壮的数据库服务，如 PostgreSQL 或 MySQL。
* **文件存储**: 同样，本地的 `/uploads` 文件夹不适用于生产环境。为了实现可扩展和持久化的文件存储，应考虑使用云存储服务（如 Amazon S3 或 Azure Blob Storage），并相应地更新 `app.py` 中的文件处理逻辑。
* **Web Sockets**: 请确保您的生产环境以及任何反向代理（如 Nginx）都已正确配置，以支持 WebSocket 连接。

---

## 🌍 国际化 (i18n) 工作流

本应用使用 `Flask-Babel` 进行国际化。

1.  **标记字符串**: 在 Python 代码 (`app.py`) 中，待翻译的字符串使用 `_()` 包裹。在 Jinja2 模板 (`index.html`) 中，同样使用 `_()` 函数。

2.  **提取字符串**: 添加或修改了需要翻译的字符串后，运行以下命令来更新 `messages.pot` 模板文件：
    ```bash
    pybabel extract -F babel.cfg -o messages.pot .
    ```

3.  **更新翻译文件**: 使用模板文件中的新字符串来更新各个语言的 `.po` 文件：
    ```bash
    # 更新所有语言
    pybabel update -i messages.pot -d translations

    # 或者只更新指定语言
    pybabel update -i messages.pot -d translations -l en
    ```

4.  **翻译**: 编辑 `.po` 文件 (例如 `translations/ja/LC_MESSAGES/messages.po`)，为每个 `msgid` 添加对应的翻译 `msgstr`。

5.  **编译翻译**: 最后，将 `.po` 文件编译成应用实际使用的二进制 `.mo` 文件：
    ```bash
    pybabel compile -d translations
    ```