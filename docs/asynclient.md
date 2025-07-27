## Aquiles‑RAG Async Python Client

The `aquiles.client.AsyncAquilesRAG` class provides an asynchronous interface for interacting with your Aquiles‑RAG service. Use it in Python `async` contexts to create indices, ingest text in chunks, and query your vector store—all without blocking your event loop.

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
    host="http://127.0.0.1:5500",  # your service URL
    api_key=token                      # if you have API key auth enabled
)

async def main():
    # Create index
    await client.create_index("my_documents_async")

    # Ingest data (define your own embedding_func)
    async_responses = await client.send_rag(
        embedding_func=my_embedding_func,
        index="my_documents_async",
        name_chunk="doc_async",
        raw_text="Long document text..."
    )
    print(async_responses)

    # Query index
    q_emb = my_embedding_func("What is Aquiles-RAG?")
    results = await client.query(
        index="my_documents_async",
        embedding=q_emb
    )
    for hit in results:
        print(f"{hit['name_chunk']} (score: {hit['score']})")

asyncio.run(main())
```

### 🔨 Methods

#### 1. `async def create_index(...) -> str`

Create or overwrite a Redis vector index asynchronously.

```python
response_text = await client.create_index(
    index_name="my_documents_async",
    embeddings_dim=768,
    dtype="FLOAT32",
    delete_the_index_if_it_exists=False
)
print(response_text)
```

* **Parameters**

  * `index_name` (`str`): Unique name for the index.
  * `embeddings_dim` (`int`, default=768): Dimensionality of your embedding vectors.
  * `dtype` (`Literal["FLOAT32", "FLOAT64", "FLOAT16"]`, default="FLOAT32"): Numeric type for storage.
  * `delete_the_index_if_it_exists` (`bool`, default=False): Overwrite existing index if True.

* **Returns**: `str` – Raw server response text.

#### 2. `async def query(...) -> List[dict]`

Search the index for the top-K nearest neighbors based on cosine similarity.

```python
results = await client.query(
    index="my_documents_async",
    embedding=q_emb,
    dtype="FLOAT32",
    top_k=5,
    cosine_distance_threshold=0.6
)
```

* **Parameters**

  * `index` (`str`): Name of the index to query.
  * `embedding` (`Sequence[float]`): Query embedding vector.
  * `dtype` (`Literal[...]`, default="FLOAT32"): Must match index’s dtype.
  * `top_k` (`int`, default=5): Number of top results to return.
  * `cosine_distance_threshold` (`float`, default=0.6): Filter threshold.

* **Returns**: `List[dict]` – Each dict contains `name_chunk`, `chunk_size`, `raw_text`, `score`, etc.

#### 3. `async def send_rag(...) -> List[dict]`

Split a long text into chunks, compute embeddings with your provided function, and upload them asynchronously.

```python
responses = await client.send_rag(
    embedding_func=my_embedding_func,
    index="my_documents_async",
    name_chunk="doc_async",
    raw_text="Very long text to index...",
    dtype="FLOAT32"
)
```

* **Parameters**

  * `embedding_func` (`Callable[[str], Sequence[float]]`): Function that takes a text chunk and returns its embedding.
  * `index` (`str`): Target index name.
  * `name_chunk` (`str`): Prefix for chunk IDs (suffix `_1`, `_2`, ... appended).
  * `raw_text` (`str`): Full text to split and index.
  * `dtype` (`Literal[...]`, default="FLOAT32"): Data type for embeddings.

* **Returns**: `List[dict]` – Responses or errors per chunk. Each success contains server JSON; failures include `{chunk_index, error}`.

> **Chunking**: Uses `chunk_text_by_words()` to split text into \~600-word segments (\~1024 tokens).

### 🛠 Error Handling

All async methods raise an `httpx.HTTPStatusError` on non-2xx responses. Catch exceptions to inspect status codes and details:

```python
try:
    await client.create_index("my_idx")
except httpx.HTTPStatusError as err:
    print("Index creation failed:", err)
```

### 🔗 Additional Tips

* **API Key Header**: When initialized with `api_key`, the header `X-API-Key` is included in every request.
* **Timeouts**: `send_rag` sets a 10-second timeout per chunk by default. Adjust by passing `timeout` to `AsyncClient` if needed.
* **Concurrency**: All chunk uploads run concurrently via `asyncio.gather()`, speeding up ingestion.

Happy asynchronous embedding and querying with Aquiles‑RAG! 🚀
