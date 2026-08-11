import React from "react";
import HomeLayout from "../../components/layout/HomeLayout";
import { Scale, AlertTriangle, FileText, UserCheck, ShieldCheck } from "lucide-react";

const Terms = () => {
  const sectionStyle = {
    background: 'var(--profile-card-bg, rgba(255, 255, 255, 0.02))',
    border: '1px solid var(--profile-border, rgba(255, 255, 255, 0.06))',
    borderRadius: '16px',
    padding: '28px 32px',
    marginBottom: '20px'
  };

  const headingStyle = {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--profile-text-primary, white)',
    margin: '0 0 12px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  };

  const textStyle = {
    color: 'var(--profile-text-secondary, #cbd5e1)',
    fontSize: '15px',
    lineHeight: '1.8',
    margin: 0
  };

  return (
    <HomeLayout>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '60px 24px 80px'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2))',
            marginBottom: '20px'
          }}>
            <Scale size={28} color="#a855f7" />
          </div>
          <h1 style={{
            fontSize: '36px',
            fontWeight: '700',
            color: 'var(--profile-text-primary, white)',
            margin: '0 0 12px',
            fontFamily: 'var(--font-serif)'
          }}>
            Terms of Service
          </h1>
          <p style={{ color: 'var(--profile-text-secondary, #94a3b8)', fontSize: '14px' }}>Last updated: July 2026</p>
        </div>

        {/* Sections */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>
            <FileText size={20} color="#a855f7" /> 1. Acceptance of Terms
          </h2>
          <p style={textStyle}>
            By accessing and using ComiVerse, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform. These terms apply to all visitors, users, and others who access or use the service.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>
            <UserCheck size={20} color="#ec4899" /> 2. User Accounts
          </h2>
          <p style={textStyle}>
            When you create an account with us, you must provide accurate and complete information. You are responsible for safeguarding your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use. ComiVerse reserves the right to suspend or terminate accounts that violate these terms.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>
            <ShieldCheck size={20} color="#10b981" /> 3. Content Guidelines
          </h2>
          <p style={textStyle}>
            Users may upload, publish, and share content on ComiVerse. You retain ownership of your original content, but by posting, you grant ComiVerse a non-exclusive license to display, distribute, and promote your content on the platform. Content must not violate any intellectual property rights, contain illegal material, or include offensive, harmful, or misleading content.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>
            <AlertTriangle size={20} color="#fbbf24" /> 4. Prohibited Activities
          </h2>
          <p style={textStyle}>
            You agree not to engage in any of the following: unauthorized access to others' accounts, scraping or automated data collection, uploading malicious code, impersonating other users or staff, circumventing security features, or any activity that disrupts the platform's normal operation. Violations may result in immediate account termination.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>
            <Scale size={20} color="#a855f7" /> 5. Limitation of Liability
          </h2>
          <p style={textStyle}>
            ComiVerse shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the platform. Our total liability for any claim arising from these terms shall not exceed the amount you have paid to ComiVerse in the twelve months preceding the claim.
          </p>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(236, 72, 153, 0.1))',
          border: '1px solid rgba(168, 85, 247, 0.2)',
          borderRadius: '16px',
          padding: '28px 32px',
          textAlign: 'center'
        }}>
          <p style={{ color: 'var(--profile-text-secondary, #94a3b8)', fontSize: '14px', margin: '0 0 4px' }}>
            If you have any questions about these Terms, please
          </p>
          <a href="/contact" style={{ color: '#a855f7', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
            contact our support team
          </a>
        </div>
      </div>
    </HomeLayout>
  );
};

export default Terms;
