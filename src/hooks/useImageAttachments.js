import { useCallback, useRef, useState } from "react";
import { MAX_IMG } from "../utils/constants";
import { processImageFile } from "../utils/image";

const useImageAttachments = () => {
  const [images, setImages] = useState([]); // [{ b64, thumb }]
  const [loading, setLoading] = useState(0); // jumlah gambar yang sedang diproses
  const imagesRef = useRef([]);
  const loadingRef = useRef(0);

  const setImgs = (next) => {
    imagesRef.current = next;
    setImages(next);
  };
  const bump = (d) => {
    loadingRef.current += d;
    setLoading(loadingRef.current);
  };

  const addFiles = useCallback(async (files) => {
    const list = [...files].filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    const room = MAX_IMG - imagesRef.current.length - loadingRef.current;
    if (room <= 0) {
      alert(`Maksimal ${MAX_IMG} gambar per pesan.`);
      return;
    }
    if (list.length > room) alert(`Maksimal ${MAX_IMG} gambar per pesan. Hanya ${room} gambar pertama yang diambil.`);

    for (const f of list.slice(0, room)) {
      bump(1);
      try {
        const processed = await processImageFile(f);
        setImgs([...imagesRef.current, processed]);
      } catch (e) {
        alert(`${f.name || "Gambar"}: ${e.message}`);
      } finally {
        bump(-1);
      }
    }
  }, []);

  const removeImage = useCallback((index) => {
    setImgs(imagesRef.current.filter((_, i) => i !== index));
  }, []);

  const clear = useCallback(() => setImgs([]), []);

  // Ambil semua gambar yang menunggu lalu kosongkan preview
  const takeImages = useCallback(() => {
    const current = imagesRef.current;
    setImgs([]);
    return current;
  }, []);

  return { images, loading, addFiles, removeImage, clear, takeImages };
};

export default useImageAttachments;
