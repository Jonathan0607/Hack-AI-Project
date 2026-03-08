from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class Message(BaseModel):
    id: str
    sender: str
    text: str
    timestamp: datetime
    
    # NLP & ML Scores
    gaslighting_score: Optional[float] = None
    isolation_score: Optional[float] = None
    threat_score: Optional[float] = None
    z_score: Optional[float] = None
    signal_detected: Optional[bool] = False

class Conversation(BaseModel):
    id: Optional[str] = None
    thread_id: str
    participants: List[str]
    messages: List[Message]
    risk_score: float = 0.0
    type: str = "text"
