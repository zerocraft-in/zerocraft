"use client";

import { motion, useScroll, useTransform, type Easing } from "framer-motion";
import {
  Mail,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  Upload,
  FileText,
  User,
  Briefcase,
  Phone,
  Calendar,
  ArrowRight,
  X,
} from "lucide-react";
import { useState } from "react";

const easeOut: Easing = [0.16, 1, 0.3, 1];

interface Application {
  id: string;
  name: string;
  email: string;
  position: string;
  appliedDate: string;
  status: "pending" | "reviewed" | "accepted" | "rejected";
  resume: string;
  coverLetter: string;
  phone: string;
}

const GmailApplicationPortal = () => {
  const [applications, setApplications] = useState<Application[]>([
    {
      id: "1",
      name: "John Doe",
      email: "john@example.com",
      position: "Senior Product Designer",
      appliedDate: "2024-05-08",
      status: "reviewed",
      resume: "resume-john.pdf",
      coverLetter: "cover-letter-john.pdf",
      phone: "+1 (555) 123-4567",
    },
    {
      id: "2",
      name: "Jane Smith",
      email: "jane@example.com",
      position: "Full-Stack Developer",
      appliedDate: "2024-05-07",
      status: "pending",
      resume: "resume-jane.pdf",
      coverLetter: "cover-letter-jane.pdf",
      phone: "+1 (555) 987-6543",
    },
  ]);

  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailContent, setEmailContent] = useState("");
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 100]);

  const statusColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    pending: {
      bg: "rgba(221, 247, 48, 0.15)",
      text: "var(--app-accent)",
      icon: <Clock size={16} />,
    },
    reviewed: {
      bg: "rgba(100, 200, 255, 0.15)",
      text: "#64c8ff",
      icon: <FileText size={16} />,
    },
    accepted: {
      bg: "rgba(76, 200, 100, 0.15)",
      text: "#4cc864",
      icon: <CheckCircle size={16} />,
    },
    rejected: {
      bg: "rgba(255, 100, 100, 0.15)",
      text: "#ff6464",
      icon: <AlertCircle size={16} />,
    },
  };

  const handleSendEmail = () => {
    if (selectedApp && emailContent.trim()) {
      console.log(`Sending email to ${selectedApp.email}:`, emailContent);
      alert(`Email sent to ${selectedApp.email}`);
      setEmailContent("");
      setShowEmailModal(false);
    }
  };

  const updateApplicationStatus = (appId: string, newStatus: Application["status"]) => {
    setApplications(
      applications.map((app) =>
        app.id === appId ? { ...app, status: newStatus } : app
      )
    );
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: easeOut },
    },
  };

  return (
    <div className="gmail-portal-page">
      {/* Animated background */}
      <div className="gmail-portal-bg">
        <motion.div
          className="gmail-portal-blob gmail-portal-blob-1"
          animate={{ y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="gmail-portal-blob gmail-portal-blob-2"
          animate={{ y: [0, -30, 0] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      {/* Header */}
      <header className="gmail-portal-header">
        <motion.div style={{ y }} className="gmail-portal-header-content">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="gmail-portal-badge">
              <Mail size={18} />
              <span>Application Portal</span>
            </div>
            <h1 className="gmail-portal-title">
              Manage <span className="text-accent">Applications</span>
            </h1>
            <p className="gmail-portal-subtitle">
              Review and communicate with candidates seamlessly
            </p>
          </motion.div>
        </motion.div>
      </header>

      {/* Main content */}
      <main className="gmail-portal-main">
        <div className="gmail-portal-container">
          <div className="gmail-portal-layout">
            {/* Applications list */}
            <section className="gmail-portal-list-section">
              <div className="gmail-portal-list-header">
                <h2 className="gmail-portal-section-title">
                  Applications ({applications.length})
                </h2>
                <div className="gmail-portal-list-stats">
                  <span className="gmail-portal-stat">
                    Pending: {applications.filter((a) => a.status === "pending").length}
                  </span>
                  <span className="gmail-portal-stat">
                    Reviewed: {applications.filter((a) => a.status === "reviewed").length}
                  </span>
                </div>
              </div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="gmail-portal-list"
              >
                {applications.map((app) => {
                  const statusInfo = statusColors[app.status];
                  return (
                    <motion.button
                      key={app.id}
                      variants={itemVariants}
                      onClick={() => setSelectedApp(app)}
                      className={`gmail-portal-app-card ${
                        selectedApp?.id === app.id ? "active" : ""
                      }`}
                      whileHover={{ x: 8 }}
                    >
                      <div className="gmail-portal-app-header">
                        <div className="gmail-portal-app-avatar">
                          {app.name.charAt(0)}
                        </div>
                        <div className="gmail-portal-app-info">
                          <h3 className="gmail-portal-app-name">{app.name}</h3>
                          <p className="gmail-portal-app-position">{app.position}</p>
                        </div>
                        <span
                          className="gmail-portal-status"
                          style={{
                            background: statusInfo.bg,
                            color: statusInfo.text,
                          }}
                        >
                          {statusInfo.icon}
                          {app.status}
                        </span>
                      </div>

                      <div className="gmail-portal-app-meta">
                        <span className="gmail-portal-meta-item">
                          <Mail size={14} /> {app.email}
                        </span>
                        <span className="gmail-portal-meta-item">
                          <Calendar size={14} />{" "}
                          {new Date(app.appliedDate).toLocaleDateString()}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            </section>

            {/* Application detail */}
            {selectedApp && (
              <motion.section
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="gmail-portal-detail-section"
              >
                <div className="gmail-portal-detail-header">
                  <div>
                    <h2 className="gmail-portal-detail-title">
                      {selectedApp.name}
                    </h2>
                    <p className="gmail-portal-detail-position">
                      {selectedApp.position}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedApp(null)}
                    className="gmail-portal-close-btn"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Applicant info */}
                <div className="gmail-portal-detail-section-content">
                  <div className="gmail-portal-info-group">
                    <h3 className="gmail-portal-info-title">Contact Information</h3>
                    <div className="gmail-portal-info-items">
                      <div className="gmail-portal-info-item">
                        <Mail size={18} />
                        <div>
                          <span className="gmail-portal-info-label">Email</span>
                          <a
                            href={`mailto:${selectedApp.email}`}
                            className="gmail-portal-info-value"
                          >
                            {selectedApp.email}
                          </a>
                        </div>
                      </div>
                      <div className="gmail-portal-info-item">
                        <Phone size={18} />
                        <div>
                          <span className="gmail-portal-info-label">Phone</span>
                          <p className="gmail-portal-info-value">
                            {selectedApp.phone}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Documents */}
                  <div className="gmail-portal-info-group">
                    <h3 className="gmail-portal-info-title">Documents</h3>
                    <div className="gmail-portal-documents">
                      <motion.a
                        href={`/files/${selectedApp.resume}`}
                        className="gmail-portal-doc-item"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <FileText size={20} />
                        <span>Resume</span>
                        <ArrowRight size={16} />
                      </motion.a>
                      <motion.a
                        href={`/files/${selectedApp.coverLetter}`}
                        className="gmail-portal-doc-item"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <FileText size={20} />
                        <span>Cover Letter</span>
                        <ArrowRight size={16} />
                      </motion.a>
                    </div>
                  </div>

                  {/* Status actions */}
                  <div className="gmail-portal-info-group">
                    <h3 className="gmail-portal-info-title">Application Status</h3>
                    <div className="gmail-portal-status-buttons">
                      {(["pending", "reviewed", "accepted", "rejected"] as const).map(
                        (status) => (
                          <motion.button
                            key={status}
                            onClick={() => updateApplicationStatus(selectedApp.id, status)}
                            className={`gmail-portal-status-btn ${
                              selectedApp.status === status ? "active" : ""
                            }`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {statusColors[status].icon}
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </motion.button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Email action */}
                  <motion.button
                    onClick={() => setShowEmailModal(true)}
                    className="gmail-portal-email-btn"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Send size={20} />
                    Send Email
                  </motion.button>
                </div>
              </motion.section>
            )}
          </div>
        </div>
      </main>

      {/* Email modal */}
      {showEmailModal && selectedApp && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="gmail-portal-modal-overlay"
          onClick={() => setShowEmailModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="gmail-portal-modal"
          >
            <div className="gmail-portal-modal-header">
              <h3>Send Email to {selectedApp.name}</h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="gmail-portal-modal-close"
              >
                <X size={24} />
              </button>
            </div>

            <div className="gmail-portal-modal-content">
              <div className="gmail-portal-form-group">
                <label>To:</label>
                <input
                  type="email"
                  value={selectedApp.email}
                  disabled
                  className="gmail-portal-modal-input"
                />
              </div>

              <div className="gmail-portal-form-group">
                <label>Message:</label>
                <textarea
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  placeholder="Type your message here..."
                  className="gmail-portal-modal-textarea"
                  rows={8}
                />
              </div>

              <div className="gmail-portal-modal-actions">
                <motion.button
                  onClick={() => setShowEmailModal(false)}
                  className="gmail-portal-modal-btn gmail-portal-modal-btn-secondary"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={handleSendEmail}
                  className="gmail-portal-modal-btn gmail-portal-modal-btn-primary"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Send size={18} />
                  Send Email
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default GmailApplicationPortal;
