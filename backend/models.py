from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class Message(BaseModel):
    id: str
    sender: str
    text: str
    timestamp: datetime
    
    # NLP & ML Scores
    toxicity_score: int = 0
    control_score: int = 0
    gaslighting_score: int = 0
    overall_risk_score: int = 0
    z_score: Optional[float] = None
    signal_detected: Optional[bool] = False

class Conversation(BaseModel):
    id: Optional[str] = None
    thread_id: str
    participants: List[str]
    messages: List[Message]
    risk_score: float = 0.0
    type: str = "text"
