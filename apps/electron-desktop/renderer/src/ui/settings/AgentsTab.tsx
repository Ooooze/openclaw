import React from "react";
import type { ConfigSnapshot } from "../../store/slices/configSlice";
import "./AgentsTab.css";

type GatewayRpc = {
  request: <T = unknown>(method: string, params?: unknown) => Promise<T>;
};

type AgentSummary = {
  id: string;
  name?: string;
  identity?: {
    name?: string;
    emoji?: string;
    avatar?: string;
    avatarUrl?: string;
  };
};

type AgentsListResult = {
  defaultId: string;
  agents: AgentSummary[];
};

type AgentConfigLike = {
  id: string;
  name?: string;
  workspace?: string;
  model?: string | { primary?: string; fallbacks?: string[] };
  skills?: string[];
  identity?: {
    name?: string;
    emoji?: string;
    avatar?: string;
    avatarUrl?: string;
  };
};

type ConfigLike = {
  agents?: {
    list?: AgentConfigLike[];
  };
};

export type AgentsTabProps = {
  gw: GatewayRpc;
  configSnap: ConfigSnapshot | null;
  reload: () => Promise<void>;
  onError: (msg: string | null) => void;
};

function getModelString(model: AgentConfigLike["model"]): string {
  if (!model) {return "Default";}
  if (typeof model === "string") {return model;}
  return model.primary || "Default";
}

function AgentCard({
  agent,
  isDefault,
  agentConfig,
}: {
  agent: AgentSummary;
  isDefault: boolean;
  agentConfig?: AgentConfigLike;
}) {
  const [open, setOpen] = React.useState(false);

  const displayName =
    agent.identity?.name || agent.name || agent.id;
  const emoji = agent.identity?.emoji;
  const avatarUrl = agent.identity?.avatarUrl || agent.identity?.avatar;

  return (
    <div className="UiAgentCard">
      <div
        className="UiAgentCardHeader"
        onClick={() => setOpen((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
      >
        <div className="UiAgentEmoji">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" />
          ) : (
            emoji || displayName.charAt(0).toUpperCase()
          )}
        </div>
        <span className="UiAgentName">{displayName}</span>
        {isDefault && <span className="UiAgentBadge">Default</span>}
        <span className={`UiAgentChevron${open ? " UiAgentChevron--open" : ""}`}>
          &#x25B6;
        </span>
      </div>
      {open && (
        <div className="UiAgentCardDetail">
          <div className="UiAgentDetailRow">
            <span className="UiAgentDetailLabel">ID</span>
            <span className="UiAgentDetailValue UiAgentDetailValue--mono">{agent.id}</span>
          </div>
          {agentConfig && (
            <>
              <div className="UiAgentDetailRow">
                <span className="UiAgentDetailLabel">Model</span>
                <span className="UiAgentDetailValue">{getModelString(agentConfig.model)}</span>
              </div>
              {agentConfig.workspace && (
                <div className="UiAgentDetailRow">
                  <span className="UiAgentDetailLabel">Workspace</span>
                  <span className="UiAgentDetailValue UiAgentDetailValue--mono">
                    {agentConfig.workspace}
                  </span>
                </div>
              )}
              <div className="UiAgentDetailRow">
                <span className="UiAgentDetailLabel">Skills</span>
                <span className="UiAgentDetailValue">
                  {agentConfig.skills ? agentConfig.skills.join(", ") || "None" : "All"}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function AgentsTab({ gw, configSnap, onError }: AgentsTabProps) {
  const [result, setResult] = React.useState<AgentsListResult | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    gw.request<AgentsListResult>("agents.list", {})
      .then((res) => {
        if (alive) {
          setResult(res);
          onError(null);
        }
      })
      .catch((err) => {
        if (alive) {onError(String(err));}
      })
      .finally(() => {
        if (alive) {setLoading(false);}
      });
    return () => {
      alive = false;
    };
  }, [gw, onError]);

  const configAgents = React.useMemo(() => {
    const cfg = configSnap?.config as ConfigLike | undefined;
    const list = cfg?.agents?.list;
    if (!Array.isArray(list)) {return new Map<string, AgentConfigLike>();}
    const map = new Map<string, AgentConfigLike>();
    for (const a of list) {
      if (a && typeof a.id === "string") {map.set(a.id, a);}
    }
    return map;
  }, [configSnap]);

  const agents = result?.agents ?? [];
  const defaultId = result?.defaultId ?? "";

  return (
    <div className="UiSettingsContentInner">
      <h2 className="UiAgentsTitle">
        Agents
        {!loading && <span className="UiAgentsCount">{agents.length}</span>}
      </h2>

      {loading && <p className="UiAgentsLoading">Loading agents...</p>}

      {!loading && agents.length === 0 && (
        <p className="UiAgentsEmpty">No agents configured.</p>
      )}

      {!loading &&
        agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            isDefault={agent.id === defaultId}
            agentConfig={configAgents.get(agent.id)}
          />
        ))}
    </div>
  );
}
