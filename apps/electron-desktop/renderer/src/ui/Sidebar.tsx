import React from "react";
import { NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useGatewayRpc } from "../gateway/context";
import type { OptimisticSession } from "./optimisticSessionContext";
import { useOptimisticSession } from "./optimisticSessionContext";
import { routes } from "./routes";
import { addToastError } from "./toast";

type SessionsListResult = {
  ts: number;
  path: string;
  count: number;
  sessions: Array<{
    key: string;
    kind: string;
    label?: string;
    derivedTitle?: string;
    lastMessagePreview?: string;
    updatedAt: number | null;
  }>;
};

type SessionWithTitle = {
  key: string;
  title: string;
};

const SESSIONS_LIST_LIMIT = 50;
const TITLE_MAX_LEN = 48;

/** Extract only the message text from derivedTitle, e.g. "[Fri 2026-02-06 …] привет [message_id:…" → "привет". */
function messageTextFromDerivedTitle(derivedTitle: string | undefined): string {
  const raw = derivedTitle?.trim();
  if (!raw) {
    return "";
  }
  let s = raw;
  const afterBracket = s.indexOf("] ");
  if (afterBracket >= 0) {
    s = s.slice(afterBracket + 2);
  }
  const beforeMeta = s.indexOf(" [");
  if (beforeMeta >= 0) {
    s = s.slice(0, beforeMeta);
  }
  return s.trim();
}

function titleFromRow(row: SessionsListResult["sessions"][number]): string {
  const raw = messageTextFromDerivedTitle(row.derivedTitle);
  if (raw) {
    return raw.length > TITLE_MAX_LEN ? `${raw.slice(0, TITLE_MAX_LEN)}…` : raw;
  }
  return "New Chat";
}

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const currentSessionKey = searchParams.get("session") ?? null;
  const gw = useGatewayRpc();
  const { optimistic: optimisticFromContext, setOptimistic } = useOptimisticSession();
  const optimisticFromState = (location.state as { optimisticNewSession?: OptimisticSession } | null)
    ?.optimisticNewSession ?? null;
  const optimistic = optimisticFromContext ?? optimisticFromState;

  const [sessions, setSessions] = React.useState<SessionWithTitle[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadSessionsWithTitles = React.useCallback(
    async (background: boolean = false) => {
      if (!background) {
        setLoading(true);
      }
      try {
        const res = await gw.request<SessionsListResult>("sessions.list", {
          includeGlobal: true,
          includeUnknown: true,
          limit: SESSIONS_LIST_LIMIT,
          includeDerivedTitles: true,
          includeLastMessage: true,
        });
        const rows = res?.sessions ?? [];
        const withTitles: SessionWithTitle[] = rows.map((row) => ({
          key: row.key,
          title: titleFromRow(row),
        }));

        setSessions(withTitles);
        if (currentSessionKey && withTitles.some((s) => s.key === currentSessionKey)) {
          setOptimistic(null);
        }
      } catch (err) {
        if (!background) {
          addToastError(String(err));
          setSessions([]);
        }
      } finally {
        if (!background) {
          setLoading(false);
        }
      }
    },
    [gw.request, currentSessionKey, setOptimistic],
  );

  const isInitialLoad = React.useRef(true);
  React.useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      void loadSessionsWithTitles(false);
      return;
    }
    if (optimistic) {
      void loadSessionsWithTitles(true);
    }
  }, [currentSessionKey, optimistic, loadSessionsWithTitles]);

  const handleNewSession = React.useCallback(() => {
    void navigate(routes.chat, { replace: true });
  }, [navigate]);

  const handleSelectSession = React.useCallback(
    (key: string) => {
      void navigate(`${routes.chat}?session=${encodeURIComponent(key)}`, { replace: true });
    },
    [navigate],
  );

  return (
    <aside className="UiChatSidebar" aria-label="Chat sessions">
      <button
        type="button"
        className="UiChatSidebarNewSession"
        onClick={handleNewSession}
        aria-label="New session"
      >
        <span className="UiChatSidebarNewSessionIcon" aria-hidden="true">
          +
        </span>
        New session
      </button>

      <div className="UiChatSidebarSessions">
        <h2 className="UiChatSidebarSessionsTitle">Sessions</h2>
        {loading && !optimistic ? (
          <div className="UiChatSidebarLoading">Loading…</div>
        ) : (
          <ul className="UiChatSidebarSessionList" role="list">
            {(optimistic
              ? [{ key: optimistic.key, title: optimistic.title }, ...sessions.filter((s) => s.key !== optimistic.key)]
              : sessions
            ).map((s) => (
              <li key={s.key}>
                <button
                  type="button"
                  className={`UiChatSidebarSessionItem${currentSessionKey != null && currentSessionKey === s.key ? " UiChatSidebarSessionItem-active" : ""}`}
                  onClick={() => handleSelectSession(s.key)}
                  title={s.key}
                >
                  {s.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="UiChatSidebarFooter">
        <NavLink
          to={routes.settings}
          className={({ isActive }) =>
            `UiChatSidebarSettings${isActive ? " UiChatSidebarSettings-active" : ""}`
          }
          aria-label="Settings"
        >
          <span className="UiChatSidebarSettingsIcon" aria-hidden="true">
            ⚙
          </span>
          Settings
        </NavLink>
      </div>
    </aside>
  );
}
