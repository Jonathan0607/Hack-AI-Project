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
            "toxicity_score": StreamEWMA(),
            "control_score": StreamEWMA(),
            "gaslighting_score": StreamEWMA(),
        }
        
    def analyze(self, scores: Dict[str, Any]) -> Dict[str, Any]:
        max_z = 0.0
        
        for key in ["toxicity_score", "control_score", "gaslighting_score"]:
            val = float(scores.get(key, 0.0))
            z = self.trackers[key].update(val)
            if z > max_z:
                max_z = z
                
        signal_detected = max_z > 2.0
        return {
            "z_score": max_z,
            "signal_detected": signal_detected
        }
