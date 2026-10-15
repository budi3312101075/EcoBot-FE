import { BsRobot } from "react-icons/bs";
import { parseThink } from "../../utils/markdown";
import MarkdownRenderer from "./MarkdownRenderer";
import MessageActions from "./MessageActions";

const Dots = () => (
  <span className="inline-flex items-center gap-1.5 py-1">
    <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce"></span>
    <span
      className="w-2 h-2 rounded-full bg-brand-400 animate-bounce"
      style={{ animationDelay: ".2s" }}
    ></span>
    <span
      className="w-2 h-2 rounded-full bg-brand-400 animate-bounce"
      style={{ animationDelay: ".4s" }}
    ></span>
  </span>
);

const ErrorContent = ({ error }) =>
  error.type === "empty" ? (
    <span className="text-amber-400">
      No response from the server. Try asking again.
    </span>
  ) : (
    <span className="text-rose-400">
      <i className="fa-solid fa-triangle-exclamation"></i> <b>Error:</b>{" "}
      {error.message}
    </span>
  );

/**
 * raw      : teks mentah (bisa memuat <think>...</think>)
 * error    : { type: "empty" | "error", message? } -> tampil menggantikan jawaban
 * actions  : { isLast, onRegenerate } -> tombol Copy/Regenerate (hanya untuk pesan final)
 */
const AssistantMessage = ({ raw = "", error = null, actions = null }) => {
  const { think, ans, open } = parseThink(raw);
  const showThink = !error && (think || open);
  const hideContent = !error && !ans && open;

  return (
    <div className="bot flex gap-3 w-full justify-start animate-fade-in">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-500 flex items-center justify-center text-slate-950 text-xs shrink-0 shadow-md shadow-brand-500/10">
        <BsRobot />
      </div>
      <div className="min-w-0 max-w-[92%] sm:max-w-[82%] space-y-2">
        <div className="think-slot">
          {showThink && (
            <details className="think">
              <summary>
                {open ? (
                  <>
                    <i className="spin"></i>Thinking…
                  </>
                ) : (
                  <>
                    <i className="fa-regular fa-lightbulb"></i>View reasoning
                  </>
                )}
              </summary>
              <div className="t">{think}</div>
            </details>
          )}
        </div>
        <div
          className={`content md glass-panel text-slate-200 px-4 py-3.5 rounded-2xl rounded-tl-md text-sm shadow-sm ${
            hideContent ? "hidden" : ""
          }`}
        >
          {error ? (
            <ErrorContent error={error} />
          ) : ans ? (
            <MarkdownRenderer content={ans} />
          ) : open ? null : (
            <Dots />
          )}
        </div>
        {actions && (
          <MessageActions
            text={ans}
            isLast={actions.isLast}
            onRegenerate={actions.onRegenerate}
          />
        )}
      </div>
    </div>
  );
};

export default AssistantMessage;
