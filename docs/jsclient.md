# Aquiles-RAG TypeScript/JavaScript Client

The `@aquiles-ai/aquiles-rag-client` package provides a modern TypeScript/JavaScript interface for interacting with your Aquiles-RAG service. Use it in Node.js or browser environments to create indices, ingest text in chunks, and query your vector store — all with full async/await support and TypeScript type safety. Aquiles-RAG works with **Redis, Qdrant, or PostgreSQL** backends.

### 📦 Installation

Install the package via npm:

```bash
npm install @aquiles-ai/aquiles-rag-client
```

Or with yarn:

```bash
yarn add @aquiles-ai/aquiles-rag-client
```

### 🚀 Quick Start

```typescript
import { AsyncAquilesRAG } from '@aquiles-ai/aquiles-rag-client';

// Initialize the asynchronous client
const client = new AsyncAquilesRAG({
  host: 'http://127.0.0.1:5500',  // your service URL (include scheme)
  apiKey: 'YOUR_API_KEY',          // optional: if provided, client sends X-API-Key header
  timeout: 30000                   // optional: request timeout in milliseconds
});

async function main() {
  // Create index
  await client.createIndex('my_documents', 768, 'FLOAT32', true);

  // Ingest data (define your own embedding function)
  const responses = await client.sendRAG(
    myEmbeddingFunction,
    'my_documents',
    'doc_1',
    'Long document text...',
    {
      embeddingModel: 'text-embedding-3-small',
      metadata: {
        author: 'John Doe',
        language: 'EN',
        topics: ['AI', 'RAG']
      }
    }
  );
  console.log(responses);

  // Query index
  const queryEmbedding = await myEmbeddingFunction('What is Aquiles-RAG?');
  const results = await client.query('my_documents', queryEmbedding, {
    topK: 5,
    cosineDistanceThreshold: 0.6
  });
  
  results.forEach(hit => {
    console.log(`${hit.name_chunk} (score: ${hit.score})`);
  });
}

main();
```

### 🔨 Methods

#### 1. `async createIndex(indexName, embeddingsDim?, dtype?, deleteIfExists?) => Promise<string>`

Create or overwrite an index/collection in the configured backend.

```typescript
const response = await client.createIndex(
  'my_documents',
  768,
  'FLOAT32',
  false
);
console.log(response);  // raw server response text
```

* **Parameters**

  * `indexName` (`string`): Unique name for the index/collection.
  * `embeddingsDim` (`number`, default=768): Dimensionality of embedding vectors.
  * `dtype` (`'FLOAT32' | 'FLOAT64' | 'FLOAT16'`, default='FLOAT32'): Storage numeric type.
  * `deleteIfExists` (`boolean`, default=false): Drop existing index before creating.

* **Returns**

  * `Promise<string>` — raw server response text (server returns slightly different JSON depending on backend).

#### 2. `async query(index, embedding, options?) => Promise<QueryResult[]>`

Search the index/collection for the top-K nearest neighbors.

```typescript
const results = await client.query(
  'my_documents',
  queryEmbedding,
  {
    dtype: 'FLOAT32',
    topK: 5,
    cosineDistanceThreshold: 0.6,
    embeddingModel: 'text-embedding-3-small',
    metadata: {
      language: 'EN',
      topics: ['AI']
    }
  }
);
// results is an array of QueryResult objects
```

* **Parameters**

  * `index` (`string`): Index/collection name.
  * `embedding` (`number[]`): Query vector (array of floats).
  * `options` (`object`, optional):
    * `dtype` (`'FLOAT32' | 'FLOAT64' | 'FLOAT16'`, default='FLOAT32'): Must match stored index dtype.
    * `topK` (`number`, default=5): Number of neighbors to return.
    * `cosineDistanceThreshold` (`number`, default=0.6): Max cosine distance filter.
    * `embeddingModel` (`string | undefined`): Optional metadata filter (forwarded to server).
    * `metadata` (`ChunkMetadata | undefined`): Optional metadata filter (see allowed keys below).

* **Returns**

  * `Promise<QueryResult[]>` — array of result objects. The server response format `{"status":"ok","total":N,"results":[...]}` is automatically unwrapped to return just the `results` array.

* **Backend notes**

  * Works with Redis and Qdrant. Redis implementation converts embedding types server-side; Qdrant forwards the float array.
  * PostgreSQL is also supported — when using PostgreSQL ensure the server is configured for vector storage (e.g., `pgvector`) and appropriate connection pooling; the server will accept the same query payload structure and handle conversion/storage as configured.

