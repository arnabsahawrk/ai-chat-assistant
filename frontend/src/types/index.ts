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
  | { type: "error"; message: string };
