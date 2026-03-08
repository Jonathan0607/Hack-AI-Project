import pytest
from analytics.stats_engine import RiskAnalyzer

def test_risk_analyzer_spike_detection():
    analyzer = RiskAnalyzer()
    
    # Send 5 low score messages
    for i in range(5):
        scores = {
            "gaslighting_score": 0.1,
            "isolation_score": 0.15,
            "threat_score": 0.2
        }
        result = analyzer.analyze(scores)
        assert result["z_score"] < 2.0
        assert result["signal_detected"] is False

    # Send a 6th massive spike message
    spike_scores = {
        "gaslighting_score": 0.9,
        "isolation_score": 0.85,
        "threat_score": 0.95
    }
    result = analyzer.analyze(spike_scores)
    
    # Assert Z-score breaches 2.0 and signal is detected
    assert result["z_score"] > 2.0
    assert result["signal_detected"] is True
    
def test_risk_analyzer_single_message_edge_case():
    # Test edge case: single message shouldn't throw ZeroDivisionError
    analyzer = RiskAnalyzer()
    
    scores = {
        "gaslighting_score": 0.5,
        "isolation_score": 0.5,
        "threat_score": 0.5
    }
    
    # This should not raise an exception
    result = analyzer.analyze(scores)
    assert result["z_score"] == 0.0
    assert result["signal_detected"] is False
