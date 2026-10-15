import { useEffect, useMemo, useRef, useState } from "react";
import useImageAttachments from "../../hooks/useImageAttachments";
import { getImageContext } from "../../utils/chatHistory";
import {
  FENCE,
  TEXT_FILE_ACCEPT,
  TEXT_FILE_MAX_BYTES,
  TEXT_FILE_MAX_CHARS,
} from "../../utils/constants";
import AttachmentButton from "./AttachmentButton";
import ImagePreview from "./ImagePreview";
import { FaImages, FaPaperclip, FaPaperPlane, FaStop } from "react-icons/fa";

const ChatInput = ({
  chatKey,
  busy,
  messages,
  onSend,
  onStop,
  textareaRef,
}) => {
  const [text, setText] = useState("");
  const [drag, setDrag] = useState(false);
  const formRef = useRef(null);
  const fileRef = useRef(null);
  const imgInputRef = useRef(null);
  const { images, loading, addFiles, removeImage, clear, takeImages } =
    useImageAttachments();

  const imgCtx = useMemo(() => getImageContext(messages), [messages]);
  const canSend = !!(text.trim() || images.length);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [text, textareaRef]);

  // Fokus saat awal dan setelah respons selesai
  useEffect(() => {
    if (!busy) textareaRef.current?.focus();
  }, [busy, textareaRef]);

  // Ganti percakapan -> buang gambar yang belum terkirim
  useEffect(() => {
    clear();
  }, [chatKey, clear]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (busy || loading > 0) return; // tunggu resize gambar selesai
    const t = text.trim();
    if (!t && !images.length) return;
    const imgs = takeImages();
    setText("");
    onSend(t, imgs);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!busy) formRef.current?.requestSubmit();
    }
  };

  const handlePaste = (e) => {
    const files = [...(e.clipboardData?.files || [])].filter((f) =>
      f.type.startsWith("image/"),
    );
    if (files.length) {
      e.preventDefault();
      addFiles(files);
    }
  };

  const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes("Files");
  const handleDragOver = (e) => {
    if (hasFiles(e)) {
      e.preventDefault();
      setDrag(true);
    }
  };
  const handleDrop = (e) => {
    setDrag(false);
    const files = [...(e.dataTransfer?.files || [])].filter((f) =>
      f.type.startsWith("image/"),
    );
    if (files.length) {
      e.preventDefault();
      addFiles(files);
    }
  };

  const handleImageInput = (e) => {
    addFiles(e.target.files);
    e.target.value = "";
  };

  const handleTextFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > TEXT_FILE_MAX_BYTES) {
      alert("File too large (max 300 KB).");
      return;
    }
    try {
      let t = await file.text();
      const cut = t.length > TEXT_FILE_MAX_CHARS;
      if (cut) t = t.slice(0, TEXT_FILE_MAX_CHARS);
      setText(
        (prev) =>
          prev +
          (prev ? "\n\n" : "") +
          `File: ${file.name}${cut ? " (truncated to 20,000 chars)" : ""}\n${FENCE}\n${t}\n${FENCE}\n`,
      );
      textareaRef.current?.focus();
    } catch (err) {
      alert(`${file.name}: ${err.message}`);
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      className="relative max-w-6xl mx-auto"
    >
      <div
        className={`glass-input ${drag ? "drag" : ""} rounded-2xl p-2.5 transition-all duration-300 shadow-2xl flex flex-col`}
      >
        <ImagePreview images={images} onRemove={removeImage} />

        {imgCtx && (
          <div className="flex items-center gap-1.5 px-3 pt-1 text-[10px] text-slate-500">
            <i className="fa-regular fa-image text-accent-400"></i>
            <span>{imgCtx}</span>
          </div>
        )}

        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Ask EcoBot anything or paste/drop an image..."
          className="w-full max-h-40 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
        />

        <div className="flex items-center justify-between pt-2 border-t border-white/5 px-2 mt-1">
          <div className="flex items-center gap-1.5">
            <AttachmentButton
              icon={FaPaperclip}
              title="Attach text file (txt, csv, json, code…)"
              label="Attach file"
              onClick={() => fileRef.current?.click()}
            />
            <AttachmentButton
              icon={FaImages}
              title="Attach image (png, jpg, webp) — bisa juga Ctrl+V atau drag & drop"
              label="Attach image"
              onClick={() => imgInputRef.current?.click()}
            />
            <input
              ref={fileRef}
              type="file"
              accept={TEXT_FILE_ACCEPT}
              hidden
              onChange={handleTextFile}
            />
            <input
              ref={imgInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              hidden
              onChange={handleImageInput}
            />
            <span className="h-3 w-px bg-slate-800 mx-1"></span>
            <span className="text-[10px] text-slate-500 font-mono hidden sm:inline-block">
              ~{Math.ceil(text.trim().length / 4)} tokens
            </span>
          </div>
          <button
            type={busy ? "button" : "submit"}
            onClick={busy ? onStop : undefined}
            disabled={busy ? false : !canSend || loading > 0}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-slate-950 font-bold text-xs hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md shadow-brand-500/20 flex items-center gap-2"
          >
            <span>{busy ? "Stop" : "Send"}</span>
            {busy ? (
              <FaStop className="text-[10px]" />
            ) : (
              <FaPaperPlane className="text-[10px]" />
            )}
          </button>
        </div>
      </div>
      <p className="text-[10px] text-center mt-2 text-white">
        EcoBot may make mistakes. Verify technical calculations and critical
        data.
      </p>
    </form>
  );
};

export default ChatInput;
