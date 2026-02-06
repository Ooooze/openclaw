import React from "react";
import { useNavigate } from "react-router-dom";
import { useGatewayRpc } from "../gateway/context";
import type { GatewayState } from "../../../src/main/types";
import { dataUrlToBase64, type ChatAttachmentInput } from "../store/slices/chatSlice";
import { ChatComposer } from "./ChatComposer";
import { addToastError } from "./toast";
import { routes } from "./routes";

function newSessionKey(): string {
  return `agent:main:main:${crypto.randomUUID().slice(0, 8)}`;
}

export function StartChatPage({ state: _state }: { state: Extract<GatewayState, { kind: "ready" }> }) {
  const navigate = useNavigate();
  const gw = useGatewayRpc();
  const [input, setInput] = React.useState("");
  const [attachments, setAttachments] = React.useState<ChatAttachmentInput[]>([]);
  const [sending, setSending] = React.useState(false);

  const logoUrl = React.useMemo(() => {
    return new URL("../../assets/main-logo.png", document.baseURI).toString();
  }, []);

  const send = React.useCallback(async () => {
    const message = input.trim();
    const hasAttachments = attachments.length > 0;
    if ((!message && !hasAttachments) || sending) {
      return;
    }

    const sessionKey = newSessionKey();
    const runId = crypto.randomUUID();
    setSending(true);

    const apiAttachments =
      attachments.length > 0
        ? attachments
            .map((att) => {
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
              (a): a is { type: "image" | "file"; mimeType: string; content: string } => a !== null,
            )
        : undefined;

    try {
      await gw.request("chat.send", {
        sessionKey,
        message,
        deliver: false,
        idempotencyKey: runId,
        ...(apiAttachments?.length ? { attachments: apiAttachments } : {}),
      });
      setInput("");
      setAttachments([]);
      const title =
        message.length > 0
          ? message.length > 48
            ? `${message.slice(0, 48)}…`
            : message
          : `[${attachments.length} file(s)]`;
      void navigate(`${routes.chat}?session=${encodeURIComponent(sessionKey)}`, {
        replace: true,
        state: {
          optimisticNewSession: { key: sessionKey, title },
          pendingFirstMessage: message || title,
        },
      });
    } catch (err) {
      addToastError(String(err));
    } finally {
      setSending(false);
    }
  }, [gw.request, input, navigate, sending, attachments]);

  return (
    <div className="UiChatShell">
      <div className="UiChatTranscript">
        <div className="UiChatEmpty">
            <img className="UiChatEmptyLogo" src={logoUrl} alt="" aria-hidden="true" />
          <div className="UiChatEmptyTitle">What can I help with?</div>
          <div className="UiChatEmptySubtitle">Send a message to start a conversation</div>
        </div>
      </div>

      <ChatComposer
        value={input}
        onChange={setInput}
        attachments={attachments}
        onAttachmentsChange={setAttachments}
        onSend={() => void send()}
        disabled={sending}
      />
    </div>
  );
}