#### 3. `async sendRAG(embeddingFunc, index, nameChunk, rawText, options?) => Promise<Array<Record<string, any>>>`

Split a long text into chunks, compute embeddings using the provided function, and upload them concurrently.

```typescript
const responses = await client.sendRAG(
  myEmbeddingFunction,   // sync or async function
  'my_documents',
  'doc_1',
  'Very long text to index...',
  {
    dtype: 'FLOAT32',
    embeddingModel: 'text-embedding-3-small',
    metadata: {
      author: 'John Doe',
      language: 'EN',
      topics: ['AI', 'RAG']
    }
  }
);
```

* **Parameters**

  * `embeddingFunc` (`(text: string) => number[] | Promise<number[]>`): Can be synchronous or asynchronous — the client detects and awaits if necessary.
  * `index` (`string`): Target index/collection name.
  * `nameChunk` (`string`): Prefix used for chunk names; client appends `_1`, `_2`, …
  * `rawText` (`string`): Full text to split and ingest.
  * `options` (`object`, optional):
    * `dtype` (`'FLOAT32' | 'FLOAT64' | 'FLOAT16'`, default='FLOAT32'): Embedding dtype (forwarded to server).
    * `embeddingModel` (`string | undefined`): Optional model identifier sent as chunk metadata.
    * `metadata` (`ChunkMetadata | undefined`): Optional metadata to associate with each chunk (allowed keys below).

* **Behavior / Implementation details**

  * Uses `chunkTextByWords()` to split text into ~600-word (~1024 token) chunks.
  * For each chunk the client calls `embeddingFunc(chunk)`. If the result is a Promise the client awaits it.
  * Uploads all chunks concurrently using `Promise.all()` and the helper `sendChunk`.
  * Each chunk payload includes `"chunk_size": 1024` in the body (server uses this field).
  * The client constructs payloads with optional `embeddingModel` and `metadata` when provided.

* **Returns**

  * `Promise<Array<Record<string, any>>>` — one entry per chunk. Successful uploads return the server JSON; failures return `{"chunk_index": N, "error": "<message>"}`.

* **Allowed metadata keys** (backend may reject unknown keys):

```typescript
interface ChunkMetadata {
  author?: string;          // Document author
  language?: string;        // ISO 639-1 code (e.g., "EN", "ES")
  topics?: string[];        // List of topics
  source?: string;          // Content source
  created_at?: string;      // ISO 8601 date
  extra?: Record<string, any>; // Additional metadata
}
```

#### 4. `async dropIndex(indexName, deleteDocs?) => Promise<Record<string, any>>`

Delete an index/collection (and optionally its documents/points).

```typescript
const response = await client.dropIndex('my_documents', true);
console.log(response);  // parsed JSON response
```

* **Parameters**

  * `indexName` (`string`): Name of index/collection to delete.
  * `deleteDocs` (`boolean`, default=false): Remove stored points/documents if true.

* **Returns**

  * `Promise<Record<string, any>>` — parsed JSON response from the server.

#### 5. `async reranker(query, docs) => Promise<Array<Record<string, any>>>`

Re-rank candidate documents returned by the RAG using the configured reranker endpoint.

```typescript
// docs can be the result array from client.query(...) or a response object
const reranked = await client.reranker(
  'Tell me about LLaDA',
  results
);
console.log(reranked);  // server-side reranker JSON with reordered scores / metadata
```

* **Parameters**

  * `query` (`string`): Original user query or question.
  * `docs` (`QueryResult[] | Record<string, any>`): Candidate documents to be reranked. Accepts either:
    * an array of document objects, or
    * the full response object from `client.query(...)` (it will use the `results` key if present).

* **Behavior / Notes**

  * The client extracts the text from each provided chunk/document and posts a `rerankerjson` payload to the server's rerank endpoint (`/v1/rerank`).
  * The server-side reranker returns a JSON payload with reranked results (order and scores), which the client returns as-is.
  * Useful when you want a second-stage, model-based ranking step after vector retrieval (low-latency vector search + high-fidelity reranker).
  * Works independently of the vector backend (Redis, Qdrant, PostgreSQL).

### 🔧 Utility Functions

The package exports two utility functions that can be used independently:

#### `chunkTextByWords(text, chunkSize?)`

Splits text into chunks by words.

