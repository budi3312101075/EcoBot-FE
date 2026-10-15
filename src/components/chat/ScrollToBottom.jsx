import { BsArrowDownCircleFill } from "react-icons/bs";

const ScrollToBottom = ({ show, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`scroll-bottom ${show ? "show" : ""}`}
    aria-label="Scroll to bottom"
    title="Scroll to bottom"
  >
    <BsArrowDownCircleFill />
  </button>
);

export default ScrollToBottom;
