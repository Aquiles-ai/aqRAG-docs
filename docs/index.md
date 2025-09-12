# Welcome to Aquiles-RAG Documentation

Aquiles-RAG is a high-performance Retrieval-Augmented Generation (RAG) service built to work with **Redis, Qdrant, or PostgreSQL** as the vector database backend, and FastAPI as the API layer. This documentation site will help you get started, configure your environment, use the CLI & Python client, deploy to production, and explore the full API surface.

## 📚 Table of Contents

1. Installation & Configuration
   Learn how to install the package, initialize and edit your settings, and choose the correct vector DB and connection mode (Redis standalone, cluster, TLS/SSL; Qdrant HTTP/gRPC; or PostgreSQL connection/pooling options).

2. Python Client SDK
   Explore the AquilesRAG Python interface: create indices, ingest text, and query your chosen vector store programmatically.

3. Deploying Aquiles-RAG
   Instructions and examples for production deployment (e.g. Render, Docker, cloud providers), including configuration file generation and notes for deploying with Redis, Qdrant, or PostgreSQL.

4. REST API Reference (`api.md`)
   Endpoint definitions, request/response schemas, and code snippets for all `/create/index`, `/rag/*`, and auth routes.

## Performance: Load Testing

Below are two load test videos demonstrating the behavior of Aquiles-RAG using Redis and Qdrant as RAGs.

### Qdrant (load testing)
<div class="video-wrapper">
  <iframe
    src="https://www.youtube.com/embed/3YJidm_FdeI?si=Ik8ePylrRmZuLo2_"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    referrerpolicy="strict-origin-when-cross-origin"
    allowfullscreen
    loading="lazy"></iframe>
</div>

> Watch on YouTube: [https://www.youtube.com/watch?v=3YJidm\_FdeI](https://www.youtube.com/watch?v=3YJidm_FdeI)

### Redis (load testing)
<div class="video-wrapper">
  <iframe
    src="https://www.youtube.com/embed/rlPxwLUtwJ4?si=fNslBDKkTCgyzdjE"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    referrerpolicy="strict-origin-when-cross-origin"
    allowfullscreen
    loading="lazy"></iframe>
</div>

> Watch on YouTube: [https://www.youtube.com/watch?v=rlPxwLUtwJ4](https://www.youtube.com/watch?v=rlPxwLUtwJ4)

> **Note:** PostgreSQL is also supported as a backend option; deployment and performance characteristics will depend on your PostgreSQL setup (connection pooling, extensions such as `pgvector`, and infrastructure).

> **Next Steps**
>
> * If you haven’t yet, begin with Installation & Configuration and pick your RAG: **Redis, Qdrant, or PostgreSQL**.
> * For hands-on testing, check out the UI Playground via the Python client or CLI commands
> * When you need detailed payload schemas or request examples, jump to the REST API Reference (`api.md`).

Enjoy building with Aquiles-RAG! 🚀