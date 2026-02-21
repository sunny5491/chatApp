import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef } from "react";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { formatMessageTime } from "../lib/utils";
import { Download, Trash2 } from "lucide-react";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    deleteMessage,
    isTyping
  } = useChatStore();
  const messageEndRef = useRef(null);

  useEffect(() => {
    if (selectedUser?._id) {
      getMessages(selectedUser._id);
      subscribeToMessages();
    }

    return () => {
      unsubscribeFromMessages();
    };
  }, [selectedUser?._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current && messages?.length > 0) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleDownload = async (url, fileName) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">No messages yet. Start a conversation!</p>
        </div>
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          if (!message?.sender) return null;
          
          return (
            <div
              key={message._id}
              className={`flex ${message.sender.isMe ? "justify-end" : "justify-start"}`}
              ref={messageEndRef}
            >
              <div className={`chat ${message.sender.isMe ? "chat-end" : "chat-start"} group relative`}>
                <div className="chat-image avatar">
                  <div className="w-10 h-10 rounded-full border">
                    <img
                      src={message.sender.profilePic || "/avatar.png"}
                      alt="profile pic"
                    />
                  </div>
                </div>
                <div className="chat-header flex items-center gap-1">
                  {message.sender.fullName}
                  <time className="text-xs opacity-50 ml-1">
                    {formatMessageTime(message.createdAt)}
                  </time>
                  {message.sender.isMe && (
                    <button
                      onClick={() => deleteMessage(message._id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 text-red-500 hover:text-red-700"
                      title="Delete originalMessage"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className={`chat-bubble ${message.sender.isMe ? "chat-bubble-primary" : ""}`}>
                  {message.fileType === "image" && message.image && (
                    <div className="relative">
                      <img
                        src={message.image}
                        alt="message image"
                        className="max-w-xs rounded-lg"
                      />
                      <button
                        onClick={() => handleDownload(message.image, message.fileName)}
                        className="absolute bottom-2 right-2 bg-black/50 p-1 rounded-full"
                      >
                        <Download size={16} className="text-white" />
                      </button>
                    </div>
                  )}
                  {message.fileType === "video" && message.video && (
                    <div className="relative">
                      <video
                        src={message.video}
                        controls
                        className="max-w-xs rounded-lg"
                      />
                      <button
                        onClick={() => handleDownload(message.video, message.fileName)}
                        className="absolute bottom-2 right-2 bg-black/50 p-1 rounded-full"
                      >
                        <Download size={16} className="text-white" />
                      </button>
                    </div>
                  )}
                  {message.text}
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex justify-start">
            <div className="chat chat-start">
              <div className="chat-image avatar">
                <div className="w-10 h-10 rounded-full border">
                  <img src={selectedUser.profilePic || "/avatar.png"} alt="profile pic" />
                </div>
              </div>
              <div className="chat-bubble bg-base-200 text-base-content flex items-center gap-2">
                <span className="loading loading-dots loading-sm"></span>
              </div>
            </div>
          </div>
        )}
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;