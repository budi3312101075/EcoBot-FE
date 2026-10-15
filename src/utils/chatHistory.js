import { MAX_CTX_IMG, IMG_FOLLOWUP_MAX } from "./constants";

// Indeks pesan user bergambar yang gambar penuhnya ikut dikirim (gambar penuh hanya ada di memori):
// terbaru dulu, masih dalam jendela follow-up, total gambar <= MAX_CTX_IMG. Logika sama dengan server.
export const imageMsgSet = (list) => {
  const userIdxs = [];
  list.forEach((m, i) => {
    if (m.role === "user") userIdxs.push(i);
  });

  const keep = new Set();
  let total = 0;
  for (let k = userIdxs.length - 1; k >= 0; k--) {
    if (userIdxs.length - 1 - k > IMG_FOLLOWUP_MAX) break;
    const m = list[userIdxs[k]];
    if (!m.images?.length) continue;
    if (total + m.images.length > MAX_CTX_IMG) break;
    keep.add(userIdxs[k]);
    total += m.images.length;
  }
  return keep;
};

// Riwayat yang dikirim ke server. Gambar penuh (base64) hanya ikut di pesan yang masuk jendela di atas.
export const slimHistory = (history = [], { maxMessages = 10, maxChars = 3000 } = {}) => {
  const sliced = history.slice(-maxMessages);
  const keep = imageMsgSet(sliced);
  return sliced.map((m, i) => {
    const out = {
      role: m.role,
      content: String(m.content || "")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, "[gambar]") // buang markdown image (termasuk base64)
        .slice(0, maxChars),
    };
    const hadImages = (m.images && m.images.length) || (m.thumbs && m.thumbs.length);
    if (keep.has(i)) out.images = m.images;
    else if (hadImages && !out.content) out.content = "[gambar]";
    return out;
  });
};

// Indikator di atas kolom input: berapa gambar aktif dan berapa pertanyaan lanjutan lagi yang membawanya
export const getImageContext = (messages) => {
  const keep = imageMsgSet(messages);
  if (!keep.size) return null;
  const newest = Math.max(...keep);
  const total = [...keep].reduce((n, i) => n + messages[i].images.length, 0);
  const userAfter = messages.slice(newest + 1).filter((m) => m.role === "user").length;
  const left = IMG_FOLLOWUP_MAX - userAfter;
  return left > 0
    ? `${total} gambar aktif, masih terbaca untuk ${left} pertanyaan lanjutan`
    : `${total} gambar aktif, setelah ini tidak ikut lagi. Lampirkan ulang kalau masih perlu`;
};
