import { IMG_MAX_SIDE, IMG_QUALITY, THUMB_SIDE, THUMB_QUALITY } from "./constants";

export const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gagal membaca gambar"));
    };
    img.src = url;
  });

// gambar ke canvas dengan sisi terpanjang <= maxSide, hasil JPEG data URL
export const scaledDataUrl = (img, maxSide, quality) => {
  const s = Math.min(1, maxSide / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.width * s));
  c.height = Math.max(1, Math.round(img.height * s));
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff"; // PNG transparan -> latar putih
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", quality);
};

// -> { b64, thumb }  (b64 = base64 murni tanpa prefix data:)
export const processImageFile = async (file) => {
  const img = await loadImage(file);
  const full = scaledDataUrl(img, IMG_MAX_SIDE, IMG_QUALITY);
  return {
    b64: full.split(",")[1],
    thumb: scaledDataUrl(img, THUMB_SIDE, THUMB_QUALITY),
  };
};
