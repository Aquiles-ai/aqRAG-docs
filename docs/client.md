# Aquiles-RAG Python Client

The `aquiles.client.AquilesRAG` class provides a simple, high-level interface for interacting with your Aquiles-RAG service. Use it to create indices, ingest text (in chunks), and query your vector store — all in pure Python.


## 📦 Installation

Make sure you have the `aquiles-rag` package installed:

```bash
pip install aquiles-rag
```

## 🚀 Quick Start

```python
from aquiles.client import AquilesRAG

# Initialize the client
client = AquilesRAG(
    host="http://127.0.0.1:5500",  # your service URL (include scheme)
    api_key="YOUR_API_KEY"         # optional: if provided, client sends X-API-Key header
)
```

**Note:** If you pass an `api_key`, the client will include the header `X-API-Key: <your_api_key>` on all protected endpoints.

## 🔨 Methods

### 1. `create_index(index_name, embeddings_dim=768, dtype="FLOAT32", delete_the_index_if_it_exists=False)`

Create (or overwrite) an index/collection in the configured backend.

```python
response_text = client.create_index(
    index_name="my_documents",
    embeddings_dim=768,
    dtype="FLOAT32",
    delete_the_index_if_it_exists=False
)
print(response_text)  # server response (note: client returns response.text)
```

* **Parameters**

  * `index_name` (`str`): Unique name for the index/collection.
  * `embeddings_dim` (`int`, default=768): Dimensionality of embedding vectors.
  * `dtype` (`str`, default="FLOAT32"): One of `"FLOAT32"`, `"FLOAT64"`, `"FLOAT16"`.
  * `delete_the_index_if_it_exists` (`bool`, default=False): If `True`, drop existing index before creating.

* **Behavior / Notes**

  * Returns `response.text` (string). The server returns slightly different JSON depending on backend:

    * Redis: `{"status":"success","index":"<indexname>","fields":[...]}`
    * Qdrant: `{"status":"success","index":"<indexname>"}`
  * Caller may want to `json.loads(response_text)` if you need structured data.

### 2. `send_rag(embedding_func, index, name_chunk, raw_text, dtype="FLOAT32", embedding_model=None)`

Split a large text into chunks, compute embeddings (using your `embedding_func`) and store each chunk.

```python
def my_embedding_func(text: str) -> list[float]:
    # call your model here (OpenAI, HF, Llama3 wrapper, etc.)
    return your_model.encode(text)

responses = client.send_rag(
    embedding_func=my_embedding_func,
    index="my_documents",
    name_chunk="doc1",
    raw_text="Very long document text...",
    dtype="FLOAT32",
    embedding_model="text-embedding-v1"  # optional metadata
)

for resp in responses:
    print(resp)
```

* **Parameters**

  * `embedding_func` (`Callable[[str], Sequence[float]]`): Function that takes chunk text and returns an embedding (list/sequence of floats).
  * `index` (`str`): Target index/collection name.
  * `name_chunk` (`str`): Base label for chunks; the client appends `_1`, `_2`, ….
  * `raw_text` (`str`): Full document text to be chunked and ingested.
  * `dtype` (`str`, default="FLOAT32"): Data type for the index.
  * `embedding_model` (`str | None`): Optional model identifier sent as metadata with each chunk.

* **Behavior / Notes**

  * The client uses `chunk_text_by_words()` to split `raw_text` into chunks (default behavior \~600 words / \~1024 tokens by your utils).
  * For each chunk, the client calls your `embedding_func(chunk)` and posts to `/rag/create`.
  * Each chunk upload uses a 10-second HTTP timeout.
  * The returned list contains server JSON responses for successful uploads or `{"chunk_index": N, "error": "<message>"}` for failures.
  * Supports both Redis and Qdrant backends — `embedding_model` is forwarded as optional metadata.


### 3. `query(index, embedding, dtype="FLOAT32", top_k=5, cosine_distance_threshold=0.6, embedding_model=None)`

Search the index/collection for the top-K nearest neighbors.

```python
results = client.query(
    index="my_documents",
    embedding=q_emb,              # list[float] from your embedding model
    dtype="FLOAT32",
    top_k=5,
    cosine_distance_threshold=0.6,
    embedding_model="text-embedding-v1"  # optional
)

for hit in results["results"]:
    print(f"{hit['name_chunk']} (score: {hit['score']})")
```

* **Parameters**

  * `index` (`str`): Index/collection name.
  * `embedding` (`Sequence[float]`): Query vector.
  * `dtype` (`str`, default="FLOAT32"): Must match the stored index dtype (server validates).
  * `top_k` (`int`, default=5): Number of neighbors to return.
  * `cosine_distance_threshold` (`float`, default=0.6): Filter out results with distance > threshold.
  * `embedding_model` (`str | None`): Optional metadata filter — forwarded to server.

* **Behavior / Notes**

  * Returns parsed JSON (`dict`) from the server with `status`, `total`, and `results`.
  * Works with both Redis (server converts the embedding to the requested dtype) and Qdrant (server forwards float list to Qdrant).

### 4. `drop_index(index_name, delete_docs=False)`

Delete an index/collection, optionally removing all documents/points.

```python
resp = client.drop_index("my_documents", delete_docs=True)
print(resp)  # parsed JSON response from server
```

* **Parameters**

  * `index_name` (`str`): Name of the index/collection to drop.
  * `delete_docs` (`bool`, default=False): If `True`, delete stored documents/points.

* **Behavior / Notes**

  * Returns parsed JSON from the server indicating success or error.
  * Works for both Redis and Qdrant backends.

## 🛠 Error Handling

* All network/HTTP errors raise a `RuntimeError` with details (the client wraps `requests` exceptions).
* For `send_rag`, individual chunk failures are returned inline as `{"chunk_index": N, "error": "..."}` so you can retry or log them.

```python
try:
    client.create_index("my_documents")
except RuntimeError as err:
    print("Index creation failed:", err)
```

## 🔗 Additional Tips

* **Base URL**: pass the full URL including scheme (`http://` or `https://`) to `AquilesRAG(host=...)`.
* **API Key Header**: if initialized with `api_key`, every protected request includes `X-API-Key`.
* **Timeouts**: `send_rag` uses a 10-second timeout per chunk upload. If you need longer timeouts, modify the client or wrap the call.
* **Chunking**: default chunking is handled by `chunk_text_by_words()` in `aquiles.utils`. Tune that util if you need different chunk sizes. The client sends `chunk_size: 1024` in the payload for each chunk.
* **Consistency**: ensure `dtype` used for `create_index` and `query` matches the dtype you used when ingesting via `send_rag`.
* **Backend differences**: some server responses differ between Redis and Qdrant (e.g., create index schema), but the client abstracts the network calls — inspect returned JSON/text as needed.

Happy embedding and querying with Aquiles-RAG! 🚀