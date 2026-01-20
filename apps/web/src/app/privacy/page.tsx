/* eslint-disable react/no-unescaped-entities */
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | TestCraft AI',
  description: 'Privacy policy and data protection practices for TestCraft AI',
};

export default function PrivacyPolicyPage() {
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
          <h1>Privacy Policy</h1>
          <p className="text-muted-foreground">
            <strong>Effective Date:</strong> January 19, 2026
            <br />
            <strong>Last Updated:</strong> January 19, 2026
          </p>

          <h2>Introduction</h2>
          <p>
            Welcome to TestCraft AI ("we," "our," or "us"). We are committed to protecting your
            privacy and the privacy of students who use our service. This Privacy Policy explains
            how we collect, use, disclose, and safeguard your information when you use our web
            application.
          </p>
          <p>
            <strong>For Parents and Guardians:</strong> This service is designed for educational
            use and may be used by children under 13. We comply with the Children's Online Privacy
            Protection Act (COPPA). Please read this policy carefully.
          </p>

          <h2>Information We Collect</h2>

          <h3>Information Provided by Teachers</h3>
          <p>When teachers create an account, we collect:</p>
          <ul>
            <li>
              <strong>Account Information:</strong> Name, email address, password (encrypted)
            </li>
            <li>
              <strong>Classroom Information:</strong> Classroom names, grade levels, classroom codes
            </li>
            <li>
              <strong>Educational Content:</strong> Vocabulary worksheets, test materials uploaded
              by teachers
            </li>
            <li>
              <strong>Usage Data:</strong> Login times, feature usage, actions performed in the
              application
            </li>
          </ul>

          <h3>Information About Students</h3>
          <p>We collect minimal information about students:</p>
          <ul>
            <li>
              <strong>Basic Information:</strong> First name, last name, username (no email
              required)
            </li>
            <li>
              <strong>Classroom Enrollment:</strong> Classroom membership information
            </li>
            <li>
              <strong>Academic Data:</strong> Test attempts, scores, answers submitted by students
            </li>
            <li>
              <strong>Usage Data:</strong> Login times, test completion times
            </li>
          </ul>
          <p>
            <strong>Important:</strong> We do NOT collect:
          </p>
          <ul>
            <li>Student email addresses</li>
            <li>Student phone numbers</li>
            <li>Student home addresses</li>
            <li>Student dates of birth</li>
            <li>Student social security numbers</li>
            <li>Geolocation data</li>
            <li>Photos or videos of students</li>
          </ul>

          <h3>Automatically Collected Information</h3>
          <ul>
            <li>
              <strong>Technical Data:</strong> IP addresses, browser type, device type, operating
              system
            </li>
            <li>
              <strong>Analytics Data:</strong> Page views, session duration, feature usage patterns
            </li>
            <li>
              <strong>Error Logs:</strong> Application errors and performance data (via Sentry)
            </li>
          </ul>

          <h2>How We Use Your Information</h2>
          <p>We use the collected information for:</p>
          <ul>
            <li>
              <strong>Service Delivery:</strong> Providing test generation, assignment, and grading
              functionality
            </li>
            <li>
              <strong>Account Management:</strong> Creating and managing teacher and student
              accounts
            </li>
            <li>
              <strong>Educational Analytics:</strong> Generating performance reports and progress
              tracking
            </li>
            <li>
              <strong>AI Processing:</strong> Extracting vocabulary words from uploaded worksheets
              using Claude AI
            </li>
            <li>
              <strong>Security:</strong> Detecting fraud, preventing abuse, and protecting user data
            </li>
            <li>
              <strong>Improvements:</strong> Analyzing usage patterns to improve our service
            </li>
            <li>
              <strong>Support:</strong> Responding to user inquiries and technical issues
            </li>
          </ul>

          <h2 id="coppa">Children's Privacy (COPPA Compliance)</h2>
          <p>
            We take children's privacy seriously and comply with the Children's Online Privacy
            Protection Act (COPPA).
          </p>

          <h3>Parental Consent</h3>
          <p>
            Our service is designed for use in educational settings where teachers or schools act as
            intermediaries. By using our service for students under 13:
          </p>
          <ul>
            <li>
              Teachers and schools obtain necessary parental consent before creating student accounts
            </li>
            <li>We rely on schools acting as agents for parents under COPPA</li>
            <li>Parents may contact us to review, modify, or delete their child's information</li>
          </ul>

          <h3>Data Minimization for Children</h3>
          <p>For students under 13, we:</p>
          <ul>
            <li>Collect only the minimum information necessary (name and username)</li>
            <li>Do not require email addresses for student accounts</li>
            <li>Do not collect personal contact information</li>
            <li>Do not allow students to publicly post or distribute personal information</li>
            <li>Do not enable student-to-student direct messaging</li>
          </ul>

          <h3>Parental Rights</h3>
          <p>Parents have the right to:</p>
          <ul>
            <li>Review the personal information collected about their child</li>
            <li>Request deletion of their child's personal information</li>
            <li>Refuse further collection or use of their child's information</li>
            <li>Receive a copy of their child's data in a portable format</li>
          </ul>
          <p>
            To exercise these rights, please contact us at{' '}
            <a href="mailto:coppa@testcraft-ai.com">coppa@testcraft-ai.com</a>.
          </p>

          <h2>Information Sharing and Disclosure</h2>
          <p>We do NOT sell, rent, or trade your personal information. We may share information:</p>

          <h3>With Service Providers</h3>
          <ul>
            <li>
              <strong>Anthropic (Claude AI):</strong> For AI-powered vocabulary extraction from
              uploaded worksheets
            </li>
            <li>
              <strong>Sentry:</strong> For error tracking and performance monitoring
            </li>
            <li>
              <strong>Azure (Microsoft):</strong> For cloud hosting and infrastructure
            </li>
          </ul>
          <p>All service providers are contractually required to protect your data.</p>

          <h3>For Legal Reasons</h3>
          <p>We may disclose information if required to:</p>
          <ul>
            <li>Comply with legal obligations or court orders</li>
            <li>Protect our rights, property, or safety</li>
            <li>Prevent fraud or abuse</li>
            <li>Respond to government requests</li>
          </ul>

          <h3>In Business Transfers</h3>
          <p>
            If we are involved in a merger, acquisition, or sale of assets, your information may be
            transferred. We will notify you before your information becomes subject to a different
            privacy policy.
          </p>

          <h2>Data Security</h2>
          <p>We implement industry-standard security measures:</p>
          <ul>
            <li>
              <strong>Encryption:</strong> HTTPS/TLS for data in transit, encryption at rest for
              sensitive data
            </li>
            <li>
              <strong>Password Security:</strong> Bcrypt hashing with salt for password storage
            </li>
            <li>
              <strong>Access Controls:</strong> Role-based access control (teachers, students,
              admins)
            </li>
            <li>
              <strong>Authentication:</strong> JWT tokens with short expiration times (15 minutes)
            </li>
            <li>
              <strong>Rate Limiting:</strong> Protection against brute-force attacks
            </li>
            <li>
              <strong>Security Headers:</strong> Content Security Policy, HSTS, XSS protection
            </li>
            <li>
              <strong>Regular Audits:</strong> Quarterly security reviews and dependency updates
            </li>
            <li>
              <strong>Monitoring:</strong> Real-time error tracking and security incident detection
            </li>
          </ul>

          <h2>Data Retention</h2>
          <p>We retain your information for as long as necessary:</p>
          <ul>
            <li>
              <strong>Active Accounts:</strong> Data retained while account is active
            </li>
            <li>
              <strong>Deleted Accounts:</strong> Data permanently deleted within 30 days of account
              deletion
            </li>
            <li>
              <strong>Backups:</strong> Backup data retained for 30 days, then permanently deleted
            </li>
            <li>
              <strong>Legal Obligations:</strong> Some data may be retained longer if required by law
            </li>
          </ul>

          <h2>Your Rights and Choices</h2>

          <h3>Access and Correction</h3>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal information</li>
            <li>Correct inaccurate information</li>
            <li>Request data portability (receive your data in a machine-readable format)</li>
          </ul>

          <h3>Deletion</h3>
          <p>You can:</p>
          <ul>
            <li>Delete your account at any time from your account settings</li>
            <li>Request deletion of specific data by contacting us</li>
            <li>
              For student accounts: Teachers or parents can request deletion via{' '}
              <a href="mailto:privacy@testcraft-ai.com">privacy@testcraft-ai.com</a>
            </li>
          </ul>

          <h3>California Privacy Rights (CCPA)</h3>
          <p>If you are a California resident, you have additional rights:</p>
          <ul>
            <li>Right to know what personal information is collected</li>
            <li>Right to know if personal information is sold or disclosed</li>
            <li>Right to say no to the sale of personal information</li>
            <li>Right to delete personal information</li>
            <li>Right to non-discrimination for exercising your rights</li>
          </ul>
          <p>
            <strong>Note:</strong> We do not sell personal information.
          </p>

          <h3>European Privacy Rights (GDPR)</h3>
          <p>If you are in the European Union, you have rights under GDPR:</p>
          <ul>
            <li>Right to access your personal data</li>
            <li>Right to rectification of inaccurate data</li>
            <li>Right to erasure ("right to be forgotten")</li>
            <li>Right to restrict processing</li>
            <li>Right to data portability</li>
            <li>Right to object to processing</li>
            <li>Right to withdraw consent</li>
          </ul>
          <p>
            To exercise these rights, contact us at{' '}
            <a href="mailto:gdpr@testcraft-ai.com">gdpr@testcraft-ai.com</a>.
          </p>

          <h2>Third-Party Services</h2>

          <h3>Anthropic (Claude AI)</h3>
          <p>
            We use Claude AI to extract vocabulary words from uploaded worksheets. Images are
            processed temporarily and not stored by Anthropic. See{' '}
            <a
              href="https://www.anthropic.com/legal/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Anthropic's Privacy Policy
            </a>
            .
          </p>

          <h3>Sentry</h3>
          <p>
            We use Sentry for error tracking. Error logs may contain technical data but no
            personally identifiable information. See{' '}
            <a href="https://sentry.io/privacy/" target="_blank" rel="noopener noreferrer">
              Sentry's Privacy Policy
            </a>
            .
          </p>

          <h3>Microsoft Azure</h3>
          <p>
            Our application is hosted on Azure infrastructure. See{' '}
            <a
              href="https://privacy.microsoft.com/en-us/privacystatement"
              target="_blank"
              rel="noopener noreferrer"
            >
              Microsoft's Privacy Statement
            </a>
            .
          </p>

          <h2>Educational Records (FERPA)</h2>
          <p>
            For U.S. schools, we comply with the Family Educational Rights and Privacy Act (FERPA).
            We act as a "school official" with a legitimate educational interest when processing
            student data on behalf of schools.
          </p>

          <h2>Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify users of material
            changes by:
          </p>
          <ul>
            <li>Updating the "Last Updated" date</li>
            <li>Sending email notifications to registered users</li>
            <li>Displaying a prominent notice in the application</li>
          </ul>
          <p>Continued use of the service after changes constitutes acceptance.</p>

          <h2>Contact Us</h2>
          <p>For privacy-related questions or requests:</p>
          <ul>
            <li>
              <strong>General Privacy:</strong>{' '}
              <a href="mailto:privacy@testcraft-ai.com">privacy@testcraft-ai.com</a>
            </li>
            <li>
              <strong>COPPA (Children's Privacy):</strong>{' '}
              <a href="mailto:coppa@testcraft-ai.com">coppa@testcraft-ai.com</a>
            </li>
            <li>
              <strong>GDPR (European Union):</strong>{' '}
              <a href="mailto:gdpr@testcraft-ai.com">gdpr@testcraft-ai.com</a>
            </li>
            <li>
              <strong>Security Concerns:</strong>{' '}
              <a href="mailto:security@testcraft-ai.com">security@testcraft-ai.com</a>
            </li>
          </ul>

          <p className="text-sm text-muted-foreground">
            This Privacy Policy is effective as of January 19, 2026.
          </p>
        </article>
      </main>
    </div>
  );
}
