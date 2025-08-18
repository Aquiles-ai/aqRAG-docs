# API Reference

Base URL: `http://<host>:<port>`

All RAG endpoints used by clients (indexing, ingestion, search, drop) require a valid API key header:

```

X-API-Key: \<your\_api\_key>

```

UI / docs / playground endpoints are protected with an access token cookie (see **Authentication**).

## Authentication

### POST `/token`

Obtain a short-lived access token (stored in an HTTP-only cookie) for the UI and docs.

- **Form parameters** (URL-encoded):
  - `username` (string) – your allowed username  
  - `password` (string) – your password  

**Responses**

- **302 Redirect** → `/ui` on success (sets `access_token` cookie)  
- **401 Unauthorized** if credentials are invalid  

## Index Management

### POST `/create/index`

Create a new vector search index in the configured backend (Redis or Qdrant). Behavior differs slightly by backend — see **Success Response**.

- **Headers**  
  - `X-API-Key: <your_api_key>`  

- **Request Body** (JSON; fields taken from `CreateIndex` model):
  | Field                          | Type      | Default     | Description                                                                                     |
  |--------------------------------|-----------|-------------|-------------------------------------------------------------------------------------------------|
  | `indexname`                    | `string`  | _n/a_       | Name of the index to create.                                                                    |
  | `embeddings_dim`               | `integer` | `768`       | Dimension of your embedding vectors.                                                            |
  | `dtype`                        | `string`  | `"FLOAT32"` | Numeric data type for storage. One of `"FLOAT32"`, `"FLOAT64"`, or `"FLOAT16"`.                |
  | `delete_the_index_if_it_exists`| `boolean` | `false`     | If true, drops any existing index with the same name before creating a fresh one.               |

- **Success Response**:  
  - **Redis** (when backend is Redis) — returns created index and field schema:
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
  - **Qdrant** (when backend is Qdrant) — returns success and index name (Qdrant collections are created accordingly):
    ```json
    {
      "status": "success",
      "index": "<indexname>"
    }
    ```

* **Errors**

  * `400 Bad Request` if index exists and `delete_the_index_if_it_exists` is false.  
  * `500 Internal Server Error` on backend/index creation failure.


## Data Ingestion (Send RAG)

### POST `/rag/create`

Store one chunk of text + its embedding into the specified index/collection. Implementation supports both Redis and Qdrant; note dtype handling differences below.

* **Headers**

  * `X-API-Key: <your_api_key>`

* **Request Body** (JSON; fields from `SendRAG` model):

  | Field            | Type      | Default     | Description                                                           |
  | ---------------- | --------- | ----------- | --------------------------------------------------------------------- |
  | `index`          | `string`  | *n/a*       | Name of the index/collection to which this chunk belongs.             |
  | `name_chunk`     | `string`  | *n/a*       | Human-readable label for this chunk (e.g. `doc1_part1`).              |
  | `dtype`          | `string`  | `"FLOAT32"` | Embedding data type. One of `"FLOAT32"`, `"FLOAT64"`, or `"FLOAT16"`. |
  | `chunk_size`     | `integer` | `1024`      | Number of tokens in this chunk.                                       |
  | `raw_text`       | `string`  | *n/a*       | Full original text content for this chunk.                            |
  | `embeddings`     | `float[]` | *n/a*       | Embedding vector array for this chunk.                                |
  | `embedding_model`| `string?` | *null*      | Optional metadata for which model produced the embedding.             |

* **Backend-specific notes**

  * **Redis**: embeddings are converted on the server into the requested numeric dtype and stored (the implementation converts the float list to a NumPy array and stores the bytes). Supported `dtype` values are validated (`FLOAT32`, `FLOAT64`, `FLOAT16`).
  * **Qdrant**: accepts the `embeddings` float array directly and creates/stores a point in the Qdrant collection. `dtype` is informational for compatibility but Qdrant stores vectors as floats.

* **Success Response**:

  ```json
  { "status": "ok", "key": "<index>:<chunk_id>" }
  ```

* **Errors**

  * `500 Internal Server Error` if any issue converting or storing the embedding.

## Querying (Search RAG)

### POST `/rag/query-rag`

Retrieve the top-K most similar chunks by cosine similarity (or the backend's configured metric).

* **Headers**

  * `X-API-Key: <your_api_key>`

* **Request Body** (JSON; fields from `QueryRAG` model):

  | Field                       | Type      | Default     | Description                                                                                 |
  | --------------------------- | --------- | ----------- | ------------------------------------------------------------------------------------------- |
  | `index`                     | `string`  | *n/a*       | Name of the index/collection in which to search.                                            |
  | `embeddings`                | `float[]` | *n/a*       | Query embedding vector.                                                                     |
  | `dtype`                     | `string`  | `"FLOAT32"` | Data type of stored embeddings (`"FLOAT32"`, `"FLOAT64"`, or `"FLOAT16"`).                  |
  | `top_k`                     | `integer` | `5`         | Number of nearest neighbors to return.                                                      |
  | `cosine_distance_threshold` | `float`   | `0.6`       | *(optional)* Maximum cosine distance (0–2) threshold; filters out results above this value. |
  | `embedding_model`           | `string?` | *null*      | Optional metadata for the embedding model (used only for filtering/metadata if applicable). |

* **Backend-specific behavior**

  * **Redis**: The API converts provided `embeddings` into the requested dtype and queries the FT vector index (cosine similarity).
  * **Qdrant**: The API forwards the float list to Qdrant's search API (Qdrant query uses the collection's configured distance/metric).

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

  * `500 Internal Server Error` if search fails.

