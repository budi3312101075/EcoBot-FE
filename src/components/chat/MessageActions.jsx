import useCopyFeedback from "../../hooks/useCopyFeedback";

const MessageActions = ({ text, isLast, onRegenerate }) => {
  const [copied, copy] = useCopyFeedback();

  return (
    <div className="actions flex items-center gap-3 px-1 text-[11px] text-slate-500">
      <button
        type="button"
        onClick={() => copy(text)}
        className="hover:text-slate-300 transition flex items-center gap-1"
      >
        {copied ? (
          <>
            <i className="fa-solid fa-check text-emerald-400"></i> Copied
          </>
        ) : (
          <>
            <i className="fa-regular fa-copy"></i> Copy
          </>
        )}
      </button>
      {isLast && (
        <button
          type="button"
          onClick={onRegenerate}
          className="regen hover:text-brand-400 transition flex items-center gap-1"
        >
          <i className="fa-solid fa-rotate-right"></i> Regenerate
        </button>
      )}
      <span className="text-[10px] text-slate-600"></span>
    </div>
  );
};

export default MessageActions;
