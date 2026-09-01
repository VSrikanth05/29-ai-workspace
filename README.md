# 🚀 29 AI Workspace — Intelligent Knowledge & Media Operating System

<div align="center">

[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://29-ai-workspace.vercel.app)
[![Backend API](https://img.shields.io/badge/Backend_API-Render_Live-46E3B7?style=for-the-badge&logo=render)](https://two9-ai-workspace.onrender.com/health)
[![Next.js 15](https://img.shields.io/badge/Next.js-15.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.0-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![NestJS](https://img.shields.io/badge/NestJS-10.0-E0234E?style=for-the-badge&logo=nestjs)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.0-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/Supabase-pgvector-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**An open-source, full-stack, multimodal alternative to Google NotebookLM.**  
*Grounded Document Intelligence • Multi-Provider LLM Gateway • AI Studio Deliverables • Dedicated Media Generation Hub*

### 🌐 [Click Here to Open the Live Application (https://29-ai-workspace.vercel.app)](https://29-ai-workspace.vercel.app)

<br/>

[![29 AI Workspace Live Preview](./docs/assets/workspace_preview.png)](https://29-ai-workspace.vercel.app)

</div>

---

## 🌟 Overview

**29 AI Workspace** is an enterprise-ready AI Knowledge Operating System designed to ingest, ground, learn from, analyze, and synthesize trusted source material.

- 🚀 **Live Frontend (Vercel)**: [https://29-ai-workspace.vercel.app](https://29-ai-workspace.vercel.app)
- ⚙️ **Live Backend API (Render)**: [https://two9-ai-workspace.onrender.com](https://two9-ai-workspace.onrender.com)
- 🗄️ **Database & Vector Store (Supabase)**: PostgreSQL + `pgvector` in Mumbai (`ap-south-1`)

---

## ✨ Key Features

### 📚 1. Grounded Document RAG Engine
- **Multiformat Ingestion**: Upload PDF, DOCX, TXT, CSV, Excel, PowerPoint, and Markdown files.
- **Hybrid Vector Retrieval**: High-precision semantic embeddings powered by `pgvector` and heuristic reranking.
- **Direct Gemini-Style Answering**: Direct, structured answers with grounded source citations—free from reasoning scratchpad clutter or instruction echoes.
- **Source Filtering**: Dynamically select which documents in your workspace ground the current query.

### 🎨 2. AI Studio Deliverables
- **Understand**: Real-time explanation, multi-length summarization (Short, Medium, Detailed, Bullet), and multilingual translation.
- **Create**: Executive reports, automated presentation deck outlines, key insight extraction, auto-graded interactive quizzes, study guides, and flashcards.
- **Visualize**: Interactive hierarchical Mind Maps (export to SVG/PNG), Mermaid diagrams, and CSV/Excel statistical charts (Bar, Line, Pie, Scatter, Histogram, Area).

### 🎬 3. Dedicated Media Tools Hub
- **🎨 Image Studio**: Generate and edit high-resolution images with customizable aspect ratios (`1024x1024`, `1536x1024`, `1024x1536`) and one-click downloads.
- **🎬 Video Studio**: Cinematic motion sequence generation and video storyboard previews.
- **🎙️ Audio & Speech Synthesis**: High-fidelity Text-to-Speech with selectable voice personas (*Alloy, Echo, Nova, Onyx, Shimmer, Coral, Sage*).
- **🌐 Image & PDF Translation**: Optical Character Recognition (OCR) text extraction, translation, and overlay re-rendering for visual files.

### ⚡ 4. Multi-Provider LLM Gateway & Failover
- Seamlessly configure and toggle between **NVIDIA NIM**, **OpenRouter**, **Google Gemini**, **OpenAI**, and **Anthropic**.
- Real-time token streaming with automatic fallback if a provider quota is exhausted.

### 📜 5. Interactive History & Universal Search
- Search through past chat sessions, prompt queries, and studio deliverables in real time.
- Single-click session resumption to pick up research right where you left off.
- Integrated **Output Library** with export capabilities to Markdown, JSON, and CSV.

---

## 🏗️ Architecture & Technology Stack

```mermaid
graph TD
    Client["Next.js 15 Client (React 19, Tailwind CSS v4, Zustand, TanStack Query)"]
    API["NestJS 10 Gateway & REST API"]
    Postgres[("PostgreSQL Database + pgvector")]
    Redis[("Redis Cache & BullMQ Ingestion Queue")]
    LLM["LLM Gateway (NVIDIA NIM / OpenRouter / Gemini / OpenAI / Anthropic)"]
    Storage["Object Storage (Cloudflare R2 / Supabase Storage)"]

    Client -->|REST & SSE Streaming| API
    API -->|Schema & Vector Search| Postgres
    API -->|Job Scheduling & Caching| Redis
    API -->|Model Inferences| LLM
    API -->|Document Uploads & Assets| Storage
```

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 15 (App Router), React 19, Tailwind CSS v4, Zustand, TanStack React Query, Lucide Icons |
| **Backend** | NestJS 10, TypeScript, RxJS, Server-Sent Events (SSE), Class-Validator |
| **Database & ORM** | PostgreSQL with `pgvector` vector extensions, Prisma ORM |
| **Async Tasks & Cache** | Redis, BullMQ queue workers |
| **Storage** | Cloudflare R2 / Supabase Storage / Local File Storage |
| **Observability** | OpenTelemetry, Prometheus Metrics, Structured Knowledge Audit Logger |

---

## 📁 Repository Structure

```text
29-ai-workspace/
├── backend/                  # NestJS API & LLM Gateway
│   ├── src/
│   │   ├── ai/               # Chat, streaming, and prompt engine
│   │   ├── ai-studio/        # Studio endpoints (summaries, quizzes, diagrams, mind maps)
│   │   ├── auth/             # Authentication & JWT verification
│   │   ├── documents/        # File parsing, ingestion & text extraction
│   │   ├── llm/              # Multi-provider integrations (NVIDIA, Gemini, OpenAI, etc.)
│   │   ├── media/            # Image, video, and audio generation endpoints
│   │   ├── rag/              # Vector retrieval, embeddings & reranking
│   │   └── workspaces/       # Workspace & source management
│   └── test/                 # Jest backend unit and integration test suites
│
├── frontend/                 # Next.js 15 Web Application
│   ├── app/                  # App Router pages ((platform), (auth), api rewrites)
│   │   ├── (platform)/
│   │   │   ├── dashboard/    # Overview dashboard
│   │   │   ├── media/        # Dedicated Media Hub page
│   │   │   ├── history/      # Interactive history and search page
│   │   │   ├── outputs/      # Saved Output Library gallery
│   │   │   └── workspace/    # 3-pane grounded research interface
│   ├── config/               # Navigation, tools registry, and provider catalogs
│   ├── features/             # Feature components, stores, hooks, and views
│   └── public/               # Static web assets
│
├── prisma/                   # PostgreSQL schema, migrations & seed scripts
├── docs/                     # Detailed architectural, API, and milestone guides
├── .env.example              # Environment variable configuration template
└── docker-compose.yml        # Multi-container orchestration stack
```

---

## 🚀 Quickstart & Setup Guide

### 📋 Prerequisites
- **Node.js**: `>= 20.x` (Node 22 or 24 recommended)
- **Database**: PostgreSQL with `pgvector` extension enabled (or Supabase Postgres)
- **Package Manager**: `npm` or `pnpm`

---

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/<your-username>/<your-repo-name>.git
cd <your-repo-name>
```

---

### 2️⃣ Configure Environment Variables

Create your local `.env` file in the root directory using the provided template:

```bash
cp .env.example .env
```

Populate your API keys and database credentials in `.env`:

```ini
# Database & Vector Store
DATABASE_URL="postgresql://user:password@localhost:5432/ai_workspace?schema=public"

# LLM Providers (Configure at least one)
NVIDIA_API_KEY="nvapi-..."
OPENROUTER_API_KEY="sk-or-v1-..."
GEMINI_API_KEY="AIzaSy..."
OPENAI_API_KEY="sk-..."

# Default Provider Selection (nvidia, gemini, openrouter, openai)
LLM_PROVIDER="nvidia"
DEFAULT_MODEL="meta/llama-3.2-11b-vision-instruct"

# Security & Secrets
JWT_SECRET="your-super-secure-jwt-secret-key"
STORAGE_PROVIDER="local"
```

---

### 3️⃣ Initialize Database & Prisma

```bash
# Install root dependencies and generate Prisma client
npm install
npx prisma generate
npx prisma db push
```

---

### 4️⃣ Launch the Application

#### Terminal 1 — Start the Backend (Port 5000)
```bash
cd backend
npm install
npm run start:dev
```

#### Terminal 2 — Start the Frontend (Port 3000)
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Verification & Quality Assurance

Run the comprehensive test suites across both applications:

```bash
# Run Frontend Tests & Typecheck (14 test suites, 24 unit tests)
cd frontend
npm run typecheck
npm test

# Run Backend Tests & Typecheck (49 test suites, 133 unit tests)
cd ../backend
npm run typecheck
npm test -- --runInBand
```

---

## 🐳 Docker Deployment

To launch the full production stack with Redis and Postgres using Docker Compose:

```bash
docker compose up -d --build
```

---

## 🛡️ Security Best Practices

- **Never commit `.env` files**: The `.gitignore` in this repository is strictly configured to ignore all environment files, local secrets, and runtime artifacts.
- **Role-Based Workspace Isolation**: Access to documents and generated studio outputs is strictly scoped to authenticated workspace members.
- **Input Validation**: All API routes enforce strict class-validator DTO whitelist filtering.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
