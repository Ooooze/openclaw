import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export type UiMessageAttachment = {
  type: string;
  mimeType?: string;
  dataUrl?: string;
};

export type UiMessage = {
  id: string;
  role: "user" | "assistant" | "system" | "unknown";
  text: string;
  ts?: number;
  runId?: string;
  pending?: boolean;
  /** Attachments (images/files) from history; shown before message text. */
  attachments?: UiMessageAttachment[];
};

export type ChatSliceState = {
  messages: UiMessage[];
  streamByRun: Record<string, UiMessage>;
  sending: boolean;
  error: string | null;
};

const initialState: ChatSliceState = {
  messages: [],
  streamByRun: {},
  sending: false,
  error: null,
};

export type GatewayRequest = <T = unknown>(method: string, params?: unknown) => Promise<T>;

export type ChatAttachmentInput = {
  id: string;
  dataUrl: string;
  mimeType: string;
  /** Optional display name (e.g. from File.name). */
  fileName?: string;
};

export function dataUrlToBase64(dataUrl: string): { content: string; mimeType: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    return null;
  }
  return { mimeType: match[1], content: match[2] };
}

type ChatHistoryResult = {
  sessionKey: string;
  sessionId: string;
  messages: unknown[];
  thinkingLevel?: string;
};

export function extractText(msg: unknown): string {
  try {
    if (!msg || typeof msg !== "object") {
      return typeof msg === "string" ? msg : "";
    }
    const m = msg as { content?: unknown; text?: unknown };
    if (typeof m.text === "string" && m.text.trim()) {
      return m.text;
    }
    const content = m.content;
    if (!Array.isArray(content)) {
      return "";
    }
    const parts = content
      .map((p) => {
        if (!p || typeof p !== "object") {
          return "";
        }
        const part = p as { type?: unknown; text?: unknown };
        if (part.type === "text" && typeof part.text === "string") {
          return part.text;
        }
        return "";
      })
      .filter(Boolean);
    return parts.join("\n");
  } catch {
    return "";
  }
}

/** Extract attachment blocks from a history message for display (images as dataUrl, others as icon). */
export function extractAttachmentsFromMessage(msg: unknown): UiMessageAttachment[] {
  const out: UiMessageAttachment[] = [];
  try {
    if (!msg || typeof msg !== "object") {
      return out;
    }
    const m = msg as { content?: unknown };
    const content = m.content;
    if (!Array.isArray(content)) {
      return out;
    }
    for (const p of content) {
      if (!p || typeof p !== "object") {
        continue;
      }
      const part = p as {
        type?: unknown;
        text?: unknown;
        data?: unknown;
        mimeType?: unknown;
        source?: { type?: unknown; data?: unknown; media_type?: unknown };
      };
      const type = typeof part.type === "string" ? part.type : "";
      if (type === "text") {
        continue;
      }
      let dataUrl: string | undefined;
      let mimeType: string | undefined;
      if (type === "image" && (typeof part.data === "string" || part.source)) {
        const data =
          typeof part.data === "string"
            ? part.data
            : typeof part.source?.data === "string"
              ? part.source.data
              : undefined;
        const mediaType =
          typeof part.mimeType === "string"
            ? part.mimeType
            : typeof part.source?.media_type === "string"
              ? part.source.media_type
              : "image/png";
        if (data) {
          dataUrl = `data:${mediaType};base64,${data}`;
          mimeType = mediaType;
        }
      }
      out.push({
        type: type || "file",
        mimeType: mimeType || (typeof part.mimeType === "string" ? part.mimeType : undefined),
        dataUrl,
      });
    }
  } catch {
    // ignore
  }
  return out;
}

function parseRole(value: unknown): UiMessage["role"] {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (raw === "user" || raw === "assistant" || raw === "system") {
    return raw;
  }
  return "unknown";
}

export function parseHistoryMessages(raw: unknown[]): UiMessage[] {
  const out: UiMessage[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const item = raw[i];
    if (!item || typeof item !== "object") {
      continue;
    }
    const msg = item as { role?: unknown; timestamp?: unknown };
    const role = parseRole(msg.role);
    const text = extractText(item);
    const attachments = extractAttachmentsFromMessage(item);
    const hasAttachments = attachments.length > 0;
    if (!text && !hasAttachments) {
      continue;
    }
    const ts =
      typeof msg.timestamp === "number" && Number.isFinite(msg.timestamp)
        ? Math.floor(msg.timestamp)
        : undefined;
    out.push({
      id: `h-${ts ?? 0}-${i}`,
      role,
      text: text || (hasAttachments ? `[${attachments.length} file(s)]` : ""),
      ts,
      attachments: hasAttachments ? attachments : undefined,
    });
  }
  return out;
}

