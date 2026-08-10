import React from "react";
import HomeLayout from "../../components/layout/HomeLayout";
import { ShieldCheck, FileText, UserCheck, UserPlus } from "lucide-react";

const Policy = () => {
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
            <ShieldCheck size={28} color="#a855f7" />
          </div>
          <h1 style={{
            fontSize: '36px',
            fontWeight: '700',
            color: 'var(--profile-text-primary, white)',
            margin: '0 0 12px',
            fontFamily: 'var(--font-serif)'
          }}>
            Privacy Policy
          </h1>
          <p style={{ color: 'var(--profile-text-secondary, #94a3b8)', fontSize: '14px' }}>Last updated: July 2026</p>
        </div>

        {/* Sections */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>
            <FileText size={20} color="#a855f7" /> 1. Information Collection
          </h2>
          <p style={textStyle}>
            At ComiVerse, we prioritize your privacy. We collect information necessary to provide a seamless experience, including account details, preferences, and usage data to improve our services. All personal information is collected lawfully and fairly, with your full knowledge and consent.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>
            <UserCheck size={20} color="#ec4899" /> 2. Data Usage & Sharing
          </h2>
          <p style={textStyle}>
            The information we collect is used solely to enhance your ComiVerse experience, process transactions, and communicate important updates. We do not sell, rent, or share your personal information with third parties except as necessary to provide our services or when required by law.
          </p>
        </div>
        
        <div style={sectionStyle}>
          <h2 style={headingStyle}>
            <ShieldCheck size={20} color="#10b981" /> 3. Data Protection
          </h2>
          <p style={textStyle}>
            We implement robust security measures to protect your personal data from unauthorized access, alteration, disclosure, or destruction. We regularly review our data collection, storage, and processing practices to ensure we meet the highest standards of data security.
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={headingStyle}>
            <UserPlus size={20} color="#fbbf24" /> 4. Your Rights
          </h2>
          <p style={textStyle}>
            You maintain full control over your personal data. You have the right to access, update, export, or request the deletion of your account information at any time. You may also opt-out of promotional communications through your account settings.
          </p>
        </div>

        {/* Contact CTA */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(236, 72, 153, 0.1))',
          border: '1px solid rgba(168, 85, 247, 0.2)',
          borderRadius: '16px',
          padding: '32px',
          textAlign: 'center',
          marginTop: '20px'
        }}>
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--profile-text-primary, white)', margin: '0 0 8px' }}>Questions about our policy?</h3>
          <p style={{ color: 'var(--profile-text-secondary, #94a3b8)', fontSize: '14px', margin: '0 0 20px' }}>
            We're here to help clarify any concerns about your privacy.
          </p>
          <a href="/contact" style={{
            display: 'inline-block',
            padding: '10px 28px',
            background: 'linear-gradient(135deg, #a855f7, #ec4899)',
            color: 'white',
            borderRadius: '10px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'opacity 0.2s'
          }}>
            Contact Privacy Team
          </a>
        </div>
      </div>
    </HomeLayout>
  );
};

export default Policy;