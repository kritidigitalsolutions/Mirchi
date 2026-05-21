  const SupportTicket = require(
  "../models/supportTicket.model"
);

const SupportMessage = require(
  "../models/supportMessage.model"
);


// ========================================
// CREATE TICKET
// ========================================
exports.createTicket = async (
  req,
  res
) => {
  try {
    const {
      subject,
      message,
      category,
    } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message:
          "Subject and message are required",
      });
    }

    // ========================================
    // CREATE TICKET
    // ========================================
    const ticket =
      await SupportTicket.create({
        user: req.user.id,
        subject,
        category,
        lastMessage: message,
        status: "OPEN",
      });

    // ========================================
    // CREATE FIRST MESSAGE
    // ========================================
    await SupportMessage.create({
      ticket: ticket._id,
      senderType: "USER",
      senderModel: "User",
      senderId: req.user.id,
      message,
    });

    res.status(201).json({
      success: true,
      message:
        "Ticket created successfully",
      ticket,
    });

  } catch (error) {
    console.error(
      "Create Ticket Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// ========================================
// GET MY TICKETS
// ========================================
exports.getMyTickets = async (
  req,
  res
) => {
  try {
    const tickets =
      await SupportTicket.find({
        user: req.user.id,
      }).sort({
        updatedAt: -1,
      });

    res.status(200).json({
      success: true,
      count: tickets.length,
      tickets,
    });

  } catch (error) {
    console.error(
      "Get My Tickets Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// ========================================
// GET SINGLE TICKET
// ========================================
exports.getSingleTicket = async (
  req,
  res
) => {
  try {
    const ticket =
      await SupportTicket.findOne({
        _id: req.params.id,
        user: req.user.id,
      }).populate(
        "user",
        "name phone email"
      );

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    // ========================================
    // GET CONVERSATION
    // ========================================
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
      ticket,
      messages,
    });

  } catch (error) {
    console.error(
      "Get Single Ticket Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// ========================================
// REPLY TO TICKET
// ========================================
exports.replyToTicket = async (
  req,
  res
) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const ticket =
      await SupportTicket.findOne({
        _id: req.params.id,
        user: req.user.id,
      });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    // ========================================
    // CLOSED TICKET CHECK
    // ========================================
    if (ticket.status === "CLOSED") {
      return res.status(400).json({
        success: false,
        message: "Ticket is closed",
      });
    }

    // ========================================
    // CREATE MESSAGE
    // ========================================
    await SupportMessage.create({
      ticket: ticket._id,
      senderType: "USER",
      senderModel: "User",
      senderId: req.user.id,
      message,
    });

    // ========================================
    // UPDATE TICKET
    // ========================================
    ticket.lastMessage = message;

    // customer replied again
    ticket.status = "OPEN";

    await ticket.save();

    // ========================================
    // RETURN UPDATED CHAT
    // ========================================
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
      message:
        "Reply sent successfully",
      messages,
    });

  } catch (error) {
    console.error(
      "Reply Ticket Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
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