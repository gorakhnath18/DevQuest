import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Users } from "lucide-react";
import api from "../services/api";

export default function RoadmapInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [sender, setSender] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/profiles/invitations/${token}`)
      .then(({ data }) => setSender(data.sender))
      .catch(e => setError(e.response?.data?.message || "Could not load this roadmap invitation."));
  }, [token]);

  async function respond(action) {
    setBusy(true);
    setError("");
    try {
      await api.post(`/profiles/invitations/${token}/${action}`);
      navigate("/");
    } catch (e) {
      setError(e.response?.data?.message || "Could not respond to this invitation.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="invite-page panel">
    <div className="brand-mark"><Users size={21}/></div>
    <div className="eyebrow">DEVQUEST ROADMAP INVITATION</div>
    <h1>{sender ? `${sender.name} invited you to follow their roadmap.` : "Roadmap invitation"}</h1>
    <p className="muted">You can see their roadmap overview and progress after accepting. Applications and your own progress remain private.</p>
    {error && <div className="error-message">{error}</div>}
    {sender && <div className="invite-dialog-actions"><button className="rb-secondary-button" disabled={busy} onClick={() => respond("decline")}>Decline</button><button className="primary-button" disabled={busy} onClick={() => respond("accept")}>{busy ? "Saving…" : "Accept invitation"} <ArrowRight size={16}/></button></div>}
  </section>;
}
