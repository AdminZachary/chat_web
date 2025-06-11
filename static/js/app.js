document.addEventListener('DOMContentLoaded', () => {

    // --- 全局变量和DOM元素 ---
    let socket;
    let currentUser = null;
    let activeContact = null;
    let friends = [];
    let currentUploadXHR = null;

    // --- DOM元素定义 (这是之前缺失的部分) ---

    // 认证部分
    const authWrapper = document.getElementById('auth-wrapper');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const loginContent = document.getElementById('login-form-content');
    const registerContent = document.getElementById('register-form-content');

    // 聊天主应用部分
    const appWrapper = document.getElementById('app-wrapper');
    const appContainer = document.getElementById('app-container');
    const messageForm = document.getElementById('message-form');
    const inputBox = document.getElementById('message-input-box');
    const sendBtn = messageForm.querySelector('.send-btn');

    // 文件与上传部分
    const fileBtn = document.getElementById('file-btn');
    const fileInput = document.getElementById('file-input');
    const uploadProgressContainer = document.getElementById('upload-progress-container');
    const uploadProgressBar = document.getElementById('upload-progress-bar');
    const uploadProgressText = document.getElementById('upload-progress-text');
    const cancelUploadBtn = document.getElementById('cancel-upload-btn');
    const avatarUploadInput = document.getElementById('avatar-upload-input');

    // 主界面UI部分
    const contactList = document.getElementById('contact-list');
    const welcomePanel = document.getElementById('welcome-panel');
    const chatPanel = document.getElementById('chat-panel');
    const messagesContainer = document.getElementById('messages');
    const currentUserAvatar = document.getElementById('current-user-avatar');
    const currentUserNickname = document.getElementById('current-user-nickname');
    const chatWithName = document.getElementById('chat-with-name');
    const chatWithStatus = document.getElementById('chat-with-status');
    const backToContactsBtn = document.getElementById('back-to-contacts-btn');
    
    // 操作与模态框部分
    const themeSwitcherBtn = document.getElementById('theme-switcher-btn');
    const emojiBtn = document.getElementById('emoji-btn');
    const emojiPanel = document.getElementById('emoji-panel');
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
    const logoutBtn = document.getElementById('logout-btn');


    // --- 认证逻辑 ---
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginContent.style.display = 'none';
        registerContent.style.display = 'block';
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerContent.style.display = 'none';
        loginContent.style.display = 'block';
    });
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.textContent = '';
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const result = await response.json();
            if (result.success) {
                performLoginTransition(result.initial_data);
            } else {
                loginError.textContent = result.message; // 使用后端传来的翻译
            }
        } catch (error) {
            loginError.textContent = translations.error_network;
        }
    });
    
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        registerError.textContent = '';
        const username = document.getElementById('register-username').value;
        const nickname = document.getElementById('register-nickname').value;
        const password = document.getElementById('register-password').value;
        const passwordConfirm = document.getElementById('register-password-confirm').value;

        if (password !== passwordConfirm) {
            registerError.textContent = translations.error_password_mismatch;
            return;
        }
        
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, password_confirm: passwordConfirm, nickname })
        });

        const result = await response.json();
        if (result.success) {
            alert(translations.register_success);
            showLoginLink.click();
            loginForm.reset();
            registerForm.reset();
        } else {
            registerError.textContent = result.message; // 使用后端传来的翻译
        }
    });

    function performLoginTransition(initialData) {
        authWrapper.classList.add('fade-zoom-out');

        authWrapper.addEventListener('animationend', () => {
            authWrapper.style.display = 'none';
            authWrapper.classList.remove('fade-zoom-out');
            
            appWrapper.style.visibility = 'visible';
            appWrapper.classList.add('fade-zoom-in');
            
            requestAnimationFrame(() => {
                setTimeout(() => {
                    initializeChatApp(initialData);
                }, 50);
            });

        }, { once: true });
    }

    // --- 聊天应用初始化和逻辑 ---
    function initializeChatApp(initialData) {
        socket = io();
        currentUser = initialData.currentUser;
        friends = initialData.friends;
        updateUIWithInitialData(initialData);
        bindChatEventListeners();
        bindSocketEvents();
    }

    function updateUIWithInitialData(data) {
        currentUserAvatar.src = data.currentUser.avatar;
        currentUserNickname.textContent = data.currentUser.nickname;
        contactList.innerHTML = '';
        if (data.friends.length > 0) {
            data.friends.forEach(friend => {
                const friendWithStatus = { ...friend, status: 'offline' };
                contactList.appendChild(createContactElement(friendWithStatus));
            });
        }
        updateFriendRequests(data.pendingRequests);
    }
    
    function createContactElement(friend) {
        const el = document.createElement('div');
        el.className = 'contact';
        el.dataset.username = friend.username;
        el.innerHTML = `<img src="${friend.avatar}"><div class="status-dot ${friend.status}" id="status-${friend.username}"></div><div class="contact-info"><h5>${friend.nickname}</h5></div>`;
        el.addEventListener('click', () => selectContact(friend));
        return el;
    }
    
    function selectContact(friend) {
        activeContact = friend;
        document.querySelectorAll('.contact').forEach(c => c.classList.remove('active'));
        document.querySelector(`.contact[data-username='${friend.username}']`)?.classList.add('active');
        appContainer.classList.add('mobile-chat-view');
        welcomePanel.style.display = 'none';
        chatPanel.style.display = 'flex';
        chatWithName.textContent = friend.nickname;
        const statusEl = document.getElementById(`status-${friend.username}`);
        chatWithStatus.textContent = statusEl?.classList.contains('online') ? translations.online : translations.offline;
        socket.emit('load_chat_history', { contact_username: friend.username });
    }

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
        
        if (!sender) { return; }

        let bubbleHTML;
        const messageType = msg.type || msg.message_type;
        const imageUrl = msg.local_preview_url || msg.url || msg.file_url;
        const videoUrl = msg.local_preview_url || msg.url || msg.file_url;

        switch (messageType) {
            case 'image_uploading':
                bubbleHTML = `<div class="preview-container uploading"><img src="${imageUrl}" class="image-preview" onload="this.style.opacity=1; messagesContainer.scrollTop = messagesContainer.scrollHeight;"><div class="upload-spinner-overlay"><div class="spinner"></div></div></div>`;
                break;
            case 'image':
                bubbleHTML = `<div class="preview-container"><a href="${imageUrl}" target="_blank"><img src="${imageUrl}" class="image-preview" onload="this.style.opacity=1; messagesContainer.scrollTop = messagesContainer.scrollHeight;"></a></div>`;
                break;
            case 'video_uploading':
                bubbleHTML = `<div class="preview-container uploading"><video src="${videoUrl}" class="video-preview" muted loop autoplay></video><div class="upload-spinner-overlay"><div class="spinner"></div></div></div>`;
                break;
            case 'video':
                bubbleHTML = `<div class="preview-container"><video src="${videoUrl}" class="video-preview" controls></video></div>`;
                break;
            case 'file_uploading':
                bubbleHTML = `<div class="file-bubble uploading-bubble"><span><div class="spinner"></div></span><div class="file-info"><span class="filename">${msg.filename}</span></div></div>`;
                break;
            case 'file':
                bubbleHTML = `<a href="${msg.url || msg.file_url}" target="_blank" class="file-bubble"><span>📄</span><div class="file-info"><span class="filename">${msg.filename || 'File'}</span></div></a>`;
                break;
            default:
                bubbleHTML = `<div class="message-bubble">${msg.content}</div>`;
                break;
        }

        const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        msgEl.innerHTML = `<img class="avatar avatar-for-${sender.username}" src="${sender.avatar}" alt="Avatar"><div class="text-content">${bubbleHTML}<div class="timestamp">${time}</div></div>`;
        if (!messageType.includes('uploading')) {
             messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    function updateFriendRequests(requests) {
        const listIsEmpty = friendRequestsList.querySelector('p');
        if (requests.length === 0 && (!friendRequestsList.hasChildNodes() || listIsEmpty)) {
            friendRequestsList.innerHTML = `<p>${translations.no_friend_requests}</p>`;
            return;
        }
        if (listIsEmpty) friendRequestsList.innerHTML = '';
        requests.forEach(req => {
            if (document.getElementById(`request-${req.username}`)) return;
            const reqEl = document.createElement('div');
            reqEl.className = 'request-item';
            reqEl.id = `request-${req.username}`;
            reqEl.innerHTML = `<div class="result-info"><img src="${req.avatar}"><span>${req.nickname} (${req.username})</span></div><div><button class="accept-btn" data-username="${req.username}">Accept</button><button class="decline-btn" data-username="${req.username}">Decline</button></div>`;
            friendRequestsList.appendChild(reqEl);
        });
    }

    function updateAllAvatarInstances(username, newAvatarUrl) {
        if (currentUser && currentUser.username === username) { document.getElementById('current-user-avatar').src = newAvatarUrl; }
        const contactImg = document.querySelector(`.contact[data-username="${username}"] img`);
        if (contactImg) { contactImg.src = newAvatarUrl; }
        const messageAvatars = document.querySelectorAll(`.avatar-for-${username}`);
        messageAvatars.forEach(img => { img.src = newAvatarUrl; });
    }

    function bindChatEventListeners() {
        themeSwitcherBtn.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
        });

        addFriendBtn.onclick = () => addFriendModal.classList.add('show');
        friendRequestsBtn.onclick = () => { 
            friendRequestsModal.classList.add('show'); 
            const dot = friendRequestsBtn.querySelector('.notification-dot'); 
            if(dot) dot.remove(); 
        };
        closeBtns.forEach(btn => btn.onclick = () => modals.forEach(m => m.classList.remove('show')));
        window.onclick = (e) => modals.forEach(m => { if(e.target == m) m.classList.remove('show'); });
        
        backToContactsBtn.addEventListener('click', () => {
            appContainer.classList.remove('mobile-chat-view');
            activeContact = null;
            document.querySelectorAll('.contact').forEach(c => c.classList.remove('active'));
        });

        messageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = inputBox.value.trim();
            if (text && activeContact) {
                socket.emit('send_message', { recipient_username: activeContact.username, type: 'text', text: text });
                inputBox.value = '';
            }
        });
        
        logoutBtn.addEventListener('click', async () => {
            await fetch('/api/logout', { method: 'POST' });
            window.location.reload();
        });

        currentUserAvatar.addEventListener('click', () => avatarUploadInput.click());
        avatarUploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0]; if (!file) return;
            const formData = new FormData(); formData.append('avatar', file);
            fetch('/upload_avatar', { method: 'POST', body: formData })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    updateAllAvatarInstances(currentUser.username, data.new_avatar_url);
                    currentUser.avatar = data.new_avatar_url;
                } else { alert(translations.avatar_upload_failed + data.error); }
            })
            .catch(error => { alert(translations.avatar_upload_error); })
            .finally(() => { avatarUploadInput.value = ''; });
        });
        
        const emojis = ['😀', '😂', '😊', '😍', '🤔', '👍', '🙏', '🎉', '🚀', '❤️', '🔥', '💯'];
        emojis.forEach(emoji => { const span = document.createElement('span'); span.textContent = emoji; span.addEventListener('click', () => { inputBox.value += emoji; emojiPanel.style.display = 'none'; inputBox.focus(); }); emojiPanel.appendChild(span); });
        emojiBtn.addEventListener('click', (e) => { e.stopPropagation(); emojiPanel.style.display = emojiPanel.style.display === 'block' ? 'none' : 'block'; });
        document.addEventListener('click', (e) => { if (!emojiPanel.contains(e.target) && e.target !== emojiBtn) emojiPanel.style.display = 'none'; });

        fileBtn.addEventListener('click', () => { if (currentUploadXHR) { alert(translations.upload_wait); return; } fileInput.click(); });
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file || !activeContact) return;

            const tempId = `temp_${Date.now()}`;
            const fileType = file.type.split('/')[0];
            let messageType;
            let localPreviewUrl = null;

            if (fileType === 'image' || fileType === 'video') {
                messageType = `${fileType}_uploading`;
                localPreviewUrl = URL.createObjectURL(file);
            } else {
                messageType = 'file_uploading';
            }

            const uploadingMessage = {
                recipient_username: activeContact.username,
                type: messageType,
                filename: file.name,
                temp_id: tempId,
                local_preview_url: localPreviewUrl 
            };
            socket.emit('send_message', uploadingMessage);
            
            renderOrUpdateMessage({
                ...uploadingMessage,
                sender_username: currentUser.username, 
                timestamp: new Date().toISOString()
            });
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

            const formData = new FormData();
            formData.append('file', file);
            currentUploadXHR = new XMLHttpRequest();
            currentUploadXHR.open('POST', '/upload', true);

            const cleanupAndNotify = (isCancelled = false, temp_id_to_clean) => {
                uploadProgressContainer.style.display = 'none';
                fileInput.value = '';
                currentUploadXHR = null;
                if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
                if (isCancelled) {
                    socket.emit('send_message', { recipient_username: activeContact.username, type: 'file_upload_cancelled', temp_id: temp_id_to_clean });
                    document.getElementById(`msg-${temp_id_to_clean}`)?.remove();
                }
            };

            currentUploadXHR.onload = function() {
                let wasSuccess = false;
                if (currentUploadXHR.status === 200) {
                    const result = JSON.parse(currentUploadXHR.responseText);
                    if (result.success) {
                        wasSuccess = true;
                        const finalMessageType = (fileType === 'image' || fileType === 'video') ? fileType : 'file';
                        socket.emit('send_message', { 
                            recipient_username: activeContact.username, 
                            type: finalMessageType, 
                            url: result.file_url, 
                            filename: file.name, 
                            temp_id: tempId 
                        });
                    } else {
                        alert(translations.upload_failed + (result.error || ''));
                    }
                } else {
                    alert(translations.upload_failed_server);
                }
                cleanupAndNotify(!wasSuccess, tempId);
            };

            currentUploadXHR.onerror = () => { alert(translations.upload_error_network_interrupted); cleanupAndNotify(true, tempId); };
            currentUploadXHR.onabort = () => { cleanupAndNotify(true, tempId); };
            currentUploadXHR.upload.onprogress = function(event) { if (event.lengthComputable) { const percent = Math.round((event.loaded / event.total) * 100); uploadProgressContainer.style.display = 'block'; uploadProgressBar.style.width = percent + '%'; uploadProgressText.textContent = `${translations.uploading} ${file.name}... ${percent}%`; } };
            cancelUploadBtn.onclick = () => { if (currentUploadXHR) currentUploadXHR.abort(); };
            
            currentUploadXHR.send(formData);
        });

        userSearchForm.addEventListener('submit', (e) => { e.preventDefault(); const query = userSearchInput.value.trim(); if (query) { socket.emit('search_user', { query }); } else { userSearchResults.innerHTML = ''; } });
        userSearchResults.addEventListener('click', (e) => { if (e.target.classList.contains('add-btn') && !e.target.disabled) { const username = e.target.dataset.username; socket.emit('send_friend_request', { username }); e.target.textContent = translations.request_sent; e.target.disabled = true; } });
        friendRequestsList.addEventListener('click', (e) => { if(e.target.classList.contains('accept-btn') || e.target.classList.contains('decline-btn')) { const username = e.target.dataset.username; const accept = e.target.classList.contains('accept-btn'); socket.emit('respond_to_friend_request', { username, accept }); document.getElementById(`request-${username}`).remove(); if(!friendRequestsList.hasChildNodes()) { friendRequestsList.innerHTML = `<p>${translations.no_friend_requests}</p>`; } } });
    }
    
    function bindSocketEvents() {
        socket.on('connect', () => {
            inputBox.disabled = false;
            sendBtn.disabled = false;
            inputBox.placeholder = translations.enter_message;
            socket.emit('get_initial_data');
        });

        socket.on('disconnect', () => {
            inputBox.disabled = true;
            sendBtn.disabled = true;
            inputBox.placeholder = translations.disconnected;
        });

        socket.on('initial_data_response', (data) => {
            friends = data.friends;
            contactList.innerHTML = '';
             if (data.friends.length > 0) {
                data.friends.forEach(friend => contactList.appendChild(createContactElement(friend)));
            }
        });
        
        socket.on('chat_history_response', (data) => { if (activeContact && data.contact === activeContact.username) { messagesContainer.innerHTML = ''; data.history.forEach(msg => renderOrUpdateMessage(msg)); messagesContainer.scrollTop = messagesContainer.scrollHeight; } });
        socket.on('receive_message', (msg) => { if (msg.type === 'file_upload_cancelled') { const msgEl = document.getElementById(`msg-${msg.temp_id}`); if (msgEl) msgEl.remove(); return; } if(activeContact && (msg.sender_username === activeContact.username || msg.recipient_username === activeContact.username)) { renderOrUpdateMessage(msg); } });
        socket.on('reload_data', () => socket.emit('get_initial_data'));
        socket.on('search_results', (results) => { 
            userSearchResults.innerHTML = ''; 
            if (results.length === 0) { userSearchResults.innerHTML = `<p>${translations.no_users_found}</p>`; return; } 
            results.forEach(user => { 
                const resultEl = document.createElement('div'); 
                resultEl.className = 'search-result'; 
                let buttonHTML = `<button class="add-btn" data-username="${user.username}">${translations.add}</button>`; 
                if (user.friendship_status === 'pending') { buttonHTML = `<button class="add-btn" disabled>${translations.request_already_sent}</button>`; } 
                else if (user.friendship_status === 'accepted') { buttonHTML = `<button class="add-btn" disabled>${translations.already_friends}</button>`; } 
                resultEl.innerHTML = `<div class="result-info"><img src="${user.avatar}" alt="Avatar"><span>${user.nickname} (${user.username})</span></div>${buttonHTML}`; 
                userSearchResults.appendChild(resultEl); 
            }); 
        });
        socket.on('friend_request_sent', (data) => { if(data.success) { /* Maybe show a small success toast */ } else { alert(data.message) } });
        socket.on('new_friend_request', (request) => { if(!document.querySelector('#friend-requests-btn .notification-dot')) { const dot = document.createElement('div'); dot.className = 'notification-dot'; friendRequestsBtn.appendChild(dot); } updateFriendRequests([request]); });
        socket.on('status_change', (data) => {
            const statusDot = document.getElementById(`status-${data.username}`);
            if (statusDot) {
                statusDot.className = `status-dot ${data.status}`;
                if (activeContact && activeContact.username === data.username) {
                    chatWithStatus.textContent = data.status === 'online' ? translations.online : translations.offline;
                }
            }
        });
        socket.on('avatar_updated', (data) => {
            const friend = friends.find(f => f.username === data.username);
            if (friend) { friend.avatar = data.new_avatar_url; }
            updateAllAvatarInstances(data.username, data.new_avatar_url);
        });
    }
});
