# Aquiles-RAG MCP Server

The **Aquiles-RAG MCP Server** provides a [Model Context Protocol (MCP)](https://modelcontextprotocol.io) interface for interacting with your Aquiles-RAG service. This allows AI agents and assistants to directly manage vector indices, store embeddings, and perform semantic search through standardized MCP tools. Aquiles-RAG works with **Redis, Qdrant, or PostgreSQL** backends.

### 🌐 What is MCP?

The Model Context Protocol (MCP) is an open standard that enables AI models to securely interact with external tools and data sources. By exposing Aquiles-RAG as an MCP server, you can:

- Connect AI agents (Claude Desktop, custom agents, etc.) to your vector database
- Enable semantic search and RAG workflows through natural language
- Provide tools for index management, data ingestion, and querying
- Build agentic applications that leverage vector search capabilities

### 📦 Installation

The MCP server is built using FastMCP and comes bundled with Aquiles-RAG:

```bash
pip install aquiles-rag fastmcp
```

### 🚀 Quick Start

#### Starting the MCP Server

```bash
# Run the MCP server (default port 5500)
aquiles-rag mcp-serve --host "0.0.0.0" --port 5500 --transport "sse"

# Or specify a custom port
aquiles-rag mcp-serve --host "0.0.0.0" --port 8800 --transport "sse"
```

The server exposes:
- **SSE endpoint**: `http://localhost:5500/sse`
- **Custom HTTP routes**: `/rag/create`, `/create/index`, `/rag/query-rag`

#### Connecting from an AI Agent

```python
from agents.mcp import MCPServerSse

# Connect to the MCP server
mcp_server = MCPServerSse({"url": "https://aquiles-deploy.onrender.com/sse", "headers": { # MCP server can now be deployed in Render
        "X-API-Key": os.getenv("AQUILES_API_KEY", "dummy-api-key")
    }})

await mcp_server.connect()
```

### 🔨 MCP Tools

The server exposes the following tools that AI agents can use:

#### 1. `readiness()` - Check Database Connection

Verify the status of the configured backend connection (Redis, Qdrant, or PostgreSQL).

**Returns:**
- `status` (`str`): "ready" if connected, or error description
- `connection_type` (`str`): "Redis", "Qdrant", or "PostgreSQL"
- `error` (`str`, optional): Error message if connection failed

#### 2. `create_index()` - Create Vector Index

Create a new vector search index in the configured backend.

```python
# Tool signature
create_index(
    indexname: str,
    embeddings_dim: int,
    dtype: Literal["FLOAT32", "FLOAT64", "FLOAT16"],
    delete_the_index_if_it_exists: bool,
    concurrently: bool
)
```

**Parameters:**
- `indexname` (`str`): Name of the index to create
- `embeddings_dim` (`int`): Dimension of the embeddings (e.g., 768, 1536)
- `dtype` (`str`): Embedding data type
  - `FLOAT32` — default, balanced precision/memory
  - `FLOAT64` — high precision, high memory
  - `FLOAT16` — low precision, low memory
- `delete_the_index_if_it_exists` (`bool`): Drop existing index before creating
- `concurrently` (`bool`): PostgreSQL-only option for concurrent index creation

**Returns:**
- `status` (`str`): "success" or error description
- `index` (`str`): Name of created index
- `fields` (`list`, Redis only): Schema field names

**Example (AI agent instruction):**
```
"Create an index named 'my_documents' with 1536 dimensions for text-embedding-3-small"
```

#### 3. `get_ind()` - List All Indices

Retrieve all created indices in the database.

```python
# Tool usage
result = await get_ind()
# Returns: {"indices": ["index1", "index2", "index3"]}
```

**Returns:**
- `indices` (`list`): Array of index names

#### 4. `delete_index()` - Remove Index

Delete an index and optionally its documents.

```python
# Tool signature
delete_index(
    index_name: str,
    delete_docs: bool
)
```

**Parameters:**
- `index_name` (`str`): Name of index to delete
- `delete_docs` (`bool`): Remove documents from the index

**Returns:**
- Dictionary describing the deleted index and status

### 🌐 Custom HTTP Routes

In addition to MCP tools, the server exposes HTTP endpoints that can be used directly:

#### POST `/rag/create` - Store Embeddings

Store a text chunk with its embedding in the vector database.

```bash
curl -X POST http://localhost:5500/rag/create \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "index": "my_index",
    "name_chunk": "doc_1",
    "raw_text": "Your text here",
    "embeddings": [0.1, 0.2, ...],
    "dtype": "FLOAT32"
  }'
```

#### POST `/create/index` - Create Index

Create a new vector index.

```bash
curl -X POST http://localhost:5500/create/index \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "indexname": "my_index",
    "embeddings_dim": 1536,
    "dtype": "FLOAT32",
    "delete_the_index_if_it_exists": false
  }'
```

#### POST `/rag/query-rag` - Query Vector Database

Search for similar embeddings.

```bash
curl -X POST http://localhost:5500/rag/query-rag \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "index": "my_index",
    "embeddings": [0.1, 0.2, ...],
    "dtype": "FLOAT32",
    "top_k": 5,
    "cosine_distance_threshold": 0.6
  }'
```

### 🤖 Complete Agent Example

Here's a full example of an AI agent using the Aquiles-RAG MCP server:

```python
import asyncio
import os
import openai
from openai import AsyncOpenAI as OpenAI
from agents import Agent, Runner, function_tool
from agents.mcp import MCPServerSse
from aquiles.client import AsyncAquilesRAG
from typing import Literal

openai.api_key = os.getenv("OPENAI_API_KEY")

async def get_emb(text: str):
    client = OpenAI()

    resp = await client.embeddings.create(
        input=text,
        model="text-embedding-3-small"
    )

    return resp.data[0].embedding

async def send_info(index: str, name_chunk: str, raw_text: str, dtype: Literal["FLOAT32", "FLOAT64", "FLOAT16"]):
    client = AsyncAquilesRAG(host="https://aquiles-deploy.onrender.com",api_key=os.getenv("AQUILES_API_KEY", "dummy-api-key")) # MCP server can now be deployed in Render

    result = await client.send_rag(get_emb, index, name_chunk, raw_text, dtype)

    return result

async def query(index: str, text: str, dtype: Literal["FLOAT32", "FLOAT64", "FLOAT16"] = "FLOAT32", 
                top_k: int = 5, cosine_distance_threshold: float = 0.6,):
    client = AsyncAquilesRAG(host="https://aquiles-deploy.onrender.com", api_key=os.getenv("AQUILES_API_KEY", "dummy-api-key")) # MCP server can now be deployed in Render
    embedding = await get_emb(text)
    result = await client.query(index=index, embedding=embedding, dtype=dtype, top_k=top_k, cosine_distance_threshold=cosine_distance_threshold)
    return result

async def main():

    mcp_server = MCPServerSse({"url": "https://aquiles-deploy.onrender.com/sse", "headers": { # MCP server can now be deployed in Render
        "X-API-Key": os.getenv("AQUILES_API_KEY", "dummy-api-key")
    }})
    await mcp_server.connect()

    agent = Agent(
        name="Aquiles Assistant",
        instructions="""
        You are a helpful assistant with access to tools on the MCP server for managing and querying a vector database (Aquiles RAG).
        Use the tools to answer user queries efficiently.

        ## Available Tools:

        ### 1. **send_info** - Store text in vector database
        Use this tool whenever you need to add text+embedding to the vector store.
        
        **Signature:** `send_info(index: str, name_chunk: str, raw_text: str, dtype: Literal["FLOAT32","FLOAT64","FLOAT16"])`
        
        **Parameters:**
        - `index`: Target index name where the chunk will be stored
        - `name_chunk`: A short identifier or name for the chunk being stored
        - `raw_text`: The text content to be vectorized and stored
        - `dtype`: Numeric dtype for storage (one of "FLOAT32", "FLOAT64", "FLOAT16")
        
        **Behavior:**
        - This tool internally computes the embedding (via the internal `get_emb` helper) and sends the chunk to Aquiles
        - IMPORTANT: When a task requires generating or storing vector representations, invoke **send_info** with the appropriate parameters
        - If **send_info** fails at any point (embedding computation or sending to Aquiles), stop execution and report exactly where it failed and why

        ### 2. **query_rag** - Search/query the vector database
        Use this tool to search for relevant information stored in the vector database based on semantic similarity.
        
        **Signature:** `query_rag(index: str, text: str, dtype: Literal["FLOAT32","FLOAT64","FLOAT16"] = "FLOAT32", top_k: int = 5, cosine_distance_threshold: float = 0.6)`
        
        **Parameters:**
        - `index`: The index name to search in (must be the same index where data was stored)
        - `text`: The query text to search for (will be converted to an embedding internally)
        - `dtype`: Numeric dtype used when the index was created (must match the storage dtype, default: "FLOAT32")
        - `top_k`: Number of most similar results to return (default: 5)
        - `cosine_distance_threshold`: Minimum similarity score threshold (0.0 to 1.0, default: 0.6). Results below this threshold are filtered out
        
        **Behavior:**
        - This tool internally computes the query embedding and searches for the most similar vectors
        - Returns results sorted by similarity (highest first)
        - Only returns results above the cosine_distance_threshold
        - IMPORTANT: Always use the same `dtype` that was used when storing the data with `send_info`
        
        **Usage Examples:**
        - To search for information: `query_rag(index="my_docs", text="What is machine learning?")`
        - To get more results: `query_rag(index="my_docs", text="AI applications", top_k=10)`
        - To filter low-quality matches: `query_rag(index="my_docs", text="query", cosine_distance_threshold=0.8)`

        ## Workflow Guidelines:

        1. **Storing Data:** Use `send_info` to add documents/chunks to the vector database
        2. **Searching Data:** Use `query_rag` to find relevant information based on user queries
        3. **Consistency:** Always use the same `dtype` for both storing and querying within the same index
        4. **Error Handling:** If any tool fails, report the exact error and suggest corrective actions
        
        ## Important Notes:
        - The embedding model used is `text-embedding-3-small` (1536 dimensions)
        - Ensure the `index` parameter is consistent between `send_info` and `query_rag` operations
        - The `dtype` must match between storage and query operations for the same index
        """,
        mcp_servers=[mcp_server],
        tools=[function_tool(send_info, name_override="send_info"),
                function_tool(query, name_override="query_rag")],
        model="gpt-5"
    )

    prompt = """Execute this test step by step. After EACH step, immediately proceed to the next:

        STEP 1: Test database connection
        STEP 2: Create 2 indexes with random names, when creating the indexes, set the embeddings dimension to 1536.
        STEP 3: List all indexes (then IMMEDIATELY continue)
        STEP 4: Add 8 sentences using send_info (2 per topic: cars, food, sports, tech, music)
        STEP 5: Query RAG with one topic (Create one query that is similar to one of the sentences you sent to the RAG and another that is on the same topic, but does not resemble the sentences you sent)
        STEP 6: Delete 1 index
        STEP 7: Report all results

    IMPORTANT: Do NOT wait after step 3. Continue immediately to step 4.
    Stop only if a step fails."""

    result = await Runner.run(agent, prompt)
    print(result.final_output)

    await mcp_server.cleanup()

if __name__ == "__main__":
    asyncio.run(main())
```

### 🔐 Authentication

The MCP server supports API key authentication via the `X-API-Key` header:

```python
# Set API key in environment
export AQUILES_API_KEY="your-secret-key"

# Include in requests
headers = {"X-API-Key": os.getenv("AQUILES_API_KEY")}
```

### 🛠 Error Handling

All MCP tools and HTTP routes include comprehensive error handling:

```python
# Tools return structured error responses
{
    "status": "error_description",
    "connection_type": "Redis",
    "error": "detailed error message"
}
```

Common errors:
- **Connection errors**: Database backend unavailable
- **Invalid index**: Index doesn't exist
- **dtype mismatch**: Query dtype doesn't match stored dtype
- **Authentication**: Missing or invalid API key

### 📊 Multi-Backend Support

The MCP server automatically handles differences between backends:

**Redis:**
- Uses byte-encoded embeddings
- Returns schema information on index creation
- Supports FT.SEARCH syntax

**Qdrant:**
- Uses native float arrays
- Collection-based architecture
- Supports filters and metadata

**PostgreSQL:**
- Requires pgvector extension
- Supports concurrent index creation
- SQL-based queries with vector operations

### 🌍 Deployment

#### Local Development

```bash
# Start the server
aquiles-rag mcp-serve --host "0.0.0.0" --port 5500 --transport "sse"

```

#### Production Deployment

The MCP server can be deployed to cloud platforms:

```python
# Example: Render.com deployment
mcp_server = MCPServerSse({
    "url": "https://your-app.onrender.com/sse",
    "headers": {
        "X-API-Key": os.getenv("AQUILES_API_KEY")
    }
})
```

See the Deploy documentation for detailed deployment instructions.

### 🔗 Additional Resources

- **MCP Specification**: [https://modelcontextprotocol.io](https://modelcontextprotocol.io)
- **FastMCP Documentation**: FastMCP makes it easy to build MCP servers
- **Aquiles-RAG API**: See API Reference for detailed endpoint documentation
- **Python Client**: See Async Client for programmatic access

### 💡 Use Cases

**AI-Powered Search:**
```
Agent: "Find documents about machine learning in our knowledge base"
→ Uses query_rag to search vector database
→ Returns relevant documents with scores
```

**Automated Knowledge Management:**
```
Agent: "Store this technical document in the 'engineering' index"
→ Uses send_info to chunk and embed document
→ Stores in vector database for future retrieval
```

**Dynamic Index Management:**
```
Agent: "Create a new index for customer support tickets"
→ Uses create_index to set up vector storage
→ Automatically configures for embedding dimensions
```

**RAG Workflows:**
```
User: "What are the benefits of our product?"
→ Agent queries vector database
→ Retrieves relevant documentation
→ Generates informed response
```

### 🎯 Best Practices

1. **Embedding Consistency**: Always use the same embedding model (e.g., text-embedding-3-small) for a given index
2. **Dimension Matching**: Set `embeddings_dim` to match your model (1536 for text-embedding-3-small, 768 for others)
3. **dtype Selection**: Use FLOAT32 for most cases; only use FLOAT16/64 if you have specific requirements
4. **Connection Pooling**: The MCP server handles connection lifecycle automatically
5. **Error Recovery**: Tools return structured errors that agents can interpret and retry
6. **Metadata**: Use the `metadata` parameter to add searchable filters to your chunks

Happy building with Aquiles-RAG MCP Server! 🚀