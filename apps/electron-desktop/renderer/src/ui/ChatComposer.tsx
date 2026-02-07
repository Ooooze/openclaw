import React from "react";
import type { ChatAttachmentInput } from "../store/slices/chatSlice";
import { ChatAttachmentCard, getFileTypeLabel } from "./ChatAttachmentCard";

function SendIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M10 15.5017L10 4.83171M10 4.83171L5.42711 9.4046M10 4.83171L14.5729 9.4046"
        stroke="currentColor"
        stroke-width="1.5243"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}

const MAX_ATTACHMENTS_DEFAULT = 5;

export type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  attachments: ChatAttachmentInput[];
  onAttachmentsChange: (
    next: ChatAttachmentInput[] | ((prev: ChatAttachmentInput[]) => ChatAttachmentInput[])
  ) => void;
  onSend: () => void;
  disabled?: boolean;
  sendLabel?: string;
  sendingLabel?: string;
  placeholder?: string;
  /** Max attachments (default 5). When exceeded, onAttachmentsLimitError is called. */
  maxAttachments?: number;
  onAttachmentsLimitError?: (message: string) => void;
};

export function ChatComposer({
  value,
  onChange,
  attachments,
  onAttachmentsChange,
  onSend,
  disabled = false,
  sendLabel = "Send",
  sendingLabel = "Sending...",
  placeholder = "Message...",
  maxAttachments = MAX_ATTACHMENTS_DEFAULT,
  onAttachmentsLimitError,
}: ChatComposerProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const MIN_INPUT_HEIGHT = 28;
  const MAX_INPUT_HEIGHT = 180;

  const adjustTextareaHeight = React.useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0";
    const next = Math.min(Math.max(el.scrollHeight, MIN_INPUT_HEIGHT), MAX_INPUT_HEIGHT);
    el.style.height = `${next}px`;
  }, []);

  React.useLayoutEffect(() => {
    adjustTextareaHeight();
  }, [value, adjustTextareaHeight]);

  const onFileChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) {
        return;
      }
      const currentCount = attachments.length;
      const totalNew = files.length;
      if (currentCount + totalNew > maxAttachments) {
        onAttachmentsLimitError?.(
          `Maximum ${maxAttachments} attachment${maxAttachments === 1 ? "" : "s"} allowed.`
        );
        e.target.value = "";
        return;
      }
      const add: ChatAttachmentInput[] = [];
      const toProcess = Math.min(totalNew, maxAttachments - currentCount);
      let done = 0;
      const checkDone = () => {
        done += 1;
        if (done === toProcess) {
          onAttachmentsChange((prev) => [...prev, ...add]);
          e.target.value = "";
        }
      };
      for (let i = 0; i < toProcess; i += 1) {
        const file = files[i]!;
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          const dataUrl = reader.result as string;
          add.push({
            id: crypto.randomUUID(),
            dataUrl,
            mimeType: file.type || "application/octet-stream",
            fileName: file.name,
          });
          checkDone();
        });
        reader.addEventListener("error", checkDone);
        reader.readAsDataURL(file);
      }
    },
    [attachments.length, maxAttachments, onAttachmentsChange, onAttachmentsLimitError]
  );

  const removeAttachment = React.useCallback(
    (id: string) => {
      onAttachmentsChange((prev) => prev.filter((a) => a.id !== id));
    },
    [onAttachmentsChange]
  );

  const canSend = value.trim().length > 0;

  return (
    <div className="UiChatComposer">
      <div className="UiChatComposerInner">
        {attachments.length > 0 && (
          <div className="UiChatAttachments">
            {attachments.map((att) => {
              const isImage = att.mimeType.startsWith("image/");
              if (isImage) {
                return (
                  <div key={att.id} className="UiChatAttachment">
                    <img src={att.dataUrl} alt="" className="UiChatAttachmentImg" />
                    <button
                      type="button"
                      className="UiChatAttachmentRemove"
                      onClick={() => removeAttachment(att.id)}
                      aria-label="Remove attachment"
                    >
                      ×
                    </button>
                  </div>
                );
              }
              return (
                <ChatAttachmentCard
                  key={att.id}
                  fileName={att.fileName ?? getFileTypeLabel(att.mimeType)}
                  mimeType={att.mimeType}
                  onRemove={() => removeAttachment(att.id)}
                />
              );
            })}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="UiChatFileInput"
          aria-hidden
          onChange={onFileChange}
        />

        <textarea
          ref={textareaRef}
          className="UiChatInput"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />

        <div className="UiChatComposerButtonBlock">
          <button
            type="button"
            className="UiChatAttachButton"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach file"
            title="Attach file or image"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
            >
              <path
                d="M9.00012 3.1499V14.8499M14.8501 8.9999H3.15012"
                stroke="white"
                stroke-width="1.503"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className="UiChatSendButton"
            onClick={onSend}
            disabled={disabled || !canSend}
            aria-label={disabled ? sendingLabel : sendLabel}
            title={disabled ? sendingLabel : sendLabel}
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
