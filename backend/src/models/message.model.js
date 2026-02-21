import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        senderID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        receiverID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        text: {
            type: String,
        },
        image: {
            type: String,
        },
        video: {
            type: String,
        },
        fileType: {
            type: String,
            enum: ['image', 'video', 'text'],
            default: 'text'
        },
        fileName: {
            type: String,
        },
        read: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// Indexes for faster message queries between users
messageSchema.index({ senderID: 1, receiverID: 1 });
messageSchema.index({ receiverID: 1, senderID: 1 });
messageSchema.index({ createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;