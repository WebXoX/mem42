# Mem 42

A sophisticated, Dockerized web application demonstrating a collaborative multi-agent system for Retrieval-Augmented Generation (RAG) using a real vector database. This project allows users to build a dynamic knowledge base from documents and then use a team of specialized AI agents to reason upon that knowledge, providing insightful, synthesized answers.

This project is structured as a modern full-stack application with a React frontend and a Node.js backend.

## Core Concepts

The application operates in two main modes:

1.  **Manage Knowledge**: A user-friendly interface to build a "corporate memory" or knowledge base. Users can upload documents (including PDFs, text files, etc.), which are sent to the backend. The backend processes them with an AI to create dense, conceptual summaries called **"Memory Engrams."** These engrams, along with their vector embeddings, are stored in a **Qdrant** vector database.
2.  **Query Brain**: The main interface for interacting with the system. When a user asks a question, the frontend sends the query to the backend. The backend then initiates a multi-agent process to provide a comprehensive answer grounded in the knowledge base, streaming the results back to the UI.

## Features

-   **Client-Server Architecture**: Secure and scalable design with a React frontend and a Node.js/Express backend.
-   **Qdrant Integration**: Uses a production-grade Qdrant vector database for robust and efficient similarity searches.
-   **Multi-Agent Reasoning**: A team of specialized "philosopher" agents (Logic, Creativity, etc.) work in parallel on the backend to brainstorm approaches to a query.
-   **Engram-Based Memory**: An AI "Knowledge Architect" reads entire documents to create rich, conceptual summaries (engrams) for a more meaningful knowledge base.
-   **Advanced RAG Pipeline**: Implements a server-side, multi-step Retrieval-Augmented Generation process with real-time streaming of results to the frontend.
-   **Dockerized Environment**: The entire full-stack application is containerized with `docker-compose` for easy, one-command setup and consistent deployment.

## Architectural Overview

### 1. Knowledge Base Creation (Handled by the Backend)

`Frontend Uploads File(s)` -> `Backend Endpoint (/api/upload)` -> `Text Extraction` -> `Full Text sent to Gemini (Engram Creation)` -> `Engram is Embedded (Gemini Embedding Model)` -> `Upserted into Qdrant Collection`

### 2. The Query Process (Server-Side Collaborative RAG)

1.  **User Input**: The frontend sends the user's query to the backend's `/api/query` streaming endpoint.
2.  **Parallel Brainstorming**: The backend sends the query to all `PLANNING_MODULES` (Logic, Creativity, etc.) simultaneously. Each returns a short plan.
3.  **Informed Retrieval**:
    -   The collection of plans is sent to the "Memory Philosopher" to generate an optimized search query.
    -   The backend uses this query to perform a similarity search in the Qdrant database.
4.  **Synthesis**:
    -   The original query, agent plans, and retrieved context from Qdrant are sent to the "Synthesizer" agent.
    -   This final agent produces the comprehensive answer.
5.  **Streaming**: Throughout this process, the backend streams updates (e.g., "plans generated," "context retrieved," "final answer") to the frontend.

---

## Getting Started

The project is fully configured to run with Docker.

### Prerequisites

-   [Docker](https://www.docker.com/get-started)
-   [Docker Compose](https://docs.docker.com/compose/install/)
-   A **Qdrant instance** (e.g., via [Qdrant Cloud](https://cloud.qdrant.io/))
-   A **Google Gemini API Key**

### Setup Instructions

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd <repository-directory>
    ```

2.  **Create an environment file:**
    Copy the example `.env.example` file to a new file named `.env`.
    ```bash
    cp .env.example .env
    ```
    Open the `.env` file and **fill in all the required values**:
    - `GEMINI_API_KEY`: Your Google Gemini API key.
    - `QDRANT_URL`: The full URL of your Qdrant instance.
    - `QDRANT_API_KEY`: Your Qdrant API key (if required by your instance).

3.  **Build and run the application:**
    From the root directory, run the following command:
    ```bash
    docker-compose up --build
    ```
    This command will build the Docker images for both the frontend and backend, and start the services.

4.  **Access the application:**
    Open your web browser and navigate to `http://localhost:8088`.
