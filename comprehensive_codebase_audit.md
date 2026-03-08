# Comprehensive Codebase Audit: Project Sentinel

## 1. Complete Directory Tree

Below is the directory structure for both the backend and the active frontend environment (`frontend3`), omitting `node_modules`, `venv`, `.next`, and `__pycache__` artifacts:

```text
backend/
├── analytics/
│   └── stats_engine.py
├── scripts/
│   └── generate_data.py
├── tests/
│   └── test_stats_engine.py
├── main.py
├── models.py
└── requirements.txt

frontend3/                 # Currently active Next.js frontend
├── public/
│   └── logo.png
├── src/
│   ├── app/
│   │   ├── fonts/
│   │   │   ├── GeistMonoVF.woff
│   │   │   └── GeistVF.woff
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   └── ui/
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       └── scroll-area.tsx
│   └── types/
│       └── index.ts
├── components.json
├── next-env.d.ts
├── next.config.mjs
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```
*(Note: An older `frontend` directory also exists with a similar structure, but `frontend3` is the active environment where the newest features are implemented).*

---

## 2. The Audio Frontend Integration

**Location:** `frontend3/src/app/page.tsx`
**Component Name:** `HavenDashboard`

**State Variables Used for Audio/Voice UI:**
- `isRecording` (boolean): Tracks if the MediaRecorder is active.
- `mediaRecorder` (MediaRecorder | null): Holds the native recording instance.
- `audioChunks` (React.MutableRefObject<Blob[]>): A ref used to gather audio data sequentially without triggering re-renders.
- `isAnalyzing` (boolean): Displays loading states while awaiting API response.
- `analysisResult` (any | null): Stores the returned NLP JSON structure for rendering.

**Data Handling & Transmission Pipeline:**
1. The frontend invokes `navigator.mediaDevices.getUserMedia({ audio: true })` to capture mic data.
2. A `MediaRecorder` instance consumes the audio stream, firing the `ondataavailable` handler pushing stream pieces to `audioChunks.current`.
3. Upon calling `mediaRecorder.stop()`, a unified blob is created: `const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' })`.
4. The blob is appended to a `FormData` object with the key `file` (filename `'audio.webm'`).
5. A `POST` request carries the `FormData` to the `http://localhost:8000/transcribe-audio` endpoint handler using the standard fetch API.

---

## 3. The NLP API Integration

**Location:** `backend/main.py`

**Exact Function Signatures:**
```python
@app.post("/transcribe-audio")
async def transcribe_audio(file: UploadFile = File(...)):
```
```python
@app.post("/analyze-screenshot")
async def analyze_screenshot(file: UploadFile = File(...)):
```
```python
@app.post("/chat")
async def chat_with_analysis(request: ChatRequest):
```

**Payload Structures Sent to the APIs:**
1. **ElevenLabs TTS (in `/transcribe-audio`):**
   ```python
   transcription_result = elevenlabs_client.speech_to_text.convert(
        file=audio_stream,
        model_id="scribe_v1"
   )
   ```
2. **Gemini 2.5 Flash via SDK (in `/transcribe-audio` and `/analyze-screenshot`):**
   ```python
   # Passed as a Generation Request to Google SDK
   full_prompt = f"{SYSTEM_PROMPT_AUDIO}\n\nTranscript:\n{transcript}"
   response = analysis_model.generate_content(full_prompt)
   ```
3. **Gemini 2.5 Flash via direct REST API (in `/chat`):**
   ```json
   {
       "contents": [{"parts": [{"text": "You are an expert clinical psychologist... \nTranscript: [...]\nAnalysis: [...]\nUser Question: [...]"}]}],
       "tools": [{"google_search": {}}],
       "generationConfig": {
           "temperature": 0.4,
           "topP": 0.95,
           "topK": 40,
           "maxOutputTokens": 8192
       }
   }
   ```

**Exact JSON Schema / Dictionary Returned (Gemini Prompt Specification):**
The API routes use `SYSTEM_PROMPT_AUDIO` and `SYSTEM_PROMPT_SCREENSHOT` which strictly enforce the following returned schema:

```json
{
  "extracted_text": [
    {
      "sender": "speaker",  // ("self" | "partner" for screenshots)
      "text": "The transcript of the audio provided."
    }
  ],
  "analysis": {
    "toxicity_score": 0,       // integer 0-10
    "control_score": 0,        // integer 0-10
    "gaslighting_score": 0,    // integer 0-10
    "overall_risk_score": 0,   // integer 0-10
    "explanation": "A concise explanation of the scores (strictly 3 to 5 sentences long)..."
  }
}
```
*(Notice: The response schema explicitly keys `gaslighting_score`, `toxicity_score`, and `control_score` rather than the `isolation_score` and `threat_score` expected by the mock analytics pipeline).*

---

## 4. Core Data Models & Stats Engine

**`backend/models.py` state:**
The data models are intact. The Pydantic tracking models reflect the older stats pipeline definitions:
```python
class Message(BaseModel):
    # ... metadata fields ...
    gaslighting_score: Optional[float] = None
    isolation_score: Optional[float] = None
    threat_score: Optional[float] = None
    z_score: Optional[float] = None
    signal_detected: Optional[bool] = False
```

**`backend/analytics/stats_engine.py` state:**
- The engine uses `StreamEWMA` to generate exponentially weighted moving averages and variances to calculate Z-scores historically across strings of text.
- The `RiskAnalyzer` triggers an alert (`signal_detected = True`) if any parameter's Z-score breaches `2.0`.
- **Critical Observation**: The `stats_engine` is still designed around the mock payload returning `{ gaslighting_score, isolation_score, threat_score }` instead of the newly standardized NLP integration schema that returns `{ toxicity_score, control_score, gaslighting_score }`. 

---

## 5. The Data Pipeline (SSE Stream)

**Location:** `backend/main.py`
**Endpoint:** `GET /stream/{id}`

Below is the exact code block intercepting the data stream before yielding results to the Next.js frontend:

```python
@app.get("/stream/{id}")
async def stream_conversation(id: str):
    async def event_generator():
        conv = await app.mongodb.conversations.find_one({"thread_id": id})
        if not conv:
            yield "data: {\"error\": \"Not found\"}\n\n"
            return
            
        analyzer = RiskAnalyzer()
        
        for msg in conv.get("messages", []):
            await asyncio.sleep(1) # Artificial delay to simulate real-time typing/streaming
            
            # Streaming data is intercepted here and mocked
            scores = get_mock_nlp_scores(msg.get("text", ""))
            analysis = analyzer.analyze(scores)
            
            msg.update(scores)
            msg.update(analysis)
            
            yield f"data: {json.dumps(msg)}\n\n"
        
        yield "event: end\ndata: {}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
```
*As shown in the block above, the incoming streaming data entirely bypasses the Gemini/ElevenLabs integrations right now, intercepting the message contents and passing them into `get_mock_nlp_scores(...)` before yielding the Event-Stream text payload down to the frontend component.*
