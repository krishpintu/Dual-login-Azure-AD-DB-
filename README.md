# Azure AD + DB Dual Login Sample with Docker and Nginx with Refresh Tokens

## Overview
- Backend: Node.js/Express with JWT & refresh token support
- Frontend: React + MSAL + custom DB login + token refresh handling
- Nginx: Reverse proxy with SSL termination (self-signed certs)
- Docker Compose for easy local development and deployment

## Setup

1. Copy `.env.example` to `.env` and fill in Azure AD details and `JWT_SECRET`.

2. In `frontend/.env`, set `REACT_APP_AZURE_CLIENT_ID` and `REACT_APP_AZURE_TENANT_ID`.

3. Generate self-signed SSL certs for nginx (for dev):

```bash
mkdir -p nginx/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/certs/selfsigned.key \
  -out nginx/certs/selfsigned.crt \
  -subj "/C=US/ST=State/L=City/O=Org/OU=Unit/CN=localhost"

```
### Generate self-signed SSL cert (for localhost)

```bash
mkdir certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/server.key -out certs/server.crt \
  -subj "/C=US/ST=State/L=City/O=Org/CN=localhost"






