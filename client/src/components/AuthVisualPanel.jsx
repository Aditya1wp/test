import './AuthVisualPanel.css';

function TrendingUp({ className, size = 24 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function AuraIcon({ className, size = 24 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}

export default function AuthVisualPanel() {
  return (
    <section className="login-visual-panel">
      <div className="login-visual-backdrop" />
      <div className="login-visual-content">
        <div className="login-visual-badge">
          <AuraIcon className="login-icon-sm" />
          <span>PREMIUM PREP ENGINE</span>
        </div>

        <div className="login-visual-copy">
          <h1 className="login-visual-title">
            Analyze. <span className="login-visual-gradient">Prepare. Ace.</span>
          </h1>
          <p className="login-visual-subtitle">
            The most advanced mock engine for NIMCET aspirants. Premium tools,
            elite insights.
          </p>
        </div>

        <div className="login-insight-hub">
          <div className="login-glass-card login-glass-card--stats">
            <span className="login-card-label">EXAM STATISTICS</span>
            <div className="login-stat-grid">
              <div className="login-stat-item">
                <p>48K+</p>
                <span>Mock Tests</span>
              </div>
              <div className="login-stat-item">
                <p>94.5%</p>
                <span>Top Score</span>
              </div>
              <div className="login-stat-item">
                <p>87%</p>
                <span>Avg Rank</span>
              </div>
            </div>
            <div className="login-card-chart" />
          </div>

          <div className="login-glass-card login-glass-card--insights">
            <span className="login-card-label">ASPIRANT INSIGHTS</span>
            <div className="login-insight-row">
              <div className="login-icon-wrap">
                <TrendingUp className="login-icon-accent" size={24} />
              </div>
              <div>
                <p className="login-insight-title">Current Performance</p>
                <p className="login-insight-text">78th Percentile (Active)</p>
              </div>
            </div>
            <div className="login-progress-stack">
              <div className="login-progress-bg">
                <div className="login-progress-fill" />
              </div>
              <p className="login-progress-caption">Target Rank: AIR &lt; 50</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
