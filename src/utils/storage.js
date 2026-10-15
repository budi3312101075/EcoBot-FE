const LS = "ecobot_chats_v1";

export const loadChats = () => {
  try {
    const v = JSON.parse(localStorage.getItem(LS) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

// field "images" (base64 penuh) TIDAK disimpan ke localStorage, hanya "thumbs" kecil
export const saveChats = (chats) => {
  try {
    localStorage.setItem(
      LS,
      JSON.stringify(chats.slice(0, 50), (k, v) => (k === "images" ? undefined : v))
    );
  } catch {
    // quota penuh / storage tidak tersedia
  }
};
