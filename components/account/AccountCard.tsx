"use client";

import { useState } from "react";
import { signIn, signInGoogle, signOut, signUp, useAccount } from "@/lib/account/account";

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export default function AccountCard() {
  const a = useAccount();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  if (a.status === "off")
    return <p className="hint">Accounts are off until Supabase is configured (see README). You can keep playing as a guest.</p>;

  if (a.email)
    return (
      <div className="acct">
        <div className="acct-me">
          <span className="acct-av">{a.email[0]?.toUpperCase()}</span>
          <div className="acct-id">
            <b>{a.email}</b>
            <span className={"acct-pill " + a.status}>
              {a.status === "syncing" ? "Syncing…" : a.status === "synced" ? "✓ Backed up" : a.status === "error" ? "Sync problem" : ""}
            </span>
          </div>
          <button className="btn g sm" onClick={() => void signOut()}>Sign out</button>
        </div>
        {a.status === "error" && <p className="hint">{a.msg}</p>}
        <p className="hint">Sign in on any phone or browser to restore your profile, progress and friends. Messages between signed-in friends are saved too.</p>
      </div>
    );

  const google = async () => {
    setBusy(true);
    setMsg("");
    const err = await signInGoogle();
    if (err) {
      setMsg(err);
      setBusy(false);
    } // on success the browser leaves for Google
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@") || pw.length < 6) return setMsg("Enter a valid email and a password of at least 6 characters.");
    setBusy(true);
    setMsg("");
    const err = await (mode === "up" ? signUp(email, pw) : signIn(email, pw));
    setBusy(false);
    setMsg(err);
  };

  return (
    <div className="acct">
      <p className="acct-lead">Save your profile and progress, and get them back on any device. Totally optional.</p>
      <button className="gbtn" disabled={busy} onClick={() => void google()}>
        <GoogleG /> Continue with Google
      </button>
      <div className="acct-or"><span>or use email</span></div>
      <div className="acct-tabs" role="tablist">
        <button role="tab" aria-selected={mode === "in"} className={mode === "in" ? "on" : ""} onClick={() => { setMode("in"); setMsg(""); }}>Sign in</button>
        <button role="tab" aria-selected={mode === "up"} className={mode === "up" ? "on" : ""} onClick={() => { setMode("up"); setMsg(""); }}>Create account</button>
      </div>
      <form onSubmit={submit}>
        <input aria-label="Email" type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div className="acct-pw">
          <input aria-label="Password" type={show ? "text" : "password"} placeholder="Password (6+ characters)" autoComplete={mode === "up" ? "new-password" : "current-password"} value={pw} onChange={(e) => setPw(e.target.value)} />
          <button type="button" className="acct-eye" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(!show)}>{show ? "🙈" : "👁"}</button>
        </div>
        <button className="btn acct-go" disabled={busy} type="submit">{mode === "up" ? "Create account" : "Sign in"}</button>
      </form>
      {(msg || a.msg) && <p className="acct-msg">{msg || a.msg}</p>}
    </div>
  );
}
