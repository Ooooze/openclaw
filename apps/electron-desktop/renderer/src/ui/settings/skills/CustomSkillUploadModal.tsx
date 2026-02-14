import React from "react";

import { getDesktopApiOrNull } from "../../../ipc/desktopApi";
import { Modal } from "../../shared/kit";

import cs from "./CustomSkillUpload.module.css";

type CustomSkillResult = {
  name: string;
  description: string;
  emoji: string;
  dirName: string;
};

type UploadState = "idle" | "loading" | "error";

export function CustomSkillUploadModal(props: {
  open: boolean;
  onClose: () => void;
  onInstalled: (skill: CustomSkillResult) => void;
}) {
  const [state, setState] = React.useState<UploadState>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (props.open) {
      setState("idle");
      setError(null);
      setDragActive(false);
    }
  }, [props.open]);

  const handleFile = React.useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".zip")) {
        setError("Please upload a .zip file");
        setState("error");
        return;
      }

      setState("loading");
      setError(null);

      try {
        const buffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ""),
        );

        const api = getDesktopApiOrNull();
        if (!api?.installCustomSkill) {
          throw new Error("API not available");
        }

        const result = await api.installCustomSkill(base64);
        if (!result.ok || !result.skill) {
          throw new Error(result.error || "Installation failed");
        }

        props.onInstalled(result.skill);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setState("error");
      }
    },
    [props],
  );

  const onDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const file = e.dataTransfer?.files?.[0];
      if (file) {
        void handleFile(file);
      }
    },
    [handleFile],
  );

  const onDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDragEnter = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const onDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const onFileInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        void handleFile(file);
      }
      // Reset so the same file can be picked again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [handleFile],
  );

  const openFilePicker = React.useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <Modal open={props.open} onClose={props.onClose} header="Add custom skill" aria-label="Add custom skill">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        style={{ display: "none" }}
        onChange={onFileInputChange}
      />

      {/* Drag-and-drop zone */}
      <div
        className={`${cs.UiCustomSkillDropZone}${dragActive ? ` ${cs["UiCustomSkillDropZone--active"]}` : ""}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
      >
        {state === "loading" ? (
          <div className={cs.UiCustomSkillSpinner} aria-label="Installing skill..." />
        ) : (
          <>
            <div className={cs.UiCustomSkillDropZoneTitle}>Drag ZIP folder here</div>
            <div className={cs.UiCustomSkillDropZoneSubtext}>
              Or{" "}
              <button type="button" className={cs.UiCustomSkillChooseFileLink} onClick={openFilePicker}>
                choose a file
              </button>{" "}
              from finder
            </div>
          </>
        )}
      </div>

      {/* Error message */}
      {state === "error" && error ? (
        <div className={cs.UiCustomSkillError}>{error}</div>
      ) : null}

      {/* Info block */}
      <div className={cs.UiCustomSkillInfoBlock}>
        <span className={cs.UiCustomSkillInfoIcon} aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" />
            <path d="M8 7v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="8" cy="5" r="0.75" fill="currentColor" />
          </svg>
        </span>
        <div className={cs.UiCustomSkillInfoText}>
          Custom skills you can find on{" "}
          <a
            href="#"
            className={cs.UiCustomSkillInfoLink}
            onClick={(e) => {
              e.preventDefault();
              void getDesktopApiOrNull()?.openExternal("https://clawhub.com");
            }}
          >
            ClawHub
          </a>
        </div>
      </div>

      {/* Security warning */}
      <div className={cs.UiCustomSkillDangerBlock}>
        <span className={cs.UiCustomSkillDangerIcon} aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 1L1 14h14L8 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M8 6v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="8" cy="12" r="0.75" fill="currentColor" />
          </svg>
        </span>
        <div className={cs.UiCustomSkillDangerText}>
          Custom packages may introduce security risks — upload only trusted files
        </div>
      </div>
    </Modal>
  );
}
