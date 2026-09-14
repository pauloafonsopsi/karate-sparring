import { forwardRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export const Btn = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "ghost" | "outline";
    full?: boolean;
  }
>(({ className, variant = "primary", full, ...props }, ref) => (
  <button
    ref={ref}
    {...props}
    className={cn(
      "inline-flex min-h-13 items-center justify-center px-6 text-sm font-semibold tracking-[0.14em] uppercase transition-none select-none",
      "disabled:cursor-not-allowed disabled:opacity-40",
      variant === "primary" && "bg-brand text-foreground hover:bg-brand/85",
      variant === "outline" &&
        "border border-line bg-transparent text-foreground hover:border-foreground/40",
      variant === "ghost" && "text-muted-fg hover:text-foreground",
      full && "w-full",
      className,
    )}
  />
));
Btn.displayName = "Btn";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="eyebrow mb-2 block">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-brand">{hint}</span> : null}
    </label>
  );
}

const controlCls =
  "w-full min-h-13 border border-line bg-surface px-4 text-base text-foreground placeholder:text-muted-fg/70 focus:border-brand focus:outline-none";

export const TextInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} {...props} className={cn(controlCls, className)} />
  ),
);
TextInput.displayName = "TextInput";

export const SelectInput = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select ref={ref} {...props} className={cn(controlCls, "appearance-none", className)} />
));
SelectInput.displayName = "SelectInput";

export function Check({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 border border-line bg-surface p-4 text-left"
    >
      <span
        className={cn(
          "mt-0.5 h-5 w-5 shrink-0 border",
          checked ? "border-brand bg-brand" : "border-line bg-background",
        )}
      />
      <span className="text-sm leading-snug text-muted-fg">{children}</span>
    </button>
  );
}

export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: string }) {
  const map: Record<string, string> = {
    ativo: "border-brand text-brand",
    aprovado: "border-foreground/40 text-foreground",
    aplicou: "border-line text-muted-fg",
    inativo: "border-line text-muted-fg",
    convertido: "border-brand text-brand",
    lead: "border-line text-muted-fg",
    orfao_conciliado: "border-foreground/40 text-foreground",
    muted: "border-line text-muted-fg",
  };
  return (
    <span
      className={cn(
        "inline-block border px-2 py-0.5 text-[10px] font-semibold tracking-[0.14em] uppercase",
        map[tone] ?? map["muted"],
      )}
    >
      {children}
    </span>
  );
}
