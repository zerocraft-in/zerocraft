"use client";

import { motion, useScroll, useTransform, type Easing } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  Zap,
  Target,
  Users,
  Lightbulb,
  CheckCircle2,
} from "lucide-react";
import { useState } from "react";

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
  type: "text" | "textarea" | "select" | "checkbox";
  required: boolean;
  placeholder?: string;
  options?: string[];
}

const CreateProjectOnboarding = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, string | boolean>>({});
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 150]);

  const steps: FormStep[] = [
    {
      id: 1,
      title: "Tell us about your vision",
      description: "Let's understand your project goals and objectives",
      fields: [
        {
          name: "projectName",
          label: "Project Name",
          type: "text",
          required: true,
          placeholder: "Enter your project name",
        },
        {
          name: "category",
          label: "Project Category",
          type: "select",
          required: true,
          options: ["Web App", "Mobile App", "Brand Identity", "E-Commerce", "Other"],
        },
        {
          name: "description",
          label: "Project Description",
          type: "textarea",
          required: true,
          placeholder: "Describe your project vision...",
        },
      ],
    },
    {
      id: 2,
      title: "Define your target audience",
      description: "Who are we building this for?",
      fields: [
        {
          name: "audience",
          label: "Target Audience",
          type: "textarea",
          required: true,
          placeholder: "Describe your target users...",
        },
        {
          name: "problems",
          label: "Main Problems to Solve",
          type: "textarea",
          required: true,
          placeholder: "What problems does your project solve?",
        },
      ],
    },
    {
      id: 3,
      title: "Project timeline & budget",
      description: "Let's align on timelines and resources",
      fields: [
        {
          name: "timeline",
          label: "Project Timeline",
          type: "select",
          required: true,
          options: ["1-3 months", "3-6 months", "6-12 months", "12+ months"],
        },
        {
          name: "budget",
          label: "Budget Range",
          type: "select",
          required: true,
          options: ["$5K-$10K", "$10K-$25K", "$25K-$50K", "$50K+"],
        },
        {
          name: "budget_flexibility",
          label: "Budget is flexible",
          type: "checkbox",
          required: false,
        },
      ],
    },
    {
      id: 4,
      title: "Additional details",
      description: "Final touches to get started",
      fields: [
        {
          name: "preferredServices",
          label: "Preferred Services",
          type: "textarea",
          required: true,
          placeholder: "Design, Development, Strategy, etc.",
        },
        {
          name: "additionalNotes",
          label: "Additional Notes",
          type: "textarea",
          required: false,
          placeholder: "Anything else we should know?",
        },
      ],
    },
  ];

  const handleInputChange = (name: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    console.log("Form submitted:", formData);
    alert("Project created! We'll contact you soon.");
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
      <motion.div
        className="create-project-bg-blob create-project-blob-3"
        animate={{ y: [0, 20, 0] }}
        transition={{ duration: 12, repeat: Infinity }}
      />

      {/* Header with parallax */}
      <header className="create-project-header">
        <div className="create-project-header-content">
          <motion.div
            style={{ y }}
            className="create-project-header-inner"
          >
            <h1 className="create-project-header-title">
              Let's Create <span className="text-accent">Your Project</span>
            </h1>
            <p className="create-project-header-subtitle">
              Join us on a journey to bring your vision to life
            </p>
          </motion.div>
        </div>
      </header>

      {/* Main content */}
      <main className="create-project-main">
        <div className="create-project-container">
          <div className="create-project-layout">
            {/* Progress sidebar */}
            <aside className="create-project-sidebar">
              <div className="create-project-progress-card">
                <div className="create-project-progress-text">
                  <span className="create-project-step-counter">
                    Step {currentStep + 1} of {steps.length}
                  </span>
                  <h3 className="create-project-progress-title">
                    {step.title}
                  </h3>
                </div>
                <div className="create-project-progress-bar-wrapper">
                  <div className="create-project-progress-bar">
                    <motion.div
                      className="create-project-progress-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                  <span className="create-project-progress-percentage">
                    {Math.round(progress)}%
                  </span>
                </div>
              </div>

              {/* Steps list */}
              <div className="create-project-steps-list">
                {steps.map((s, index) => (
                  <motion.button
                    key={s.id}
                    onClick={() => setCurrentStep(index)}
                    className={`create-project-step-item ${
                      index === currentStep ? "active" : ""
                    } ${index < currentStep ? "completed" : ""}`}
                    whileHover={{ x: 8 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="create-project-step-icon">
                      {index < currentStep ? (
                        <CheckCircle2 size={20} />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                    <span className="create-project-step-label">{s.title}</span>
                  </motion.button>
                ))}
              </div>
            </aside>

            {/* Form content */}
            <section className="create-project-form-section">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="create-project-form-content"
              >
                <div className="create-project-form-header">
                  <h2 className="create-project-form-title">{step.title}</h2>
                  <p className="create-project-form-description">
                    {step.description}
                  </p>
                </div>

                {/* Form fields */}
                <form className="create-project-form">
                  {step.fields.map((field) => (
                    <motion.div
                      key={field.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="create-project-form-group"
                    >
                      <label htmlFor={field.name} className="create-project-label">
                        {field.label}
                        {field.required && (
                          <span className="create-project-required">*</span>
                        )}
                      </label>

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

                      {field.type === "text" && (
                        <input
                          id={field.name}
                          type="text"
                          name={field.name}
                          placeholder={field.placeholder}
                          value={(formData[field.name] as string) || ""}
                          onChange={(e) =>
                            handleInputChange(field.name, e.target.value)
                          }
                          className="create-project-input"
                        />
                      )}

                      {field.type === "checkbox" && (
                        <label className="create-project-checkbox-label">
                          <input
                            type="checkbox"
                            name={field.name}
                            checked={(formData[field.name] as boolean) || false}
                            onChange={(e) =>
                              handleInputChange(field.name, e.target.checked)
                            }
                            className="create-project-checkbox"
                          />
                          <span>{field.label}</span>
                        </label>
                      )}
                    </motion.div>
                  ))}
                </form>

                {/* Action buttons */}
                <div className="create-project-form-actions">
                  {currentStep > 0 && (
                    <motion.button
                      onClick={handlePrev}
                      className="create-project-btn create-project-btn-secondary"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      ← Previous
                    </motion.button>
                  )}

                  {currentStep < steps.length - 1 ? (
                    <motion.button
                      onClick={handleNext}
                      className="create-project-btn create-project-btn-primary"
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Next <ArrowRight size={18} />
                    </motion.button>
                  ) : (
                    <motion.button
                      onClick={handleSubmit}
                      className="create-project-btn create-project-btn-primary"
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Submit Project <Sparkles size={18} />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateProjectOnboarding;
