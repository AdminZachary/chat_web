import os
import time
import socket
import re
import json
from flask import Flask, render_template, request, session, redirect, url_for, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from werkzeug.security import check_password_hash, generate_password_hash
from flask_socketio import SocketIO, join_room, leave_room
from flask_babel import Babel, _
import database as db
from datetime import datetime, timezone

# --- 应用设置 (Application Setup) ---
UPLOAD_FOLDER = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app = Flask(__name__)
app.config['SECRET_KEY'] = 'a-very-secret-key-for-the-final-version'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# --- 国际化配置 (i18n Configuration) ---
app.config['LANGUAGES'] = ['zh', 'en', 'ja']
app.config['BABEL_DEFAULT_LOCALE'] = 'zh'

def get_locale():
    """
    语言选择函数，根据浏览器请求头自动选择最佳匹配语言。
    Language selector function, automatically chooses the best match from request headers.
    """
    return request.accept_languages.best_match(app.config['LANGUAGES'])

# 初始化 Babel，并直接传入语言选择器函数
# Initialize Babel and pass the locale selector function directly
babel = Babel(app, locale_selector=get_locale)

socketio = SocketIO(app, async_mode='eventlet')
online_users = {}

db.init_db()

# --- (新增修正) 上下文处理器，将 get_locale 函数注入到模板中 ---
@app.context_processor
def inject_locale():
    """Makes the get_locale function available to all templates."""
    return dict(get_locale=get_locale)


