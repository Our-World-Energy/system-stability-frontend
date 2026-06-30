# Deploying the dashboard (host: 149.28.112.32)

The frontend is a static SPA. It's served by nginx, which also **reverse-proxies**
the REST API and the WebSocket so the browser only ever talks to port 80
(no need to expose the backend's internal ports `18964`/`3001`).

```
browser ──► 149.28.112.32:80 (nginx) ──┬─► /            static files (dist/)
                                        ├─► /api/        → 127.0.0.1:18964
                                        └─► /ws/status   → 127.0.0.1:3001  (WebSocket)
```

The production build (`.env.production`) is configured for this:
`VITE_WS_URL=/ws/status`, `VITE_API_BASE_URL=/api`, `VITE_STATUS_TRANSPORT=ws`.

## 1. Build (on your machine)
```bash
npm ci
npm run build        # outputs dist/
```

## 2. Copy the build to the server
```bash
scp -r dist/* USER@149.28.112.32:/tmp/owe-dist/
```

## 3. Configure nginx (on the server, over SSH)
```bash
sudo apt update && sudo apt install -y nginx
sudo mkdir -p /var/www/owe
sudo cp -r /tmp/owe-dist/* /var/www/owe/

sudo tee /etc/nginx/sites-available/owe >/dev/null <<'NGINX'
server {
    listen 80;
    server_name _;
    root /var/www/owe;
    index index.html;

    location / { try_files $uri /index.html; }   # SPA fallback

    location /api/ {                              # REST → backend
        proxy_pass http://127.0.0.1:18964;
        proxy_set_header Host $host;
    }

    location /ws/ {                               # WebSocket → backend
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/owe /etc/nginx/sites-enabled/owe
sudo rm -f /etc/nginx/sites-enabled/default   # if the default site is in the way
sudo nginx -t && sudo systemctl reload nginx
```

## 4. Verify
- Open `http://149.28.112.32/` → dashboard loads, connection badge turns **Live**.
- Backend must be running locally on the host: REST on `:18964`, WS on `:3001`.
- Quick checks from the server:
  ```bash
  curl -s localhost:18964/api/owe-stability-service/aurora/status   # REST up
  curl -s -o /dev/null -w '%{http_code}\n' \
       -H "Connection: Upgrade" -H "Upgrade: websocket" \
       -H "Sec-WebSocket-Key: x" -H "Sec-WebSocket-Version: 13" \
       localhost:3001/ws/status                                     # expect 101
  ```

## Notes
- **HTTPS:** if you later serve over TLS, the app auto-uses `wss://` (no rebuild
  needed) — just add the cert to the nginx server block.
- **Re-deploy:** repeat steps 1–2 and `sudo cp -r /tmp/owe-dist/* /var/www/owe/`.
  No nginx change needed.
