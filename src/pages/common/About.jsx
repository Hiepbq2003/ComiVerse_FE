import React from "react";
import HomeLayout from "../../components/layout/HomeLayout";
import { Info, Users, BookOpen, Globe } from "lucide-react";

const About = () => {
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
            <Info size={28} color="#a855f7" />
          </div>
          <h1 style={{
            fontSize: '36px',
            fontWeight: '700',
            color: 'var(--profile-text-primary, white)',
            margin: '0 0 12px',
            fontFamily: 'var(--font-serif)'
          }}>
            About ComiVerse
          </h1>
          <p style={{ color: 'var(--profile-text-secondary, #94a3b8)', fontSize: '16px', lineHeight: '1.7', maxWidth: '600px', margin: '0 auto' }}>
            Your ultimate destination for webcomics, manga, and manhwa. Created by creators, for creators and readers alike.
          </p>
        </div>

        {/* Mission Section */}
        <div style={{
          background: 'var(--profile-card-bg, rgba(255, 255, 255, 0.02))',
          border: '1px solid var(--profile-border, rgba(255, 255, 255, 0.06))',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '24px'
        }}>
          <h2 style={{ fontSize: '22px', fontWeight: '600', color: 'var(--profile-text-primary, white)', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Globe size={20} color="#a855f7" /> Our Mission
          </h2>
          <p style={{ color: 'var(--profile-text-secondary, #cbd5e1)', fontSize: '15px', lineHeight: '1.8', margin: 0 }}>
            ComiVerse was founded with a simple yet powerful vision: to build a platform where comic creators can share their stories with the world and readers can discover incredible content from across the globe. We believe in empowering artists and storytellers by providing them with the tools and audience they deserve. Whether you're a seasoned professional or a first-time creator, ComiVerse is your home.
          </p>
        </div>

        {/* Values Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '24px'
        }}>
          <div style={{
            background: 'var(--profile-card-bg, rgba(255, 255, 255, 0.02))',
            border: '1px solid var(--profile-border, rgba(255, 255, 255, 0.06))',
            borderRadius: '16px',
            padding: '28px'
          }}>
            <Users size={24} color="#ec4899" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '17px', fontWeight: '600', color: 'var(--profile-text-primary, white)', margin: '0 0 8px' }}>Community First</h3>
            <p style={{ color: 'var(--profile-text-secondary, #94a3b8)', fontSize: '14px', lineHeight: '1.7', margin: 0 }}>
              We put our community of readers and creators at the heart of everything we do. Every feature, every update is driven by your feedback.
            </p>
          </div>

          <div style={{
            background: 'var(--profile-card-bg, rgba(255, 255, 255, 0.02))',
            border: '1px solid var(--profile-border, rgba(255, 255, 255, 0.06))',
            borderRadius: '16px',
            padding: '28px'
          }}>
            <BookOpen size={24} color="#fbbf24" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '17px', fontWeight: '600', color: 'var(--profile-text-primary, white)', margin: '0 0 8px' }}>Quality Content</h3>
            <p style={{ color: 'var(--profile-text-secondary, #94a3b8)', fontSize: '14px', lineHeight: '1.7', margin: 0 }}>
              We curate and maintain a library of 1,000+ top-quality webcomics, manga, and manhwa for your reading pleasure.
            </p>
          </div>

          <div style={{
            background: 'var(--profile-card-bg, rgba(255, 255, 255, 0.02))',
            border: '1px solid var(--profile-border, rgba(255, 255, 255, 0.06))',
            borderRadius: '16px',
            padding: '28px'
          }}>
            <Info size={24} color="#10b981" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '17px', fontWeight: '600', color: 'var(--profile-text-primary, white)', margin: '0 0 8px' }}>Fair Monetization</h3>
            <p style={{ color: 'var(--profile-text-secondary, #94a3b8)', fontSize: '14px', lineHeight: '1.7', margin: 0 }}>
              Our transparent revenue-sharing model ensures creators are fairly compensated for their work and passion.
            </p>
          </div>
        </div>

        {/* Contact CTA */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(236, 72, 153, 0.1))',
          border: '1px solid rgba(168, 85, 247, 0.2)',
          borderRadius: '16px',
          padding: '32px',
          textAlign: 'center'
        }}>
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--profile-text-primary, white)', margin: '0 0 8px' }}>Want to learn more?</h3>
          <p style={{ color: 'var(--profile-text-secondary, #94a3b8)', fontSize: '14px', margin: '0 0 20px' }}>
            Feel free to reach out to us anytime. We'd love to hear from you!
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
            Contact Us
          </a>
        </div>
      </div>
    </HomeLayout>
  );
};

export default About;
