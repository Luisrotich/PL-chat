let ws = null;
let currentUser = null;

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const chatScreen = document.getElementById('chatScreen');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const chatMessages = document.getElementById('chatMessages');
const currentUserSpan = document.getElementById('currentUser');
const otherUserStatus = document.getElementById('otherUserStatus');

// Login handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Show loading state
    const submitBtn = loginForm.querySelector('button');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Logging in...';
    submitBtn.disabled = true;
    
    try {
        console.log('Attempting login for:', username);
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        console.log('Login response:', data);
        
        if (data.success) {
            currentUser = data.username;
            currentUserSpan.textContent = data.name || data.username;
            connectWebSocket(username, password);
        } else {
            document.getElementById('loginError').textContent = 'Invalid username or password';
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        console.error('Login error:', error);
        document.getElementById('loginError').textContent = 'Connection error. Make sure server is running on port 5000';
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

function connectWebSocket(username, password) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    console.log('Connecting to WebSocket:', wsUrl);
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('WebSocket connected, sending auth...');
        ws.send(JSON.stringify({
            type: 'auth',
            username: username,
            password: password
        }));
    };
    
    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message:', data.type);
            handleWebSocketMessage(data);
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        document.getElementById('loginError').textContent = 'WebSocket connection error';
        const submitBtn = loginForm.querySelector('button');
        submitBtn.textContent = 'Login';
        submitBtn.disabled = false;
    };
    
    ws.onclose = () => {
        console.log('WebSocket closed');
        if (currentUser) {
            showLoginScreen();
            alert('Disconnected from server');
        }
    };
}

function handleWebSocketMessage(data) {
    switch(data.type) {
        case 'auth_success':
            console.log('Auth successful, showing chat screen');
            showChatScreen();
            // Load message history
            if (data.messageHistory && data.messageHistory.length > 0) {
                chatMessages.innerHTML = '';
                data.messageHistory.forEach(msg => addMessageToChat(msg));
            }
            break;
            
        case 'auth_fail':
            console.log('Auth failed');
            alert('Authentication failed');
            ws.close();
            showLoginScreen();
            break;
            
        case 'message':
            console.log('New message received');
            addMessageToChat(data.data);
            break;
            
        case 'user_status':
            console.log('User status update:', data.username, data.status);
            updateOtherUserStatus(data.username, data.status);
            break;
    }
}

function addMessageToChat(message) {
    const isSent = message.username === currentUser;
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
    
    if (!isSent) {
        const senderSpan = document.createElement('div');
        senderSpan.className = 'message-sender';
        senderSpan.textContent = message.username;
        messageDiv.appendChild(senderSpan);
    }
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';
    bubbleDiv.textContent = message.text;
    
    const timeSpan = document.createElement('div');
    timeSpan.className = 'message-time';
    timeSpan.textContent = message.timestamp || new Date().toLocaleTimeString();
    
    bubbleDiv.appendChild(timeSpan);
    messageDiv.appendChild(bubbleDiv);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Remove welcome message if exists
    const welcomeMsg = chatMessages.querySelector('.welcome-message');
    if (welcomeMsg) welcomeMsg.remove();
}

function updateOtherUserStatus(username, status) {
    otherUserStatus.textContent = status === 'online' ? '🟢 Online' : '⚫ Offline';
    otherUserStatus.className = `status ${status}`;
}

function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !ws || ws.readyState !== WebSocket.OPEN) {
        console.log('Cannot send message:', { text, wsState: ws?.readyState });
        return;
    }
    
    ws.send(JSON.stringify({
        type: 'message',
        text: text
    }));
    
    messageInput.value = '';
    messageInput.focus();
}

function showChatScreen() {
    loginScreen.classList.remove('active');
    chatScreen.classList.add('active');
    messageInput.focus();
}

function showLoginScreen() {
    chatScreen.classList.remove('active');
    loginScreen.classList.add('active');
    document.getElementById('loginForm').reset();
    document.getElementById('loginError').textContent = '';
    currentUser = null;
    if (ws) {
        ws.close();
        ws = null;
    }
}

// Event listeners
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});
logoutBtn.addEventListener('click', () => {
    showLoginScreen();
});