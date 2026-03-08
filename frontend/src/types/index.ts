export interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  toxicity_score?: number;
  control_score?: number;
  gaslighting_score?: number;
  overall_risk_score?: number;
  z_score?: number;
  signal_detected?: boolean;
}

export interface Conversation {
  _id?: string;
  id?: string;
  thread_id: string;
  participants: string[];
  messages: Message[];
  risk_score: number;
  type: string;
}
