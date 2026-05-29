import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Send,
  Tag,
  User,
  X,
} from "lucide-react";
import API from "../api/axios";
import "./SupportDetails.css";

const STATUS_OPTIONS = ["OPEN", "PENDING", "RESOLVED", "CLOSED"];

const formatDate = (value) => {
  if (!value) return "N/A";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

export default function SupportDetails({ ticketId }) {
  const params = useParams();
  const navigate = useNavigate();
  const routeTicketId = ticketId || params.id;

  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [tickets, setTickets] = useState([]);
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [error, setError] = useState("");
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const activeTicketId = routeTicketId || selectedTicketId;
  const showTicketList = !routeTicketId;

  // Filter tickets reactively based on subject, user details, category, or status
  const filteredTickets = useMemo(() => {
    if (!searchQuery.trim()) return tickets;
    const query = searchQuery.toLowerCase().trim();
    return tickets.filter((item) => {
      const subject = (item.subject || "").toLowerCase();
      const userName = (item.user?.name || "").toLowerCase();
      const userEmail = (item.user?.email || "").toLowerCase();
      const itemStatus = (item.status || "").toLowerCase();
      const category = (item.category || "").toLowerCase();
      const ticketIdStr = (item._id || "").toLowerCase();
      return (
        subject.includes(query) ||
        userName.includes(query) ||
        userEmail.includes(query) ||
        itemStatus.includes(query) ||
        category.includes(query) ||
        ticketIdStr.includes(query)
      );
    });
  }, [tickets, searchQuery]);

  const user = ticket?.user || {};
  const userName = user.name || "Unknown User";

  const fetchTickets = useCallback(async () => {
    if (!showTicketList) return;

    try {
      setTicketsLoading(true);
      const res = await API.get("/admin/support");
      const nextTickets = res.data.tickets || [];

      setTickets(nextTickets);
      setSelectedTicketId((currentId) => {
        if (currentId) return currentId;
        return nextTickets[0]?._id || "";
      });
    } catch (err) {
      console.error("Fetch Support Tickets Error:", err);
      setTickets([]);
    } finally {
      setTicketsLoading(false);
    }
  }, [showTicketList]);

  const fetchTicket = useCallback(async () => {
    if (!activeTicketId) {
      setLoading(false);
      setTicket(null);
      setMessages([]);
      setStatus("");
      setError(showTicketList ? "" : "Ticket id is missing");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await API.get(`/admin/support/${activeTicketId}`);
      const nextTicket = res.data.ticket || null;

      setTicket(nextTicket);
      setMessages(res.data.messages || []);
      setStatus(nextTicket?.status || "");
    } catch (err) {
      console.error("Fetch Support Ticket Error:", err);
      setError(
        err.response?.data?.message ||
          "Unable to load this support ticket"
      );
    } finally {
      setLoading(false);
    }
  }, [activeTicketId, showTicketList]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const timeline = useMemo(() => {
    return [...messages].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
  }, [messages]);

  const handleStatusChange = async (nextStatus) => {
    if (!activeTicketId || nextStatus === status) return;

    const previousStatus = status;
    setStatus(nextStatus);
    setSavingStatus(true);

    try {
      const res = await API.patch(
        `/admin/support/status/${activeTicketId}`,
        { status: nextStatus }
      );
      setTicket(res.data.ticket || { ...ticket, status: nextStatus });
    } catch (err) {
      console.error("Update Support Status Error:", err);
      setStatus(previousStatus);
      alert(err.response?.data?.message || "Status update failed");
    } finally {
      setSavingStatus(false);
    }
  };

  const handleReply = async (event) => {
    event.preventDefault();

    const trimmedReply = reply.trim();
    if (!activeTicketId || !trimmedReply) return;

    try {
      setSendingReply(true);
      await API.post(`/admin/support/reply/${activeTicketId}`, {
        message: trimmedReply,
      });
      setReply("");
      fetchTicket();
      fetchTickets();
    } catch (err) {
      console.error("Send Support Reply Error:", err);
      alert(err.response?.data?.message || "Reply failed");
    } finally {
      setSendingReply(false);
    }
  };

  const ticketList = showTicketList ? (
    <div className="support-ticket-list">
      <div className="support-ticket-list-head">
        <div>
          <h2>Tickets</h2>
          <p>
            {searchQuery.trim()
              ? `${filteredTickets.length} found`
              : `${tickets.length} total`}
          </p>
        </div>
        {ticketsLoading && <Loader2 className="spin" size={18} />}
      </div>

      {/* SEARCH BAR */}
      <div className="support-search-bar">
        <Search size={16} className="support-search-icon" />
        <input
          type="text"
          placeholder="Search tickets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="support-search-input"
        />
        {searchQuery && (
          <button
            type="button"
            className="support-search-clear"
            onClick={() => setSearchQuery("")}
            title="Clear search"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {filteredTickets.length === 0 ? (
        <div className="support-ticket-list-empty">
          <MessageSquare size={24} />
          <p>
            {searchQuery.trim()
              ? "No matching tickets found."
              : "No support tickets found."}
          </p>
        </div>
      ) : (
        <div className="support-ticket-items">
          {filteredTickets.map((item) => (
            <button
              className={`support-ticket-item ${
                item._id === activeTicketId ? "active" : ""
              }`}
              type="button"
              key={item._id}
              onClick={() => setSelectedTicketId(item._id)}
            >
              <span
                className={`support-status ${(
                  item.status || "OPEN"
                ).toLowerCase()}`}
              >
                {item.status || "OPEN"}
              </span>
              <strong>{item.subject}</strong>
              <small>
                {item.user?.name || "Unknown User"} ·{" "}
                {formatDate(item.createdAt)}
              </small>
            </button>
          ))}
        </div>
      )}
    </div>
  ) : null;

  if (loading) {
    return (
      <div className="support-details-page">
        <div className="support-state">
          <Loader2 className="spin" size={28} />
          <p>Loading support ticket...</p>
        </div>
      </div>
    );
  }

  if (showTicketList && !activeTicketId && !ticket) {
    return (
      <div className="support-details-page">
        <div className="support-details-header">
          <div className="support-title-block">
            <div className="support-kicker">
              <MessageSquare size={16} />
              Support
            </div>
            <h1>Support Tickets</h1>
            <p>Review and respond to user tickets</p>
          </div>
        </div>

        <div className="support-state with-list">
          {ticketList}
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="support-details-page">
        <div className="support-state">
          <MessageSquare size={30} />
          <h2>Support Ticket</h2>
          <p>{error || "Ticket not found"}</p>
          <button className="support-btn primary" onClick={fetchTicket}>
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="support-details-page">
      <div className="support-details-header">
        <button
          className="support-icon-btn"
          type="button"
          onClick={() => navigate(-1)}
          title="Back"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="support-title-block">
          <div className="support-kicker">
            <MessageSquare size={16} />
            Support Ticket
          </div>
          <h1>{ticket.subject}</h1>
          <p>Created {formatDate(ticket.createdAt)}</p>
        </div>

        <div className="support-header-actions">
          <button
            className="support-btn ghost"
            type="button"
            onClick={fetchTicket}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <label className="support-status-select">
            <span>Status</span>
            <select
              value={status}
              onChange={(event) => handleStatusChange(event.target.value)}
              disabled={savingStatus}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="support-details-grid">
        <section className="support-main-panel">
          <div className="support-thread-head">
            <div>
              <h2>Conversation</h2>
              <p>{timeline.length} messages</p>
            </div>
            <span className={`support-status ${status.toLowerCase()}`}>
              {savingStatus ? "Updating..." : status}
            </span>
          </div>

          <div className="support-thread">
            {timeline.length === 0 ? (
              <div className="support-empty-thread">
                <MessageSquare size={28} />
                <p>No messages found for this ticket.</p>
              </div>
            ) : (
              timeline.map((message) => {
                const isAdmin = message.senderType === "ADMIN";

                return (
                  <article
                    className={`support-message ${
                      isAdmin ? "admin" : "user"
                    }`}
                    key={message._id}
                  >
                    <div className="support-message-avatar">
                      {isAdmin ? "A" : getInitials(userName)}
                    </div>
                    <div className="support-message-body">
                      <div className="support-message-meta">
                        <span>{isAdmin ? "Admin" : userName}</span>
                        <time>{formatDate(message.createdAt)}</time>
                      </div>
                      <p>{message.message}</p>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <form className="support-reply-box" onSubmit={handleReply}>
            <label htmlFor="supportReply">Reply</label>
            <textarea
              id="supportReply"
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              placeholder="Write a response to the user"
              disabled={sendingReply || status === "CLOSED"}
              rows={5}
            />
            <div className="support-reply-actions">
              <span>
                {status === "CLOSED"
                  ? "Closed tickets cannot receive replies."
                  : "Replying will notify the user."}
              </span>
              <button
                className="support-btn primary"
                type="submit"
                disabled={
                  sendingReply || status === "CLOSED" || !reply.trim()
                }
              >
                {sendingReply ? (
                  <Loader2 className="spin" size={16} />
                ) : (
                  <Send size={16} />
                )}
                Send Reply
              </button>
            </div>
          </form>
        </section>

        <aside className="support-side-panel">
          {ticketList}

          <div className="support-user-card">
            <div className="support-user-avatar">{getInitials(userName)}</div>
            <div>
              <h2>{userName}</h2>
              <p>User Details</p>
            </div>
          </div>

          <div className="support-info-list">
            <div className="support-info-item">
              <Mail size={17} />
              <div>
                <span>Email</span>
                <strong>{user.email || "N/A"}</strong>
              </div>
            </div>

            <div className="support-info-item">
              <Phone size={17} />
              <div>
                <span>Phone</span>
                <strong>{user.phone || "N/A"}</strong>
              </div>
            </div>

            <div className="support-info-item">
              <Tag size={17} />
              <div>
                <span>Category</span>
                <strong>{ticket.category || "OTHER"}</strong>
              </div>
            </div>

            <div className="support-info-item">
              <Clock size={17} />
              <div>
                <span>Last Updated</span>
                <strong>{formatDate(ticket.updatedAt)}</strong>
              </div>
            </div>

            <div className="support-info-item">
              <User size={17} />
              <div>
                <span>Ticket ID</span>
                <strong className="mono">{ticket._id}</strong>
              </div>
            </div>
          </div>

          <div className="support-last-message">
            <span>Last Message</span>
            <p>{ticket.lastMessage || "No recent message"}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