export const loadChatHistory = createAsyncThunk(
  "chat/loadChatHistory",
  async (
    {
      request,
      sessionKey,
      limit = 200,
    }: { request: GatewayRequest; sessionKey: string; limit?: number },
    thunkApi
  ) => {
    thunkApi.dispatch(chatActions.setError(null));
    const res = await request<ChatHistoryResult>("chat.history", { sessionKey, limit });
    thunkApi.dispatch(chatActions.historyLoaded(parseHistoryMessages(res.messages)));
  }
);

export const sendChatMessage = createAsyncThunk(
  "chat/sendChatMessage",
  async (
    {
      request,
      sessionKey,
      message,
      attachments,
    }: {
      request: GatewayRequest;
      sessionKey: string;
      message: string;
      attachments?: ChatAttachmentInput[];
    },
    thunkApi
  ) => {
    const trimmed = message.trim();
    const hasAttachments = Boolean(attachments?.length);
    if (!trimmed && !hasAttachments) {
      return;
    }

    thunkApi.dispatch(chatActions.setError(null));
    thunkApi.dispatch(chatActions.setSending(true));

    const localId = `u-${crypto.randomUUID()}`;
    const runId = crypto.randomUUID();
    const displayMessage = trimmed || (hasAttachments ? `[${attachments!.length} file(s)]` : "");

    thunkApi.dispatch(
      chatActions.userMessageQueued({
        localId,
        message: displayMessage,
      })
    );
    thunkApi.dispatch(chatActions.ensureStreamRun({ runId }));

    const apiAttachments =
      attachments
        ?.map((att) => {
          const parsed = dataUrlToBase64(att.dataUrl);
          if (!parsed) {
            return null;
          }
          const isImage = parsed.mimeType.startsWith("image/");
          return {
            type: isImage ? "image" : "file",
            mimeType: parsed.mimeType,
            content: parsed.content,
          };
        })
        .filter(
          (a): a is { type: "image" | "file"; mimeType: string; content: string } => a !== null
        ) ?? [];

    try {
      await request("chat.send", {
        sessionKey,
        message: trimmed,
        deliver: false,
        idempotencyKey: runId,
        ...(apiAttachments.length > 0 ? { attachments: apiAttachments } : {}),
      });
      thunkApi.dispatch(chatActions.markUserMessageDelivered({ localId }));
    } catch (err) {
      console.error("[Chat] sendChatMessage failed:", {
        error: err,
        sessionKey,
        runId,
        message: message.slice(0, 100),
      });
      thunkApi.dispatch(chatActions.markUserMessageDelivered({ localId }));
      thunkApi.dispatch(chatActions.streamCleared({ runId }));
      thunkApi.dispatch(chatActions.setError(String(err)));
    } finally {
      thunkApi.dispatch(chatActions.setSending(false));
    }
  }
);

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setSending(state, action: PayloadAction<boolean>) {
      state.sending = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    historyLoaded(state, action: PayloadAction<UiMessage[]>) {
      state.messages = action.payload;
      state.streamByRun = {};
    },
    userMessageQueued(state, action: PayloadAction<{ localId: string; message: string }>) {
      state.messages.push({
        id: action.payload.localId,
        role: "user",
        text: action.payload.message,
        ts: Date.now(),
        pending: true,
      });
    },
    markUserMessageDelivered(state, action: PayloadAction<{ localId: string }>) {
      state.messages = state.messages.map((m) =>
        m.id === action.payload.localId ? { ...m, pending: false } : m
      );
    },
    ensureStreamRun(state, action: PayloadAction<{ runId: string }>) {
      const runId = action.payload.runId;
      if (state.streamByRun[runId]) {
        return;
      }
      state.streamByRun[runId] = {
        id: `s-${runId}`,
        role: "assistant",
        text: "",
        runId,
        ts: Date.now(),
      };
    },
    streamDeltaReceived(state, action: PayloadAction<{ runId: string; text: string }>) {
      const runId = action.payload.runId;
      state.streamByRun[runId] = {
        id: `s-${runId}`,
        role: "assistant",
        text: action.payload.text,
        runId,
        ts: Date.now(),
      };
    },
    streamFinalReceived(
      state,
      action: PayloadAction<{ runId: string; seq: number; text: string }>
    ) {
      const { runId, seq, text } = action.payload;
      delete state.streamByRun[runId];
      if (!text) {
        return;
      }
      state.messages.push({
        id: `a-${runId}-${seq}`,
        role: "assistant",
        text,
        runId,
        ts: Date.now(),
      });
    },
    streamErrorReceived(state, action: PayloadAction<{ runId: string; errorMessage?: string }>) {
      delete state.streamByRun[action.payload.runId];
      if (action.payload.errorMessage) {
        state.error = action.payload.errorMessage;
      }
    },
    streamAborted(state, action: PayloadAction<{ runId: string }>) {
      delete state.streamByRun[action.payload.runId];
    },
    streamCleared(state, action: PayloadAction<{ runId: string }>) {
      delete state.streamByRun[action.payload.runId];
    },
  },
});

export const chatActions = chatSlice.actions;
export const chatReducer = chatSlice.reducer;
