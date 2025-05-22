import React, { useState } from "react";
import { PublicClientApplication, InteractionRequiredAuthError } from "@azure/msal-browser";
import { MsalProvider, useMsal, useIsAuthenticated } from "@azure/msal-react";

const msalConfig = {
  auth: {
    clientId: process.env.REACT_APP_AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.REACT_APP_AZURE_TENANT_ID}`,
    redirectUri: window.location.origin,
  },
};

const loginRequest = {
  scopes: ["User.Read"],
};

const msalInstance = new PublicClientApplication(msalConfig);

function ProfileContent() {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const [dbUsername, setDbUsername] = useState("");
  const [dbPassword, setDbPassword] = useState("");
  const [dbToken, setDbToken] = useState(null);

  const handleAzureLogin = () => {
    instance.loginPopup(loginRequest).catch(console.error);
  };

  const handleDbLogin = async () => {
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: dbUsername, password: dbPassword }),
      });
      if (!res.ok) throw new Error("Login failed");
      const data = await res.json();
      setDbToken(data.token);
      alert("DB login successful!");
    } catch (e) {
      alert("DB login error: " + e.message);
    }
  };

  const callApiWithDbToken = async () => {
    if (!dbToken) return;
    const res = await fetch("/api/profile", {
      headers: { Authorization: `Bearer ${dbToken}` },
    });
    const data = await res.json();
    alert("Profile: " + JSON.stringify(data));
  };

  const callApiWithMsal = async () => {
    if (!isAuthenticated) return;
    try {
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
      });
      const accessToken = response.accessToken;
      const res = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      alert("Azure AD profile: " + JSON.stringify(data));
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        instance.acquireTokenPopup(loginRequest);
      }
      console.error(error);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "auto", padding: 20 }}>
      <h1>Dual Login (Azure AD + DB)</h1>

      <section style={{ marginBottom: 40 }}>
        <h2>Azure AD Login</h2>
        {isAuthenticated ? (
          <>
            <p>Welcome {accounts[0].username}</p>
            <button onClick={callApiWithMsal}>Get Profile</button>
            <button onClick={() => instance.logoutPopup()}>Logout</button>
          </>
        ) : (
          <button onClick={handleAzureLogin}>Login with Azure AD</button>
        )}
      </section>

      <section>
        <h2>DB Login</h2>
        <input
          placeholder="Username"
          value={dbUsername}
          onChange={(e) => setDbUsername(e.target.value)}
        />
        <br />
        <input
          placeholder="Password"
          type="password"
          value={dbPassword}
          onChange={(e) => setDbPassword(e.target.value)}
        />
        <br />
        <button onClick={handleDbLogin}>Login with DB</button>

        {dbToken && (
          <>
            <p>DB user logged in</p>
            <button onClick={callApiWithDbToken}>Get DB Profile</button>
            <button onClick={() => setDbToken(null)}>Logout DB User</button>
          </>
        )}
      </section>
    </div>
  );
}

export default function App() {
  return (
    <MsalProvider instance={msalInstance}>
      <ProfileContent />
    </MsalProvider>
  );
}
