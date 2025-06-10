import os
import time
import socket
from flask import Flask, render_template, request, session, redirect, url_for, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from werkzeug.security import check_password_hash
from flask_socketio import SocketIO, join_room, leave_room
import database as db

# --- 应用设置 ---
UPLOAD_FOLDER = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app = Flask(__name__)
app.config['SECRET_KEY'] = 'a-very-secret-key-for-the-final-version'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
socketio = SocketIO(app, async_mode='eventlet')
online_users = {} 

# 初始化数据库
db.init_db()

# --- HTTP 路由 ---
@app.route('/')
def index():
    if 'username' not in session: return redirect(url_for('auth_page'))
    return render_template('chat.html')

@app.route('/auth')
def auth_page(): return render_template('auth.html')

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username, password, nickname = data.get('username'), data.get('password'), data.get('nickname')
    if not all([username, password, nickname]): return jsonify({'success': False, 'message': '所有字段均为必填项'}), 400
    if db.add_user(username, password, nickname): return jsonify({'success': True, 'message': '注册成功'})
    return jsonify({'success': False, 'message': '用户名已存在'}), 409

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username, password = data.get('username'), data.get('password')
    user = db.get_user(username)
    if user and check_password_hash(user['password_hash'], password):
        session['username'] = username
        return jsonify({'success': True})
    return jsonify({'success': False, 'message': '用户名或密码错误'}), 401
    
@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('username', None)
    return jsonify({'success': True})

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'username' not in session: return jsonify({'error': 'Unauthorized'}), 401
    if 'file' not in request.files: return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '': return jsonify({'error': 'No selected file'}), 400
    if file:
        filename = f"{int(time.time())}-{secure_filename(file.filename)}"
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        return jsonify({'success': True, 'file_url': url_for('uploaded_file', filename=filename)})
    return jsonify({'success': False, 'error': 'File upload failed'}), 500

# **新增：头像上传路由**
@app.route('/upload_avatar', methods=['POST'])
def upload_avatar():
    username = session.get('username')
    if not username: return jsonify({'success': False, 'error': 'Unauthorized'}), 401
    if 'avatar' not in request.files: return jsonify({'success': False, 'error': 'No file part'}), 400
    
    file = request.files['avatar']
    if file.filename == '': return jsonify({'success': False, 'error': 'No selected file'}), 400

    if file:
        # 增加文件类型校验
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
        if '.' not in file.filename or file.filename.rsplit('.', 1)[1].lower() not in allowed_extensions:
            return jsonify({'success': False, 'error': '文件类型不被允许'}), 400

        filename = f"avatar_{username}_{int(time.time())}.{file.filename.rsplit('.', 1)[1].lower()}"
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        avatar_url = url_for('uploaded_file', filename=filename)

        # 更新数据库
        db.update_user_avatar(username, avatar_url)

        # 通知所有在线的好友更新头像
        friends = db.get_friends(username)
        for friend in friends:
            if friend['username'] in online_users:
                friend_sid = online_users[friend['username']]
                socketio.emit('avatar_updated', {'username': username, 'new_avatar_url': avatar_url}, room=friend_sid)

        return jsonify({'success': True, 'new_avatar_url': avatar_url})

    return jsonify({'success': False, 'error': 'Avatar upload failed'}), 500


@app.route('/uploads/<filename>')
def uploaded_file(filename): return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# --- Socket.IO 事件 (无重大变化，仅增加一个 avatar_updated 事件的转发) ---
@socketio.on('connect')
def handle_connect(*args, **kwargs):
    username = session.get('username')
    if not username: return
    join_room('all_users')
    online_users[username] = request.sid
    socketio.emit('status_change', {'username': username, 'status': 'online'}, to='all_users')
    print(f"Client connected: {username} ({request.sid}), joined room 'all_users'")

@socketio.on('disconnect')
def handle_disconnect(*args, **kwargs):
    username = session.get('username')
    if username in online_users:
        del online_users[username]
        leave_room('all_users')
        socketio.emit('status_change', {'username': username, 'status': 'offline'}, to='all_users')
        print(f"Client disconnected: {username}, left room 'all_users'")

