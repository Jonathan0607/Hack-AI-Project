import random
import math
from typing import Dict, Any

class StreamEWMA:
    def __init__(self, alpha: float = 0.3):
        self.alpha = alpha
        self.mean = 0.0
        self.var = 0.0
        self.count = 0

    def update(self, value: float) -> float:
        self.count += 1
        if self.count == 1:
            self.mean = value
            self.var = 0.0
            return 0.0
            
        diff = value - self.mean
        self.mean += self.alpha * diff
        self.var = (1 - self.alpha) * (self.var + self.alpha * (diff ** 2))
        
        stddev = math.sqrt(self.var)
        if stddev > 0:
            return diff / stddev
        return 0.0

class RiskAnalyzer:
    def __init__(self):
        self.trackers = {
            "gaslighting_score": StreamEWMA(),
            "isolation_score": StreamEWMA(),
            "threat_score": StreamEWMA(),
        }
        
    def analyze(self, scores: Dict[str, float]) -> Dict[str, Any]:
        max_z = 0.0
        
        for key in ["gaslighting_score", "isolation_score", "threat_score"]:
            val = scores.get(key, 0.0)
            z = self.trackers[key].update(val)
            if z > max_z:
                max_z = z
                
        signal_detected = max_z > 2.0
        return {
            "z_score": max_z,
            "signal_detected": signal_detected
        }

def get_mock_nlp_scores(text: str) -> Dict[str, float]:
    trigger_words = ["crazy", "always", "never", "nobody", "wrong", "fault", "leave", "hurt"]
    text_lower = text.lower()
    is_spike = random.random() < 0.1 or any(word in text_lower for word in trigger_words)
    
    if is_spike:
        return {
            "gaslighting_score": random.uniform(0.8, 1.0),
            "isolation_score": random.uniform(0.8, 1.0),
            "threat_score": random.uniform(0.8, 1.0),
        }
    else:
        return {
            "gaslighting_score": random.uniform(0.1, 0.4),
            "isolation_score": random.uniform(0.1, 0.4),
            "threat_score": random.uniform(0.1, 0.4),
        }
