export interface User {
  pk: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  profile_picture: string | null;
  full_name: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  provider: string;
  model_used: string;
  created_at: string;
}

export interface ChatSession {
  id: number;
  title: string;
  last_message: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChatSessionDetail extends ChatSession {
  messages: Message[];
}

// SSE event types
export type SSEEvent =
  | { type: "user_message"; data: Message }
  | { type: "chunk"; content: string }
  | { type: "done"; data: Message }
  | { type: "error"; message: string }
  | { type: "title"; title: string; session_id: string };

export interface ProviderBreakdown {
  provider: string;
  count: number;
  percentage: number;
}

export interface DailyCount {
  date: string;
  count: number;
}

export interface TodayUsage {
  provider: string;
  used: number;
  limit: number;
}

export interface DashboardStats {
  total_messages: number;
  total_sessions: number;
  total_users: number;
  provider_breakdown: ProviderBreakdown[];
  messages_per_day: DailyCount[];
  today_usage: TodayUsage[];
}
