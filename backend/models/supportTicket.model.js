const mongoose = require("mongoose");

const supportTicketSchema = new mongoose.Schema(
  {
    // ========================================
    // USER
    // ========================================
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ========================================
    // SUBJECT
    // ========================================
    subject: {
      type: String,
      required: true,
      trim: true,
    },

    // ========================================
    // CATEGORY
    // ========================================
    category: {
      type: String,
      enum: [
        "PAYMENT",
        "TECHNICAL",
        "SUBSCRIPTION",
        "ACCOUNT",
        "OTHER",
      ],
      default: "OTHER",
    },

    // ========================================
    // STATUS
    // ========================================
    status: {
      type: String,
      enum: [
        "OPEN",
        "PENDING",
        "RESOLVED",
        "CLOSED",
      ],
      default: "OPEN",
    },

    // ========================================
    // LAST MESSAGE PREVIEW
    // ========================================
    lastMessage: {
      type: String,
      default: "",
    },

    // ========================================
    // OPTIONAL UNREAD COUNTS
    // ========================================
    unreadByUser: {
      type: Number,
      default: 0,
    },

    unreadByAdmin: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);


// ========================================
// INDEXES
// ========================================
supportTicketSchema.index({
  user: 1,
  updatedAt: -1,
});

supportTicketSchema.index({
  status: 1,
});

module.exports = mongoose.model(
  "SupportTicket",
  supportTicketSchema
);
// ========================================
// GET COMPLETE CONVERSATION
// ========================================
exports.getTicketConversation =
  async (req, res) => {
    try {
      const ticket =
        await SupportTicket.findOne({
          _id: req.params.id,
          user: req.user.id,
        }).populate(
          "user",
          "name email phone"
        );

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found",
        });
      }

      const messages =
        await SupportMessage.find({
          ticket: ticket._id,
        })
          .populate(
            "senderId",
            "name email"
          )
          .sort({
            createdAt: 1,
          });

      res.status(200).json({
        success: true,

        conversation: {
          ticketId: ticket._id,
          subject: ticket.subject,
          category: ticket.category,
          status: ticket.status,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,

          user: ticket.user,

          messages,
        },
      });

    } catch (error) {
      console.error(
        "Get Conversation Error:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  };
