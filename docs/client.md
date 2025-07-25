# Aquiles‑RAG Python Client

The `aquiles.client.AquilesRAG` class provides a simple, high‑level interface for interacting with your Aquiles‑RAG service. Use it to create indices, ingest text (in chunks), and query your vector store—all in pure Python.


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
    host="http://127.0.0.1:5500",  # your service URL
    api_key="YOUR_API_KEY"         # if you have API key auth enabled
)
```


## 🔨 Methods

### 1. `create_index(...)`

Create (or overwrite) a Redis vector index.

```python
response_text = client.create_index(
    index_name="my_documents",
    embeddings_dim=768,                    # dimensionality of your embedding vectors
    dtype="FLOAT32",                       # one of "FLOAT32", "FLOAT64", "FLOAT16"
    delete_the_index_if_it_exists=False    # set True to drop an existing index first
)
print(response_text)  # e.g. {"status":"success",...}
```

* **Parameters**

  * `index_name` (`str`): Unique name for the index.
  * `embeddings_dim` (`int`, default=768): Length of each embedding vector.
  * `dtype` (`str`, default="FLOAT32"): Underlying numeric type for storage.
  * `delete_the_index_if_it_exists` (`bool`, default=False): Overwrite existing index if True.


### 2. `send_rag(...)`

Split a large text into manageable chunks, compute embeddings via your own function, and store each chunk in Redis.

```python
from aquiles.client import AquilesRAG

# Example embedding function (replace with your own)
def my_embedding_func(text: str) -> list[float]:
    # e.g. call OpenAI, Llama3, HuggingFace, etc.
    return your_model.encode(text)

# Ingest a long document
responses = client.send_rag(
    embedding_func=my_embedding_func,
    index="my_documents",
    name_chunk="doc1",               # prefix for chunk IDs
    raw_text="Very long document..." # full text to be indexed
)

# Each response is either {"status":"ok","key":"my_documents:1"} or {"chunk_index":N,"error":...}
for resp in responses:
    print(resp)
```

* **Parameters**

  * `embedding_func` (`Callable[[str], Sequence[float]]`): Your custom function that takes a text chunk and returns its embedding vector.
  * `index` (`str`): The target index name.
  * `name_chunk` (`str`): Base label for each chunk (auto‑incremented with `_1`, `_2`, …).
  * `raw_text` (`str`): The full text to split and ingest.
  * `dtype` (`str`, default="FLOAT32"): Data type of the embeddings in the index.

> **Chunking**
> By default, `chunk_text_by_words()` splits the text into \~600‑word chunks (≈1024 tokens), balancing size and performance.

### 3. `query(...)`

Search the index for the top‑K nearest neighbors to a query embedding.

```python
# Suppose q_emb is a list[float] from your embedding model
results = client.query(
    index="my_documents",
    embedding=q_emb,
    dtype="FLOAT32",          # must match index dtype
    top_k=5,                  # return up to 5 results
    cosine_distance_threshold=0.6
)

# Sample output:
# {
#   "status": "ok",
#   "total": 3,
#   "results": [
#     {
#       "name_chunk": "doc1_2",
#       "chunk_id": 2,
#       "chunk_size": 598,
#       "raw_text": "…",
#       "score": 0.1234
#     },
#     …
#   ]
# }
for hit in results["results"]:
    print(f"{hit['name_chunk']} (score: {hit['score']})")
```

* **Parameters**

  * `index` (`str`): Index to query.
  * `embedding` (`Sequence[float]`): Query vector.
  * `dtype` (`str`, default="FLOAT32"): Must match the index’s dtype.
  * `top_k` (`int`, default=5): Maximum number of neighbors to return.
  * `cosine_distance_threshold` (`float`, default=0.6): Filter out results with cosine distance > threshold.

## 🛠 Error Handling

All methods raise a `RuntimeError` if the HTTP request fails. Inspect the exception message for details:

```python
try:
    client.create_index("my_documents")
except RuntimeError as err:
    print("Index creation failed:", err)
```

## 🔗 Additional Tips

* **API Key Header**: If initialized with `api_key`, every request includes `X-API-Key`.
* **Timeouts**: `send_rag` uses a 10‑second timeout per chunk; you can modify `client.send_rag` to pass a different `timeout` if needed.
* **Chunk Size**: To customize chunk lengths, adjust the `chunk_text_by_words()` implementation in `aquiles.utils`.

Happy embedding and querying with Aquiles‑RAG! 🚀
