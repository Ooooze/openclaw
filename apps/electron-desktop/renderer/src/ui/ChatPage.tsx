import React from "react";
import Markdown from "react-markdown";
import { useLocation, useSearchParams } from "react-router-dom";
import { useGatewayRpc } from "../gateway/context";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  chatActions,
  extractText,
  loadChatHistory,
  sendChatMessage,
  type ChatAttachmentInput,
  type UiMessageAttachment,
} from "../store/slices/chatSlice";
import type { GatewayState } from "../../../src/main/types";
import { ChatComposer } from "./ChatComposer";
import { addToastError } from "./toast";

function CopyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

type ChatEvent = {
  runId: string;
  sessionKey: string;
  seq: number;
  state: "delta" | "final" | "aborted" | "error";
  message?: unknown;
  errorMessage?: string;
};

export function ChatPage({ state: _state }: { state: Extract<GatewayState, { kind: "ready" }> }) {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const sessionKey = searchParams.get("session") ?? "";
  const [input, setInput] = React.useState("");
  const [attachments, setAttachments] = React.useState<ChatAttachmentInput[]>([]);
  const [optimisticFirstMessage, setOptimisticFirstMessage] = React.useState<string | null>(() => {
    const state = location.state as { pendingFirstMessage?: string } | null;
    return state?.pendingFirstMessage ?? null;
  });

  const dispatch = useAppDispatch();
  const messages = useAppSelector((s) => s.chat.messages);
  const streamByRun = useAppSelector((s) => s.chat.streamByRun);
  const sending = useAppSelector((s) => s.chat.sending);
  const error = useAppSelector((s) => s.chat.error);

  const gw = useGatewayRpc();
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    return gw.onEvent((evt) => {
      if (evt.event !== "chat") {
        return;
      }
      const payload = evt.payload as ChatEvent;
      if (payload.sessionKey !== sessionKey) {
        return;
      }
      if (payload.state === "delta") {
        const text = extractText(payload.message);
        dispatch(chatActions.streamDeltaReceived({ runId: payload.runId, text }));
        return;
      }
      if (payload.state === "final") {
        const text = extractText(payload.message);
        dispatch(chatActions.streamFinalReceived({ runId: payload.runId, seq: payload.seq, text }));
        return;
      }
      if (payload.state === "error") {
        dispatch(
          chatActions.streamErrorReceived({
            runId: payload.runId,
            errorMessage: payload.errorMessage,
          })
        );
        return;
      }
      if (payload.state === "aborted") {
        dispatch(chatActions.streamAborted({ runId: payload.runId }));
      }
    });
  }, [dispatch, gw, sessionKey]);

  const refresh = React.useCallback(() => {
    void dispatch(loadChatHistory({ request: gw.request, sessionKey, limit: 200 }));
  }, [dispatch, gw.request, sessionKey]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  React.useEffect(() => {
    if (messages.length > 0 && optimisticFirstMessage != null) {
      setOptimisticFirstMessage(null);
    }
  }, [messages.length, optimisticFirstMessage]);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    el.scrollTop = el.scrollHeight;
  }, [messages.length, optimisticFirstMessage, streamByRun]);

  React.useEffect(() => {
    if (error) {
      addToastError(error);
      dispatch(chatActions.setError(null));
    }
  }, [error, dispatch]);

  const send = React.useCallback(() => {
    const message = input.trim();
    const hasAttachments = attachments.length > 0;
    if (!message && !hasAttachments) {
      return;
    }
    const toSend = attachments.length > 0 ? [...attachments] : undefined;
    setInput("");
    setAttachments([]);
    void dispatch(
      sendChatMessage({ request: gw.request, sessionKey, message, attachments: toSend })
    );
  }, [dispatch, gw.request, input, sessionKey, attachments]);

  const allMessages =
    optimisticFirstMessage != null
      ? [{ id: "opt-first", role: "user" as const, text: optimisticFirstMessage }, ...messages]
      : messages;

  const displayMessages = allMessages.filter((m) => m.role === "user" || m.role === "assistant");

  return (
    <div className="UiChatShell">
      <div className="UiChatTranscript" ref={scrollRef}>
        {displayMessages.map((m) => (
          <div key={m.id} className={`UiChatRow UiChatRow-${m.role}`}>
            <div className={`UiChatBubble UiChatBubble-${m.role}`}>
              {m.pending && (
                <div className="UiChatBubbleMeta">
                  <span className="UiChatPending">sending…</span>
                </div>
              )}
              {m.attachments && m.attachments.length > 0 ? (
                <div className="UiChatMessageAttachments">
                  {m.attachments.map((att: UiMessageAttachment, idx: number) => {
                    const isImage = att.dataUrl && (att.mimeType?.startsWith("image/") ?? false);
                    if (!isImage) return null;
                    return (
                      <div key={`${m.id}-att-${idx}`} className="UiChatMessageAttachment">
                        {isImage && att.dataUrl && (
                          <img src={att.dataUrl} alt="" className="UiChatMessageAttachmentImg" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null}
              <div className="UiChatText UiMarkdown">
                <Markdown>{m.text}</Markdown>
              </div>
              {m.role === "assistant" && (
                <div className="UiChatMessageActions">
                  <button
                    type="button"
                    className="UiChatMessageActionBtn"
                    onClick={() => {
                      void navigator.clipboard.writeText(m.text);
                    }}
                    aria-label="Copy"
                  >
                    <CopyIcon />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {Object.values(streamByRun).map((m) => (
          <div key={m.id} className="UiChatRow UiChatRow-assistant">
            <div className="UiChatBubble UiChatBubble-assistant UiChatBubble-stream">
              <div className="UiChatBubbleMeta">
                <span className="UiChatPending">
                  <span className="UiChatTypingDots" aria-label="typing">
                    <span />
                    <span />
                    <span />
                  </span>
                </span>
              </div>
              {m.text ? (
                <div className="UiChatText UiMarkdown">
                  <Markdown>{m.text}</Markdown>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <ChatComposer
        value={input}
        onChange={setInput}
        attachments={attachments}
        onAttachmentsChange={setAttachments}
        onSend={send}
        disabled={sending}
      />
    </div>
  );
}
