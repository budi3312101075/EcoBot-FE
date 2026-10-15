import { FaTrash } from "react-icons/fa6";

const ConversationItem = ({ chat, active, onOpen, onDelete }) => (
  <div
    className={`group flex items-center rounded-xl transition ${
      active
        ? "bg-slate-800/60 border border-slate-700/50"
        : "hover:bg-slate-800/30 border border-transparent"
    }`}
  >
    <button
      type="button"
      onClick={() => onOpen(chat.id)}
      className={`flex-1 min-w-0 flex items-center gap-2.5 p-2.5 text-left text-xs ${
        active ? "text-slate-100" : "text-slate-400 hover:text-slate-200"
      }`}
    >
      <i
        className={`fa-regular fa-message ${active ? "text-brand-400" : "text-slate-500"}`}
      ></i>
      <span className="truncate">{chat.title}</span>
    </button>
    <button
      type="button"
      onClick={() => {
        if (window.confirm("Delete this conversation?")) onDelete(chat.id);
      }}
      aria-label="Delete"
      className="p-2 mr-1 text-slate-500 hover:text-rose-400 lg:opacity-0 lg:group-hover:opacity-100 transition"
    >
      <FaTrash />
    </button>
  </div>
);

export default ConversationItem;