### POST `/rag/drop_index`

Remove an existing index/collection, optionally deleting all its documents/points.

* **Headers**

  * `X-API-Key: <your_api_key>`

* **Request Body** (JSON; fields from `DropIndex` model):

  | Field         | Type      | Default | Description                                                           |
  | ------------- | --------- | ------- | --------------------------------------------------------------------- |
  | `index_name`  | `string`  | *n/a*   | Name of the index/collection to drop.                                 |
  | `delete_docs` | `boolean` | `false` | If `true`, also removes every document/point contained in that index. |

* **Success Response**

  ```json
  {
    "status": "success",
    "drop-index": "<index_name>"
  }
  ```

* **Errors**

  * `500 Internal Server Error` if the drop operation fails on the selected backend.

## Monitoring & Status Endpoints

### GET `/status/ram`

Return JSON with Redis memory stats (when backend is Redis) and FastAPI process metrics.

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

* **Notes**

  * When the backend is **Qdrant**, Redis-specific metrics are not available; the response will contain an error message under `"redis"` indicating metrics are not retrievable for Qdrant:

    ```json
    { "error": "In Qdrant you can't get the metrics :(" }
    ```
  * If Redis metrics cannot be retrieved for any reason, `"redis"` will contain:

    ```json
    { "error": "Failed to get Redis metrics: <error message>" }
    ```

### GET `/status`

Return an HTML status page (rendered from `status.html`).

* **Response**

  * `200 OK` with rendered HTML showing health/metrics.

---

## Health endpoints

### GET `/health/live`  — Liveness

```json
{ "status": "alive" }
```

### GET `/health/ready` — Readiness

Verifies connectivity to the configured backend:

* Returns `{"status":"ready"}` if the backend client can respond.
* Returns `503 Service Unavailable` if Redis or Qdrant is not reachable.


## UI Configuration (Protected — requires `access_token` cookie)

These endpoints power the `/ui` playground and require the user to be authenticated via the `access_token` cookie (set by `/token`). They are not typically used by production clients, but are documented here for completeness.

### GET `/ui/configs`

Fetch current Aquiles-RAG configuration and existing indices/collections.

* **Response** (JSON):

  * **When backend is Redis**

    ```json
    {
      "local": true,
      "host": "localhost",
      "port": 6379,
      "username": "",
      "password": "",
      "cluster_mode": false,
      "ssl_cert": "",
      "ssl_key": "",
      "ssl_ca": "",
      "allows_api_keys": ["…"],
      "allows_users": [{ "username":"…", "password":"…" }],
      "indices": ["idx1", "idx2", …]
    }
    ```

  * **When backend is Qdrant**

    ```json
    {
      "local": true,
      "host": "localhost",
      "port": 6333,
      "prefer_grpc": false,
      "grpc_port": 6334,
      "grpc_options": { /* optional */ },
      "api_key": "",
      "auth_token_provider": "",
      "allows_api_keys": ["…"],
      "allows_users": [{ "username":"…", "password":"…" }],
      "indices": ["collection1", "collection2", …]
    }
    ```

### POST `/ui/configs`

Update Aquiles-RAG configuration settings from the UI.

* **Request Body** (JSON; any subset of `EditsConfigsReds` or `EditsConfigsQdrant` fields):

  * `local`, `host`, `port`, `username`, `password`, `cluster_mode`, `tls_mode`, `ssl_cert`, `ssl_key`, `ssl_ca`, `allows_api_keys`, `allows_users` (for Redis);
  * or `local`, `host`, `port`, `prefer_grpc`, `grpc_port`, `grpc_options`, `api_key`, `auth_token_provider`, `allows_api_keys`, `allows_users` (for Qdrant).

* **Success Response**:

  ```json
  { "status": "ok", "updated": { /* the fields you changed */ } }
  ```

* **Errors**

  * `400 Bad Request` if no valid fields provided.

## API Docs & Playground UIs

All UI docs are protected and require login:

* **Swagger UI**: GET `/docs` → interactive API explorer (requires login)
* **ReDoc**: GET `/redoc` → static API reference (requires login)

Both use the same OpenAPI spec under `/openapi.json` (protected).

> ⚙️ **Tip**: Use the UI Playground (at `/ui`) after logging in at `/login/ui` to experiment with these endpoints in-browser.