# ... (其他事件处理器保持不变) ...
@socketio.on('get_initial_data')
def handle_get_initial_data():
    username = session.get('username');
    if not username: return
    user_info = db.get_user(username)
    if not user_info: print(f"Warning: User '{username}' from session not found in database."); return
    friends, pending_requests = db.get_friends(username), db.get_pending_requests(username)
    friends_with_status = [{'username': f['username'], 'nickname': f['nickname'], 'avatar': f['avatar'], 'status': 'online' if f['username'] in online_users else 'offline'} for f in friends]
    socketio.emit('initial_data_response', {'currentUser': dict(user_info), 'friends': friends_with_status, 'pendingRequests': pending_requests}, room=request.sid)

@socketio.on('send_message')
def handle_send_message(data):
    sender, recipient = session.get('username'), data.get('recipient_username')
    if not all([sender, recipient]) or not db.are_friends(sender, recipient): return
    msg_type = data.get('type', 'text');
    message_to_forward = {'sender_username': sender,'recipient_username': recipient,'type': msg_type,'timestamp': time.time() * 1000,'temp_id': data.get('temp_id')}
    if msg_type == 'text':
        message_to_forward['content'] = data.get('text'); db.save_message(sender, recipient, message_to_forward['content'], msg_type)
    elif msg_type == 'file_uploading':
        message_to_forward['filename'] = data.get('filename')
    elif msg_type == 'file_upload_cancelled': pass
    elif msg_type == 'file':
        message_to_forward['url'] = data.get('url'); message_to_forward['filename'] = data.get('filename'); db.save_message(sender, recipient, None, msg_type, message_to_forward['url'], message_to_forward['filename'])
    if recipient in online_users: socketio.emit('receive_message', message_to_forward, room=online_users[recipient])
    if msg_type in ['text', 'file']: socketio.emit('receive_message', message_to_forward, room=request.sid)

@socketio.on('load_chat_history')
def handle_load_chat_history(data):
    user1, user2 = session.get('username'), data.get('contact_username');
    if not all([user1, user2]): return
    history = db.get_chat_history(user1, user2); socketio.emit('chat_history_response', {'contact': user2, 'history': history}, room=request.sid)

@socketio.on('search_user')
def handle_search_user(data):
    prefix, current_user = data.get('query'), session.get('username');
    if all([prefix, current_user]): results = db.search_users_by_prefix(prefix, current_user); socketio.emit('search_results', results, room=request.sid)

@socketio.on('send_friend_request')
def handle_send_friend_request(data):
    from_user, to_user = session.get('username'), data.get('username');
    if not all([from_user, to_user]): return
    success, message = db.add_friend_request(from_user, to_user); socketio.emit('friend_request_sent', {'success': success, 'message': message}, room=request.sid)
    if success and to_user in online_users:
        sender_info = db.get_user(from_user); socketio.emit('new_friend_request', dict(sender_info), room=online_users[to_user])

@socketio.on('respond_to_friend_request')
def handle_respond_to_request(data):
    to_user, from_user, accept = session.get('username'), data.get('username'), data.get('accept');
    if not all([to_user, from_user]): return
    db.respond_to_friend_request(responder=to_user, requester=from_user, accept=accept)
    if accept:
        if from_user in online_users: socketio.emit('reload_data', room=online_users[from_user])
        socketio.emit('reload_data', room=request.sid)

if __name__ == '__main__':
    import eventlet; import eventlet.wsgi
    port = 5000; local_ip = '127.0.0.1'
    try: s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(("8.8.8.8", 80)); local_ip = s.getsockname()[0]; s.close()
    except Exception: pass
    print(">>> Chat Server (with Avatar Upload) is running!");
    print("=" * 53); print(f"  Access from this machine: http://127.0.0.1:{port}/auth"); print(f"  Access from LAN devices:  http://{local_ip}:{port}/auth"); print("=" * 53)
    eventlet.wsgi.server(eventlet.listen(('0.0.0.0', port)), app)