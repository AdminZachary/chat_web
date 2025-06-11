document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    // 全局状态
    let currentUser = null;
    let activeContact = null;
    let friends = [];
    let currentUploadXHR = null; 

    // --- DOM 元素 ---
    const appContainer = document.getElementById('app-container');
    const messageForm = document.getElementById('message-form');
    const inputBox = document.getElementById('message-input-box');
    const sendBtn = messageForm.querySelector('.send-btn');
    const fileBtn = document.getElementById('file-btn');
    const fileInput = document.getElementById('file-input');
    const messageInputElement = document.querySelector('.message-input');
    const uploadProgressContainer = document.getElementById('upload-progress-container');
    const uploadProgressBar = document.getElementById('upload-progress-bar');
    const uploadProgressText = document.getElementById('upload-progress-text');
    const cancelUploadBtn = document.getElementById('cancel-upload-btn');
    const contactList = document.getElementById('contact-list');
    const welcomePanel = document.getElementById('welcome-panel');
    const chatPanel = document.getElementById('chat-panel');
    const messagesContainer = document.getElementById('messages');
    const currentUserAvatar = document.getElementById('current-user-avatar');
    const currentUserNickname = document.getElementById('current-user-nickname');
    const chatWithName = document.getElementById('chat-with-name');
    const chatWithStatus = document.getElementById('chat-with-status');
    const emojiBtn = document.getElementById('emoji-btn');
    const emojiPanel = document.getElementById('emoji-panel');
    const backToContactsBtn = document.getElementById('back-to-contacts-btn');
    const themeSwitcherBtn = document.getElementById('theme-switcher-btn');
    const addFriendBtn = document.getElementById('add-friend-btn');
    const addFriendModal = document.getElementById('add-friend-modal');
    const userSearchForm = document.getElementById('user-search-form');
    const userSearchInput = document.getElementById('user-search-input');
    const userSearchResults = document.getElementById('user-search-results');
    const friendRequestsBtn = document.getElementById('friend-requests-btn');
    const friendRequestsModal = document.getElementById('friend-requests-modal');
    const friendRequestsList = document.getElementById('friend-requests-list');
    const modals = document.querySelectorAll('.modal');
    const closeBtns = document.querySelectorAll('.close-btn');
    const avatarUploadInput = document.getElementById('avatar-upload-input');

    // --- 头像上传功能 ---
    currentUserAvatar.addEventListener('click', () => { avatarUploadInput.click(); });
    avatarUploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0]; if (!file) return;
        const formData = new FormData(); formData.append('avatar', file);
        fetch('/upload_avatar', { method: 'POST', body: formData })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateAllAvatarInstances(currentUser.username, data.new_avatar_url);
                currentUser.avatar = data.new_avatar_url;
            } else { alert('头像上传失败: ' + data.error); }
        })
        .catch(error => { console.error('Error uploading avatar:', error); alert('头像上传出错。'); })
        .finally(() => { avatarUploadInput.value = ''; });
    });
    socket.on('avatar_updated', (data) => {
        const friend = friends.find(f => f.username === data.username);
        if (friend) { friend.avatar = data.new_avatar_url; }
        updateAllAvatarInstances(data.username, data.new_avatar_url);
    });
    function updateAllAvatarInstances(username, newAvatarUrl) {
        if (currentUser && currentUser.username === username) { document.getElementById('current-user-avatar').src = newAvatarUrl; }
        const contactImg = document.querySelector(`.contact[data-username="${username}"] img`);
        if (contactImg) { contactImg.src = newAvatarUrl; }
        const messageAvatars = document.querySelectorAll(`.avatar-for-${username}`);
        messageAvatars.forEach(img => { img.src = newAvatarUrl; });
    }
    
    // --- 移动端键盘遮挡问题修复 ---
    inputBox.addEventListener('focus', () => { setTimeout(() => { messagesContainer.scrollTop = messagesContainer.scrollHeight; }, 300); });
    window.addEventListener('resize', () => { if (document.activeElement === inputBox) { setTimeout(() => { messagesContainer.scrollTop = messagesContainer.scrollHeight; }, 100); } });

    // --- 主题切换 & 模态窗口处理 (核心修改) ---
    const htmlEl = document.documentElement; const savedTheme = localStorage.getItem('theme') || 'light'; htmlEl.className = savedTheme; themeSwitcherBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    themeSwitcherBtn.addEventListener('click', () => { const newTheme = htmlEl.classList.contains('dark') ? 'light' : 'dark'; htmlEl.className = newTheme; themeSwitcherBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙'; localStorage.setItem('theme', newTheme); });
    
    // **核心修改：使用 classList.add/remove('show') 代替 style.display**
    addFriendBtn.onclick = () => addFriendModal.classList.add('show');
    friendRequestsBtn.onclick = () => { 
        friendRequestsModal.classList.add('show'); 
        const dot = friendRequestsBtn.querySelector('.notification-dot'); 
        if(dot) dot.remove(); 
    };
    closeBtns.forEach(btn => btn.onclick = () => modals.forEach(m => m.classList.remove('show')));
    window.onclick = (e) => modals.forEach(m => { if(e.target == m) m.classList.remove('show'); });


    // --- Emoji 功能 ---
    const emojis = ['😀', '😂', '😊', '😍', '🤔', '👍', '🙏', '🎉', '🚀', '❤️', '🔥', '💯'];
    emojis.forEach(emoji => { const span = document.createElement('span'); span.textContent = emoji; span.addEventListener('click', () => { inputBox.value += emoji; emojiPanel.style.display = 'none'; inputBox.focus(); }); emojiPanel.appendChild(span); });
    emojiBtn.addEventListener('click', (e) => { e.stopPropagation(); emojiPanel.style.display = emojiPanel.style.display === 'block' ? 'none' : 'block'; });
    document.addEventListener('click', (e) => { if (!emojiPanel.contains(e.target) && e.target !== emojiBtn) emojiPanel.style.display = 'none'; });

    // --- 连接 & 初始化数据 ---
    socket.on('connect', () => { console.log('Connected!'); socket.emit('get_initial_data'); inputBox.disabled = false; sendBtn.disabled = false; inputBox.placeholder = '输入消息...'; });
    socket.on('disconnect', () => { console.log('Disconnected!'); inputBox.disabled = true; sendBtn.disabled = true; inputBox.placeholder = '已断开连接...'; });
    socket.on('initial_data_response', (data) => { if(!data.currentUser) { console.error("Could not get user data."); return; } currentUser = data.currentUser; friends = data.friends; updateUIWithInitialData(data); });
    socket.on('reload_data', () => socket.emit('get_initial_data'));
    
    function updateUIWithInitialData(data) { currentUserAvatar.src = data.currentUser.avatar; currentUserNickname.textContent = data.currentUser.nickname; contactList.innerHTML = ''; if (data.friends.length === 0) { contactList.innerHTML = '<p style="text-align:center; color: var(--text-secondary-color); padding: 1rem;">暂无好友</p>'; } else { data.friends.forEach(friend => contactList.appendChild(createContactElement(friend))); } updateFriendRequests(data.pendingRequests); }
    function createContactElement(friend) { const el = document.createElement('div'); el.className = 'contact'; el.dataset.username = friend.username; el.innerHTML = `<img src="${friend.avatar}"><div class="status-dot ${friend.status}" id="status-${friend.username}"></div><div class="contact-info"><h5>${friend.nickname}</h5></div>`; el.addEventListener('click', () => selectContact(friend)); return el; }
    function selectContact(friend) { activeContact = friend; document.querySelectorAll('.contact').forEach(c => c.classList.remove('active')); document.querySelector(`.contact[data-username='${friend.username}']`)?.classList.add('active'); appContainer.classList.add('mobile-chat-view'); welcomePanel.style.display = 'none'; chatPanel.style.display = 'flex'; chatWithName.textContent = friend.nickname; const statusEl = document.getElementById(`status-${friend.username}`); chatWithStatus.textContent = statusEl?.classList.contains('online') ? '在线' : '离线'; socket.emit('load_chat_history', { contact_username: friend.username }); }
    backToContactsBtn.addEventListener('click', () => { appContainer.classList.remove('mobile-chat-view'); activeContact = null; document.querySelectorAll('.contact').forEach(c => c.classList.remove('active')); });

    // --- 消息发送与渲染 ---
    socket.on('chat_history_response', (data) => { if (activeContact && data.contact === activeContact.username) { messagesContainer.innerHTML = ''; data.history.forEach(msg => renderOrUpdateMessage(msg)); } });
    socket.on('receive_message', (msg) => { if (msg.type === 'file_upload_cancelled') { const msgEl = document.getElementById(`msg-${msg.temp_id}`); if (msgEl) msgEl.remove(); return; } if(activeContact && (msg.sender_username === activeContact.username || msg.recipient_username === activeContact.username)) { renderOrUpdateMessage(msg); } });
    messageForm.addEventListener('submit', (e) => { e.preventDefault(); const text = inputBox.value.trim(); if (text && activeContact) { socket.emit('send_message', { recipient_username: activeContact.username, type: 'text', text: text }); inputBox.value = ''; } });
    
    function renderOrUpdateMessage(msg) {
        const tempId = msg.temp_id;
        let msgEl = tempId ? document.getElementById(`msg-${tempId}`) : null;
        const isSent = msg.sender_username === currentUser.username;
        const sender = isSent ? currentUser : (friends.find(f => f.username === msg.sender_username) || { username: msg.sender_username, avatar: msg.sender_avatar, nickname: msg.sender_nickname });

        if (!msgEl) {
            msgEl = document.createElement('div');
            msgEl.className = `message ${isSent ? 'sent' : 'received'}`;
            if (tempId) msgEl.id = `msg-${tempId}`;
            messagesContainer.appendChild(msgEl);
        }
        
        if (!sender) { console.error("Could not find sender for message:", msg); return; }

        let bubbleHTML;
        const messageType = msg.type || msg.message_type;

        switch (messageType) {
            case 'file_uploading':
                const senderNickname = isSent ? '你' : (sender.nickname || msg.sender_username);
                const uploadingText = `${senderNickname} 正在发送: ${msg.filename || '一个文件...'}`;
                bubbleHTML = `<div class="file-bubble uploading-bubble"><span><div class="spinner"></div></span><div class="file-info"><span class="filename">${uploadingText}</span></div></div>`;
                break;
            case 'file':
                const fileUrl = msg.url || msg.file_url;
                bubbleHTML = `<a href="${fileUrl}" target="_blank" class="file-bubble"><span>📄</span><div class="file-info"><span class="filename">${msg.filename || '文件'}</span></div></a>`;
                break;
            default:
                bubbleHTML = `<div class="message-bubble">${msg.content}</div>`;
                break;
        }

        const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        msgEl.innerHTML = `<img class="avatar avatar-for-${sender.username}" src="${sender.avatar}" alt="Avatar"><div class="text-content">${bubbleHTML}<div class="timestamp">${time}</div></div>`;
        if (msg.type !== 'file_uploading') {
             messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    // --- 文件上传与进度 ---
    fileBtn.addEventListener('click', () => { if (currentUploadXHR) { alert('请等待当前文件上传完成。'); return; } fileInput.click(); });
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0]; if (!file || !activeContact) return;
        const tempId = `temp_${Date.now()}`;
        socket.emit('send_message', { recipient_username: activeContact.username, type: 'file_uploading', filename: file.name, temp_id: tempId, });
        renderOrUpdateMessage({ sender_username: currentUser.username, type: 'file_uploading', filename: file.name, temp_id: tempId, timestamp: Date.now() });
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        const formData = new FormData(); formData.append('file', file); currentUploadXHR = new XMLHttpRequest(); currentUploadXHR.open('POST', '/upload', true);
        const cleanupAndNotify = (isCancelled = false, temp_id_to_clean) => { uploadProgressContainer.style.display = 'none'; fileInput.value = ''; currentUploadXHR = null; if (isCancelled) { socket.emit('send_message', { recipient_username: activeContact.username, type: 'file_upload_cancelled', temp_id: temp_id_to_clean }); document.getElementById(`msg-${temp_id_to_clean}`)?.remove(); } };
        currentUploadXHR.onload = function() { let wasSuccess = false; if (currentUploadXHR.status === 200) { const result = JSON.parse(currentUploadXHR.responseText); if (result.success) { wasSuccess = true; socket.emit('send_message', { recipient_username: activeContact.username, type: 'file', url: result.file_url, filename: file.name, temp_id: tempId }); } else { alert('文件上传失败: ' + (result.error || '未知错误')); } } else { alert('文件上传失败: 服务器错误.'); } cleanupAndNotify(!wasSuccess, tempId); };
        currentUploadXHR.onerror = () => { alert('网络错误，上传中断。'); cleanupAndNotify(true, tempId); };
        currentUploadXHR.onabort = () => { console.log('Upload aborted.'); cleanupAndNotify(true, tempId); };
        currentUploadXHR.upload.onprogress = function(event) { if (event.lengthComputable) { const percent = Math.round((event.loaded / event.total) * 100); uploadProgressContainer.style.display = 'block'; uploadProgressBar.style.width = percent + '%'; uploadProgressText.textContent = `正在上传 ${file.name}... ${percent}%`; } };
        cancelUploadBtn.onclick = () => { if (currentUploadXHR) currentUploadXHR.abort(); };
        currentUploadXHR.send(formData);
    });

    // --- 好友管理逻辑 ---
    userSearchForm.addEventListener('submit', (e) => { e.preventDefault(); const query = userSearchInput.value.trim(); if (query) { socket.emit('search_user', { query }); } else { userSearchResults.innerHTML = ''; } });
    socket.on('search_results', (results) => { userSearchResults.innerHTML = ''; if (results.length === 0) { userSearchResults.innerHTML = '<p>没有找到用户</p>'; return; } results.forEach(user => { const resultEl = document.createElement('div'); resultEl.className = 'search-result'; let buttonHTML = `<button class="add-btn" data-username="${user.username}">添加</button>`; if (user.friendship_status === 'pending') { buttonHTML = `<button class="add-btn" disabled>请求已发送</button>`; } else if (user.friendship_status === 'accepted') { buttonHTML = `<button class="add-btn" disabled>已是好友</button>`; } resultEl.innerHTML = `<div class="result-info"><img src="${user.avatar}" alt="Avatar"><span>${user.nickname} (${user.username})</span></div>${buttonHTML}`; userSearchResults.appendChild(resultEl); }); });
    userSearchResults.addEventListener('click', (e) => { if (e.target.classList.contains('add-btn') && !e.target.disabled) { const username = e.target.dataset.username; socket.emit('send_friend_request', { username }); e.target.textContent = '已发送'; e.target.disabled = true; } });
    socket.on('friend_request_sent', (data) => { alert(data.message); });
    socket.on('new_friend_request', (request) => { if(!document.querySelector('#friend-requests-btn .notification-dot')) { const dot = document.createElement('div'); dot.className = 'notification-dot'; friendRequestsBtn.appendChild(dot); } updateFriendRequests([request]); });
    function updateFriendRequests(requests) { const listIsEmpty = friendRequestsList.querySelector('p'); if(requests.length === 0 && (!friendRequestsList.hasChildNodes() || listIsEmpty)) { friendRequestsList.innerHTML = '<p>没有新的好友请求</p>'; return; } if (listIsEmpty) friendRequestsList.innerHTML = ''; requests.forEach(req => { if(document.getElementById(`request-${req.username}`)) return; const reqEl = document.createElement('div'); reqEl.className = 'request-item'; reqEl.id = `request-${req.username}`; reqEl.innerHTML = `<div class="result-info"><img src="${req.avatar}"><span>${req.nickname} (${req.username})</span></div><div><button class="accept-btn" data-username="${req.username}">接受</button><button class="decline-btn" data-username="${req.username}">拒绝</button></div>`; friendRequestsList.appendChild(reqEl); }); }
    friendRequestsList.addEventListener('click', (e) => { if(e.target.classList.contains('accept-btn') || e.target.classList.contains('decline-btn')) { const username = e.target.dataset.username; const accept = e.target.classList.contains('accept-btn'); socket.emit('respond_to_friend_request', { username, accept }); document.getElementById(`request-${username}`).remove(); if(!friendRequestsList.hasChildNodes()) { friendRequestsList.innerHTML = '<p>没有新的好友请求</p>'; } } });
    socket.on('status_change', (data) => { const statusDot = document.getElementById(`status-${data.username}`); if(statusDot) { statusDot.className = `status-dot ${data.status}`; if(activeContact && activeContact.username === data.username) { chatWithStatus.textContent = data.status === 'online' ? '在线' : '离线'; } } });
    document.getElementById('logout-btn').addEventListener('click', async () => { await fetch('/api/logout', { method: 'POST' }); window.location.href = '/auth'; });
});