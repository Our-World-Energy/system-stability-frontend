# Deploying the dashboard (host: 149.28.112.32)

The frontend is a static SPA. It's served by nginx, which also **reverse-proxies**
the REST API and the SSE stream so the browser only ever talks to port 80
(no need to expose the backend's internal ports `18964`/`3001`).

```
browser ──► 149.28.112.32:80 (nginx) ──┬─► /            static files (dist/)
                                        ├─► /api/        → 127.0.0.1:18964
                                        └─► /sse/status  → 127.0.0.1:3001  (SSE stream)
```

The live UI consumes the SSE stream (browser-native `EventSource`). For this
same-origin deploy set: `VITE_SSE_URL=/sse/status`, `VITE_API_BASE_URL=/api`, and
leave `VITE_STATUS_TRANSPORT` unset (SSE is the default).

> Vercel note: Vercel can't reliably hold a long-lived SSE stream through its
> rewrite proxy, so the Vercel build keeps `VITE_STATUS_TRANSPORT=rest` (REST
> polling). This nginx deploy is the one that uses SSE.

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

    location /sse/ {                              # SSE stream → backend
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Connection "";            # keep the upstream alive
        proxy_set_header Host $host;
        proxy_buffering off;                       # REQUIRED: stream events immediately
        proxy_cache off;
        proxy_read_timeout 3600s;                  # long-lived connection
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/owe /etc/nginx/sites-enabled/owe
sudo rm -f /etc/nginx/sites-enabled/default   # if the default site is in the way
sudo nginx -t && sudo systemctl reload nginx
```

## 4. Verify
- Open `http://149.28.112.32/` → dashboard loads, connection badge turns **Live**.
- Backend must be running locally on the host: REST on `:18964`, SSE on `:3001`.
- Quick checks from the server:
  ```bash
  curl -s localhost:18964/api/owe-stability-service/aurora/status   # REST up
  curl -sN localhost:3001/sse/status | head -c 200                  # expect: event: initial_snapshot
  ```

## Notes
- **HTTPS:** serving over TLS is required if the page is https — a same-origin
  `/sse/status` behind nginx avoids mixed-content blocking. Just add the cert to
  the nginx server block; no rebuild needed.
- **Re-deploy:** repeat steps 1–2 and `sudo cp -r /tmp/owe-dist/* /var/www/owe/`.
  No nginx change needed.
