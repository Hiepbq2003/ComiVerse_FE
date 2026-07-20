import React from "react";
import HomeLayout from "../../components/layout/HomeLayout";
import { ShieldCheck, FileText, UserCheck, Mail, UserPlus } from "lucide-react"; // Đã thêm icon UserPlus

const Policy = () => {
  return (
    <HomeLayout>
      <div className="container py-5">
        {/* Header */}
        <div className="row mb-5">
          <div className="col-12 text-center">
            <h1 className="display-4 fw-bold text-primary">
              <ShieldCheck className="me-2" size={40} />
              Privacy Policy
            </h1>
            <p className="text-muted">Last updated: July 2026</p>
          </div>
        </div>

        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card shadow-sm border-0 p-4 mb-4">
              <div className="card-body">
                <section className="mb-5">
                  <h3 className="h4 text-dark mb-3 d-flex align-items-center">
                    <FileText className="text-primary me-2" /> 1. Information Collection
                  </h3>
                  <p className="text-secondary">
                    At ComiVerse, we prioritize your privacy. We collect information necessary 
                    to provide a seamless experience, including account details and usage data 
                    to improve our services.
                  </p>
                </section>

                <section>
                  <h3 className="h4 text-dark mb-3 d-flex align-items-center">
                    <UserCheck className="text-primary me-2" /> 2. Your Rights
                  </h3>
                  <p className="text-secondary">
                    You maintain full control over your personal data. You have the right 
                    to access, update, or request the deletion of your account information 
                    at any time.
                  </p>
                </section>
              </div>
            </div>

            <div className="card border-0 shadow-sm bg-light p-4">
              <div className="d-flex flex-column flex-md-row align-items-center justify-content-between gap-3">
                <div className="d-flex align-items-center">
                  <Mail className="text-primary me-3" size={40} />
                  <div>
                    <h5 className="mb-1">Ready to get started?</h5>
                    <p className="mb-0 text-muted small">Join ComiVerse today to enjoy our services.</p>
                  </div>
                </div>
                
                <a href="/translator-register" className="btn btn-primary btn-lg px-4 d-flex align-items-center">
                  <UserPlus className="me-2" size={20} />
                  Sign Up Now
                </a>
              </div>
            </div>

          </div>
        </div>
      </div>
    </HomeLayout>
  );
};

export default Policy;