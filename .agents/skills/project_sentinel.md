# Project Sentinel: Technical Standards

## Tech Stack
- Frontend: Next.js 14+ (App Router), TypeScript, Tailwind CSS, Shadcn UI.
- Backend: FastAPI, Pydantic v2, Python 3.11+.
- State Management: React Hooks / Context API.

## UI/UX Principles
- Theme: Professional Dark Mode (Zinc/Slate palette).
- Components: Use Shadcn for all Cards, Tables, and Modals.
- Priority: Data density and readability. This is a tool for professionals (crisis counselors).

## Data Schema (Immutable)
- Message: { id: string, sender: 'user'|'system', text: string, timestamp: ISO8601 }
- Conversation: { id: string, risk_score: number, status: 'low'|'medium'|'high', messages: Message[] }

## Database Standards
- Database: MongoDB (Atlas)
- Driver: `motor` (Asynchronous Python driver for MongoDB/FastAPI)
- ODM: `Beanie` or raw Pydantic models for document validation.
- Collection Structure:
    - `conversations`: Stores the metadata and the calculated `risk_score`.
    - `messages`: Stores individual text chunks with timestamps and specific NLP scores.