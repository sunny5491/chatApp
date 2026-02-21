import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req,res) => {
    try {
        const loggedInUserID = req.user._id;
        const filteredUsers = await User.find({_id: {$ne:loggedInUserID}}).select("-password");

        // Get the last message for each user
        const usersWithLastMessage = await Promise.all(
            filteredUsers.map(async (user) => {
                const lastMessage = await Message.findOne({
                    $or: [
                        { senderID: loggedInUserID, receiverID: user._id },
                        { senderID: user._id, receiverID: loggedInUserID }
                    ]
                }).sort({ createdAt: -1 });

                return {
                    ...user.toObject(),
                    lastMessage: lastMessage || null,
                    unreadCount: await Message.countDocuments({
                        senderID: user._id,
                        receiverID: loggedInUserID,
                        read: false
                    })
                };
            })
        );

        // Sort users by last message time (most recent first)
        const sortedUsers = usersWithLastMessage.sort((a, b) => {
            if (!a.lastMessage) return 1;
            if (!b.lastMessage) return -1;
            return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
        });

        res.status(200).json(sortedUsers);
    } catch (error) {
        console.log("Error in getUsersForSidebar: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
}

export const getMessages = async (req,res) => {
    try {
        const { userId: userToChatId } = req.params;
        const myId = req.user._id;

        console.log("Fetching messages between:", {
            myId,
            userToChatId
        });

        // Get both users' details
        const [currentUser, otherUser] = await Promise.all([
            User.findById(myId).select('fullName profilePic'),
            User.findById(userToChatId).select('fullName profilePic')
        ]);

        if (!currentUser || !otherUser) {
            return res.status(404).json({ error: "User not found" });
        }

        // Get messages between the two users
        const messages = await Message.find({
            $or: [
                { senderID: myId, receiverID: userToChatId },
                { senderID: userToChatId, receiverID: myId }
            ]
        })
        .sort({ createdAt: 1 })
        .populate({
            path: 'senderID',
            select: 'fullName profilePic',
            model: User
        })
        .populate({
            path: 'receiverID',
            select: 'fullName profilePic',
            model: User
        });

        console.log(`Found ${messages.length} messages`);

        // Mark unread messages as read
        await Message.updateMany(
            {
                senderID: userToChatId,
                receiverID: myId,
                read: false
            },
            { $set: { read: true } }
        );

        // Structure the response
        const structuredMessages = messages.map(message => ({
            _id: message._id,
            text: message.text,
            image: message.image,
            video: message.video,
            fileType: message.fileType,
            fileName: message.fileName,
            read: message.read,
            createdAt: message.createdAt,
            sender: {
                _id: message.senderID._id,
                fullName: message.senderID.fullName,
                profilePic: message.senderID.profilePic,
                isMe: message.senderID._id.toString() === myId.toString()
            },
            receiver: {
                _id: message.receiverID._id,
                fullName: message.receiverID.fullName,
                profilePic: message.receiverID.profilePic,
                isMe: message.receiverID._id.toString() === myId.toString()
            }
        }));

        // Add chat metadata
        const response = {
            chatId: userToChatId,
            participants: {
                currentUser: {
                    _id: currentUser._id,
                    fullName: currentUser.fullName,
                    profilePic: currentUser.profilePic
                },
                otherUser: {
                    _id: otherUser._id,
                    fullName: otherUser.fullName,
                    profilePic: otherUser.profilePic
                }
            },
            messages: structuredMessages,
            totalMessages: messages.length
        };

        res.status(200).json(response);
    } catch (error) {
        console.error("Error in getMessages controller:", error);
        res.status(500).json({ 
            error: "Internal server error",
            message: error.message
        });
    }
};

export const sendMessage = async (req,res) => {
    try {
        const { text, image, video, fileType, fileName } = req.body;
        const { userId: receiverID } = req.params;
        const senderID = req.user._id;

        console.log("Sending message with data:", {
            text,
            image: image ? "image present" : "no image",
            video: video ? "video present" : "no video",
            fileType,
            fileName,
            receiverID,
            senderID
        });

        // Verify that the user is not sending a message to themselves
        if (senderID === receiverID) {
            return res.status(400).json({ error: "Cannot send message to yourself" });
        }

        // Verify that the receiver exists
        const receiver = await User.findById(receiverID);
        if (!receiver) {
            return res.status(404).json({ error: "Receiver not found" });
        }

        let imageUrl, videoUrl;
        if (image && fileType === 'image'){
            try {
                const uploadResponse = await cloudinary.uploader.upload(image, {
                    resource_type: "image",
                    folder: "chat_images"
                });
                imageUrl = uploadResponse.secure_url;
            } catch (uploadError) {
                console.error("Error uploading image to Cloudinary:", uploadError);
                return res.status(500).json({ error: "Failed to upload image" });
            }
        }

        if (video && fileType === 'video') {
            try {
                const uploadResponse = await cloudinary.uploader.upload(video, {
                    resource_type: "video",
                    folder: "chat_videos"
                });
                videoUrl = uploadResponse.secure_url;
            } catch (uploadError) {
                console.error("Error uploading video to Cloudinary:", uploadError);
                return res.status(500).json({ error: "Failed to upload video" });
            }
        }

        // Create and save the message
        const newMessage = new Message({
            senderID,
            receiverID,
            text,
            image: imageUrl,
            video: videoUrl,
            fileType: fileType || 'text',
            fileName
        });

        console.log("Attempting to save message:", {
            senderID,
            receiverID,
            text,
            image: imageUrl ? "image present" : "no image",
            video: videoUrl ? "video present" : "no video",
            fileType: newMessage.fileType
        });

        try {
            const savedMessage = await newMessage.save();
            console.log("Message saved successfully:", savedMessage._id);

            // Only emit to the specific receiver
            const receiverSocketId = getReceiverSocketId(receiverID);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("newMessage", savedMessage);
            }

            res.status(201).json(savedMessage);
        } catch (saveError) {
            console.error("Error saving message to database:", saveError);
            return res.status(500).json({ 
                error: "Failed to save message",
                details: saveError.message
            });
        }
    } catch (error) {
        console.error("Error in sendMessage controller:", error);
        res.status(500).json({ 
            error: "Internal server error",
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

export const markMessagesAsRead = async (req, res) => {
    try {
        const { id: senderId } = req.params;
        const receiverId = req.user._id;

        await Message.updateMany(
            {
                senderID: senderId,
                receiverID: receiverId,
                read: false
            },
            { $set: { read: true } }
        );

        res.status(200).json({ message: "Messages marked as read" });
    } catch (error) {
        console.log("Error in markMessagesAsRead: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user._id;

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ error: "Message not found" });
        }

        // Only the sender can delete their own message
        if (message.senderID.toString() !== userId.toString()) {
            return res.status(403).json({ error: "You can only delete your own messages" });
        }

        await Message.findByIdAndDelete(messageId);

        res.status(200).json({ message: "Message deleted successfully", messageId });
    } catch (error) {
        console.error("Error in deleteMessage controller:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const searchMessages = async (req, res) => {
    try {
        const { userId: otherUserId } = req.params;
        const myId = req.user._id;
        const { q } = req.query;

        if (!q || q.trim() === "") {
            return res.status(400).json({ error: "Search query is required" });
        }

        const messages = await Message.find({
            $or: [
                { senderID: myId, receiverID: otherUserId },
                { senderID: otherUserId, receiverID: myId }
            ],
            text: { $regex: q.trim(), $options: "i" }
        })
        .sort({ createdAt: -1 })
        .limit(50);

        res.status(200).json({ results: messages, total: messages.length });
    } catch (error) {
        console.error("Error in searchMessages controller:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};