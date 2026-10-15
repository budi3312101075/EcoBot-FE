const AttachmentButton = ({ icon: Icon, title, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-label={label}
    className="p-2 rounded-xl text-slate-400 hover:text-brand-400 hover:bg-slate-800/60 transition"
  >
    <Icon className="text-xs" />
  </button>
);

export default AttachmentButton;
