import { type ChatSession, type ChatSessionDetail, type Message } from "@/types";
import apiClient from "./client";

export const getSessions = async (): Promise<ChatSession[]> => {
  const res = await apiClient.get("/chat/sessions/");
  return res.data;
};

export const createSession = async (): Promise<ChatSession> => {
  const res = await apiClient.post("/chat/sessions/", {});
  return res.data;
};

export const getSession = async (id: number): Promise<ChatSessionDetail> => {
  const res = await apiClient.get(`/chat/sessions/${id}/`);
  return res.data;
};

export const deleteSession = async (id: number): Promise<void> => {
  await apiClient.delete(`/chat/sessions/${id}/`);
};

export const getMessages = async (sessionId: number): Promise<Message[]> => {
  const res = await apiClient.get(`/chat/sessions/${sessionId}/messages/`);
  return res.data;
};

export const streamMessage = async (
  sessionId: number,
  content: string,
  accessToken: string,
  signal: AbortSignal,
): Promise<Response> => {
  const res = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/chat/sessions/${sessionId}/messages/send/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ content }),
      signal,
    },
  );

  if (!res.ok) throw new Error("Failed to send message");
  return res;
};

export const regenerateMessage = async (
  sessionId: number,
  accessToken: string,
  signal: AbortSignal,
): Promise<Response> => {
  const res = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/chat/sessions/${sessionId}/messages/regenerate/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      signal,
    },
  );
  if (!res.ok) throw new Error("Failed to regenerate message");
  return res;
};
