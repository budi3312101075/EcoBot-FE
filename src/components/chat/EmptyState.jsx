import { BsRobot } from "react-icons/bs";
import { SUGGESTIONS, TXT, HOV } from "../../utils/constants";

const EmptyState = ({ onSelect }) => (
  <div className="my-auto py-10 flex flex-col items-center justify-center text-center animate-fade-in">
    <div className="relative mb-6">
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-brand-500 to-accent-500 opacity-30 blur-2xl animate-pulse-glow"></div>
      <div className="relative w-20 h-20 rounded-3xl bg-dark-card border border-white/10 flex items-center justify-center text-brand-400 text-3xl shadow-2xl animate-float">
        <BsRobot />
      </div>
    </div>
    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
      How can <span className="shimmer-text">EcoBot</span> assist you?
    </h2>
    <p className="text-sm text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
      Local AI assistant for data analysis, technical reports, and automation.
      Your conversations stay on your own server.
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full text-left">
      {SUGGESTIONS.map((s) => {
        const Icon = s.icon;
        return (
          <button
            key={s.label}
            type="button"
            onClick={() => onSelect(s.q)}
            className={`p-4 rounded-2xl glass-panel hover:bg-slate-800/50 ${HOV[s.color]} transition-all duration-200 text-left`}
          >
            <span
              className={`text-xs font-semibold ${TXT[s.color]} flex items-center gap-1.5 mb-1.5`}
            >
              <Icon /> {s.label}
            </span>
            <p className="text-xs text-slate-300 font-medium line-clamp-2">
              {s.q}.
            </p>
          </button>
        );
      })}
    </div>
  </div>
);

export default EmptyState;
