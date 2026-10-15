import ConversationItem from "./ConversationItem";

const ConversationList = ({ chats, curId, onOpen, onDelete }) => {
  if (!chats.length) {
    return <p className="px-2.5 py-3 text-xs text-slate-500">No conversations yet.</p>;
  }
  return (
    <>
      {[...chats]
        .sort((a, b) => b.ts - a.ts)
        .map((c) => (
          <ConversationItem key={c.id} chat={c} active={c.id === curId} onOpen={onOpen} onDelete={onDelete} />
        ))}
    </>
  );
};

export default ConversationList;
