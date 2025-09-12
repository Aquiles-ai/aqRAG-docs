# Aquiles-RAG Async Python Client

The `aquiles.client.AsyncAquilesRAG` class provides an asynchronous interface for interacting with your Aquiles-RAG service. Use it in Python `async` contexts to create indices, ingest text in chunks, and query your vector store — all without blocking your event loop. Aquiles-RAG works with **Redis, Qdrant, or PostgreSQL** backends.

### 📦 Installation

Ensure you have the `aquiles-rag` package and `httpx` installed:

```bash
pip install aquiles-rag httpx
```

### 🚀 Quick Start

```python
import asyncio
from aquiles.client import AsyncAquilesRAG

# Initialize the asynchronous client
token = "YOUR_API_KEY"
client = AsyncAquilesRAG(
    host="http://127.0.0.1:5500",  # your service URL (include scheme)
    api_key=token                  # optional: if provided, client sends X-API-Key header
)

async def main():
    # Create index
    await client.create_index("my_documents_async")

    # Ingest data (define your own embedding_func, may be sync or async)
    async_responses = await client.send_rag(
        embedding_func=my_embedding_func,
        index="my_documents_async",
        name_chunk="doc_async",
        raw_text="Long document text..."
    )
    print(async_responses)

    # Query index
    q_emb = await maybe_awaitable_embedding("What is Aquiles-RAG?")
    results = await client.query(
        index="my_documents_async",
        embedding=q_emb
    )
    for hit in results["results"]:
        print(f"{hit['name_chunk']} (score: {hit['score']})")

asyncio.run(main())
```

### 🔨 Methods

#### 1. `async def create_index(index_name, embeddings_dim=768, dtype="FLOAT32", delete_the_index_if_it_exists=False) -> str`

Create or overwrite an index/collection in the configured backend.

```python
response_text = await client.create_index(
    index_name="my_documents_async",
    embeddings_dim=768,
    dtype="FLOAT32",
    delete_the_index_if_it_exists=False
)
print(response_text)  # raw server response text
```

* **Parameters**

  * `index_name` (`str`): Unique name for the index/collection.
  * `embeddings_dim` (`int`, default=768): Dimensionality of embedding vectors.
  * `dtype` (`Literal["FLOAT32","FLOAT64","FLOAT16"]`, default="FLOAT32"): Storage numeric type.
  * `delete_the_index_if_it_exists` (`bool`, default=False): Drop existing index before creating.

* **Returns**

  * `str` — raw server response text (server returns slightly different JSON depending on backend).

#### 2. `async def query(index, embedding, dtype="FLOAT32", top_k=5, cosine_distance_threshold=0.6, embedding_model=None, metadata=None) -> List[dict]`

Search the index/collection for the top-K nearest neighbors.

```python
results = await client.query(
    index="my_documents_async",
    embedding=q_emb,
    dtype="FLOAT32",
    top_k=5,
    cosine_distance_threshold=0.6
)
# results is parsed JSON dict with "status", "total", "results"
```

* **Parameters**

  * `index` (`str`): Index/collection name.
  * `embedding` (`Sequence[float]`): Query vector (list of floats).
  * `dtype` (`Literal[...]`, default="FLOAT32"): Must match stored index dtype.
  * `top_k` (`int`, default=5): Number of neighbors to return.
  * `cosine_distance_threshold` (`float`, default=0.6): Max cosine distance filter.
  * `embedding_model` (`str | None`): Optional metadata filter (forwarded to server).
  * `metadata` (`Dict[str, Any] | None`): Optional metadata filter (see allowed keys in `send_rag`).

* **Returns**

  * `List[dict]` — parsed JSON response from server: `{"status":"ok","total":N,"results":[...]}`

* **Backend notes**

  * Works with Redis and Qdrant. Redis implementation converts embedding types server-side; Qdrant forwards the float array.
  * PostgreSQL is also supported — when using PostgreSQL ensure the server is configured for vector storage (e.g., `pgvector`) and appropriate connection pooling; the server will accept the same query payload structure and handle conversion/storage as configured.

#### 3. `async def send_rag(embedding_func, index, name_chunk, raw_text, dtype="FLOAT32", embedding_model=None, metadata=None) -> List[dict]`

Split a long text into chunks, compute embeddings using the provided function (sync or async), and upload them concurrently.

```python
responses = await client.send_rag(
    embedding_func=my_embedding_func,   # sync or async callable
    index="my_documents_async",
    name_chunk="doc_async",
    raw_text="Very long text to index...",
    dtype="FLOAT32",
    embedding_model="text-embedding-v1"  # optional
)
```

