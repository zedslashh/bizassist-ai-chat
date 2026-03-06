# BizAssistAI Chatbot

A platform that allows **Small and Medium Enterprises (SMEs)** to easily
create and deploy AI-powered chatbots without requiring advanced
technical knowledge.

Businesses can upload their documents, generate a chatbot using
**Retrieval-Augmented Generation (RAG)** and integrate the bot into
their websites or messaging platforms.

------------------------------------------------------------------------

## 🚀 Features

-   📄 **Upload Knowledge Base**
    -   Upload PDFs and documents to train the chatbot.
    -   The system converts documents into embeddings for semantic
        search.
-   🌐 **Multiple Integration Options**
    -   Landing Page Chatbot
    -   Website Widget
    -   Telegram Bot
-   🌍 **Multilingual Support**
    -   Supports multiple languages using **multilingual-e5-base
        embeddings**.
-   🤖 **AI-Powered Responses**
    -   Uses **Gemini models** for intelligent conversational responses.
-   🔍 **Semantic Search with RAG**
    -   Queries are answered using **ChromaDB vector search** for
        accurate retrieval.
-   💳 **Subscription & Payments**
    -   Integrated **Stripe** for managing user subscriptions.
-   🔐 **Authentication**
    -   Secure login using **Supabase Authentication**.

------------------------------------------------------------------------

## 🏗️ Tech Stack

### Backend

-   **FastAPI**
-   **Python**
-   **ChromaDB (Vector Database)**
-   **RAG Architecture**
-   **Gemini API**
-   **multilingual-e5-base embeddings**

### Frontend

-   **React**
-   **Tailwind / UI libraries**

### Authentication

-   **Supabase Auth**

### Payments

-   **Stripe**

### Deployment Integrations

-   Website **Widget**
-   **Landing Page chatbot**
-   **Telegram Bot**

------------------------------------------------------------------------

## 🧠 How It Works

1.  **User uploads PDFs or documents**
2.  Documents are **processed and converted into embeddings**
3.  Embeddings are stored in **ChromaDB**
4.  When a user asks a question:
    -   Query is embedded using **multilingual-e5-base**
    -   Relevant context is retrieved from **ChromaDB**
    -   Context is sent to **Gemini model**
5.  Gemini generates a **context-aware response**

------------------------------------------------------------------------

## ⚙️ Installation

### 1. Clone the repository

``` bash
git clone https://github.com/zedslashh/bizassist-ai-chat.git
cd sme-chatbot-builder
```

### 2. Install backend dependencies

``` bash
pip install -r requirements.txt
```

### 3. Run FastAPI server

``` bash
uvicorn backend.main:app --reload
```

### 4. Start Frontend

``` bash
cd frontend
npm install
npm run dev
```

------------------------------------------------------------------------

## 🔌 Integration Methods

### 1️⃣ Landing Page Chatbot

A dedicated chatbot page hosted for the business.

### 2️⃣ Website Widget

Embed the chatbot in any website using a small script.

### 3️⃣ Telegram Bot

Deploy the chatbot as a Telegram assistant for customer interaction.

------------------------------------------------------------------------

## 📂 Project Architecture

    Frontend (React)
            │
            │ API Requests
            ▼
    Backend (FastAPI)
            │
            ├── Authentication (Supabase)
            ├── Payments (Stripe)
            ├── Embedding Model (multilingual-e5-base)
            ├── Vector Store (ChromaDB)
            └── LLM (OpenAI)

------------------------------------------------------------------------

## 🎯 Target Users

-   Small Businesses
-   Service Providers
-   Local Shops
-   Startups
-   SMEs needing automated customer support

