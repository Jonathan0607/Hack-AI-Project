import pytest
from analytics.stats_engine import RiskAnalyzer

def test_risk_analyzer_spike_detection():
    analyzer = RiskAnalyzer()
    
    # Send 5 low score messages
    for i in range(5):
        scores = {
            "toxicity_score": 1,
            "control_score": 2,
            "gaslighting_score": 1,
            "overall_risk_score": 1
        }
        result = analyzer.analyze(scores)
        assert result["z_score"] < 2.0
        assert result["signal_detected"] is False

    # Send a 6th massive spike message
    spike_scores = {
        "toxicity_score": 9,
        "control_score": 8,
        "gaslighting_score": 9,
        "overall_risk_score": 9
    }
    result = analyzer.analyze(spike_scores)
    
    # Assert Z-score breaches 2.0 and signal is detected
    assert result["z_score"] > 2.0
    assert result["signal_detected"] is True
    
def test_risk_analyzer_single_message_edge_case():
    # Test edge case: single message shouldn't throw ZeroDivisionError
    analyzer = RiskAnalyzer()
    
    scores = {
        "toxicity_score": 5,
        "control_score": 5,
        "gaslighting_score": 5,
        "overall_risk_score": 5
    }
    
    # This should not raise an exception
    result = analyzer.analyze(scores)
    assert result["z_score"] == 0.0
    assert result["signal_detected"] is False
