import { createSession, deleteSession, getSession, getSessions, streamMessage } from "@/api/chat";
import { useAuth } from "@/context/AuthContext";
import type { ChatSession, Message, SSEEvent } from "@/types";
import { useCallback, useRef, useState } from "react";

export const useChat = () => {
  const { tokens } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const data = await getSessions();
      setSessions(data);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  const selectSession = useCallback(async (sessionId: number) => {
    setActiveSessionId(sessionId);
    setStreamError(null);
    setIsLoadingMessages(true);
    try {
      const detail = await getSession(sessionId);
      setMessages(detail.messages);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const startNewSession = useCallback(async () => {
    const session = await createSession();
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    setMessages([]);
    setStreamError(null);
    return session;
  }, []);

  const removeSession = useCallback(
    async (sessionId: number) => {
      await deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
        setStreamError(null);
      }
    },
    [activeSessionId],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!tokens?.access || isStreaming) return;

      setStreamError(null);
      let sessionId = activeSessionId;

      // Auto-create session if none active
      if (!sessionId) {
        try {
          const session = await createSession();
          setSessions((prev) => [session, ...prev]);
          setActiveSessionId(session.id);
          sessionId = session.id;
        } catch {
          setStreamError("Failed to create a new chat session. Please try again.");
          return;
        }
      }

      // Optimistic user message — show immediately, don't wait for server
      const optimisticUserMsg: Message = {
        id: Date.now(),
        role: "user",
        content,
        provider: "",
        model_used: "",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticUserMsg]);
      setIsStreaming(true);
      setStreamingContent("");

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const response = await streamMessage(
          sessionId,
          content,
          tokens.access,
          abortController.signal,
        );

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let serverUserMsgReceived = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr) as SSEEvent;

              if (event.type === "user_message") {
                // Replace optimistic message with real server message
                if (!serverUserMsgReceived) {
                  serverUserMsgReceived = true;
                  setMessages((prev) =>
                    prev.map((m) => (m.id === optimisticUserMsg.id ? event.data : m)),
                  );
                }
              } else if (event.type === "title") {
                // Update session title in sidebar live
                setSessions((prev) =>
                  prev.map((s) =>
                    String(s.id) === event.session_id ? { ...s, title: event.title } : s,
                  ),
                );
              } else if (event.type === "chunk") {
                setStreamingContent((prev) => prev + event.content);
              } else if (event.type === "done") {
                setMessages((prev) => [...prev, event.data]);
                setStreamingContent("");
                setSessions((prev) =>
                  prev.map((s) =>
                    s.id === sessionId
                      ? {
                          ...s,
                          last_message: event.data.content.slice(0, 80),
                          updated_at: new Date().toISOString(),
                        }
                      : s,
                  ),
                );
              } else if (event.type === "error") {
                throw new Error(event.message);
              }
            } catch {
              // skip malformed lines
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          // User stopped generation — keep what streamed so far
          const stoppedContent = streamingContent;
          if (stoppedContent) {
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now(),
                role: "assistant",
                content: stoppedContent,
                provider: "",
                model_used: "",
                created_at: new Date().toISOString(),
              },
            ]);
          }
        } else {
          const message = err instanceof Error ? err.message : "Something went wrong.";
          setStreamError(message);
        }
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
        abortControllerRef.current = null;
      }
    },
    [tokens, activeSessionId, isStreaming, streamingContent],
  );

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    sessions,
    activeSessionId,
    messages,
    isStreaming,
    streamingContent,
    streamError,
    isLoadingSessions,
    isLoadingMessages,
    loadSessions,
    selectSession,
    startNewSession,
    removeSession,
    sendMessage,
    stopStreaming,
  };
};
