import React, { useState } from "react";
import HomeLayout from "../../components/layout/HomeLayout";
import { Mail, MessageSquare, MapPin, Phone } from "lucide-react";
import { toast } from "react-toastify";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast.warning('Please fill in all required fields.');
      return;
    }
    toast.success('Your message has been sent! We will get back to you soon.');
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  const inputStyle = {
    width: '100%',
    background: 'var(--profile-input-bg, rgba(255, 255, 255, 0.03))',
    border: '1px solid var(--profile-border, rgba(255, 255, 255, 0.08))',
    borderRadius: '10px',
    padding: '12px 16px',
    color: 'var(--profile-text-primary, white)',
    fontSize: '14px',
    fontFamily: 'var(--font-sans)',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--profile-text-secondary, #94a3b8)',
    marginBottom: '6px'
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
            <MessageSquare size={28} color="#a855f7" />
          </div>
          <h1 style={{
            fontSize: '36px',
            fontWeight: '700',
            color: 'var(--profile-text-primary, white)',
            margin: '0 0 12px',
            fontFamily: 'var(--font-serif)'
          }}>
            Contact Support
          </h1>
          <p style={{ color: 'var(--profile-text-secondary, #94a3b8)', fontSize: '16px', lineHeight: '1.7', maxWidth: '500px', margin: '0 auto' }}>
            Have a question or need help? We're here for you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.5fr',
          gap: '24px',
          alignItems: 'start'
        }}>
          {/* Contact Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              background: 'var(--profile-card-bg, rgba(255, 255, 255, 0.02))',
              border: '1px solid var(--profile-border, rgba(255, 255, 255, 0.06))',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <Mail size={20} color="#a855f7" />
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--profile-text-primary, white)' }}>Email</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--profile-text-secondary, #94a3b8)' }}>support@comiverse.com</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <Phone size={20} color="#ec4899" />
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--profile-text-primary, white)' }}>Phone</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--profile-text-secondary, #94a3b8)' }}>+84 123 456 789</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <MapPin size={20} color="#fbbf24" />
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--profile-text-primary, white)' }}>Office</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--profile-text-secondary, #94a3b8)' }}>FPT University, Hoa Lac, Hanoi</p>
                </div>
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(236, 72, 153, 0.1))',
              border: '1px solid rgba(168, 85, 247, 0.2)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '15px', color: 'var(--profile-text-primary, white)' }}>Response Time</h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--profile-text-secondary, #94a3b8)', lineHeight: '1.6' }}>
                We typically respond within 24 hours during business days. For urgent issues, please include "URGENT" in your subject line.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{
            background: 'var(--profile-card-bg, rgba(255, 255, 255, 0.02))',
            border: '1px solid var(--profile-border, rgba(255, 255, 255, 0.06))',
            borderRadius: '16px',
            padding: '28px 32px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your name"
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(168, 85, 247, 0.5)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                />
              </div>
              <div>
                <label style={labelStyle}>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(168, 85, 247, 0.5)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Subject</label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder="What's this about?"
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = 'rgba(168, 85, 247, 0.5)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Message *</label>
              <textarea
                name="message"
                rows="5"
                value={formData.message}
                onChange={handleChange}
                placeholder="Tell us how we can help..."
                style={{ ...inputStyle, resize: 'none' }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(168, 85, 247, 0.5)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
              />
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.opacity = '0.9'}
              onMouseLeave={(e) => e.target.style.opacity = '1'}
            >
              Send Message
            </button>
          </form>
        </div>
      </div>
    </HomeLayout>
  );
};

export default Contact;
