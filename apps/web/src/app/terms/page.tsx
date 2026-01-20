import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service | TestCraft AI',
  description: 'Terms of service and user agreement for TestCraft AI',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <article className="prose prose-gray dark:prose-invert max-w-none">
          <h1>Terms of Service</h1>
          <p className="text-muted-foreground">
            <strong>Effective Date:</strong> January 19, 2026
            <br />
            <strong>Last Updated:</strong> January 19, 2026
          </p>

          <h2>Agreement to Terms</h2>
          <p>
            By accessing or using TestCraft AI ("the Service"), you agree to be bound by these
            Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.
          </p>
          <p>
            <strong>For Teachers and Schools:</strong> By creating an account, you represent that
            you have authority to agree to these Terms on behalf of your educational institution.
          </p>
          <p>
            <strong>For Students:</strong> Student accounts are created and managed by teachers. By
            using the Service, students agree to follow classroom rules and these Terms.
          </p>

          <h2>1. Service Description</h2>

          <h3>What We Provide</h3>
          <p>TestCraft AI is an educational platform that:</p>
          <ul>
            <li>Enables teachers to upload vocabulary materials</li>
            <li>Uses AI to extract vocabulary words and create tests</li>
            <li>Allows students to take vocabulary and spelling tests</li>
            <li>Tracks student progress and performance</li>
            <li>Provides classroom management tools for teachers</li>
          </ul>

          <h3>Service Limitations</h3>
          <p>The Service is provided "as is" and we make no guarantees about:</p>
          <ul>
            <li>Continuous, uninterrupted access</li>
            <li>Accuracy of AI-generated content</li>
            <li>Educational outcomes or student performance</li>
            <li>Compatibility with all devices or browsers</li>
          </ul>

          <h2>2. Eligibility and Account Registration</h2>

          <h3>Teacher Accounts</h3>
          <p>To create a teacher account, you must:</p>
          <ul>
            <li>Be at least 18 years old</li>
            <li>Be a teacher, educator, or school administrator</li>
            <li>Have authority to create student accounts</li>
            <li>Provide accurate and complete registration information</li>
            <li>Maintain the security of your account credentials</li>
          </ul>

          <h3>Student Accounts</h3>
          <p>Student accounts are created by teachers and:</p>
          <ul>
            <li>Do not require age verification (managed by teachers/schools)</li>
            <li>Do not require email addresses</li>
            <li>Are subject to teacher and school oversight</li>
            <li>Must be used only for educational purposes</li>
          </ul>

          <h3>Account Security</h3>
          <p>You are responsible for:</p>
          <ul>
            <li>Maintaining the confidentiality of your password</li>
            <li>All activities that occur under your account</li>
            <li>Notifying us immediately of any unauthorized access</li>
            <li>Using strong, unique passwords</li>
          </ul>
          <p>We are not liable for losses caused by unauthorized use of your account.</p>

          <h2>3. User Responsibilities</h2>

          <h3>Teachers Must</h3>
          <ul>
            <li>
              <strong>Verify Authority:</strong> Ensure you have permission to create student
              accounts
            </li>
            <li>
              <strong>Obtain Consent:</strong> Obtain necessary parental consent as required by
              COPPA
            </li>
            <li>
              <strong>Supervise Students:</strong> Monitor student use of the Service
            </li>
            <li>
              <strong>Protect Student Privacy:</strong> Handle student information in compliance
              with FERPA and other laws
            </li>
            <li>
              <strong>Report Issues:</strong> Report any security issues or policy violations
            </li>
            <li>
              <strong>Maintain Accuracy:</strong> Keep account information up to date
            </li>
          </ul>

          <h3>Students Must</h3>
          <ul>
            <li>Use the Service only for assigned educational activities</li>
            <li>Follow teacher and school instructions</li>
            <li>Not share account credentials with others</li>
            <li>Not attempt to access other students' accounts or data</li>
            <li>Report any technical issues or inappropriate content to teachers</li>
          </ul>

          <h2>4. Acceptable Use Policy</h2>

          <h3>Prohibited Activities</h3>
          <p>You may NOT:</p>
          <ul>
            <li>
              <strong>Violate Laws:</strong> Use the Service for any illegal purpose
            </li>
            <li>
              <strong>Infringe Rights:</strong> Violate intellectual property or privacy rights
            </li>
            <li>
              <strong>Harass Others:</strong> Engage in bullying, harassment, or hate speech
            </li>
            <li>
              <strong>Upload Malicious Content:</strong> Upload viruses, malware, or harmful files
            </li>
            <li>
              <strong>Circumvent Security:</strong> Attempt to hack, breach, or disable security
              features
            </li>
            <li>
              <strong>Scrape Data:</strong> Use automated tools to extract data from the Service
            </li>
            <li>
              <strong>Impersonate Others:</strong> Pretend to be another user or entity
            </li>
            <li>
              <strong>Spam:</strong> Send unsolicited messages or advertisements
            </li>
            <li>
              <strong>Resell Service:</strong> Resell or redistribute access to the Service
            </li>
            <li>
              <strong>Reverse Engineer:</strong> Attempt to reverse engineer or copy our software
            </li>
          </ul>

          <h3>Content Guidelines</h3>
          <p>All uploaded content must:</p>
          <ul>
            <li>Be educational and age-appropriate</li>
            <li>Not contain offensive, violent, or adult content</li>
            <li>Not violate copyright or intellectual property rights</li>
            <li>Not contain personal information of students (addresses, phone numbers, etc.)</li>
          </ul>

          <h2>5. Intellectual Property Rights</h2>

          <h3>Our Rights</h3>
          <p>We own all rights to:</p>
          <ul>
            <li>The Service software, code, and design</li>
            <li>TestCraft AI name, logo, and branding</li>
            <li>AI-generated test questions and formats</li>
            <li>Documentation and help content</li>
          </ul>

          <h3>Your Rights</h3>
          <p>You retain ownership of:</p>
          <ul>
            <li>Original worksheets and materials you upload</li>
            <li>Student answers and submissions</li>
            <li>Classroom names and organizational content</li>
          </ul>

          <h3>License to Use</h3>
          <p>By uploading content, you grant us a license to:</p>
          <ul>
            <li>Process and analyze your content using AI</li>
            <li>Store your content on our servers</li>
            <li>Display content back to you and your students</li>
            <li>Generate tests and educational materials from your content</li>
          </ul>
          <p>
            This license is limited to providing the Service and does not allow us to share your
            content with other users or use it for other purposes.
          </p>

          <h2>6. User-Generated Content</h2>

          <h3>Content Moderation</h3>
          <p>We reserve the right to:</p>
          <ul>
            <li>Review uploaded content for compliance with these Terms</li>
            <li>Remove content that violates our policies</li>
            <li>Suspend or terminate accounts for repeated violations</li>
            <li>Report illegal content to authorities</li>
          </ul>

          <h3>No Endorsement</h3>
          <p>
            We do not endorse, verify, or guarantee the accuracy of user-generated content. Teachers
            are responsible for reviewing AI-generated tests before assigning them to students.
          </p>

          <h2>7. Educational Use and COPPA Compliance</h2>

          <h3>School Authorization</h3>
          <p>By creating student accounts, teachers represent that:</p>
          <ul>
            <li>They have authority from their school or institution</li>
            <li>They have obtained necessary parental consent for students under 13</li>
            <li>They will comply with FERPA, COPPA, and other applicable laws</li>
            <li>They will supervise student use of the Service</li>
          </ul>

          <h3>Parental Rights</h3>
          <p>
            Parents have the right to review, modify, or request deletion of their child's
            information. See our <Link href="/privacy">Privacy Policy</Link> for details.
          </p>

          <h2>8. Service Availability and Modifications</h2>

          <h3>Availability</h3>
          <p>We strive for high availability but cannot guarantee:</p>
          <ul>
            <li>24/7 uptime (maintenance windows may occur)</li>
            <li>Compatibility with all devices or networks</li>
            <li>Error-free operation</li>
          </ul>

          <h3>Modifications</h3>
          <p>We may:</p>
          <ul>
            <li>Add, modify, or remove features at any time</li>
            <li>Change pricing or subscription plans (with notice)</li>
            <li>Update these Terms (effective date will be updated)</li>
            <li>Discontinue the Service with 30 days' notice</li>
          </ul>

          <h2>9. Fees and Payment</h2>

          <h3>Current Pricing</h3>
          <p>
            TestCraft AI is currently free to use. We may introduce paid plans in the future with
            advance notice.
          </p>

          <h3>Future Paid Plans</h3>
          <p>If we introduce paid plans:</p>
          <ul>
            <li>Existing users will receive 60 days' notice before any charges</li>
            <li>Free tier options may remain available</li>
            <li>Schools and institutions may negotiate custom pricing</li>
            <li>Refund policies will be clearly stated</li>
          </ul>

          <h2>10. Termination</h2>

          <h3>By You</h3>
          <p>You may terminate your account at any time:</p>
          <ul>
            <li>Teacher accounts: Delete account from settings</li>
            <li>Student accounts: Contact your teacher</li>
            <li>Data will be deleted within 30 days (see Privacy Policy)</li>
          </ul>

          <h3>By Us</h3>
          <p>We may suspend or terminate accounts for:</p>
          <ul>
            <li>Violation of these Terms</li>
            <li>Fraudulent or abusive behavior</li>
            <li>Non-payment (if paid plans are introduced)</li>
            <li>Legal requirements</li>
            <li>Security concerns</li>
          </ul>
          <p>
            We will provide notice when possible, except in cases of serious violations or legal
            requirements.
          </p>

          <h3>Effect of Termination</h3>
          <p>Upon termination:</p>
          <ul>
            <li>You lose access to the Service</li>
            <li>Your data will be deleted (see Privacy Policy)</li>
            <li>Outstanding obligations remain (e.g., unpaid fees if applicable)</li>
          </ul>

          <h2>11. Disclaimers and Limitations of Liability</h2>

          <h3>Disclaimers</h3>
          <p>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, INCLUDING:</p>
          <ul>
            <li>Merchantability or fitness for a particular purpose</li>
            <li>Accuracy of AI-generated content</li>
            <li>Uninterrupted or error-free operation</li>
            <li>Security or freedom from viruses</li>
            <li>Educational outcomes or student performance improvements</li>
          </ul>

          <h3>Limitation of Liability</h3>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE ARE NOT LIABLE FOR ANY INDIRECT, INCIDENTAL,
            SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING:
          </p>
          <ul>
            <li>Lost profits or data</li>
            <li>Service interruptions</li>
            <li>Educational outcomes</li>
            <li>Student performance</li>
            <li>Third-party actions</li>
          </ul>
          <p>
            OUR TOTAL LIABILITY FOR ANY CLAIM ARISING FROM THESE TERMS OR THE SERVICE SHALL NOT
            EXCEED $100.
          </p>

          <h3>Educational Outcomes</h3>
          <p>We make no guarantees about:</p>
          <ul>
            <li>Student test scores or academic improvement</li>
            <li>Accuracy of AI-generated test questions</li>
            <li>Suitability for specific curricula or standards</li>
            <li>Effectiveness for particular learning needs</li>
          </ul>
          <p>Teachers are responsible for reviewing content and assessing appropriateness.</p>

          <h2>12. Indemnification</h2>
          <p>You agree to indemnify and hold us harmless from claims arising from:</p>
          <ul>
            <li>Your use of the Service</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any laws or rights of third parties</li>
            <li>Content you upload to the Service</li>
            <li>Actions of students under your supervision</li>
          </ul>

          <h2>13. Dispute Resolution</h2>

          <h3>Informal Resolution</h3>
          <p>
            Before filing a claim, contact us at{' '}
            <a href="mailto:legal@testcraft-ai.com">legal@testcraft-ai.com</a> to attempt informal
            resolution.
          </p>

          <h3>Arbitration Agreement</h3>
          <p>
            Any disputes will be resolved through binding arbitration, not in court, except for:
          </p>
          <ul>
            <li>Small claims court actions</li>
            <li>Intellectual property disputes</li>
            <li>Injunctive relief requests</li>
          </ul>
          <p>Arbitration will be conducted by the American Arbitration Association (AAA).</p>

          <h3>Class Action Waiver</h3>
          <p>
            You agree to resolve disputes individually, not as part of a class action or
            consolidated proceeding.
          </p>

          <h3>Governing Law</h3>
          <p>
            These Terms are governed by the laws of [Your State/Country], without regard to conflict
            of law provisions.
          </p>

          <h2>14. General Provisions</h2>

          <h3>Entire Agreement</h3>
          <p>These Terms, together with our Privacy Policy, constitute the entire agreement.</p>

          <h3>Severability</h3>
          <p>
            If any provision is found invalid, the remaining provisions remain in full force and
            effect.
          </p>

          <h3>No Waiver</h3>
          <p>Failure to enforce any provision does not waive our right to enforce it later.</p>

          <h3>Assignment</h3>
          <p>You may not assign these Terms. We may assign them to successors or affiliates.</p>

          <h3>Force Majeure</h3>
          <p>
            We are not liable for delays or failures due to circumstances beyond our reasonable
            control (natural disasters, war, pandemics, etc.).
          </p>

          <h3>Export Compliance</h3>
          <p>
            You agree to comply with all export control laws and not to export or re-export the
            Service to prohibited countries or entities.
          </p>

          <h2>15. Contact Information</h2>
          <p>For questions about these Terms:</p>
          <ul>
            <li>
              <strong>General Inquiries:</strong>{' '}
              <a href="mailto:legal@testcraft-ai.com">legal@testcraft-ai.com</a>
            </li>
            <li>
              <strong>Privacy Questions:</strong>{' '}
              <a href="mailto:privacy@testcraft-ai.com">privacy@testcraft-ai.com</a>
            </li>
            <li>
              <strong>COPPA Questions:</strong>{' '}
              <a href="mailto:coppa@testcraft-ai.com">coppa@testcraft-ai.com</a>
            </li>
            <li>
              <strong>Security Issues:</strong>{' '}
              <a href="mailto:security@testcraft-ai.com">security@testcraft-ai.com</a>
            </li>
          </ul>

          <h2>Acceptance of Terms</h2>
          <p>
            By using TestCraft AI, you acknowledge that you have read, understood, and agree to be
            bound by these Terms of Service. If you do not agree, please discontinue use of the
            Service immediately.
          </p>

          <p className="text-sm text-muted-foreground">
            These Terms of Service are effective as of January 19, 2026.
          </p>
        </article>
      </main>
    </div>
  );
}
