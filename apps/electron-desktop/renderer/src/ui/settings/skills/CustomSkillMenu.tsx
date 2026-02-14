import React from "react";

import cm from "./CustomSkillMenu.module.css";
import sit from "./SkillsIntegrationsTab.module.css";

export function CustomSkillMenu({ onRemove }: { onRemove: () => void }) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) {return;}
    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        popoverRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className={sit.UiCustomSkillMenuWrap}>
      <button
        ref={triggerRef}
        type="button"
        className={cm.UiCustomSkillMenuTrigger}
        aria-label="Skill options"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <circle cx="3" cy="8" r="1.5" fill="currentColor" />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" />
          <circle cx="13" cy="8" r="1.5" fill="currentColor" />
        </svg>
      </button>
      {open ? (
        <div ref={popoverRef} className={`UiPopover ${cm.UiCustomSkillMenuPopover}`} role="menu">
          <button
            type="button"
            className={`${cm.UiCustomSkillMenuItem} ${cm["UiCustomSkillMenuItem--danger"]}`}
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onRemove();
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M2 4h12M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M6 7v4M8 7v4M10 7v4M4 4l.5 8a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1L12 4" />
            </svg>
            Remove
          </button>
        </div>
      ) : null}
    </div>
  );
}
