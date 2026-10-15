import { FaLeaf, FaPlus, FaXmark } from "react-icons/fa6";
import ConversationList from "./ConversationList";
import { IoLogOut } from "react-icons/io5";

const Sidebar = ({
  open,
  chats,
  curId,
  onClose,
  onNew,
  onOpen,
  onDelete,
  onClearAll,
}) => {
  const handleLogout = () => {
    localStorage.removeItem("ecoBot");
    window.location.reload();
  };

  return (
    <aside
      id="sidebar"
      className={`fixed lg:static inset-y-0 left-0 z-40 w-72 bg-dark-surface/95 border-r border-dark-border backdrop-blur-2xl transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col ${
        open ? "" : "-translate-x-full"
      }`}
    >
      <div className="p-4 border-b border-dark-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-emerald-500 to-accent-400 text-slate-950 shadow-lg shadow-brand-500/20">
            <FaLeaf className="text-lg" />
          </div>
          <div>
            <h2 className="font-bold text-slate-100 tracking-wide text-sm">
              EcoBot AI
            </h2>
            <p className="text-[11px] text-slate-400">IK Engineering</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg"
          aria-label="Close sidebar"
        >
          <FaXmark className="text-lg" />
        </button>
      </div>

      <div className="p-3">
        <button
          type="button"
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-slate-950 font-semibold text-sm transition-all duration-200 shadow-md shadow-brand-500/15 group"
        >
          <FaPlus className="transition-transform group-hover:rotate-90 duration-300" />
          <span>New Conversation</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Recent
        </div>
        <div className="space-y-1 mt-1">
          <ConversationList
            chats={chats}
            curId={curId}
            onOpen={onOpen}
            onDelete={onDelete}
          />
        </div>
      </div>

      <div className="p-3 border-t border-dark-border space-y-3">
        <div className="p-2.5 rounded-xl bg-dark-card/60 border border-dark-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-300 font-medium">IK ENGINEERING</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono"></span>
        </div>
        {/* <button
          type="button"
          onClick={() => {
            if (
              !chats.length ||
              !window.confirm("Delete ALL saved conversations?")
            )
              return;
            onClearAll();
          }}
          className="w-full py-2 px-3 rounded-lg glass-button text-xs text-slate-400 hover:text-rose-400 flex items-center justify-center gap-1.5"
        >
          <FaTrash />
          <span>Clear all history</span>
        </button> */}

        <button
          type="button"
          onClick={handleLogout}
          className="w-full py-2 px-3 rounded-lg glass-button text-xs text-slate-400 flex items-center justify-center gap-1.5 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200"
        >
          Logout <IoLogOut />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
