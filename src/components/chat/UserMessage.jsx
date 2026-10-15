import { FaUser } from "react-icons/fa6";

const UserMessage = ({ text, thumbs = [] }) => (
  <div className="flex gap-3 w-full justify-end animate-fade-in">
    <div className="max-w-[85%] sm:max-w-[75%] bg-gradient-to-r from-brand-600 to-emerald-600 text-slate-950 px-4 py-3 rounded-2xl rounded-tr-md text-sm font-medium shadow-lg shadow-brand-500/10 leading-relaxed break-words">
      {thumbs.length > 0 && (
        <div
          className={`u-imgs flex flex-wrap gap-2 justify-end ${text ? "mb-2" : ""}`}
        >
          {thumbs.map((t, i) => (
            <img key={i} className="u-thumb" src={t} alt="gambar terlampir" />
          ))}
        </div>
      )}
      {text && <div className="u-text whitespace-pre-wrap">{text}</div>}
    </div>
    <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 text-xs shrink-0">
      <FaUser />
    </div>
  </div>
);

export default UserMessage;
