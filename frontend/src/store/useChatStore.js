import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  chatMetadata: null,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ 
        messages: res.data.messages,
        chatMetadata: {
          participants: res.data.participants,
          totalMessages: res.data.totalMessages
        }
      });
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error("Unauthorized access to messages");
      } else {
        toast.error(error.response?.data?.message || "Failed to load messages");
      }
      set({ messages: [], chatMetadata: null });
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    if (!selectedUser) {
      toast.error("No user selected");
      return;
    }

    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      const { authUser } = useAuthStore.getState();
      
      // Structure the new message
      const structuredMessage = {
        ...res.data,
        sender: {
          _id: res.data.senderID,
          fullName: authUser.fullName,
          profilePic: authUser.profilePic,
          isMe: true
        },
        receiver: {
          _id: res.data.receiverID,
          fullName: selectedUser.fullName,
          profilePic: selectedUser.profilePic,
          isMe: false
        }
      };

      set({ messages: [...messages, structuredMessage] });
    } catch (error) {
      if (error.response?.status === 400) {
        toast.error("Cannot send message to yourself");
      } else {
        toast.error(error.response?.data?.message || "Failed to send message");
      }
    }
  },

  deleteMessage: async (messageId) => {
    try {
      await axiosInstance.delete(`/messages/${messageId}`);
      set((state) => ({
        messages: state.messages.filter((msg) => msg._id !== messageId),
      }));
      toast.success("Message deleted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete message");
    }
  },

  subscribeToMessages: () => {
    const { selectedUser, messages } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    const { authUser } = useAuthStore.getState();

    // Remove any existing listeners to prevent duplicates
    socket.off("newMessage");

    socket.on("newMessage", (newMessage) => {
      console.log("New message received:", newMessage);
      
      // Only add message if it's from/to the selected user and current user
      const isRelevantMessage = 
        (newMessage.senderID === selectedUser._id && newMessage.receiverID === authUser._id) ||
        (newMessage.senderID === authUser._id && newMessage.receiverID === selectedUser._id);
      
      if (isRelevantMessage) {
        // Structure the new message
        const structuredMessage = {
          ...newMessage,
          sender: {
            _id: newMessage.senderID,
            fullName: newMessage.senderID === authUser._id ? authUser.fullName : selectedUser.fullName,
            profilePic: newMessage.senderID === authUser._id ? authUser.profilePic : selectedUser.profilePic,
            isMe: newMessage.senderID === authUser._id
          },
          receiver: {
            _id: newMessage.receiverID,
            fullName: newMessage.receiverID === authUser._id ? authUser.fullName : selectedUser.fullName,
            profilePic: newMessage.receiverID === authUser._id ? authUser.profilePic : selectedUser.profilePic,
            isMe: newMessage.receiverID === authUser._id
          }
        };

        console.log("Adding structured message:", structuredMessage);
        set((state) => ({ messages: [...state.messages, structuredMessage] }));
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("newMessage");
    }
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));