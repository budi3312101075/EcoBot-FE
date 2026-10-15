const ImagePreview = ({ images, onRemove }) => {
  if (!images.length) return null;
  return (
    <div className="flex flex-wrap gap-2 px-2 pt-1 pb-2">
      {images.map((p, i) => (
        <div key={i} className="pv">
          <img src={p.thumb} alt={`preview ${i + 1}`} />
          <button type="button" className="img-x" onClick={() => onRemove(i)} aria-label="Hapus gambar">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      ))}
    </div>
  );
};

export default ImagePreview;
