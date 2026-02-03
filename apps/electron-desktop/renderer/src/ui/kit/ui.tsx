import React from "react";

export function Brand({ text = "ATOMIC BOT" }: { text?: string }) {
  return (
    <div className="UiBrand" aria-label={text}>
      <span className="UiBrandMark" aria-hidden="true">
        +
      </span>
      <span className="UiBrandText">{text}</span>
    </div>
  );
}

export function HeroPageLayout(props: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  role?: "dialog" | "main";
  "aria-label"?: string;
}) {
  const { title, subtitle, children, role = "main" } = props;
  return (
    <div className="UiHeroShell" role={role} aria-label={props["aria-label"]}>
      <div className="UiHeroTopbar">
        <Brand />
      </div>

      <div className="UiHero">
        <div className="UiHeroTitle">{title}</div>
        {subtitle ? <div className="UiHeroSubtitle">{subtitle}</div> : null}
        {children}
      </div>
    </div>
  );
}

export function GlassCard({ children }: { children: React.ReactNode }) {
  return <div className="UiGlassCard">{children}</div>;
}

export function ScrollBox({ children }: { children: React.ReactNode }) {
  return <div className="UiScrollBox">{children}</div>;
}

export function CheckboxRow(props: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="UiCheckRow">
      <input type="checkbox" checked={props.checked} onChange={(e) => props.onChange(e.target.checked)} />
      <span>{props.label}</span>
    </label>
  );
}

export function InlineError({ children }: { children: React.ReactNode }) {
  return <div className="UiInlineError">{children}</div>;
}

export function PrimaryButton(props: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button className="UiPrimaryButton" disabled={props.disabled} onClick={props.onClick}>
      {props.children}
    </button>
  );
}

export function SecondaryButton(props: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button className="UiSecondaryButton" disabled={props.disabled} onClick={props.onClick}>
      {props.children}
    </button>
  );
}

export function ToolbarButton(props: {
  children: React.ReactNode;
  disabled?: boolean;
  variant?: "default" | "primary";
  onClick: () => void;
}) {
  const variant = props.variant ?? "default";
  const className = variant === "primary" ? "UiToolbarButton UiToolbarButton-primary" : "UiToolbarButton";
  return (
    <button className={className} disabled={props.disabled} onClick={props.onClick}>
      {props.children}
    </button>
  );
}

