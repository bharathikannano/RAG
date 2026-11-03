import './ApiBudget.css';

export default function ApiBudget({ status }) {
  if (!status) return null;

  const { usageToday = {}, providers = [] } = status;
  const hostedProviders = providers.filter(p => p.name !== 'extractive');

  if (hostedProviders.length === 0) return null;

  return (
    <div className="glass api-budget">
      <h3 className="budget-title">📊 API Budget Today</h3>
      <div className="budget-list">
        {hostedProviders.map(p => (
          <div key={p.name} className={`budget-row ${p.hasKey ? '' : 'budget-inactive'}`}>
            <span className="budget-provider">{p.name}</span>
            <span className={`budget-count ${p.hasKey ? 'badge badge-purple' : 'badge badge-red'}`}>
              {p.hasKey ? `${usageToday[p.name] || 0} req` : 'no key'}
            </span>
          </div>
        ))}
        <div className="budget-row">
          <span className="budget-provider">extractive</span>
          <span className="badge badge-green">always free</span>
        </div>
      </div>
      <p className="text-xs text-muted">
        Local counter · resets at midnight
      </p>
    </div>
  );
}
