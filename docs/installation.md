# Installation & Configuration

This guide shows you how to install Aquiles-RAG, initialise it, and configure it using the new interactive **Setup Wizard**. The installation steps remain the same, but the manual/flag-based configuration options have been replaced by the wizard which walks you through everything needed for **Redis, Qdrant, or PostgreSQL**.

## 1. Install Aquiles-RAG

### Via PyPI (recommended)

```bash
pip install aquiles-rag
```

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

## 2. Setup Wizard (new — recommended)

The previous manual CLI flags for configuration have been deprecated in favor of an interactive **Setup Wizard**. The wizard asks the necessary questions to create a fully valid configuration file for **Redis**, **Qdrant**, or **PostgreSQL**, and saves it to disk.

### How to run the wizard

Run the interactive configuration wizard with:

```bash
aquiles-rag configs
```

> The wizard is interactive and will prompt you for connection details, credentials, TLS options, API keys and an admin user. At the end it shows a summary and asks whether to save the configuration file.

### What the wizard asks (summary)

**If you choose Redis**

* Is Redis running locally? (yes/no)
* Host (default: `localhost`)
* Port (default: `6379`)
* Username (optional)
* Password (optional)
* Is this a Redis Cluster? (yes/no)
* Use TLS/SSL? (if yes, prompts for cert/key/CA paths)
* Allowed API keys (comma-separated)
* Create admin user (username + password)
* Final confirmation: save config to disk

**If you choose Qdrant**

* Is Qdrant running locally? (yes/no)
* Host (default: `localhost`)
* Port (default: `6333`)
* Prefer gRPC instead of HTTP? (yes/no)
* gRPC port (default: `6334`)
* Qdrant API key (optional)
* Auth token provider (optional)
* Allowed API keys (comma-separated)
* Create admin user (username + password)
* Final confirmation: save config to disk

**If you choose PostgreSQL**

* Is PostgreSQL running locally? (yes/no)
* Host (default: `localhost`)
* Port (default: `5432`)
* PostgreSQL user (leave empty to use peer/ident)
* PostgreSQL password (leave empty if none)
* Database name (default: e.g. `postgres`)
* Connection pool settings:

  * Connection pool `min_size` (default: `1`)
  * Connection pool `max_size` (default: `10`)
  * `max_queries` before reconnect (default: `50000`)
  * Connection timeout in seconds (default: `60`)
* Allowed API keys (comma-separated)
* Create admin user (username + password)
* Final confirmation: save config to disk

**Reranker options (asked for every backend)**

The wizard will also prompt whether you want to enable the reranker functionality and, if enabled, will ask for the following options common to all database types:

* Enable reranker functionality? (yes/no)
* Execution provider selection (examples shown during the wizard; e.g. CPUExecutionProvider, CUDAExecutionProvider, ROCMExecutionProvider, TensorrtExecutionProvider, DmlExecutionProvider, OpenVINOExecutionProvider, CoreMLExecutionProvider)
* Reranker model name (optional — leave empty for default)
* Maximum concurrent requests for the reranker (optional)
* Preload reranker model into memory? (yes/no)

These options let you control how the reranker is executed, which model to use, concurrency limits and whether to keep the model preloaded for lower latency.

The wizard saves the configuration into the standard location:

```
~/.local/share/aquiles/aquiles_config.json
```

## 3. Initialise & Locate Config File

On first successful run the wizard will create the config file at the path above. Example path:

```
~/.local/share/aquiles/aquiles_config.json
```

You can open and inspect this file to confirm the values the wizard wrote. If you need to re-run the wizard and overwrite the existing file, run the wizard again (or call the Python fallback with `checkout=False` where applicable).

## 4. Verify & Start

1. **Verify connection** by launching Aquiles-RAG:

```bash
aquiles-rag serve --host "0.0.0.0" --port 5500
```

2. **Check logs** for successful Redis / Qdrant / PostgreSQL handshake and index-info / connection checks.
3. **Open the UI** at `http://localhost:5500/ui` and confirm you can list indices (or database-backed resources) and that the connection matches the backend you configured.

## 5. Example: Setup Wizard — demo video

Below is a demo video showing the Setup Wizard flow.

<div class="video-wrapper">
  <iframe
    src="https://www.youtube.com/embed/zUKSniYczyY?si=R04jNrrwJv_uyD6N"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    referrerpolicy="strict-origin-when-cross-origin"
    allowfullscreen
    loading="lazy"></iframe>
</div>

> View on YouTube: [https://www.youtube.com/watch?v=zUKSniYczyY](https://www.youtube.com/watch?v=zUKSniYczyY)
