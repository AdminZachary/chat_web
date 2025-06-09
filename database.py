import sqlite3
import os
from werkzeug.security import generate_password_hash, check_password_hash
from itertools import combinations

DATABASE_FILE = 'chat.db'

def get_db_connection():
    """建立数据库连接"""
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """初始化数据库和表"""
    if os.path.exists(DATABASE_FILE):
        return

    print("Creating new database...")
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        nickname TEXT NOT NULL,
        avatar TEXT
    )''')
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_username TEXT NOT NULL,
        recipient_username TEXT NOT NULL,
        content TEXT,
        message_type TEXT NOT NULL DEFAULT 'text',
        file_url TEXT,
        filename TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS friendships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user1_username TEXT NOT NULL,
        user2_username TEXT NOT NULL,
        status TEXT NOT NULL, -- 'pending', 'accepted'
        action_user TEXT NOT NULL,
        UNIQUE(user1_username, user2_username)
    )''')
    
    conn.commit()
    conn.close()
    
    print("Adding preset users...")
    preset_users = [
        ('user1', 'pass123', '爱丽丝', 'https://i.pravatar.cc/150?u=user1'),
        ('user2', 'pass123', '鲍勃', 'https://i.pravatar.cc/150?u=user2'),
        ('user3', 'pass123', '查理', 'https://i.pravatar.cc/150?u=user3'),
        ('user4', 'pass123', '黛安娜', 'https://i.pravatar.cc/150?u=user4')
    ]
    for username, password, nickname, avatar in preset_users:
        add_user(username, password, nickname, avatar)
    
    # ======================================================================
    # **新功能：** 为预设用户默认互相添加好友
    # ======================================================================
    print("Adding default friendships...")
    preset_usernames = [u[0] for u in preset_users]
    # 使用 combinations 来获取所有不重复的用户对
    for user1, user2 in combinations(preset_usernames, 2):
        add_accepted_friendship(user1, user2)
    # ======================================================================
        
    print("Database initialized.")


def add_accepted_friendship(user1, user2):
    """直接添加一个已接受的好友关系 (仅供初始化使用)"""
    conn = get_db_connection()
    try:
        # 保证user1_username始终是字典序较小的那个，防止(u1,u2)和(u2,u1)重复
        if user1 > user2:
            user1, user2 = user2, user1
        conn.execute(
            "INSERT INTO friendships (user1_username, user2_username, status, action_user) VALUES (?, ?, 'accepted', 'system')",
            (user1, user2)
        )
        conn.commit()
    except sqlite3.IntegrityError:
        pass # 如果已存在，则忽略
    finally:
        conn.close()


