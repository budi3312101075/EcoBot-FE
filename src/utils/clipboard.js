export const copyText = async (t) => {
  try {
    await navigator.clipboard.writeText(t);
  } catch {
    const el = document.createElement("textarea");
    el.value = t;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    el.remove();
  }
};
