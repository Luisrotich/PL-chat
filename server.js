const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files from root directory
app.use(express.static(__dirname));
app.use(express.json());

// User data file
const USERS_FILE = './users.json';

// Initialize users if not exists
if (!fs.existsSync(USERS_FILE)) {
    const users = {
        "Precious": {
            password: "Precious1432.ke",
            name: "Precious"
        },
        "Luis": {
            password: "Luis2850.ke",
            name: "Luis"
        }
    };
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    console.log('Created users.json file with your users');
}

// Read users
function getUsers() {
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading users file:', error);
        return {};
    }
}

// Authentication endpoint
app.post('/login', (req, res) => {
    console.log('Login attempt:', req.body);
    const { username, password } = req.body;
    const users = getUsers();
    
    // Check if user exists and password matches
    if (users[username] && users[username].password === password) {
        console.log(`✅ Login successful: ${username}`);
        res.json({ success: true, username, name: users[username].name });
    } else {
        console.log(`❌ Login failed: ${username}`);
        res.json({ success: false, message: "Invalid credentials" });
    }
});

// Store active connections
const clients = new Map();
let messageHistory = [];

// WebSocket server
wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection attempt');
    let username = null;

    ws.on('message', (data) => {
        try {
            const parsed = JSON.parse(data);
            console.log('WebSocket message:', parsed.type);
            
            switch(parsed.type) {
                case 'auth':
                    const users = getUsers();
                    if (users[parsed.username] && users[parsed.username].password === parsed.password) {
                        username = parsed.username;
                        clients.set(username, ws);
                        console.log(`✅ WebSocket authenticated: ${username}`);
                        
                        // Send auth success with message history
                        ws.send(JSON.stringify({ 
                            type: 'auth_success', 
                            username,
                            messageHistory 
                        }));
                        
                        // Notify other user
                        broadcastToOther(username, {
                            type: 'user_status',
                            username,
                            status: 'online'
                        });
                    } else {
                        console.log(`❌ WebSocket auth failed: ${parsed.username}`);
                        ws.send(JSON.stringify({ type: 'auth_fail' }));
                        ws.close();
                    }
                    break;
                    
                case 'message':
                    if (username) {
                        const message = {
                            id: Date.now(),
                            username,
                            text: parsed.text,
                            timestamp: new Date().toLocaleTimeString()
                        };
                        messageHistory.push(message);
                        console.log(`📨 Message from ${username}: ${parsed.text}`);
                        
                        // Keep only last 100 messages
                        if (messageHistory.length > 100) {
                            messageHistory = messageHistory.slice(-100);
                        }
                        
                        // Broadcast to all connected clients
                        broadcastToAll(message);
                    }
                    break;
                    
                case 'typing':
                    if (username) {
                        broadcastToOther(username, {
                            type: 'typing',
                            isTyping: parsed.isTyping,
                            username: username
                        });
                    }
                    break;
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });
    
    ws.on('close', () => {
        if (username) {
            console.log(`🔴 User disconnected: ${username}`);
            clients.delete(username);
            broadcastToOther(username, {
                type: 'user_status',
                username,
                status: 'offline'
            });
        }
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

function broadcastToAll(message) {
    clients.forEach((client, user) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'message', data: message }));
        }
    });
}

function broadcastToOther(senderUsername, data) {
    clients.forEach((client, username) => {
        if (username !== senderUsername && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

const PORT = 5000;
server.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log('📝 Registered users:');
    const users = getUsers();
    Object.keys(users).forEach(user => {
        console.log(`   - ${user}`);
    });
    console.log('\n💡 Open two browser windows and login with different users\n');
});