# --- HTTP 路由 (HTTP Routes) ---
@app.route('/')
def index():
    if 'username' in session:
        session.pop('username', None)

    # 为 JavaScript 准备的翻译字典
    # Translation dictionary for JavaScript
    js_translations = {
        "error_network": _("网络错误，请稍后重试。"),
        "register_success": _("注册成功！请登录。"),
        "error_password_mismatch": _("两次输入的密码不一致。"),
        "online": _("在线"),
        "offline": _("离线"),
        "no_friend_requests": _("没有新的好友请求"),
        "upload_wait": _("请等待当前文件上传完成。"),
        "upload_failed": _("文件上传失败: "),
        "upload_failed_server": _("文件上传失败: 服务器错误."),
        "upload_error_network_interrupted": _("网络错误，上传中断。"),
        "uploading": _("正在上传"),
        "request_sent": _("已发送"),
        "no_users_found": _("没有找到用户"),
        "friend_request_sent_msg": _("好友请求已发送"),
        "request_already_sent": _("请求已发送"),
        "already_friends": _("已是好友"),
        "add": _("添加"),
        "connecting": _("正在连接..."),
        "enter_message": _("输入消息..."),
        "disconnected": _("已断开连接..."),
        "avatar_upload_failed": _("头像上传失败: "),
        "avatar_upload_error": _("头像上传出错。")
    }
    return render_template('index.html', js_translations=json.dumps(js_translations))

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password')
    password_confirm = data.get('password_confirm')
    nickname = data.get('nickname')
    
    if not all([username, password, password_confirm, nickname]): 
        return jsonify({'success': False, 'message': _('所有字段均为必填项')}), 400
    
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        return jsonify({'success': False, 'message': _('用户名只能包含字母、数字和下划线')}), 400

    if password != password_confirm: 
        return jsonify({'success': False, 'message': _('两次输入的密码不一致')}), 400
    
    if db.get_user(username):
        return jsonify({'success': False, 'message': _('该用户名已被注册')}), 409

    if db.add_user(username, password, nickname): 
        return jsonify({'success': True, 'message': _('注册成功')})
    
    return jsonify({'success': False, 'message': _('注册过程中发生未知错误')}), 500

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username, password = data.get('username'), data.get('password')
    user = db.get_user(username)
    if user and check_password_hash(user['password_hash'], password):
        session['username'] = username
        user_info = db.get_user(username)
        friends = db.get_friends(username)
        pending_requests = db.get_pending_requests(username)
        friends_with_status = [{'username': f['username'], 'nickname': f['nickname'], 'avatar': f['avatar'], 'status': 'offline'} for f in friends]
        
        initial_data = {
            'currentUser': dict(user_info),
            'friends': friends_with_status,
            'pendingRequests': pending_requests
        }
        return jsonify({'success': True, 'initial_data': initial_data})
        
    return jsonify({'success': False, 'message': _('用户名或密码错误')}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('username', None)
    return jsonify({'success': True})

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'username' not in session: 
        return jsonify({'error': 'Unauthorized'}), 401
    if 'file' not in request.files: 
        return jsonify({'error': _('没有文件部分')}), 400
    file = request.files['file']
    if file.filename == '': 
        return jsonify({'error': _('未选择文件')}), 400
    if file:
        filename = f"{int(time.time())}-{secure_filename(file.filename)}"
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        return jsonify({'success': True, 'file_url': url_for('uploaded_file', filename=filename)})
    return jsonify({'success': False, 'error': _('文件上传失败')}), 500

@app.route('/upload_avatar', methods=['POST'])
def upload_avatar():
    username = session.get('username')
    if not username: 
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401
    if 'avatar' not in request.files: 
        return jsonify({'success': False, 'error': _('没有文件部分')}), 400
    file = request.files['avatar']
    if file.filename == '': 
        return jsonify({'success': False, 'error': _('未选择文件')}), 400
    if file:
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
        if '.' not in file.filename or file.filename.rsplit('.', 1)[1].lower() not in allowed_extensions:
            return jsonify({'success': False, 'error': _('文件类型不被允许')}), 400
        filename = f"avatar_{username}_{int(time.time())}.{file.filename.rsplit('.', 1)[1].lower()}"
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        avatar_url = url_for('uploaded_file', filename=filename)
        db.update_user_avatar(username, avatar_url)
        friends = db.get_friends(username)
        for friend in friends:
            if friend['username'] in online_users:
                socketio.emit('avatar_updated', {'username': username, 'new_avatar_url': avatar_url}, room=online_users[friend['username']])
        return jsonify({'success': True, 'new_avatar_url': avatar_url})
    return jsonify({'success': False, 'error': _('头像上传失败')}), 500

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


# --- Socket.IO 事件 (Socket.IO Events) ---
# ... 此处省略所有未改动的 Socket.IO 事件处理器，它们与您之前的代码相同 ...
@socketio.on('send_message')
def handle_send_message(data):
    sender, recipient = session.get('username'), data.get('recipient_username')
    if not all([sender, recipient]) or not db.are_friends(sender, recipient):
        return
    msg_type = data.get('type', 'text')
    now_utc = datetime.now(timezone.utc).isoformat()
    message_to_forward = {
        'sender_username': sender, 'recipient_username': recipient,
        'type': msg_type, 'timestamp': now_utc,
        'temp_id': data.get('temp_id')
    }
    if msg_type == 'text':
        message_to_forward['content'] = data.get('text')
        db.save_message(sender, recipient, message_to_forward['content'], msg_type, None, None, now_utc)
    elif msg_type in ['image_uploading', 'video_uploading', 'file_uploading']:
        message_to_forward['filename'] = data.get('filename')
    elif msg_type == 'file_upload_cancelled':
        pass
    elif msg_type in ['image', 'video', 'file']:
        message_to_forward['url'] = data.get('url')
        message_to_forward['filename'] = data.get('filename')
        db.save_message(sender, recipient, None, msg_type, message_to_forward['url'], message_to_forward['filename'], now_utc)
    if recipient in online_users:
        socketio.emit('receive_message', message_to_forward, room=online_users[recipient])
    if msg_type not in ['file_upload_cancelled']:
        socketio.emit('receive_message', message_to_forward, room=request.sid)

@socketio.on('connect')
def handle_connect(*args, **kwargs):
    username = session.get('username')
    if not username:
        return
    join_room('all_users')
    online_users[username] = request.sid
    socketio.emit('status_change', {'username': username, 'status': 'online'}, to='all_users')
    friends = db.get_friends(username)
    for friend in friends:
        if friend['username'] in online_users:
            socketio.emit('status_change', {'username': username, 'status': 'online'}, to=online_users[friend['username']])

@socketio.on('disconnect')
def handle_disconnect(*args, **kwargs):
    username = session.get('username')
    if username in online_users:
        del online_users[username]
        leave_room('all_users')
        socketio.emit('status_change', {'username': username, 'status': 'offline'}, to='all_users')

@socketio.on('get_initial_data')
def handle_get_initial_data():
    username = session.get('username')
    if not username:
        return
    user_info = db.get_user(username)
    if not user_info:
        return
    friends, pending_requests = db.get_friends(username), db.get_pending_requests(username)
    friends_with_status = [{'username': f['username'], 'nickname': f['nickname'], 'avatar': f['avatar'], 'status': 'online' if f['username'] in online_users else 'offline'} for f in friends]
    socketio.emit('initial_data_response', {'currentUser': dict(user_info), 'friends': friends_with_status, 'pendingRequests': pending_requests}, room=request.sid)

@socketio.on('load_chat_history')
def handle_load_chat_history(data):
    user1, user2 = session.get('username'), data.get('contact_username')
    if not all([user1, user2]):
        return
    history = db.get_chat_history(user1, user2)
    socketio.emit('chat_history_response', {'contact': user2, 'history': history}, room=request.sid)

@socketio.on('search_user')
def handle_search_user(data):
    prefix, current_user = data.get('query'), session.get('username')
    if all([prefix, current_user]):
        results = db.search_users_by_prefix(prefix, current_user)
        socketio.emit('search_results', results, room=request.sid)

@socketio.on('send_friend_request')
def handle_send_friend_request(data):
    from_user, to_user = session.get('username'), data.get('username')
    if not all([from_user, to_user]):
        return
    success, message = db.add_friend_request(from_user, to_user)
    socketio.emit('friend_request_sent', {'success': success, 'message': _('好友请求已发送') if success else message}, room=request.sid)
    if success and to_user in online_users:
        sender_info = db.get_user(from_user)
        socketio.emit('new_friend_request', dict(sender_info), room=online_users[to_user])

@socketio.on('respond_to_friend_request')
def handle_respond_to_request(data):
    to_user, from_user, accept = session.get('username'), data.get('username'), data.get('accept')
    if not all([to_user, from_user]):
        return
    db.respond_to_friend_request(responder=to_user, requester=from_user, accept=accept)
    if accept:
        if from_user in online_users:
            socketio.emit('reload_data', room=online_users[from_user])
        socketio.emit('reload_data', room=request.sid)

if __name__ == '__main__':
    # 使用 eventlet 运行服务器
    # Running the server with eventlet
    import eventlet
    eventlet.wsgi.server(eventlet.listen(('0.0.0.0', 5000)), app)
