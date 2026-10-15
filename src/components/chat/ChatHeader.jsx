import { FaMoon, FaSun } from "react-icons/fa";
import { FaBars } from "react-icons/fa6";
import { IoIosFlash } from "react-icons/io";

const ChatHeader = ({
  title,
  lastTime,
  theme,
  onToggleTheme,
  onOpenSidebar,
}) => {
  const isLight = theme === "light";
  const themeLabel = isLight ? "Switch to dark mode" : "Switch to light mode";

  return (
    <header className="h-16 shrink-0 border-b border-dark-border bg-dark-bg/60 backdrop-blur-xl flex items-center justify-between px-4 lg:px-8 z-20">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="lg:hidden p-2 text-slate-400 hover:text-white glass-button rounded-xl"
          aria-label="Open sidebar"
        >
          <FaBars />
        </button>
        <div className="min-w-0">
          <h1 className="font-semibold text-slate-100 text-sm truncate">
            {title}
          </h1>
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>{" "}
            Local session
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 font-mono">
          <IoIosFlash className="text-yellow-400 size-3.5" />
          <span>
            Last reply: <strong className="text-slate-200">{lastTime}</strong>
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleTheme}
          className="w-9 h-9 flex items-center justify-center rounded-xl glass-button text-slate-400 hover:text-brand-400"
          aria-label={themeLabel}
          title={themeLabel}
        >
          <span className="ico-sun">
            <FaSun className="text-yellow-500" />
          </span>
          <span className="ico-moon">
            <FaMoon className="text-slate-700" />
          </span>
        </button>
      </div>
    </header>
  );
};

export default ChatHeader;
