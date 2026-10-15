import AssistantMessage from "./AssistantMessage";
import UserMessage from "./UserMessage";
import EmptyState from "./EmptyState";

const ChatContainer = ({ scrollerRef, onScroll, showEmpty, messages, stream, busy, onSuggestion, onRegenerate }) => (
  <main ref={scrollerRef} onScroll={onScroll} className="flex-1 overflow-y-auto scroll-smooth">
    <div className="max-w-7xl w-full mx-auto px-4 py-6 md:px-8 flex flex-col gap-6 min-h-full">
      {showEmpty && !stream && <EmptyState onSelect={onSuggestion} />}

      {messages.map((m, i) =>
        m.role === "user" ? (
          <UserMessage key={i} text={m.content} thumbs={m.thumbs || []} />
        ) : (
          <AssistantMessage
            key={i}
            raw={m.content}
            actions={{ isLast: i === messages.length - 1 && !busy, onRegenerate }}
          />
        )
      )}

      {stream && <AssistantMessage raw={stream.raw} error={stream.error} />}
    </div>
  </main>
);

export default ChatContainer;
