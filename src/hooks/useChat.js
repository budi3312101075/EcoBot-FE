import { useCallback, useEffect, useRef, useState } from "react";
import { loadChats, saveChats } from "../utils/storage";
import { slimHistory } from "../utils/chatHistory";
import { parseThink } from "../utils/markdown";

const useChat = () => {
  const chatsRef = useRef(null);
  if (chatsRef.current === null) chatsRef.current = loadChats();

  const [chats, setChats] = useState(chatsRef.current);
  const [curId, setCurId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [stream, setStream] = useState(null); // { chatId, raw, error: null | { type, message? } }
  const [lastTime, setLastTime] = useState("–");
  const [scrollTick, setScrollTick] = useState(0);

  const curIdRef = useRef(null);
  const busyRef = useRef(false);
  const ctrlRef = useRef(null);

  // Update chats lewat ref supaya handler async selalu memakai data terbaru, lalu simpan ke localStorage
  const commit = useCallback((updater) => {
    const next = updater(chatsRef.current);
    chatsRef.current = next;
    setChats(next);
    saveChats(next);
  }, []);

  const patchChat = useCallback(
    (id, fn) => commit((list) => list.map((c) => (c.id === id ? fn(c) : c))),
    [commit]
  );

  const selectChat = (id) => {
    curIdRef.current = id;
    setCurId(id);
  };

  /* ---------- Chat engine (Ollama NDJSON stream) ---------- */
  const run = useCallback(
    async (id) => {
      busyRef.current = true;
      setBusy(true);
      const controller = new AbortController();
      ctrlRef.current = controller;

      const t0 = performance.now();
      let raw = "";
      let frame = 0;
      let closed = false;

      setStream({ chatId: id, raw: "", error: null });

      const paint = () => {
        frame = 0;
        if (!closed) setStream({ chatId: id, raw, error: null });
      };
      const schedule = () => {
        if (!frame) frame = requestAnimationFrame(paint);
      };
      const cancelFrame = () => {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
      };

      const finish = () => {
        const { ans } = parseThink(raw);
        if (!ans) return false;
        patchChat(id, (c) => ({
          ...c,
          ts: Date.now(),
          messages: [...c.messages, { role: "assistant", content: ans }],
        }));
        setLastTime(((performance.now() - t0) / 1000).toFixed(1) + "s");
        return true;
      };

      // Sama seperti sumber: pesan user terakhir dibuang jika tidak ada jawaban
      const dropLastUser = () =>
        patchChat(id, (c) => ({ ...c, messages: c.messages.slice(0, -1) }));

      try {
        const messages = chatsRef.current.find((c) => c.id === id)?.messages ?? [];
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: slimHistory(messages) }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error((await res.text()) || "Server error " + res.status);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop();
          for (const line of lines) {
            if (!line.trim()) continue;
            let data;
            try {
              data = JSON.parse(line);
            } catch {
              continue;
            }
            if (data.message?.content) {
              raw += data.message.content;
              schedule();
            }
          }
        }
        cancelFrame();
        if (finish()) {
          setStream(null);
        } else {
          dropLastUser();
          setStream({ chatId: id, raw: "", error: { type: "empty" } });
        }
      } catch (err) {
        cancelFrame();
        if (err.name === "AbortError") {
          if (!finish()) dropLastUser();
          setStream(null);
        } else {
          dropLastUser();
          setStream({ chatId: id, raw: "", error: { type: "error", message: err.message } });
        }
      } finally {
        closed = true;
        cancelFrame();
        if (ctrlRef.current === controller) ctrlRef.current = null;
        busyRef.current = false;
        setBusy(false);
      }
    },
    [patchChat]
  );

  const send = useCallback(
    (text, imgs = []) => {
      if (busyRef.current || (!text.trim() && !imgs.length)) return;

      const msg = { role: "user", content: text };
      if (imgs.length) {
        msg.images = imgs.map((i) => i.b64); // hanya di memori, dibuang saat saveChats()
        msg.thumbs = imgs.map((i) => i.thumb); // ikut disimpan, untuk tampilan
      }

      let id = curIdRef.current;
      if (!id) {
        id = Date.now().toString(36);
        const title = text.replace(/\s+/g, " ").slice(0, 42) || "Image";
        commit((list) => [{ id, title, messages: [msg], ts: Date.now() }, ...list]);
        selectChat(id);
      } else {
        patchChat(id, (c) => ({ ...c, messages: [...c.messages, msg] }));
      }
      setStream(null);
      setScrollTick((t) => t + 1);
      run(id);
    },
    [commit, patchChat, run]
  );

  const stop = useCallback(() => ctrlRef.current?.abort(), []);

  const regenerate = useCallback(() => {
    const id = curIdRef.current;
    if (busyRef.current || !id) return;
    patchChat(id, (c) =>
      c.messages.at(-1)?.role === "assistant" ? { ...c, messages: c.messages.slice(0, -1) } : c
    );
    setScrollTick((t) => t + 1);
    run(id);
  }, [patchChat, run]);

  const newChat = useCallback(() => {
    if (busyRef.current) ctrlRef.current?.abort();
    selectChat(null);
    setStream(null);
    setScrollTick((t) => t + 1);
  }, []);

  const openChat = useCallback((id) => {
    if (!chatsRef.current.some((c) => c.id === id)) return;
    if (busyRef.current) ctrlRef.current?.abort();
    selectChat(id);
    setStream(null);
    setScrollTick((t) => t + 1);
  }, []);

  const deleteChat = useCallback(
    (id) => {
      commit((list) => list.filter((c) => c.id !== id));
      if (curIdRef.current === id) newChat();
    },
    [commit, newChat]
  );

  const clearAll = useCallback(() => {
    commit(() => []);
    newChat();
  }, [commit, newChat]);

  // Batalkan request yang masih berjalan saat hook di-unmount
  useEffect(() => () => ctrlRef.current?.abort(), []);

  const current = chats.find((c) => c.id === curId) || null;

  return {
    chats,
    curId,
    current,
    messages: current?.messages ?? [],
    busy,
    stream: stream && stream.chatId === curId ? stream : null,
    lastTime,
    scrollTick,
    send,
    stop,
    regenerate,
    newChat,
    openChat,
    deleteChat,
    clearAll,
  };
};

export default useChat;
