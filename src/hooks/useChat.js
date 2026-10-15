import { useCallback, useEffect, useRef, useState } from "react";
import {
  authHeaders,
  fetchChats,
  createChat,
  addMessages,
  deleteLastMessage,
  deleteChatApi,
  deleteAllChats,
  migrateLocalStorageOnce,
} from "../utils/chatApi";
import { slimHistory } from "../utils/chatHistory";
import { parseThink } from "../utils/markdown";
import { generateUUID } from "../utils/utils";

const useChat = () => {
  const chatsRef = useRef([]);

  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [curId, setCurId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [stream, setStream] = useState(null);
  const [lastTime, setLastTime] = useState("–");
  const [scrollTick, setScrollTick] = useState(0);

  const curIdRef = useRef(null);
  const busyRef = useRef(false);
  const ctrlRef = useRef(null);

  const syncedRef = useRef(new Map());
  const queueRef = useRef(Promise.resolve());
  const enqueue = useCallback((fn) => {
    queueRef.current = queueRef.current
      .then(fn)
      .catch((e) => console.error("[sync]", e));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await migrateLocalStorageOnce();
        const list = await fetchChats();
        if (cancelled) return;
        syncedRef.current = new Map(list.map((c) => [c.id, c.messages.length]));
        chatsRef.current = list;
        setChats(list);
      } catch (e) {
        console.error("Gagal memuat riwayat chat", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const commit = useCallback((updater) => {
    const next = updater(chatsRef.current);
    chatsRef.current = next;
    setChats(next);
  }, []);

  const patchChat = useCallback(
    (id, fn) => commit((list) => list.map((c) => (c.id === id ? fn(c) : c))),
    [commit],
  );

  // Kirim ke DB semua pesan yang belum tersimpan. Kalau gagal, counter tidak naik,
  // jadi otomatis dicoba lagi saat sync berikutnya.
  const syncChat = useCallback(
    (id) =>
      enqueue(async () => {
        const chat = chatsRef.current.find((c) => c.id === id);
        if (!chat) return;
        if (!syncedRef.current.has(id)) {
          await createChat(id, chat.title);
          syncedRef.current.set(id, 0);
        }
        const done = syncedRef.current.get(id);
        const pending = chat.messages.slice(done);
        if (!pending.length) return;
        await addMessages(
          id,
          pending.map((m) => ({
            role: m.role,
            content: m.content,
            thumbs: m.thumbs,
          })),
        );
        syncedRef.current.set(id, done + pending.length);
      }),
    [enqueue],
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
        syncChat(id); // simpan pesan user + jawaban ke DB
        setLastTime(((performance.now() - t0) / 1000).toFixed(1) + "s");
        return true;
      };

      // Pesan user terakhir dibuang jika tidak ada jawaban (belum pernah masuk DB)
      const dropLastUser = () =>
        patchChat(id, (c) => ({ ...c, messages: c.messages.slice(0, -1) }));

      try {
        const messages =
          chatsRef.current.find((c) => c.id === id)?.messages ?? [];
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ messages: slimHistory(messages) }),
          signal: controller.signal,
        });
        if (!res.ok)
          throw new Error((await res.text()) || "Server error " + res.status);

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
          setStream({
            chatId: id,
            raw: "",
            error: { type: "error", message: err.message },
          });
        }
      } finally {
        closed = true;
        cancelFrame();
        if (ctrlRef.current === controller) ctrlRef.current = null;
        busyRef.current = false;
        setBusy(false);
      }
    },
    [patchChat, syncChat],
  );

  const send = useCallback(
    (text, imgs = []) => {
      if (busyRef.current || (!text.trim() && !imgs.length)) return;

      const msg = { role: "user", content: text };
      if (imgs.length) {
        msg.images = imgs.map((i) => i.b64); // hanya di memori, tidak disimpan
        msg.thumbs = imgs.map((i) => i.thumb); // ikut disimpan ke DB, untuk tampilan
      }

      let id = curIdRef.current;
      if (!id) {
        id = generateUUID();
        const title = text.replace(/\s+/g, " ").slice(0, 42) || "Image";
        commit((list) => [
          { id, title, messages: [msg], ts: Date.now() },
          ...list,
        ]);
        selectChat(id);
      } else {
        patchChat(id, (c) => ({ ...c, messages: [...c.messages, msg] }));
      }
      setStream(null);
      setScrollTick((t) => t + 1);
      run(id);
    },
    [commit, patchChat, run],
  );

  const stop = useCallback(() => ctrlRef.current?.abort(), []);

  const regenerate = useCallback(() => {
    const id = curIdRef.current;
    if (busyRef.current || !id) return;

    const chat = chatsRef.current.find((c) => c.id === id);
    if (chat?.messages.at(-1)?.role === "assistant") {
      const target = chat.messages.length - 1;
      patchChat(id, (c) => ({ ...c, messages: c.messages.slice(0, -1) }));
      // samakan DB: hapus jawaban terakhir kalau sudah tersimpan
      enqueue(async () => {
        const saved = syncedRef.current.get(id);
        if (saved !== undefined && saved > target) {
          await deleteLastMessage(id, "assistant");
          syncedRef.current.set(id, saved - 1);
        }
      });
    }
    setScrollTick((t) => t + 1);
    run(id);
  }, [patchChat, run, enqueue]);

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
      enqueue(async () => {
        if (!syncedRef.current.has(id)) return; // belum pernah dibuat di DB
        await deleteChatApi(id);
        syncedRef.current.delete(id);
      });
      if (curIdRef.current === id) newChat();
    },
    [commit, enqueue, newChat],
  );

  const clearAll = useCallback(() => {
    commit(() => []);
    enqueue(async () => {
      await deleteAllChats();
      syncedRef.current.clear();
    });
    newChat();
  }, [commit, enqueue, newChat]);

  // Batalkan request yang masih berjalan saat hook di-unmount
  useEffect(() => () => ctrlRef.current?.abort(), []);

  const current = chats.find((c) => c.id === curId) || null;

  return {
    chats,
    curId,
    current,
    messages: current?.messages ?? [],
    busy: busy || loading, // input dikunci sebentar selama riwayat dimuat dari DB
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
