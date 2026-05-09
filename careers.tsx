"use client";

import { motion, useScroll, useTransform, type Easing } from "framer-motion";
import {
  Users,
  Briefcase,
  MapPin,
  Clock,
  ArrowRight,
  Heart,
  Zap,
  Globe,
  Search,
} from "lucide-react";
import { useState } from "react";

const easeOut: Easing = [0.16, 1, 0.3, 1];

interface JobListing {
  id: number;
  title: string;
  department: string;
  location: string;
  type: "Full-time" | "Part-time" | "Contract";
  experience: string;
  description: string;
  requirements: string[];
  salary: string;
}

const CareersPage = () => {
  const [selectedJob, setSelectedJob] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState("All");
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 100]);

  const jobs: JobListing[] = [
    {
      id: 1,
      title: "Senior Product Designer",
      department: "Design",
      location: "Remote",
      type: "Full-time",
      experience: "5+ years",
      description:
        "Lead design for our upcoming product suite. Shape the future of digital experiences.",
      requirements: [
        "Expertise in Figma and design systems",
        "Strong portfolio of digital products",
        "Experience with design thinking",
        "Excellent communication skills",
      ],
      salary: "$120K - $150K",
    },
    {
      id: 2,
      title: "Full-Stack Developer",
      department: "Engineering",
      location: "Remote",
      type: "Full-time",
      experience: "3+ years",
      description:
        "Build scalable web applications using modern technologies and best practices.",
      requirements: [
        "Proficiency in React/Next.js",
        "Strong backend knowledge (Node.js/Python)",
        "Database design experience",
        "Git and CI/CD familiarity",
      ],
      salary: "$110K - $140K",
    },
    {
      id: 3,
      title: "UX Researcher",
      department: "Research",
      location: "Remote",
      type: "Full-time",
      experience: "2+ years",
      description:
        "Conduct user research to inform product decisions and drive innovation.",
      requirements: [
        "Experience with user research methods",
        "Data analysis skills",
        "Excellent documentation",
        "Stakeholder management",
      ],
      salary: "$80K - $110K",
    },
    {
      id: 4,
      title: "Frontend Engineer",
      department: "Engineering",
      location: "Remote",
      type: "Full-time",
      experience: "2+ years",
      description:
        "Create beautiful, performant user interfaces using modern JavaScript frameworks.",
      requirements: [
        "JavaScript/TypeScript expertise",
        "React or Vue experience",
        "CSS/SCSS knowledge",
        "Performance optimization",
      ],
      salary: "$90K - $120K",
    },
    {
      id: 5,
      title: "Product Manager",
      department: "Product",
      location: "Remote",
      type: "Full-time",
      experience: "4+ years",
      description:
        "Own product strategy and roadmap. Work cross-functionally to deliver impact.",
      requirements: [
        "Product management experience",
        "Analytical thinking",
        "Leadership skills",
        "Data-driven decision making",
      ],
      salary: "$130K - $160K",
    },
    {
      id: 6,
      title: "Marketing Specialist",
      department: "Marketing",
      location: "Hybrid",
      type: "Full-time",
      experience: "1+ years",
      description:
        "Drive growth through strategic marketing campaigns and content creation.",
      requirements: [
        "Content creation skills",
        "Social media expertise",
        "Analytics understanding",
        "Creative thinking",
      ],
      salary: "$60K - $85K",
    },
  ];

  const departments = ["All", "Design", "Engineering", "Product", "Research", "Marketing"];
  const filteredJobs = jobs.filter((job) => {
    const matchSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDept = filterDept === "All" || job.department === filterDept;
    return matchSearch && matchDept;
  });

  const benefits = [
    {
      icon: <Heart size={24} />,
      title: "Health & Wellness",
      description: "Comprehensive health insurance and wellness programs",
    },
    {
      icon: <Zap size={24} />,
      title: "Learning & Development",
      description: "Budget for courses, conferences, and skill development",
    },
    {
      icon: <Globe size={24} />,
      title: "Remote First",
      description: "Work from anywhere in the world with flexible hours",
    },
    {
      icon: <Users size={24} />,
      title: "Collaborative Culture",
      description: "Work with talented, passionate team members",
    },
  ];

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
    <div className="careers-page">
      {/* Animated background */}
      <div className="careers-bg">
        <motion.div
          className="careers-blob careers-blob-1"
          animate={{ y: [0, 40, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="careers-blob careers-blob-2"
          animate={{ y: [0, -40, 0] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      {/* Hero */}
      <header className="careers-hero">
        <motion.div style={{ y }} className="careers-hero-content">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="careers-badge">
              <Users size={18} />
              <span>We're Hiring</span>
            </div>
            <h1 className="careers-title">
              Join Our <span className="text-accent">Creative Team</span>
            </h1>
            <p className="careers-subtitle">
              Help us build the future of digital design and development
            </p>
          </motion.div>
        </motion.div>
      </header>

      {/* Benefits Section */}
      <section className="careers-benefits">
        <div className="careers-container">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="careers-section-title"
          >
            Why Join Us?
          </motion.h2>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="careers-benefits-grid"
          >
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="careers-benefit-card"
              >
                <div className="careers-benefit-icon">{benefit.icon}</div>
                <h3 className="careers-benefit-title">{benefit.title}</h3>
                <p className="careers-benefit-description">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Jobs Section */}
      <section className="careers-jobs">
        <div className="careers-container">
          <div className="careers-jobs-header">
            <h2 className="careers-section-title">Open Positions</h2>
            <p className="careers-jobs-count">
              {filteredJobs.length} position{filteredJobs.length !== 1 ? "s" : ""} available
            </p>
          </div>

          {/* Search and filters */}
          <div className="careers-controls">
            <div className="careers-search">
              <Search size={20} />
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="careers-search-input"
              />
            </div>

            <div className="careers-filters">
              {departments.map((dept) => (
                <motion.button
                  key={dept}
                  onClick={() => setFilterDept(dept)}
                  className={`careers-filter-btn ${
                    filterDept === dept ? "active" : ""
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {dept}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Jobs list and detail */}
          <div className="careers-jobs-layout">
            {/* Jobs list */}
            <motion.div
              className="careers-jobs-list"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {filteredJobs.map((job, index) => (
                <motion.button
                  key={job.id}
                  variants={itemVariants}
                  onClick={() => setSelectedJob(job.id)}
                  className={`careers-job-card ${
                    selectedJob === job.id ? "active" : ""
                  }`}
                  whileHover={{ x: 8 }}
                >
                  <div className="careers-job-header">
                    <h3 className="careers-job-title">{job.title}</h3>
                    <span className="careers-job-type">{job.type}</span>
                  </div>

                  <div className="careers-job-meta">
                    <div className="careers-job-meta-item">
                      <Briefcase size={16} />
                      {job.department}
                    </div>
                    <div className="careers-job-meta-item">
                      <MapPin size={16} />
                      {job.location}
                    </div>
                    <div className="careers-job-meta-item">
                      <Clock size={16} />
                      {job.experience}
                    </div>
                  </div>

                  <p className="careers-job-description">{job.description}</p>
                </motion.button>
              ))}
            </motion.div>

            {/* Job detail */}
            {selectedJob && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="careers-job-detail"
              >
                {filteredJobs.find((j) => j.id === selectedJob) && (
                  <div className="careers-job-detail-content">
                    {(() => {
                      const job = filteredJobs.find((j) => j.id === selectedJob)!;
                      return (
                        <>
                          <div className="careers-detail-header">
                            <div>
                              <h3 className="careers-detail-title">
                                {job.title}
                              </h3>
                              <div className="careers-detail-meta">
                                <span>{job.department}</span>
                                <span>{job.location}</span>
                                <span>{job.salary}</span>
                              </div>
                            </div>
                            <span className="careers-detail-type">
                              {job.type}
                            </span>
                          </div>

                          <div className="careers-detail-section">
                            <h4>About the Role</h4>
                            <p>{job.description}</p>
                          </div>

                          <div className="careers-detail-section">
                            <h4>Requirements</h4>
                            <ul className="careers-requirements-list">
                              {job.requirements.map((req, i) => (
                                <li key={i}>
                                  <CheckCircle size={18} />
                                  {req}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <motion.button
                            className="careers-apply-btn"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            Apply Now
                            <ArrowRight size={18} />
                          </motion.button>
                        </>
                      );
                    })()}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

// Add missing CheckCircle import at the top
import { CheckCircle } from "lucide-react";

export default CareersPage;
