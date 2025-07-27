# API Reference

Base URL: `http://<host>:<port>`

All RAG endpoints require a valid API key header:
```
X-API-Key: \<your\_api\_key>

```

## Authentication

### POST `/token`

Obtain a short‑lived access token (stored in an HTTP‐only cookie) for the UI and docs.

- **Form parameters** (URL‐encoded):
  - `username` (string) – your allowed username  
  - `password` (string) – your password  

**Responses**

- **302 Redirect** → `/ui` on success (sets `access_token` cookie)  
- **401 Unauthorized** if credentials are invalid  

## Index Management

### POST `/create/index`

Create a new vector search index in Redis, or overwrite an existing one.

- **Headers**  
  - `X-API-Key: <your_api_key>`  

- **Request Body** (JSON; fields taken from `CreateIndex` model):
  | Field                        | Type      | Default   | Description                                                                                     |
  |------------------------------|-----------|-----------|-------------------------------------------------------------------------------------------------|
  | `indexname`                  | `string`  | _n/a_     | Name of the index to create.                                                                    |
  | `embeddings_dim`             | `integer` | `768`     | Dimension of your embedding vectors.                                                            |
  | `dtype`                      | `string`  | `"FLOAT32"` | Numeric data type for storage. One of `"FLOAT32"`, `"FLOAT64"`, or `"FLOAT16"`.                 |
  | `delete_the_index_if_it_exists` | `boolean` | `false`   | If true, drops any existing index with the same name before creating a fresh one.               |

- **Success Response**:  
  ```json
  {
    "status": "success",
    "index": "<indexname>",
    "fields": [
      "name_chunk",
      "chunk_id",
      "chunk_size",
      "raw_text",
      "embedding"
    ]
  }
    ```

* **Errors**

  * `400 Bad Request` if index exists and `delete_the_index_if_it_exists` is false
  * `500 Internal Server Error` on Redis/index creation failure


## Data Ingestion (Send RAG)

### POST `/rag/create`

Store one chunk of text + its embedding into the specified index.

* **Headers**

  * `X-API-Key: <your_api_key>`

* **Request Body** (JSON; fields from `SendRAG` model):

  | Field        | Type      | Default     | Description                                                           |
  | ------------ | --------- | ----------- | --------------------------------------------------------------------- |
  | `index`      | `string`  | *n/a*       | Name of the index to which this chunk belongs.                        |
  | `name_chunk` | `string`  | *n/a*       | Human‑readable label for this chunk (e.g. `doc1_part1`).              |
  | `dtype`      | `string`  | `"FLOAT32"` | Embedding data type. One of `"FLOAT32"`, `"FLOAT64"`, or `"FLOAT16"`. |
  | `chunk_size` | `integer` | `1024`      | Number of tokens in this chunk.                                       |
  | `raw_text`   | `string`  | *n/a*       | Full original text content for this chunk.                            |
  | `embeddings` | `float[]` | *n/a*       | Embedding vector array for this chunk.                                |

* **Success Response**:

  ```json
  { "status": "ok", "key": "<index>:<chunk_id>" }
  ```

* **Errors**

  * `500 Internal Server Error` if any issue converting or storing the embedding

## Querying (Search RAG)

### POST `/rag/query-rag`

Retrieve the top‐K most similar chunks by cosine similarity.

* **Headers**

  * `X-API-Key: <your_api_key>`

* **Request Body** (JSON; fields from `QueryRAG` model):

  | Field                       | Type      | Default     | Description                                                                                 |
  | --------------------------- | --------- | ----------- | ------------------------------------------------------------------------------------------- |
  | `index`                     | `string`  | *n/a*       | Name of the index in which to search.                                                       |
  | `embeddings`                | `float[]` | *n/a*       | Query embedding vector.                                                                     |
  | `dtype`                     | `string`  | `"FLOAT32"` | Data type of stored embeddings (`"FLOAT32"`, `"FLOAT64"`, or `"FLOAT16"`).                  |
  | `top_k`                     | `integer` | `5`         | Number of nearest neighbors to return.                                                      |
  | `cosine_distance_threshold` | `float`   | `0.6`       | *(optional)* Maximum cosine distance (0–2) threshold; filters out results above this value. |

* **Success Response**:

  ```json
  {
    "status": "ok",
    "total": <number_of_results>,
    "results": [
      {
        "name_chunk": "<label>",
        "chunk_id": <id>,
        "chunk_size": <tokens>,
        "raw_text": "<chunk_text>",
        "score": <cosine_distance>
      },
      …
    ]
  }
  ```

* **Errors**

  * `500 Internal Server Error` if search fails

## Monitoring & Status Endpoints

### GET `/status/ram`

Return JSON with both Redis memory stats and FastAPI process metrics.

* **Response Body** (JSON):

  ```json
  {
    "redis": {
      "memory_info": { /* raw output of `INFO memory` */ },
      "memory_stats": { /* output of `memory_stats()` */ },
      "free_memory_mb": <float|null>
    },
    "app_process": {
      "process_memory_mb": <float>,
      "process_cpu_percent": <float>
    }
  }
  ```

* **Errors**

  * If Redis metrics cannot be retrieved, `"redis"` will contain:

    ```json
    { "error": "Failed to get Redis metrics: <error message>" }
    ```

### GET `/status`

Return an HTML status page (e.g. via Jinja2 template `status.html`).

* **Response**

  * `200 OK` with rendered HTML showing health/metrics.

## UI Configuration (Protected)

These endpoints power the `/ui` playground and require the user to be authenticated via the `access_token` cookie (set by `/token`). They are not typically used by production clients, but are documented here for completeness.

### GET `/ui/configs`

Fetch current Aquiles‑RAG configuration and existing indices.

* **Response** (JSON):

  ```json
  {
    "local": <bool>,
    "host": "<string>",
    "port": <int>,
    "username": "<string>",
    "password": "<string>",
    "cluster_mode": <bool>,
    "ssl_cert": "<string>",
    "ssl_key": "<string>",
    "ssl_ca": "<string>",
    "allows_api_keys": ["…"],
    "allows_users": [{ "username":"…", "password":"…" }],
    "indices": ["idx1", "idx2", …]
  }
  ```

### POST `/ui/configs`

Update Aquiles‑RAG configuration settings.

* **Request Body** (JSON; any subset of `EditsConfigs` fields):

  * `local`, `host`, `port`, `username`, `password`, `cluster_mode`, `tls_mode`, `ssl_cert`, `ssl_key`, `ssl_ca`, `allows_api_keys`, `allows_users`

* **Success Response**:

  ```json
  { "status": "ok", "updated": { /* the fields you changed */ } }
  ```

* **Errors**

  * `400 Bad Request` if no valid fields provided

## API Docs & Playground UIs

All UI docs are protected and require login:

* **Swagger UI**: GET `/docs` → interactive API explorer
* **ReDoc**: GET `/redoc` → static API reference

Both use the same OpenAPI spec under `/openapi.json` (protected).

> ⚙️ **Tip**: Use the UI Playground (at `/ui`) after logging in at `/login/ui` to experiment with these endpoints in‑browser.

