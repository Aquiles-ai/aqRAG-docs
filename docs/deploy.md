# Deployment Guide

Use this guide to deploy Aquiles-RAG to a cloud provider (e.g. Render) with minimal configuration. In this example, we’ll deploy using a private Git repo containing:

```
requirements.txt
test_deploy.py
```

## 1. Repository Structure

> **Example repo:** https://github.com/Aquiles-ai/aquiles-example-deploy

> Note: You can go to [`deploy-example`](https://github.com/Aquiles-ai/Aquiles-RAG/tree/main/deploy-example) or [`docker`](https://github.com/Aquiles-ai/Aquiles-RAG/tree/main/docker) in the main repo to see examples of both Aquiles-RAG and Aquiles-RAG-MCP deployments.

- **requirements.txt**  
```

FastAPI
aquiles-rag
python-dotenv
PyJWT
psutil

```
_(Specifies the FastAPI framework, the Aquiles-RAG package, dotenv support and JWT support.)_

- **deploy_redis.py** (example file used to generate runtime config and launch)
- **deploy_qdrant.py** (alternative example for Qdrant)
- Optional: `.env` containing secrets (recommended to provide via provider secrets store instead)

## 2. Example: Deploy with Redis

Create a file (e.g. `deploy_redis.py`) with the following contents. This script constructs a `DeployConfigRd`, then `gen_configs_file()` inside a `run()` function — the `aquiles-rag deploy` command will import and execute `run()` at startup.

```python
# deploy_redis.py
import os
from dotenv import load_dotenv
from pathlib import Path
from aquiles.deploy_config import DeployConfigRd, gen_configs_file
from aquiles.configs import AllowedUser

# Load .env if present (recommended to use provider secrets instead)
env_path = Path('.') / '.env'
load_dotenv(dotenv_path=env_path)

REDIS_HOST = os.getenv('REDIS_HOST', 'redis-dummy.com')
REDIS_PORT = int(os.getenv('REDIS_PORT', 123))
REDIS_USER = os.getenv('REDIS_USERNAME', 'default')
REDIS_PASSWORD = os.getenv('REDIS_PASS', 'dummy-password')

apikeys = ["dummy-api-key", "secure-api-key"]

users = [
    AllowedUser(username="root", password="root"),
    AllowedUser(username="supersu", password="supersu")
]

dp_cfg = DeployConfigRd(
    local=False,
    host=REDIS_HOST,
    port=REDIS_PORT,
    username=REDIS_USER,
    password=REDIS_PASSWORD,
    cluster_mode=False,
    tls_mode=False,
    ssl_cert="",
    ssl_key="",
    ssl_ca="",
    allows_api_keys=apikeys,
    allows_users=users,
    initial_cap=200,
    rerank=False,
    provider_re=None,
    reranker_model=None,
    max_concurrent_request=None,
    reranker_preload=None,
    ALGORITHM="HS256"
)

def run():
    print("Generating the configs file")
    gen_configs_file(dp_cfg, force=True)
```

**Notes**

* Do **not** commit secrets. Use provider secret stores (Render env vars, GitHub Actions secrets, etc.), or a private `.env` excluded from VCS.
* `initial_cap`, `ALGORITHM`, and other fields are optional — set them according to your needs.

## 3. Example: Deploy with Qdrant

Create a file (e.g. `deploy_qdrant.py`) with the following contents. This generates a `DeployConfigQdrant` and writes the runtime config.

```python
# deploy_qdrant.py
import os
from dotenv import load_dotenv
from pathlib import Path
from aquiles.deploy_config import DeployConfigQdrant, gen_configs_file
from aquiles.configs import AllowedUser

env_path = Path('.') / '.env'
load_dotenv(dotenv_path=env_path)

HOST = os.getenv('QDRANT_HOST', 'fe2.gcp.cloud.qdrant.io')
PORT = int(os.getenv('QDRANT_PORT', 6333))
API_KEY_QDRANT = os.getenv('API_KEY_QDRANT', 'dummy-api-key')
GRPC_PORT = int(os.getenv('GRPC_PORT', 6334))

API_KEYS = ["dummy-api-key", "idk-api-key"]

users = [
    AllowedUser(username="root", password="root"),
    AllowedUser(username="supersu", password="supersu")
]

dp_cfg = DeployConfigQdrant(
    local=False,
    host=HOST,
    port=PORT,
    prefer_grpc=False,           # set True if you want gRPC
    grpc_port=GRPC_PORT,
    api_key=API_KEY_QDRANT,
    allows_api_keys=API_KEYS,
    allows_users=users,
    rerank=False,
    provider_re=None,
    reranker_model=None,
    max_concurrent_request=None,
    reranker_preload=None,
    ALGORITHM="HS256"
)

def run():
    print("Generating the configs file")
    gen_configs_file(dp_cfg, force=True)
```

**Notes for Qdrant**

* If you plan to use gRPC (`prefer_grpc=True`), ensure your environment supports outgoing gRPC and open the `grpc_port` if needed.
* Qdrant cloud providers usually require an API key — pass it with `api_key` or via environment variables.


## 4. Deploying to Render (or similar)

1. **Push** your repo containing `requirements.txt` and either `deploy_redis.py` or `deploy_qdrant.py` to your Git provider.

2. **Create a new service** on Render:

   * Choose **Web Service** and link your repo.

3. **Build Settings**:

   * **Environment**: Python.
   * **Build Command**: default (`pip install -r requirements.txt`) or `pip install -r requirements.txt --no-cache-dir`.

4. **Start Command** (example):

```bash
# Redis example
aquiles-rag deploy --host "0.0.0.0" --port 5500 --workers 2 deploy_redis.py

# Qdrant example
aquiles-rag deploy --host "0.0.0.0" --port 5500 --workers 2 deploy_qdrant.py

# MCP Example (the deployment is only compatible with SSE transport, and you can reuse the configuration files for Aquiles-RAG REST-API for added convenience.)
aquiles-rag deploy-mcp --host "0.0.0.0" --port 5500 deploy_redis.py
```

What the command does:

* Imports the given config file and executes its `run()` function to create `aquiles_config.json` (or overwrite it with `force=True`).
* Starts the FastAPI app (`uvicorn`) on the configured host/port with the specified number of workers.

5. **Instance size**:

   * For light usage a small instance is sufficient. For production load, increase CPU/memory and configure autoscaling as needed.

6. **Environment variables / secrets**:

   * Prefer provider secrets over committing `.env`.
   * Provide `QDRANT` or `REDIS` sensitive values via Render environment variables.

## 5. How It Works (internals)

* **`DeployConfigRd` / `DeployConfigQdrant` / `DeployConfigPostgreSQL`** :

  * These classes mirror the runtime config schema (`InitConfigsRedis` / `InitConfigsQdrant` / `InitConfigsPostgreSQL`) and add deployment helpers like `ALGORITHM`/JWT fields.
* **`gen_configs_file()`**:

  * Writes `aquiles_config.json` in the user data directory (`~/.local/share/aquiles/`) before the server starts.
* **`aquiles-rag deploy` CLI**:

  * Dynamically imports the specified Python file, executes `run()`, then starts the FastAPI app process.


## 6. Testing Deployment

Once the service is live and you have a public URL:

1. **Verify Health**:

```bash
curl https://<your-render-URL>/health/ready
# => {"status":"ready"}  (if backend reachable)
```

2. **Basic API smoke test** (example to create an index):

```bash
curl https://<your-render-URL>/create/index \
  -X POST \
  -H "X-API-Key: <your-deploy-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"indexname":"test","embeddings_dim":16}'
```

3. **Inspect Logs** for:

* `Generating the configs file` at startup.
* Successful connection to Redis or Qdrant.
* Uvicorn listening on port `5500`.

## 7. Troubleshooting & Tips

* **Secrets**: never commit credentials. Use Render/GCP/AWS secret stores or GitHub Actions secrets to inject env vars at deploy time.
* **Qdrant metrics**: Qdrant does not expose Redis `INFO` metrics — monitoring differs between backends (see Monitoring docs).
* **gRPC**: if using `prefer_grpc=True`, ensure the runtime environment supports gRPC outbound connections.
* **Networking**: when using managed Redis (AWS ElastiCache, Azure), check VPC/firewall rules and TLS settings.
* **Automated CI**: to run non-interactive deployments in CI, generate the JSON config locally and include it in the artifact (or use a bootstrap script that writes `aquiles_config.json` from environment variables).


With `requirements.txt` plus a small `deploy_*.py` that generates the runtime config, and the `aquiles-rag deploy` CLI command, you can deploy Aquiles-RAG to Render or similar providers quickly and reproducibly. 🚀