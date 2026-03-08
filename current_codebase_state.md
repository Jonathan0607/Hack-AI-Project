# Current Codebase State

## Directory Structure

### `/backend`
- `main.py`: Main FastAPI application file handling CORS, MongoDB connection, and API endpoints.
- `scripts/generate_data.py`: Script to seed the MongoDB database with synthetic conversation data.
- `requirements.txt`: Python package dependencies.
- `venv/`: Local Python environment.

### `/frontend`
- `public/logo.png`: Application logo.
- `src/app/`: Next.js app router directory. Contains `layout.tsx`, `page.tsx`, and styling.
- `src/components/ui/`: UI components directory (currently empty).
- Standard Next.js config files (`next.config.mjs`, `tailwind.config.ts`, `package.json`, etc.).

## Data Models
There are currently **no formalized Data Models** (Pydantic, Beanie, or separate TypeScript interfaces) implemented in the codebase.
- **Backend:** `main.py` and `scripts/generate_data.py` rely on raw Python dictionaries when interacting with the MongoDB `conversations` collection.
- **Frontend:** Data fetched from the API uses `any[]` typing instead of strict TypeScript interfaces (e.g., `useState<any[]>([])`).

## The NLP Engine
**Not Found.** The codebase currently lacks a functioning NLP scoring engine. 
- The risk scores and conversation classes ("signal" vs "noise") are mapped using hardcoded arrays within `backend/scripts/generate_data.py`. 
- No file or function signature exists for dynamic NLP text analysis.

## ElevenLabs Integration
**Not Found.** There is no speech-to-text integration or any ElevenLabs API usage present within the repository.

## API Endpoints
The backend runs on FastAPI with the following active routes defined in `backend/main.py`:
- `GET /`: Health check root endpoint returning `{"message": "Project Sentinel API"}`.
- `GET /conversations`: Retrieves the top 100 conversation threads sorted by `risk_score` descending.
- `GET /stream/{id}`: An SSE (Server-Sent Events) endpoint that streams the simulated real-time playback of a conversation. It queries MongoDB for the matching `thread_id` and sleeps for 1 second between yielding each message dictionary to the client, concluding with an `event: end` payload.

## Frontend State
The interactive chat view and dashboard are monolithic and fully contained within:
- `frontend/src/app/page.tsx`: Contains the main `SentinelDashboard` component. It uses React State (`useState`) for `conversations` list data, `activeThread`, and `messages` (the streamed playback state). 
- It manages the visual layout with a sidebar for conversation history and a main chat view, utilizing Framer Motion for message animations (`AnimatePresence`, `motion.div`). 
- Streaming relies directly on the native browser `EventSource` connection to update state from the backend API.
