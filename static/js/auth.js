document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');

    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const loginContent = document.getElementById('login-form-content');
    const registerContent = document.getElementById('register-form-content');

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

        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();
        if (result.success) {
            window.location.href = '/';
        } else {
            loginError.textContent = result.message || '登录失败';
        }
    });
    
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        registerError.textContent = '';
        const username = document.getElementById('register-username').value;
        const nickname = document.getElementById('register-nickname').value;
        const password = document.getElementById('register-password').value;
        // **新增：获取并校验确认密码**
        const passwordConfirm = document.getElementById('register-password-confirm').value;

        if (password !== passwordConfirm) {
            registerError.textContent = '两次输入的密码不一致。';
            return;
        }
        
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // **新增：将确认密码一并发送到后端**
            body: JSON.stringify({ username, password, password_confirm: passwordConfirm, nickname })
        });

        const result = await response.json();
        if (result.success) {
            alert('注册成功！请登录。');
            showLoginLink.click();
            loginForm.reset();
            registerForm.reset();
        } else {
            registerError.textContent = result.message || '注册失败';
        }
    });
});