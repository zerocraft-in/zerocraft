"use client";

import { motion, useScroll, useTransform, AnimatePresence, type Easing } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  Zap,
  Target,
  Users,
  Lightbulb,
  CheckCircle2,
  User,
  Mail,
  Phone,
  Building,
  Briefcase,
  AlertCircle,
  Clock,
  DollarSign,
  FileCheck,
  Send,
  Home,
  FolderKanban,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";

const easeOut: Easing = [0.16, 1, 0.3, 1];

interface FormStep {
  id: number;
  title: string;
  description: string;
  fields: FormField[];
}

interface FormField {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "textarea" | "select" | "checkbox";
  required: boolean;
  placeholder?: string;
  options?: string[];
  icon?: React.ReactNode;
}

const CreateProjectOnboarding = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, string | boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 150]);

  const steps: FormStep[] = [
    {
      id: 1,
      title: "Contact Details & Client Info",
      description: "Please provide your contact information so our team can reach you",
      fields: [
        {
          name: "fullName",
          label: "Full Name",
          type: "text",
          required: true,
          placeholder: "e.g. Alex Morgan",
          icon: <User size={16} />,
        },
        {
          name: "email",
          label: "Email Address",
          type: "email",
          required: true,
          placeholder: "alex@company.com",
          icon: <Mail size={16} />,
        },
        {
          name: "phone",
          label: "Phone Number",
          type: "tel",
          required: true,
          placeholder: "+1 (555) 000-0000",
          icon: <Phone size={16} />,
        },
        {
          name: "company",
          label: "Company / Organization",
          type: "text",
          required: false,
          placeholder: "Acme Studios (Optional)",
          icon: <Building size={16} />,
        },
      ],
    },
    {
      id: 2,
      title: "Project Vision & Scope",
      description: "Tell us about what you're planning to build",
      fields: [
        {
          name: "projectName",
          label: "Project Name",
          type: "text",
          required: true,
          placeholder: "Enter project name or working title",
        },
        {
          name: "category",
          label: "Project Category",
          type: "select",
          required: true,
          options: [
            "Web App",
            "Mobile App",
            "Brand Identity",
            "UI/UX System",
            "AI / 3D Experience",
            "E-Commerce",
            "Other",
          ],
        },
        {
          name: "description",
          label: "Project Description & Objectives",
          type: "textarea",
          required: true,
          placeholder: "Describe your project vision, target goals, and key deliverables...",
        },
      ],
    },
    {
      id: 3,
      title: "Target Audience & Core Requirements",
      description: "Help us understand who we're designing and building for",
      fields: [
        {
          name: "audience",
          label: "Target Audience",
          type: "textarea",
          required: true,
          placeholder: "Who are your primary users, customers, or key stakeholders?",
        },
        {
          name: "problems",
          label: "Key Problems to Solve",
          type: "textarea",
          required: true,
          placeholder: "What main challenges or features should this project address?",
        },
      ],
    },
    {
      id: 4,
      title: "Timeline, Budget & Final Details",
      description: "Aligning on timelines, resources, and special requests",
      fields: [
        {
          name: "timeline",
          label: "Target Timeline",
          type: "select",
          required: true,
          options: ["Urgent (< 1 month)", "1-3 months", "3-6 months", "6+ months"],
        },
        {
          name: "budget",
          label: "Estimated Budget Range",
          type: "select",
          required: true,
          options: ["$5K - $10K", "$10K - $25K", "$25K - $50K", "$50K+"],
        },
        {
          name: "preferredServices",
          label: "Primary Services Required",
          type: "textarea",
          required: false,
          placeholder: "UI/UX Design, Web Development, Branding, Mobile, Strategy...",
        },
        {
          name: "additionalNotes",
          label: "Additional Notes or Design Links",
          type: "textarea",
          required: false,
          placeholder: "Inspirations, existing pitch decks, or tech requirements...",
        },
      ],
    },
  ];

  const handleInputChange = (name: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear field error when user types
    if (errors[name]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const validateStep = (stepIdx: number): boolean => {
    const currentFields = steps[stepIdx].fields;
    const newErrors: Record<string, string> = {};

    currentFields.forEach((field) => {
      const val = formData[field.name];

      if (field.required) {
        if (!val || (typeof val === "string" && val.trim() === "")) {
          newErrors[field.name] = `${field.label} is required`;
        }
      }

      // Email format check
      if (field.type === "email" && val && typeof val === "string") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val.trim())) {
          newErrors[field.name] = "Please enter a valid email address";
        }
      }

      // Phone format check
      if (field.type === "tel" && val && typeof val === "string") {
        const phoneCleaned = val.replace(/\D/g, "");
        if (phoneCleaned.length < 7) {
          newErrors[field.name] = "Please enter a valid phone number";
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
        window.scrollTo({ top: 300, behavior: "smooth" });
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (targetIndex: number) => {
    // Only allow going back or to next step if current is valid
    if (targetIndex < currentStep) {
      setCurrentStep(targetIndex);
    } else if (targetIndex === currentStep + 1) {
      handleNext();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep(currentStep)) {
      setIsSubmitted(true);
      window.scrollTo({ top: 150, behavior: "smooth" });
    }
  };

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="create-project-page">
      {/* Animated background elements */}
      <motion.div
        className="create-project-bg-blob create-project-blob-1"
        animate={{ y: [0, 30, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="create-project-bg-blob create-project-blob-2"
        animate={{ y: [0, -30, 0] }}
        transition={{ duration: 10, repeat: Infinity }}
      />

      {/* Header with parallax */}
      <header className="create-project-header">
        <div className="create-project-header-content">
          <motion.div style={{ y }} className="create-project-header-inner">
            <h1 className="create-project-header-title">
              Start Your <span className="text-accent">Project Journey</span>
            </h1>
            <p className="create-project-header-subtitle">
              Tell us about your product vision and client contact details to get a customized proposal
            </p>
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="create-project-main">
        <div className="create-project-container">
          {isSubmitted ? (
            /* Submission Success State Card */
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="create-project-success-card"
            >
              <div className="success-icon-badge">
                <CheckCircle2 size={48} />
              </div>
              <h2 className="success-title">Project Request Submitted!</h2>
              <p className="success-subtitle">
                Thank you <strong className="text-accent">{formData.fullName as string}</strong>! We have received your project details and sent a confirmation to <strong>{formData.email as string}</strong>.
              </p>

              <div className="success-summary-box">
                <h4 className="summary-title">Summary of Request</h4>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span className="summary-label">Client Name</span>
                    <span className="summary-value">{formData.fullName as string}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Email</span>
                    <span className="summary-value">{formData.email as string}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Phone</span>
                    <span className="summary-value">{formData.phone as string}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Project Name</span>
                    <span className="summary-value">{formData.projectName as string}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Category</span>
                    <span className="summary-value">{formData.category as string}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Budget & Timeline</span>
                    <span className="summary-value">
                      {formData.budget as string} • {formData.timeline as string}
                    </span>
                  </div>
                </div>
              </div>

              <p className="success-next-steps">
                Our Senior Technical Producer will review your submission and contact you within <strong>24 business hours</strong>.
              </p>

              <div className="success-actions">
                <Link href="/works" className="create-project-btn create-project-btn-primary">
                  <FolderKanban size={18} />
                  <span>Explore Works</span>
                </Link>
                <Link href="/" className="create-project-btn create-project-btn-secondary">
                  <Home size={18} />
                  <span>Return to Home</span>
                </Link>
              </div>
            </motion.div>
          ) : (
            /* Multi-Step Onboarding Form */
            <div className="create-project-layout">
              {/* Progress Sidebar */}
              <aside className="create-project-sidebar">
                <div className="create-project-progress-card">
                  <div className="create-project-progress-text">
                    <span className="create-project-step-counter">
                      Step {currentStep + 1} of {steps.length}
                    </span>
                    <h3 className="create-project-progress-title">{step.title}</h3>
                  </div>
                  <div className="create-project-progress-bar-wrapper">
                    <div className="create-project-progress-bar">
                      <motion.div
                        className="create-project-progress-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </div>
                    <span className="create-project-progress-percentage">
                      {Math.round(progress)}%
                    </span>
                  </div>
                </div>

                {/* Navigation Steps List */}
                <div className="create-project-steps-list">
                  {steps.map((s, index) => (
                    <motion.button
                      key={s.id}
                      onClick={() => handleStepClick(index)}
                      className={`create-project-step-item ${
                        index === currentStep ? "active" : ""
                      } ${index < currentStep ? "completed" : ""}`}
                      whileHover={{ x: 6 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="create-project-step-icon">
                        {index < currentStep ? (
                          <CheckCircle2 size={18} />
                        ) : (
                          <span>{index + 1}</span>
                        )}
                      </div>
                      <span className="create-project-step-label">{s.title}</span>
                    </motion.button>
                  ))}
                </div>
              </aside>

              {/* Form Content Panel */}
              <section className="create-project-form-section">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4 }}
                  className="create-project-form-content"
                >
                  <div className="create-project-form-header">
                    <h2 className="create-project-form-title">{step.title}</h2>
                    <p className="create-project-form-description">{step.description}</p>
                  </div>

                  {/* Form Fields */}
                  <form className="create-project-form" onSubmit={handleSubmit}>
                    {step.fields.map((field) => {
                      const hasError = !!errors[field.name];

                      return (
                        <motion.div
                          key={field.name}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className={`create-project-form-group ${hasError ? "has-error" : ""}`}
                        >
                          <label htmlFor={field.name} className="create-project-label">
                            <span>{field.label}</span>
                            {field.required && (
                              <span className="create-project-required">*</span>
                            )}
                          </label>

                          <div className="input-field-wrapper">
                            {field.type === "textarea" && (
                              <textarea
                                id={field.name}
                                name={field.name}
                                placeholder={field.placeholder}
                                value={(formData[field.name] as string) || ""}
                                onChange={(e) =>
                                  handleInputChange(field.name, e.target.value)
                                }
                                className="create-project-textarea"
                                rows={4}
                              />
                            )}

                            {field.type === "select" && (
                              <select
                                id={field.name}
                                name={field.name}
                                value={(formData[field.name] as string) || ""}
                                onChange={(e) =>
                                  handleInputChange(field.name, e.target.value)
                                }
                                className="create-project-select"
                              >
                                <option value="">Select an option...</option>
                                {field.options?.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            )}

                            {(field.type === "text" ||
                              field.type === "email" ||
                              field.type === "tel") && (
                              <div className="input-with-icon">
                                {field.icon && (
                                  <span className="field-icon">{field.icon}</span>
                                )}
                                <input
                                  id={field.name}
                                  type={field.type}
                                  name={field.name}
                                  placeholder={field.placeholder}
                                  value={(formData[field.name] as string) || ""}
                                  onChange={(e) =>
                                    handleInputChange(field.name, e.target.value)
                                  }
                                  className="create-project-input"
                                />
                              </div>
                            )}
                          </div>

                          {hasError && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="field-error-msg"
                            >
                              <AlertCircle size={14} />
                              <span>{errors[field.name]}</span>
                            </motion.div>
                          )}
                        </motion.div>
                      );
                    })}

                    {/* Action Buttons */}
                    <div className="create-project-form-actions">
                      {currentStep > 0 && (
                        <button
                          type="button"
                          onClick={handlePrev}
                          className="create-project-btn create-project-btn-secondary"
                        >
                          ← Previous
                        </button>
                      )}

                      {currentStep < steps.length - 1 ? (
                        <button
                          type="button"
                          onClick={handleNext}
                          className="create-project-btn create-project-btn-primary"
                        >
                          <span>Next Step</span>
                          <ArrowRight size={18} />
                        </button>
                      ) : (
                        <button
                          type="submit"
                          className="create-project-btn create-project-btn-primary"
                        >
                          <span>Submit Project Request</span>
                          <Sparkles size={18} />
                        </button>
                      )}
                    </div>
                  </form>
                </motion.div>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CreateProjectOnboarding;
