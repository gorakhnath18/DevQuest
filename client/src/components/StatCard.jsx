export default function StatCard({ label, value, suffix = "", detail, icon: Icon, tone = "blue" }) {
  return <div className="stat-card">
    <div className={`stat-icon ${tone}`}>{Icon && <Icon size={19}/>}</div>
    <div className="stat-label">{label}</div>
    <div className="stat-value">{value}<small>{suffix}</small></div>
    <div className="stat-detail">{detail}</div>
  </div>;
}
