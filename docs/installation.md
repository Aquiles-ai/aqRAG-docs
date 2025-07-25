# Installation & Configuration

This guide shows you how to install Aquiles‑RAG, configure it, and choose the correct Redis connection based on your environment (standalone, cluster, cloud/TLS, etc.).

---

## 1. Install Aquiles‑RAG

### Via PyPI (recommended)
```bash
pip install aquiles-rag
````

### From Source

```bash
git clone https://github.com/Aquiles-ai/Aquiles-RAG.git
cd Aquiles-RAG

# (Optional) Create & activate a virtual env
python -m venv .venv
source .venv/bin/activate

# (Optional) Editable mode for development
pip install -e .
```

---

## 2. Initialise & Locate Config File

On first run, Aquiles‑RAG will create a JSON config at:

```
~/.local/share/aquiles/aquiles_config.json
```

Default contents:

```json
{
  "local": true,
  "host": "localhost",
  "port": 6379,
  "username": "",
  "password": "",
  "cluster_mode": false,
  "tls_mode": false,
  "ssl_certfile": "",
  "ssl_keyfile": "",
  "ssl_ca_certs": "",
  "allows_api_keys": [""],
  "allows_users": [{ "username": "root", "password": "root" }]
}
```

---

## 3. Edit Configuration

### A) Manually

Open `~/.local/share/aquiles/aquiles_config.json` in your editor and adjust fields.

### B) Via CLI

```bash
# Example: connect to a remote Redis with password
aquiles-rag configs \
  --local false \
  --host redis.example.com \
  --port 6380 \
  --username myuser \
  --password secretpass \
  --tls-mode true \
  --ssl-cert /path/to/client.crt \
  --ssl-key  /path/to/client.key \
  --ssl-ca   /path/to/ca.crt
```

---

## 4. Choosing Your Redis Connection Mode

Aquiles‑RAG’s `get_connection()` logic supports four modes:

1. **Local Cluster**

   * Settings:

     ```json
     { "local": true, "cluster_mode": true }
     ```
   * Code path:

     ```python
     RedisCluster(host, port, decode_responses=True)
     ```

2. **Local Standalone**

   * Settings:

     ```json
     { "local": true, "cluster_mode": false }
     ```
   * Code path:

     ```python
     redis.Redis(host, port, decode_responses=True)
     ```

3. **Remote with TLS/SSL**

   * Settings:

     ```json
     {
       "local": false,
       "tls_mode": true,
       "username": "...",         # optional
       "password": "...",         # optional
       "ssl_certfile": "...",     # client cert
       "ssl_keyfile": "...",      # client key
       "ssl_ca_certs": "..."      # CA bundle
     }
     ```
   * Code path:

     ```python
     redis.Redis(
       host, port,
       username=username or None,
       password=password or None,
       ssl=True,
       decode_responses=True,
       ssl_certfile=ssl_certfile,
       ssl_keyfile=ssl_keyfile,
       ssl_ca_certs=ssl_ca_certs
     )
     ```

4. **Remote without TLS/SSL**

   * Settings:

     ```json
     { "local": false, "tls_mode": false }
     ```
   * Code path:

     ```python
     redis.Redis(
       host, port,
       username=username or None,
       password=password or None,
       decode_responses=True
     )
     ```

> **Tip:**
>
> * If you’re on a private network or using Docker Compose, standalone local (`local=true`) is easiest.
> * For production clusters, enable `cluster_mode`.
> * For managed cloud services (AWS ElastiCache, Azure Redis, etc.), set `tls_mode=true` and provide certs.

---

## 5. Verify & Start

1. **Verify connection** by launching Aquiles‑RAG:

   ```bash
   aquiles-rag serve --host "0.0.0.0" --port 5500
   ```
2. **Check logs** for successful Redis handshake and index-info calls.
3. **Open the UI** at `http://localhost:5500/ui` and confirm you can list indices.