* **Parameters**

  * `embedding_func` (`Callable[[str], Union[Sequence[float], Awaitable[Sequence[float]]]]`): Can be synchronous or asynchronous — the client detects and `await`s if necessary.
  * `index` (`str`): Target index/collection name.
  * `name_chunk` (`str`): Prefix used for chunk names; client appends `_1`, `_2`, …
  * `raw_text` (`str`): Full text to split and ingest.
  * `dtype` (`Literal[...]`, default="FLOAT32"): Embedding dtype (forwarded to server).
  * `embedding_model` (`str | None`): Optional model identifier sent as chunk metadata.
  * `metadata` (`Dict[str, Any] | None`): Optional metadata to associate with each chunk (allowed keys below).

* **Behavior / Implementation details**

  * Uses `chunk_text_by_words()` to split text into \~600-word (\~1024 token) chunks.
  * For each chunk the client calls `embedding_func(chunk)`. If the result is awaitable the client awaits it.
  * Uploads all chunks concurrently using `asyncio.gather()` and the helper `_send_chunk`.
  * Each chunk payload includes `"chunk_size": 1024` in the body (server uses this field).
  * The client constructs payloads with optional `embedding_model` and `metadata` when provided.

* **Returns**

  * `List[dict]` — one entry per chunk. Successful uploads return the server JSON; failures return `{"chunk_index": N, "error": "<message>"}`.

* **Allowed metadata keys** (backend may reject unknown keys): `author`, `language`, `topics`, `source`, `created_at`, `extra`.

#### 4. `async def drop_index(index_name, delete_docs=False) -> dict`

Delete an index/collection (and optionally its documents/points).

```python
resp = await client.drop_index("my_documents_async", delete_docs=True)
print(resp)  # parsed JSON response
```

* **Parameters**

  * `index_name` (`str`): Name of index/collection to delete.
  * `delete_docs` (`bool`, default=False): Remove stored points/documents if True.

* **Returns**

  * Parsed JSON response from the server.

#### 5. `async def reranker(query, docs) -> List[dict]`

Re-rank candidate documents returned by the RAG using the configured reranker endpoint.

```python
# docs can be the raw response from await client.query(...) or a list of doc dicts
response = await client.reranker("Tell me about LLaDA", docs)
print(response)  # server-side reranker JSON with reordered scores / metadata
```

* **Parameters**

  * `query` (`str`): Original user query or question.
  * `docs` (`List[dict] | Dict`): Candidate documents to be reranked. Accepts either:

    * a list of document dicts, or
    * the full response dict from `client.query(...)` (it will use the `results` key if present).

* **Behavior / Notes**

  * The client extracts the text from each provided chunk/document and posts a `rerankerjson` payload to the server's rerank endpoint (`/v1/rerank`).
  * The server-side reranker returns a JSON payload with reranked results (order and scores), which the client returns as-is.
  * Useful when you want a second-stage, model-based ranking step after vector retrieval (low-latency vector search + high-fidelity reranker).
  * Works independently of the vector backend (Redis, Qdrant, PostgreSQL).

### ⏱ Timeouts & HTTP client

* The client uses an internal `httpx.Timeout` by default:

```py
Timeout(connect=10.0, read=30.0, write=30.0, pool=30.0)
```

* Each method creates an `httpx.AsyncClient` with the configured `timeout`. To customize timeouts you can:

  * modify the client source to accept a `timeout` parameter, or
  * create your own request loop that uses `httpx.AsyncClient` with custom timeout and calls the server endpoints directly.

### 🛠 Error Handling

* All async methods call `response.raise_for_status()` — on non-2xx responses `httpx.HTTPStatusError` is raised (inspect `err.response` for details).
* `send_rag` captures per-chunk exceptions and returns them inline as `{"chunk_index": N, "error": "..."}`.
* Example:

```python
try:
    await client.create_index("my_idx")
except httpx.HTTPStatusError as err:
    print("Index creation failed:", err.response.status_code, err.response.text)
```

### 🔗 Additional Tips

* **API Key Header**: When initialized with `api_key`, the header `X-API-Key` is sent with every request.
* **Concurrency**: `send_rag` performs concurrent uploads via `asyncio.gather()` — this speeds ingestion but be mindful of rate limits and backend throughput.
* **Embedding functions**: Support for both sync and async `embedding_func` makes it easy to plug-in sync models or async HTTP calls (e.g., remote embedding services).
* **Chunking**: Default chunking is handled by `chunk_text_by_words()` in `aquiles.utils`. Adjust that util to change chunk sizes if needed.
* **Backend differences**: server responses and metrics vary across Redis, Qdrant and PostgreSQL — consult API Reference for backend-specific behavior.
* **PostgreSQL note**: when using PostgreSQL as the backend, ensure your server is configured with the expected extensions (e.g., `pgvector`) and connection pooling settings; the async client will forward metadata and embeddings similarly to other backends.

Happy asynchronous embedding, querying and reranking with Aquiles-RAG! 🚀
