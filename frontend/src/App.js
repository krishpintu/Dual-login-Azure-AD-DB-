import React, { useState, useEffect } from 'react';
import {
  PublicClientApplication,
  InteractionStatus,
} from '@azure/msal-browser';
import { MsalProvider, useMsal, useIsAuthenticated } from '@azure/msal-react';

// MSAL config
const msalConfig = {
  auth: {
    clientId: 'YOUR_AZURE_AD_CLIENT_ID',
    authority: 'https://login.microsoftonline.com/YOUR_TENANT_ID',
    redirectUri: 'https://localhost',
  },
};

const msalInstance = new PublicClientApplication(msalConfig);

function AzureLoginButton() {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const login = () => {
    instance.loginPopup({
      scopes: ['User.Read'],
    }).catch(e => {
      console.error(e);
    });
  };

  return (
    <div>
      {isAuthenticated ? (
        <p>Logged in as: {accounts[0].username}</p>
      ) : (
        <button onClick={login}>Login with Azure AD</button>
      )}
    </div>
  );
}

function DbLogin({ onTokens }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);

  const login = async () => {
    const res = await fetch('https://localhost/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      const data = await res.json();
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      onTokens(data.accessToken, data.refreshToken);
    } else {
      alert('Login failed');
    }
  };

  // Token refresh function
  const refreshAccessToken = async () => {
    const res = await fetch('https://localhost/api/token/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (res.ok) {
      const data = await res.json();
      setAccessToken(data.accessToken);
      onTokens(data.accessToken, refreshToken);
      return data.accessToken;
    } else {
      alert('Session expired. Please login again.');
      setAccessToken(null);
      setRefreshToken(null);
      onTokens(null, null);
      return null;
    }
  };

  // Example: call protected API with token refresh support
  const callProfile = async () => {
    if (!accessToken) return alert('Please login first');
    let res = await fetch('https://localhost/api/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 401) {
      // Try refresh token
      const newToken = await refreshAccessToken();
      if (!newToken) return;
      res = await fetch('https://localhost/api/profile', {
        headers: { Authorization: `Bearer ${newToken}` },
      });
    }
    if (res.ok) {
      const data = await res.json();
      alert('Profile: ' + JSON.stringify(data));
    } else {
      alert('Failed to fetch profile');
    }
  };

  return (
    <div style={{ marginTop: 20 }}>
      <h3>DB Login</h3>
      <input
        placeholder="Username"
        value={username}
        onChange={e => setUsername(e.target.value)}
      /><br />
      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      /><br />
      <button onClick={login}>Login</button>
      <button onClick={callProfile} style={{ marginLeft: 10 }}>
        Get Profile
      </button>
    </div>
  );
}

function App() {
  const [dbAccessToken, setDbAccessToken] = useState(null);
  const [dbRefreshToken, setDbRefreshToken] = useState(null);

  return (
    <MsalProvider instance={msalInstance}>
      <div style={{ padding: 20 }}>
        <h1>Azure AD + DB Dual Login</h1>
        <AzureLoginButton />
        <DbLogin onTokens={(at, rt) => {
          setDbAccessToken(at);
          setDbRefreshToken(rt);
        }} />
      </div>
    </MsalProvider>
  );
}

export default App;
