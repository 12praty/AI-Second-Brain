"use client";

import { useState, useEffect, use } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { EyeIcon, ViewOffIcon, Loading01Icon, AiBrain02Icon } from "@hugeicons/core-free-icons";

type Mode = "login" | "register";

export function AuthForm({
  mode,
  searchParamsPromise,
}: {
  mode: Mode;
  searchParamsPromise: Promise<{ callbackUrl?: string }>;
}) {
  const params = use(searchParamsPromise);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = mode === "login" ? "Sign in · Second Brain" : "Create account · Second Brain";
  }, [mode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "register") {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to register");
        }
      }
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        if (mode === "register") {
          toast.error("Account created but sign-in failed. Please try signing in.");
          router.push("/login");
          return;
        }
        throw new Error("Invalid email or password");
      }
      toast.success(mode === "register" ? "Account created" : "Welcome back");
      router.push(params.callbackUrl ?? "/");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-bg-base">
      <div className="hidden md:flex md:w-2/5 relative overflow-hidden bg-bg-card items-center justify-center p-12 border-r border-bg-border">
        <div className="max-w-md">
          <div className="size-12 rounded-2xl bg-accent flex items-center justify-center mb-6 shadow-sm">
            <HugeiconsIcon icon={AiBrain02Icon} className="size-6 text-white" />
          </div>
          <h1 className="font-serif text-[2.25rem] leading-tight mb-3 text-text-primary">
            Your knowledge,
            <br />
            connected.
          </h1>
          <p className="text-text-secondary text-sm leading-relaxed mb-10 max-w-sm">
            Save anything. Find everything. Ask questions about everything you&apos;ve ever read.
          </p>
          <div className="space-y-3">
            <PreviewCard icon={<HugeiconsIcon icon={File01Icon} className="size-3.5" />} title="Atomic notes on focus" subtitle="Saved 2 days ago" color="var(--note-color)" />
            <PreviewCard icon={<HugeiconsIcon icon={Link01Icon} className="size-3.5" />} title="Why deep work matters" subtitle="cal.com/blog · 5 days ago" delay="0.05s" color="var(--url-color)" />
            <PreviewCard icon={<HugeiconsIcon icon={Pdf01Icon} className="size-3.5" />} title="Algorithms paper.pdf" subtitle="38 pages · 1 week ago" delay="0.1s" color="var(--pdf-color)" />
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-10">
            <div className="size-9 rounded-xl bg-accent flex items-center justify-center shadow-sm">
              <HugeiconsIcon icon={AiBrain02Icon} className="size-4 text-white" />
            </div>
            <span className="font-medium text-base text-text-primary">Second Brain</span>
          </div>
          <h2 className="text-xl font-medium mb-1 text-text-primary">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-sm text-text-secondary mb-8">
            {mode === "login"
              ? "Sign in to access your knowledge base"
              : "Start building your second brain"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <Field
                label="Name"
                type="text"
                value={name}
                onChange={setName}
                required
              />
            )}
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              required
              autoComplete="email"
            />
            <div className="relative">
              <Field
                label="Password"
                type={show ? "text" : "password"}
                value={password}
                onChange={setPassword}
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors p-2 grid place-items-center"
                tabIndex={-1}
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <HugeiconsIcon icon={ViewOffIcon} className="size-4" /> : <HugeiconsIcon icon={EyeIcon} className="size-4" />}
              </button>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full h-11 mt-2 text-sm">
              {loading ? <HugeiconsIcon icon={Loading01Icon} className="size-4 animate-spin" /> : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="text-sm text-text-secondary text-center mt-8">
            {mode === "login" ? (
              <>
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-accent hover:text-accent-hover font-medium">
                  Create one
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link href="/login" className="text-accent hover:text-accent-hover font-medium">
                  Sign in
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

import { File01Icon, Link01Icon, Pdf01Icon } from "@hugeicons/core-free-icons";

function PreviewCard({
  icon,
  title,
  subtitle,
  delay,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  delay?: string;
  color: string;
}) {
  return (
    <div
      className="rounded-xl bg-bg-elevated px-4 py-3.5 border border-bg-border flex items-center gap-3 animate-slideUp transition-all duration-200"
      style={{ animationDelay: delay }}
    >
      <div
        className="size-8 rounded-lg flex items-center justify-center"
        style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate text-text-primary">{title}</div>
        <div className="text-xs text-text-muted mt-0.5">{subtitle}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  required,
  autoComplete,
  minLength,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
}) {
  const filled = value.length > 0;
  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        minLength={minLength}
        className="input h-11 pt-4 pb-1.5 text-sm"
        placeholder=" "
      />
      <label
        className={`absolute left-4 transition-all pointer-events-none ${
          filled
            ? "top-1 text-xs text-text-muted"
            : "top-1/2 -translate-y-1/2 text-sm text-text-muted"
        }`}
      >
        {label}
      </label>
    </div>
  );
}