def add_user(username, password, nickname, avatar=None):
    """添加新用户"""
    conn = get_db_connection()
    try:
        if not avatar:
            avatar = f'https://i.pravatar.cc/150?u={username}'
        password_hash = generate_password_hash(password)
        conn.execute(
            'INSERT INTO users (username, password_hash, nickname, avatar) VALUES (?, ?, ?, ?)',
            (username, password_hash, nickname, avatar)
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def get_user(username):
    """根据用户名获取用户"""
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
    conn.close()
    return user

def save_message(sender, recipient, content, msg_type='text', file_url=None, filename=None):
    """保存消息到数据库"""
    conn = get_db_connection()
    conn.execute(
        'INSERT INTO messages (sender_username, recipient_username, content, message_type, file_url, filename) VALUES (?, ?, ?, ?, ?, ?)',
        (sender, recipient, content, msg_type, file_url, filename)
    )
    conn.commit()
    conn.close()

def get_chat_history(user1, user2):
    """获取两个用户间的聊天记录"""
    conn = get_db_connection()
    messages = conn.execute(
        '''SELECT m.*, u.nickname as sender_nickname, u.avatar as sender_avatar FROM messages m
           JOIN users u ON m.sender_username = u.username
           WHERE (sender_username = ? AND recipient_username = ?) OR (sender_username = ? AND recipient_username = ?) 
           ORDER BY timestamp ASC''',
        (user1, user2, user2, user1)
    ).fetchall()
    conn.close()
    return [dict(msg) for msg in messages]

def search_users_by_prefix(prefix, current_user):
    """根据前缀搜索用户"""
    conn = get_db_connection()
    # 确保user1 < user2 来简化查询
    # We check both directions for friendship
    users = conn.execute(
        """
        SELECT u.username, u.nickname, u.avatar,
               CASE
                   WHEN f.status IS NOT NULL THEN f.status
                   ELSE 'not_friends'
               END as friendship_status
        FROM users u
        LEFT JOIN friendships f ON
            (u.username = f.user1_username AND ? = f.user2_username) OR
            (u.username = f.user2_username AND ? = f.user1_username)
        WHERE u.username LIKE ? AND u.username != ?
        """,
        (current_user, current_user, f'{prefix}%', current_user)
    ).fetchall()
    conn.close()
    return [dict(u) for u in users]


def get_friends(username):
    """获取用户的好友列表"""
    conn = get_db_connection()
    # 使用 IIF 或 CASE WHEN 简化逻辑，获取好友的用户名
    friends = conn.execute(
        '''
        SELECT u.username, u.nickname, u.avatar
        FROM friendships f
        JOIN users u ON u.username = CASE WHEN f.user1_username = ? THEN f.user2_username ELSE f.user1_username END
        WHERE (f.user1_username = ? OR f.user2_username = ?) AND f.status = 'accepted'
        ''', (username, username, username)
    ).fetchall()
    conn.close()
    return [dict(f) for f in friends]

def add_friend_request(from_user, to_user):
    """发送好友请求"""
    if from_user == to_user: return False, "不能添加自己为好友"
    
    conn = get_db_connection()
    # 保证user1是字典序较小的
    user1, user2 = sorted((from_user, to_user))

    existing = conn.execute(
        "SELECT * FROM friendships WHERE user1_username = ? AND user2_username = ?",
        (user1, user2)
    ).fetchone()
    
    if existing:
        conn.close()
        return False, "已是好友或请求已发送"

    conn.execute(
        "INSERT INTO friendships (user1_username, user2_username, status, action_user) VALUES (?, ?, 'pending', ?)",
        (user1, user2, from_user)
    )
    conn.commit()
    conn.close()
    return True, "好友请求已发送"

def get_pending_requests(username):
    """获取待处理的好友请求"""
    conn = get_db_connection()
    requests = conn.execute(
        """
        SELECT u.username, u.nickname, u.avatar 
        FROM friendships f
        JOIN users u ON u.username = f.action_user
        WHERE (f.user1_username = ? OR f.user2_username = ?) AND f.status = 'pending' AND f.action_user != ?
        """, (username, username, username)
    ).fetchall()
    conn.close()
    return [dict(req) for req in requests]

def respond_to_friend_request(responder, requester, accept=True):
    """回应好友请求"""
    conn = get_db_connection()
    user1, user2 = sorted((responder, requester))
    
    if accept:
        conn.execute(
            "UPDATE friendships SET status = 'accepted', action_user = ? WHERE user1_username = ? AND user2_username = ? AND status = 'pending'",
            (responder, user1, user2)
        )
    else:
        conn.execute(
            "DELETE FROM friendships WHERE user1_username = ? AND user2_username = ?",
            (user1, user2)
        )
    conn.commit()
    conn.close()

def are_friends(user1, user2):
    """检查两人是否是好友"""
    conn = get_db_connection()
    u1, u2 = sorted((user1, user2))
    friendship = conn.execute(
        "SELECT status FROM friendships WHERE user1_username = ? AND user2_username = ? AND status = 'accepted'",
        (u1, u2)
    ).fetchone()
    conn.close()
    return friendship is not None