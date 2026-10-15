import { useCallback, useEffect, useRef, useState } from "react";
import useChat from "../hooks/useChat";
import useTheme from "../hooks/useTheme";
import Sidebar from "../components/sidebar/Sidebar";
import ChatHeader from "../components/chat/ChatHeader";
import ChatContainer from "../components/chat/ChatContainer";
import ScrollToBottom from "../components/chat/ScrollToBottom";
import ChatInput from "../components/input/ChatInput";

const MainLayout = () => {
  const chat = useChat();
  const { theme, toggle } = useTheme();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const scrollerRef = useRef(null);
  const textareaRef = useRef(null);
  const stickRef = useRef(true);

  const distFromBottom = () => {
    const el = scrollerRef.current;
    return el ? el.scrollHeight - el.scrollTop - el.clientHeight : 0;
  };

  const handleScroll = useCallback(() => {
    const dist = distFromBottom();
    stickRef.current = dist < 140;
    setShowScrollBtn(dist > 200);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    const content = el.firstElementChild;
    const onResize = () => {
      if (stickRef.current)
        el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
      setShowScrollBtn(distFromBottom() > 200 && !stickRef.current);
    };
    const ro = "ResizeObserver" in window ? new ResizeObserver(onResize) : null;
    ro?.observe(content);
    window.addEventListener("resize", handleScroll);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", handleScroll);
    };
  }, [handleScroll]);

  useEffect(() => {
    const el = scrollerRef.current;
    stickRef.current = true;
    el?.scrollTo({ top: el.scrollHeight, behavior: "auto" });
    setShowScrollBtn(false);
  }, [chat.scrollTick]);

  const scrollToEnd = () => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  };

  const closeSidebar = () => setSidebarOpen(false);

  const handleNew = () => {
    chat.newChat();
    closeSidebar();
    textareaRef.current?.focus();
  };
  const handleOpen = (id) => {
    chat.openChat(id);
    closeSidebar();
  };

  return (
    <>
      <div
        id="ambient"
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      >
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-500/10 rounded-full blur-[120px] animate-pulse-glow"></div>
        <div
          className="absolute top-1/2 -right-40 w-96 h-96 bg-accent-500/10 rounded-full blur-[120px] animate-pulse-glow"
          style={{ animationDelay: "1.5s" }}
        ></div>
        <div
          className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-600/10 rounded-full blur-[100px] animate-pulse-glow"
          style={{ animationDelay: "3s" }}
        ></div>
        <div className="ambient-dots absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px]"></div>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={closeSidebar}
        ></div>
      )}

      <Sidebar
        open={sidebarOpen}
        chats={chat.chats}
        curId={chat.curId}
        onClose={closeSidebar}
        onNew={handleNew}
        onOpen={handleOpen}
        onDelete={chat.deleteChat}
        onClearAll={() => {
          chat.clearAll();
          closeSidebar();
        }}
      />

      <div className="flex-1 flex flex-col h-full min-w-0 relative overflow-hidden z-10">
        <ChatHeader
          title={chat.current ? chat.current.title : "New conversation"}
          lastTime={chat.lastTime}
          theme={theme}
          onToggleTheme={toggle}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <ChatContainer
          scrollerRef={scrollerRef}
          onScroll={handleScroll}
          showEmpty={!chat.current}
          messages={chat.messages}
          stream={chat.stream}
          busy={chat.busy}
          onSuggestion={(q) => chat.send(q)}
          onRegenerate={chat.regenerate}
        />

        <footer className="shrink-0 px-4 pb-4 pt-1 md:px-8 relative z-20">
          <ScrollToBottom show={showScrollBtn} onClick={scrollToEnd} />
          <ChatInput
            chatKey={chat.curId}
            busy={chat.busy}
            messages={chat.messages}
            onSend={chat.send}
            onStop={chat.stop}
            textareaRef={textareaRef}
          />
        </footer>
      </div>
    </>
  );
};

export default MainLayout;
