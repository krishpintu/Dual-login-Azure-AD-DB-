const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwksClient = require('jwks-rsa');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// In-memory demo DB users (store hashed passwords in real DB)
const DB_USERS = [
  { id: 1, username: 'alice', passwordHash: bcrypt.hashSync('password123', 10), roles: ['user'] },
  { id: 2, username: 'admin', passwordHash: bcrypt.hashSync('adminpass', 10), roles: ['admin'] },
];

// JWKS client for Azure AD token validation
const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function (err, key) {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

// DB login route
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = DB_USERS.find((u) => u.username === username);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { sub: user.id, username: user.username, roles: user.roles },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.json({ token });
});

// Middleware to accept Azure AD or DB JWT token
function checkJwtDual(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');

  if (!token) return res.status(401).json({ error: 'Token missing' });

  // Try DB JWT verify
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.authType = 'db';
    return next();
  } catch (_) {
    // Not DB token, try Azure AD token next
  }

  jwt.verify(
    token,
    getKey,
    {
      audience: process.env.AZURE_CLIENT_ID,
      issuer: `https://sts.windows.net/${process.env.AZURE_TENANT_ID}/`,
      algorithms: ['RS256'],
    },
    (err, decoded) => {
      if (err) return res.status(401).json({ error: 'Token invalid', details: err.message });
      req.user = decoded;
      req.authType = 'azuread';
      next();
    }
  );
}

// Protected profile route
app.get('/api/profile', checkJwtDual, async (req, res) => {
  if (req.authType === 'azuread') {
    // For demo, just return token claims
    res.json({ user: req.user, authType: 'azuread' });
  } else {
    // DB user info
    res.json({ user: req.user, authType: 'db' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
