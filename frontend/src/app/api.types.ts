export interface AuthResponse {
  access_token?: string;
  token_type?: string;
  msg?: string;
  detail?: string;
}

export interface ChatMessage {
  role: string;
  content: string;
  created_at: string;
}