```typescript
import { chunkTextByWords } from '@aquiles-ai/aquiles-rag-client';

const chunks = chunkTextByWords('Your long text...', 600);
// Returns: ['chunk 1...', 'chunk 2...', ...]
```

#### `extractTextFromChunk(chunk)`

Extracts text from a chunk that may have different formats.

```typescript
import { extractTextFromChunk } from '@aquiles-ai/aquiles-rag-client';

const text = extractTextFromChunk(result);
// Handles objects with raw_text, text, or content fields
// Also handles stringified arrays
```

### ⏱ Timeouts & HTTP client

* The client uses `axios` internally with configurable timeout:

```typescript
const client = new AsyncAquilesRAG({
  host: 'http://127.0.0.1:5500',
  timeout: 30000  // 30 seconds (default)
});
```

* All requests use the configured timeout value. You can customize it when initializing the client.

### 🛠 Error Handling

* All async methods call `response.raise_for_status()` — on non-2xx responses `AxiosError` is raised.
* `sendRAG` captures per-chunk exceptions and returns them inline as `{"chunk_index": N, "error": "..."}`.
* Example:

```typescript
try {
  await client.createIndex('my_idx');
} catch (error) {
  if (axios.isAxiosError(error)) {
    console.error('Index creation failed:', error.response?.status, error.response?.data);
  }
}
```

### 📝 TypeScript Support

The package is written in TypeScript and includes full type definitions:

```typescript
import { 
  AsyncAquilesRAG, 
  ChunkMetadata, 
  QueryResult,
  DType,
  EmbeddingFunc 
} from '@aquiles-ai/aquiles-rag-client';

// Full IntelliSense and type checking
const metadata: ChunkMetadata = {
  author: 'John Doe',
  language: 'EN',
  topics: ['AI', 'RAG'],
  created_at: new Date().toISOString()
};
```

### 🔗 Additional Tips

* **API Key Header**: When initialized with `apiKey`, the header `X-API-Key` is sent with every request.
* **Concurrency**: `sendRAG` performs concurrent uploads via `Promise.all()` — this speeds ingestion but be mindful of rate limits and backend throughput.
* **Embedding functions**: Support for both sync and async `embeddingFunc` makes it easy to plug-in sync models or async HTTP calls (e.g., remote embedding services like OpenAI).
* **Chunking**: Default chunking is handled by `chunkTextByWords()`. The function splits by whitespace and creates ~600-word chunks by default.
* **Backend differences**: server responses and metrics vary across Redis, Qdrant and PostgreSQL — consult API Reference for backend-specific behavior.
* **PostgreSQL note**: when using PostgreSQL as the backend, ensure your server is configured with the expected extensions (e.g., `pgvector`) and connection pooling settings; the client will forward metadata and embeddings similarly to other backends.
* **Browser usage**: While the package is designed for Node.js, it can work in browsers with proper bundling (webpack, vite, etc.) as long as CORS is properly configured on your Aquiles-RAG server.

### 📚 Example with OpenAI Embeddings

```typescript
import { AsyncAquilesRAG, ChunkMetadata } from '@aquiles-ai/aquiles-rag-client';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getEmbedding(text: string): Promise<number[]> {
  if (!text) return [];

  const resp = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });

  const emb = (resp as any)?.data?.[0]?.embedding;
  if (!Array.isArray(emb)) throw new Error("Invalid embedding");

  return emb.map(Number);
}

const client = new AsyncAquilesRAG({
  host: 'http://127.0.0.1:5500',
  apiKey: 'your-api-key',
});

async function main() {
  // Create index with correct dimensions for text-embedding-3-small
  await client.createIndex('my_index', 1536, 'FLOAT32', true);

  // Metadata
  const metadata: ChunkMetadata = {
    author: 'John Doe',
    language: 'EN',
    topics: ['AI', 'Machine Learning'],
    source: 'documentation',
    created_at: new Date().toISOString(),
  };

  // Ingest document
  const text = 'Your long document text here...';
  await client.sendRAG(
    getEmbedding,
    'my_index',
    'document_1',
    text,
    {
      embeddingModel: 'text-embedding-3-small',
      metadata
    }
  );

  // Query
  const queryEmbedding = await getEmbedding('What is this about?');
  const results = await client.query('my_index', queryEmbedding, {
    topK: 5,
    cosineDistanceThreshold: 0.6
  });

  console.log('Results:', results);
}

main();
```

Happy embedding, querying and reranking with Aquiles-RAG! 🚀