import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowRight, Code2, ShieldCheck, Trophy, Users } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function AuthPage({ mode = "login" }) {
  const isRegister = mode === "register";
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { authenticate } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const change = e => setForm({ ...form, [e.target.name]: e.target.value });
  async function submit(e) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const { data } = await api.post(`/auth/${isRegister ? "register" : "login"}`, form);
      authenticate(data); navigate(location.state?.from || "/");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Check the API connection.");
    } finally { setBusy(false); }
  }

  return <div className="auth-screen">
    <div className="auth-visual">
      <div className="brand auth-brand"><div className="brand-mark"><Code2 size={22}/></div><span>DEV<span className="accent">QUEST</span></span></div>
      <div className="visual-copy"><div className="eyebrow"><span className="pulse"/> YOUR CUSTOM SDE ROADMAP</div><h1>Build skills.<br/><span>Ship your future.</span></h1><p>Your personal command center for mastering DSA, core CS, development and system design — together with your people.</p>
        <div className="visual-points"><div><Trophy/> <span>Track XP and real progress</span></div><div><Users/> <span>Compete and grow with friends</span></div><div><ShieldCheck/> <span>Your own profile and journey</span></div></div>
      </div>
      <div className="visual-footer">DESIGNED FOR THE NEXT LEVEL <span>© DEVQUEST</span></div>
    </div>
    <div className="auth-form-side">
      <div className="auth-form-wrap">
        <div className="form-kicker">{isRegister ? "CREATE YOUR ACCOUNT" : "WELCOME BACK"}</div>
        <h2>{isRegister ? "Start your quest." : "Pick up where you left off."}</h2>
        <p className="muted">{isRegister ? "Set up your profile and create a roadmap that fits your goals." : "Sign in to your DEVQUEST workspace."}</p>
        <form onSubmit={submit} className="auth-form">
          {isRegister && <><label>Full name<input name="name" value={form.name} onChange={change} placeholder="Your name" required maxLength="70"/></label><label>Username<input name="username" value={form.username} onChange={change} placeholder="e.g. aditya_dev" required minLength="3" maxLength="24"/></label></>}
          <label>Email address<input type="email" name="email" value={form.email} onChange={change} placeholder="you@example.com" required/></label>
          <label>Password<input type="password" name="password" value={form.password} onChange={change} placeholder="At least 8 characters" required minLength="8"/></label>
          {error && <div className="error-message">{error}</div>}
          <button className="primary-button full" disabled={busy}>{busy ? "Please wait…" : isRegister ? "Create account" : "Sign in"} <ArrowRight size={17}/></button>
        </form>
        <div className="auth-switch">{isRegister ? "Already have an account?" : "New to DEVQUEST?"} <Link to={isRegister ? "/login" : "/register"} state={location.state}>{isRegister ? "Sign in" : "Create account"}</Link></div>
        <div className="secure-note"><ShieldCheck size={15}/> Your progress is stored in your DEVQUEST account.</div>
      </div>
    </div>
  </div>;
}
