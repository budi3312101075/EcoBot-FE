import { useCallback, useEffect, useRef, useState } from "react";
import { copyText } from "../utils/clipboard";

// Salin teks + status "Copied" selama 1,6 detik
const useCopyFeedback = () => {
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async (text) => {
    await copyText(text);
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  }, []);

  return [copied, copy];
};

export default useCopyFeedback;
