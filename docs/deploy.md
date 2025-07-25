# Deployment Guide

Use this guide to deploy Aquiles‑RAG to a cloud provider (e.g. Render) with minimal configuration. In this example, we’ll deploy using a private Git repo containing:

```
requirements.txt
test_deploy.py
```

## 1. Repository Structure

- **requirements.txt**  
```
FastAPI
aquiles-rag
PyJWT
```
_(Specifies the FastAPI framework, the Aquiles‑RAG package, and JWT support.)_

- **test_deploy.py**  
```python
from aquiles.deploy_config import DeployConfig, gen_configs_file
from aquiles.configs import AllowedUser

# 1) Create a DeployConfig with only the essential fields:
dp_cfg = DeployConfig(
    local=False,
    host="redis-dummy-url.redis-cloud.com",
    port=15177,
    usernanme="default",
    password="jP-dummy-password",
    cluster_mode=False,
    tls_mode=False,
    ssl_cert="",
    ssl_key="",
    ssl_ca="",
    allows_api_keys=["dummy-api-key"],
    allows_users=[AllowedUser(username="root", password="root")],
    ALGORITHM="HS256"
)

# 2) Encapsulate config generation in a run() function for the CLI
def run():
    print("Generating the configs file")
    gen_configs_file(dp_cfg)
```

* **Note**: In a real setup, replace the example Redis host, port, username, and password with your own. For this guide, we’re using a Redis Cloud instance on `redis.io`.


## 2. Deploying to Render

1. **Push** your repo (`requirements.txt` + `test_deploy.py`) to your Git provider (GitHub, GitLab, etc.).

2. **Create a new service** on Render:

   * Choose **Web Service**.
   * Link to your private repo.

3. **Build Settings**:

   * **Environment**: Select Python (it will install from `requirements.txt`).
   * **Build Command**: leave default (`pip install -r requirements.txt`).

4. **Start Command**:

   ```bash
   aquiles-rag deploy --host "0.0.0.0" --port 5500 test_deploy.py
   ```

   * This will:

     1. Import and execute `run()` from `test_deploy.py`, writing `aquiles_config.json` with your `DeployConfig`.
     2. Launch the FastAPI server on `0.0.0.0:5500`.

5. **Instance Size**:
   Select the free or small instance—Aquiles‑RAG and a single Redis connection are lightweight.

6. **Deploy**:
   Click **Create Service** (or **Deploy**) and wait for Render to build and start your app.


## 3. How It Works

* **`DeployConfig`** (in `deploy_config.py`):

  * Inherits all standard Redis + auth fields from `InitConfigs`.
  * Adds `JWT_SECRET` (auto‑generated) and `ALGORITHM` for signing tokens.
  * Can also pull from a `.env` file if present.

* **`gen_configs_file()`**:

  * Writes a new `aquiles_config.json` in your user data directory (`~/.local/share/aquiles/`) only if it doesn't exist.
  * Ensures your Redis connection details, API keys, and allowed users are in place before the server starts.

* **CLI `deploy` command**:

  * Dynamically imports `test_deploy.py`.
  * Calls its `run()` to generate the config file.
  * Then invokes `uvicorn` on `aquiles.main:app` to start the FastAPI service.


## 4. Testing Deployment

Once your service is live, Render provides a public URL. You can:

1. **Verify Health**:

   ```bash
   curl https://<your-render-URL>/create/index \
     -X POST \
     -H "X-API-Key: dummy-api-key" \
     -H "Content-Type: application/json" \
     -d '{"indexname":"test","embeddings_dim":16}'
   ```

2. **Inspect Logs** in Render to confirm:

   * `Generating the configs file` printed during startup.
   * Redis connection established without errors.
   * Uvicorn listening on port 5500.

3. **Use the API** as described in API Reference or API CLIENT.


With just a `requirements.txt`, a simple `test_deploy.py`, and the `aquiles-rag deploy` CLI command, you can get Aquiles‑RAG running on Render (or any similar platform) in minutes. 🚀
