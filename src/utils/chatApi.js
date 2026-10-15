import { useAuth } from "../store/auth";
import { loadChats } from "./storage";

const BASE = "/api/chats";
const MIGRATED = "ecobot_migrated_to_db_v1";

export const authHeaders = () => {
  const token = useAuth.getState().loginResponse;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function req(path = "", options = {}) {
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let msg;
    try {
      const body = await res.json();
      msg = body.error || body.message || body.msg;
    } catch {
      // body bukan JSON
    }
    throw new Error(msg || `Server error ${res.status}`);
  }
  return res.json();
}

export const fetchChats = async () => (await req()).data;
export const createChat = (id, title) =>
  req("", { method: "POST", body: JSON.stringify({ id, title }) });
export const addMessages = (id, messages) =>
  req(`/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ messages }),
  });
export const deleteLastMessage = (id, role) =>
  req(`/${id}/messages/last?role=${role}`, { method: "DELETE" });
export const deleteChatApi = (id) => req(`/${id}`, { method: "DELETE" });
export const deleteAllChats = () => req("", { method: "DELETE" });

// Pindahkan riwayat lama dari localStorage ke DB, sekali saja per browser.
// Promise di-cache supaya aman dari double-effect React StrictMode (dev).
let migrating = null;
export const migrateLocalStorageOnce = () =>
  (migrating ??= (async () => {
    if (localStorage.getItem(MIGRATED)) return;
    const old = loadChats().map((c) => ({
      title: c.title,
      ts: c.ts,
      messages: (c.messages || []).map((m) => ({
        role: m.role,
        content: m.content,
        thumbs: m.thumbs,
      })),
    }));
    if (old.length) {
      await req("/import", {
        method: "POST",
        body: JSON.stringify({ chats: old }),
      });
    }
    localStorage.setItem(MIGRATED, "1"); // ecobot_chats_v1 sengaja tidak dihapus, jadi backup
  })().catch((e) => {
    console.error("Migrasi gagal", e);
    migrating = null; // dicoba lagi di load berikutnya
  }));
