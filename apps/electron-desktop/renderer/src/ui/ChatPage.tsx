import React from "react";
import Markdown from "react-markdown";
import { useGatewayRpc } from "../gateway/context";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { chatActions, extractText, loadChatHistory, sendChatMessage } from "../store/slices/chatSlice";
import type { GatewayState } from "../../../src/main/types";
import { ActionButton, InlineError } from "./kit";

type ChatEvent = {
  runId: string;
  sessionKey: string;
  seq: number;
  state: "delta" | "final" | "aborted" | "error";
  message?: unknown;
  errorMessage?: string;
};

export function ChatPage({ state: _state }: { state: Extract<GatewayState, { kind: "ready" }> }) {
  const sessionKey = "main";
  const [input, setInput] = React.useState("");

  const logoUrl = React.useMemo(() => {
    return new URL("../../assets/icon-simple-splash.png", document.baseURI).toString();
  }, []);
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
        dispatch(chatActions.streamErrorReceived({ runId: payload.runId, errorMessage: payload.errorMessage }));
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
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    // Keep the latest content in view, like Control UI.
    el.scrollTop = el.scrollHeight;
  }, [messages, streamByRun]);

  const send = React.useCallback(() => {
    const message = input.trim();
    if (!message) {
      return;
    }
    setInput("");
    void dispatch(sendChatMessage({ request: gw.request, sessionKey, message }));
  }, [dispatch, gw.request, input, sessionKey]);

  const isEmpty = messages.length === 0 && Object.keys(streamByRun).length === 0;

  return (
    <div className="UiChatShell">
      {error && <InlineError>{error}</InlineError>}

      <div className="UiChatTranscript" ref={scrollRef}>
        {isEmpty && (
          <div className="UiChatEmpty">
            <div className="UiChatEmptyBubble">
              <img className="UiChatEmptyLogo" src={logoUrl} alt="" aria-hidden="true" />
            </div>
            <div className="UiChatEmptyTitle">Start a conversation</div>
            <div className="UiChatEmptySubtitle">Send a message to begin chatting with the assistant.</div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`UiChatRow UiChatRow-${m.role}`}>
            <div className={`UiChatBubble UiChatBubble-${m.role}`}>
              <div className="UiChatBubbleMeta">
                <span className="UiChatRole">{m.role}</span>
                {m.pending && <span className="UiChatPending">sending…</span>}
              </div>
              <div className="UiChatText UiMarkdown">
                <Markdown>{m.text}</Markdown>
              </div>
            </div>
          </div>
        ))}
        {Object.values(streamByRun).map((m) => (
          <div key={m.id} className="UiChatRow UiChatRow-assistant">
            <div className="UiChatBubble UiChatBubble-assistant UiChatBubble-stream">
              <div className="UiChatBubbleMeta">
                <span className="UiChatRole">assistant</span>
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

      <div className="UiChatComposer">
        <div className="UiChatComposerInner">
          <textarea
            className="UiChatInput"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Write a message…"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <ActionButton variant="primary" onClick={send} disabled={sending || !input.trim()}>
            {sending ? "Sending…" : "Send"}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

