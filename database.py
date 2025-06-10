import sqlite3
import os
from werkzeug.security import generate_password_hash, check_password_hash
from itertools import combinations
# 新增：导入 datetime 用于处理时间
from datetime import datetime, timezone

DATABASE_FILE = 'chat.db'

def get_db_connection():
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    if os.path.exists(DATABASE_FILE):
        return
    print("Creating new database...")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, nickname TEXT NOT NULL, avatar TEXT)')
    
    # **核心修改：将 timestamp 列的类型改为 TEXT，不再使用数据库默认时间**
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_username TEXT NOT NULL,
        recipient_username TEXT NOT NULL,
        content TEXT,
        message_type TEXT NOT NULL DEFAULT 'text',
        file_url TEXT,
        filename TEXT,
        timestamp TEXT NOT NULL
    )''')
    
    cursor.execute('CREATE TABLE IF NOT EXISTS friendships (id INTEGER PRIMARY KEY AUTOINCREMENT, user1_username TEXT NOT NULL, user2_username TEXT NOT NULL, status TEXT NOT NULL, action_user TEXT NOT NULL, UNIQUE(user1_username, user2_username))')
    conn.commit()
    conn.close()
    
    print("Adding preset users...")
    preset_users = [('user1', 'pass123', '爱丽丝'), ('user2', 'pass123', '鲍勃'), ('user3', 'pass123', '查理'), ('user4', 'pass123', '黛安娜')]
    for username, password, nickname in preset_users:
        add_user(username, password, nickname)
    
    print("Adding default friendships...")
    preset_usernames = [u[0] for u in preset_users]
    for user1, user2 in combinations(preset_usernames, 2):
        add_accepted_friendship(user1, user2)
    print("Database initialized.")

# **核心修改：save_message 函数现在需要一个明确的 timestamp 参数**
def save_message(sender, recipient, content, msg_type, file_url, filename, timestamp_iso):
    conn = get_db_connection()
    conn.execute(
        'INSERT INTO messages (sender_username, recipient_username, content, message_type, file_url, filename, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
        (sender, recipient, content, msg_type, file_url, filename, timestamp_iso)
    )
    conn.commit()
    conn.close()

# ... (其他所有函数保持不变) ...
def add_accepted_friendship(user1, user2):
    conn = get_db_connection()
    try:
        if user1 > user2: user1, user2 = user2, user1
        conn.execute("INSERT INTO friendships (user1_username, user2_username, status, action_user) VALUES (?, ?, 'accepted', 'system')", (user1, user2))
        conn.commit()
    except sqlite3.IntegrityError: pass
    finally: conn.close()
def add_user(username, password, nickname, avatar=None):
    conn = get_db_connection()
    try:
        if not avatar:
            morandi_colors = "c0a0a0,b0c4b1,a4b4a9,a4a9b4,c0b0a0"
            avatar = f'https://api.dicebear.com/8.x/initials/svg?seed={nickname}&backgroundColor={morandi_colors}&radius=50&fontSize=45'
        password_hash = generate_password_hash(password)
        conn.execute('INSERT INTO users (username, password_hash, nickname, avatar) VALUES (?, ?, ?, ?)', (username, password_hash, nickname, avatar))
        conn.commit()
        return True
    except sqlite3.IntegrityError: return False
    finally: conn.close()
def update_user_avatar(username, avatar_url):
    conn = get_db_connection()
    conn.execute('UPDATE users SET avatar = ? WHERE username = ?', (avatar_url, username))
    conn.commit()
    conn.close()
def get_user(username):
    conn = get_db_connection(); user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone(); conn.close(); return user
def get_chat_history(user1, user2):
    conn = get_db_connection(); messages = conn.execute('SELECT m.*, u.nickname as sender_nickname, u.avatar as sender_avatar FROM messages m JOIN users u ON m.sender_username = u.username WHERE (sender_username = ? AND recipient_username = ?) OR (sender_username = ? AND recipient_username = ?) ORDER BY timestamp ASC', (user1, user2, user2, user1)).fetchall(); conn.close(); return [dict(msg) for msg in messages]
def search_users_by_prefix(prefix, current_user):
    conn = get_db_connection(); users = conn.execute("SELECT u.username, u.nickname, u.avatar, CASE WHEN f.status IS NOT NULL THEN f.status ELSE 'not_friends' END as friendship_status FROM users u LEFT JOIN friendships f ON (u.username = f.user1_username AND ? = f.user2_username) OR (u.username = f.user2_username AND ? = f.user1_username) WHERE u.username LIKE ? AND u.username != ?", (current_user, current_user, f'{prefix}%', current_user)).fetchall(); conn.close(); return [dict(u) for u in users]
def get_friends(username):
    conn = get_db_connection(); friends = conn.execute("SELECT u.username, u.nickname, u.avatar FROM friendships f JOIN users u ON u.username = CASE WHEN f.user1_username = ? THEN f.user2_username ELSE f.user1_username END WHERE (f.user1_username = ? OR f.user2_username = ?) AND f.status = 'accepted'", (username, username, username)).fetchall(); conn.close(); return [dict(f) for f in friends]
def add_friend_request(from_user, to_user):
    if from_user == to_user: return False, "不能添加自己为好友"
    conn = get_db_connection(); user1, user2 = sorted((from_user, to_user)); existing = conn.execute("SELECT * FROM friendships WHERE user1_username = ? AND user2_username = ?", (user1, user2)).fetchone()
    if existing: conn.close(); return False, "已是好友或请求已发送"
    conn.execute("INSERT INTO friendships (user1_username, user2_username, status, action_user) VALUES (?, ?, 'pending', ?)", (user1, user2, from_user)); conn.commit(); conn.close(); return True, "好友请求已发送"
def get_pending_requests(username):
    conn = get_db_connection(); requests = conn.execute("SELECT u.username, u.nickname, u.avatar FROM friendships f JOIN users u ON u.username = f.action_user WHERE (f.user1_username = ? OR f.user2_username = ?) AND f.status = 'pending' AND f.action_user != ?", (username, username, username)).fetchall(); conn.close(); return [dict(req) for req in requests]
def respond_to_friend_request(responder, requester, accept=True):
    conn = get_db_connection(); user1, user2 = sorted((responder, requester))
    if accept: conn.execute("UPDATE friendships SET status = 'accepted', action_user = ? WHERE user1_username = ? AND user2_username = ? AND status = 'pending'", (responder, user1, user2))
    else: conn.execute("DELETE FROM friendships WHERE user1_username = ? AND user2_username = ?", (user1, user2))
    conn.commit(); conn.close()
def are_friends(user1, user2):
    conn = get_db_connection(); u1, u2 = sorted((user1, user2)); friendship = conn.execute("SELECT status FROM friendships WHERE user1_username = ? AND user2_username = ? AND status = 'accepted'", (u1, u2)).fetchone(); conn.close(); return friendship is not None