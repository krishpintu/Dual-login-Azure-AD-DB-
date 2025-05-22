const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const JWT_SECRET = 'your_jwt_secret_key_here_change_this_in_prod';

// Dummy DB users
const DB_USERS = [
  { id: '1', username: 'user1', password: 'pass1', roles: ['user'] },
  { id: '2', username: 'admin', password: 'adminpass', roles: ['admin', 'user'] }
];

// In-memory refresh token store: refreshToken -> userId
const refreshTokens = new Map();

// Middleware to verify JWT (for both Azure AD tokens or custom tokens)
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.sendStatus(401);

  const token = authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// DB login route
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = DB_USERS.find(u => u.username === username);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const accessToken = jwt.sign(
    { sub: user.id, username: user.username, roles: user.roles },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = crypto.randomBytes(40).toString('hex');
  refreshTokens.set(refreshToken, user.id);

  res.json({ accessToken, refreshToken });
});

// Refresh token route
app.post('/api/token/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken || !refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
  const userId = refreshTokens.get(refreshToken);
  const user = DB_USERS.find(u => u.id === userId);
  if (!user) return res.status(401).json({ error: 'User not found' });

  const newAccessToken = jwt.sign(
    { sub: user.id, username: user.username, roles: user.roles },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  res.json({ accessToken: newAccessToken });
});

// Protected profile route example
app.get('/api/profile', authenticateToken, (req, res) => {
  const user = DB_USERS.find(u => u.id === req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({
    id: user.id,
    username: user.username,
    roles: user.roles,
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
