import { toast } from "@/hooks/use-toast";

export interface EmailNotification {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  newMessages: boolean;
  newsUpdates: boolean;
}

export interface EmailTemplate {
  propertyAlert: {
    subject: string;
    template: string;
  };
  priceDropAlert: {
    subject: string;
    template: string;
  };
  newMessage: {
    subject: string;
    template: string;
  };
  newsUpdate: {
    subject: string;
    template: string;
  };
  welcome: {
    subject: string;
    template: string;
  };
  passwordReset: {
    subject: string;
    template: string;
  };
  accountVerification: {
    subject: string;
    template: string;
  };
  accountDeactivation: {
    subject: string;
    template: string;
  };
  accountDeletion: {
    subject: string;
    template: string;
  };
}

class EmailService {
  private baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  private supportEmail = 'support@buildhomemartsquares.com';
  
  private emailTemplates: EmailTemplate = {
    propertyAlert: {
      subject: 'New Properties Match Your Criteria',
      template: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #2563eb; margin: 0;">New Property Alert</h1>
          </div>
          <div style="padding: 20px;">
            <p>Dear {{userName}},</p>
            <p>We found new properties that match your search criteria:</p>
            <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
              {{propertyList}}
            </div>
            <p>View all matching properties on your dashboard.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{dashboardUrl}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Properties</a>
            </div>
          </div>
          <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>This email was sent from ${this.supportEmail}</p>
          </div>
        </div>
      `
    },
    priceDropAlert: {
      subject: 'Price Drop Alert - Your Favorite Property',
      template: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #10b981; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Price Drop Alert! 📉</h1>
          </div>
          <div style="padding: 20px;">
            <p>Great news, {{userName}}!</p>
            <p>The price has dropped for a property you're interested in:</p>
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h3 style="margin: 0 0 10px 0; color: #059669;">{{propertyTitle}}</h3>
              <p style="margin: 5px 0;"><strong>Previous Price:</strong> <span style="text-decoration: line-through; color: #ef4444;">{{oldPrice}}</span></p>
              <p style="margin: 5px 0;"><strong>New Price:</strong> <span style="color: #10b981; font-size: 18px; font-weight: bold;">{{newPrice}}</span></p>
              <p style="margin: 5px 0;"><strong>You Save:</strong> <span style="color: #10b981; font-weight: bold;">{{savings}}</span></p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{propertyUrl}}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Property</a>
            </div>
          </div>
          <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>This email was sent from ${this.supportEmail}</p>
          </div>
        </div>
      `
    },
    newMessage: {
      subject: 'New Message - BuildHomeMart Squares',
      template: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #7c3aed; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">New Message 💬</h1>
          </div>
          <div style="padding: 20px;">
            <p>Hi {{userName}},</p>
            <p>You have received a new message from {{senderName}}:</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed;">
              <p style="margin: 0; font-style: italic;">"{{messagePreview}}"</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{messagesUrl}}" style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Message</a>
            </div>
          </div>
          <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>This email was sent from ${this.supportEmail}</p>
          </div>
        </div>
      `
    },
    newsUpdate: {
      subject: 'Real Estate News & Updates',
      template: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f59e0b; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Latest Real Estate News 📰</h1>
          </div>
          <div style="padding: 20px;">
            <p>Hello {{userName}},</p>
            <p>Here are the latest updates in the real estate market:</p>
            <div style="margin: 20px 0;">
              {{newsContent}}
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{websiteUrl}}" style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Read More</a>
            </div>
          </div>
          <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>This email was sent from ${this.supportEmail}</p>
          </div>
        </div>
      `
    },
    welcome: {
      subject: 'Welcome to BuildHomeMart Squares!',
      template: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #2563eb; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Welcome to BuildHomeMart Squares! 🏠</h1>
          </div>
          <div style="padding: 20px;">
            <p>Dear {{userName}},</p>
            <p>Welcome to BuildHomeMart Squares! We're excited to help you find your perfect property.</p>
            <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2563eb; margin: 0 0 15px 0;">Getting Started:</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Complete your profile to get personalized recommendations</li>
                <li>Set up property alerts for your preferred locations</li>
                <li>Save properties to your favorites</li>
                <li>Connect with verified agents and owners</li>
              </ul>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{dashboardUrl}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Go to Dashboard</a>
            </div>
          </div>
          <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>This email was sent from ${this.supportEmail}</p>
          </div>
        </div>
      `
    },
    passwordReset: {
      subject: 'Password Reset Request',
      template: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #dc2626; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Password Reset Request 🔐</h1>
          </div>
          <div style="padding: 20px;">
            <p>Hi {{userName}},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{resetUrl}}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Reset Password</a>
            </div>
            <p style="font-size: 14px; color: #6b7280;">This link will expire in 1 hour. If you didn't request this reset, please ignore this email.</p>
          </div>
          <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>This email was sent from ${this.supportEmail}</p>
          </div>
        </div>
      `
    },
    accountVerification: {
      subject: 'Verify Your Account - BuildHomeMart Squares',
      template: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #059669; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Verify Your Account ✅</h1>
          </div>
          <div style="padding: 20px;">
            <p>Hello {{userName}},</p>
            <p>Please verify your email address to complete your account setup:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{verificationUrl}}" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Verify Email</a>
            </div>
            <p style="font-size: 14px; color: #6b7280;">This verification link will expire in 24 hours.</p>
          </div>
          <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>This email was sent from ${this.supportEmail}</p>
          </div>
        </div>
      `
    },
    accountDeactivation: {
      subject: 'Confirm Account Deactivation - BuildHomeMart Squares',
      template: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f59e0b; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Account Deactivation Request ⚠️</h1>
          </div>
          <div style="padding: 20px;">
            <p>Hi {{userName}},</p>
            <p>We received a request to temporarily deactivate your BuildHomeMart Squares account.</p>
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <h3 style="margin: 0 0 15px 0; color: #92400e;">What happens when you deactivate:</h3>
              <ul style="margin: 0; padding-left: 20px; color: #78350f;">
                <li>Your profile will be hidden from other users</li>
                <li>You won't receive any notifications</li>
                <li>Your data remains safe and secure</li>
                <li>You can reactivate anytime by logging in</li>
              </ul>
            </div>
            <p>To confirm deactivation, click the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{deactivationUrl}}" style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Confirm Deactivation</a>
            </div>
            <p style="font-size: 14px; color: #6b7280;">
              This link will expire in 24 hours. If you didn't request this, please ignore this email and your account will remain active.
            </p>
          </div>
          <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>Need help? Contact us at ${this.supportEmail}</p>
          </div>
        </div>
      `
    },
    accountDeletion: {
      subject: 'Confirm Permanent Account Deletion - BuildHomeMart Squares',
      template: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #dc2626; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Permanent Account Deletion 🗑️</h1>
          </div>
          <div style="padding: 20px;">
            <p>Hi {{userName}},</p>
            <p>We received a request to <strong>permanently delete</strong> your BuildHomeMart Squares account.</p>
            <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <h3 style="margin: 0 0 15px 0; color: #991b1b;">⚠️ This action is PERMANENT and cannot be undone</h3>
              <p style="margin: 0 0 10px 0; color: #7f1d1d; font-weight: bold;">All of the following will be permanently deleted:</p>
              <ul style="margin: 0; padding-left: 20px; color: #7f1d1d;">
                <li>Your profile and account information</li>
                <li>All property listings and favorites</li>
                <li>Messages and conversation history</li>
                <li>Reviews and ratings you've provided</li>
                <li>All saved preferences and settings</li>
              </ul>
            </div>
            <p style="font-weight: bold; color: #dc2626;">
              Are you absolutely sure you want to proceed?
            </p>
            <p>To confirm permanent deletion, click the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{deletionUrl}}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Confirm Permanent Deletion</a>
            </div>
            <p style="font-size: 14px; color: #6b7280;">
              This link will expire in 24 hours. If you didn't request this, please ignore this email and your account will remain active.
            </p>
            <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #1e40af; font-size: 14px;">
                <strong>Changed your mind?</strong> Consider deactivating instead. You can always reactivate your account later.
              </p>
            </div>
          </div>
          <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>Need help or have questions? Contact us at ${this.supportEmail}</p>
          </div>
        </div>
      `
    }
  };

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          success: false,
          message: `HTTP ${response.status}: ${response.statusText}`,
        }));
        throw new Error(errorData.message || 'An error occurred');
      }

      return await response.json();
    } catch (error) {
      console.error('Email API request failed:', error);
      throw error;
    }
  }

  private interpolateTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  async sendEmail(notification: EmailNotification): Promise<any> {
    try {
      const response = await this.makeRequest('/email/send', {
        method: 'POST',
        body: JSON.stringify({
          from: this.supportEmail,
          to: notification.to,
          subject: notification.subject,
          html: this.interpolateTemplate(notification.template, notification.data),
          text: this.htmlToText(notification.template, notification.data)
        }),
      });

      return response;
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  async sendPropertyAlert(userEmail: string, userName: string, properties: any[]): Promise<void> {
    try {
      const propertyList = properties.map(property => `
        <div style="border-bottom: 1px solid #e5e7eb; padding: 10px 0;">
          <strong>${property.title}</strong><br>
          <span style="color: #2563eb; font-weight: bold;">${property.price}</span><br>
          <span style="font-size: 14px; color: #6b7280;">${property.location}</span>
        </div>
      `).join('');

      await this.sendEmail({
        to: userEmail,
        subject: this.emailTemplates.propertyAlert.subject,
        template: this.emailTemplates.propertyAlert.template,
        data: {
          userName,
          propertyList,
          dashboardUrl: `${window.location.origin}/v2/customer/dashboard`
        }
      });
    } catch (error) {
      console.error('Failed to send property alert:', error);
    }
  }

  async sendPriceDropAlert(userEmail: string, userName: string, property: any, oldPrice: string, newPrice: string): Promise<void> {
    try {
      const savings = `₹${(parseInt(oldPrice.replace(/[^\d]/g, '')) - parseInt(newPrice.replace(/[^\d]/g, ''))).toLocaleString('en-IN')}`;

      await this.sendEmail({
        to: userEmail,
        subject: this.emailTemplates.priceDropAlert.subject,
        template: this.emailTemplates.priceDropAlert.template,
        data: {
          userName,
          propertyTitle: property.title,
          oldPrice,
          newPrice,
          savings,
          propertyUrl: `${window.location.origin}/v2/property/${property._id}`
        }
      });
    } catch (error) {
      console.error('Failed to send price drop alert:', error);
    }
  }

  async sendNewMessageNotification(userEmail: string, userName: string, senderName: string, messagePreview: string): Promise<void> {
    try {
      await this.sendEmail({
        to: userEmail,
        subject: this.emailTemplates.newMessage.subject,
        template: this.emailTemplates.newMessage.template,
        data: {
          userName,
          senderName,
          messagePreview: messagePreview.substring(0, 100) + (messagePreview.length > 100 ? '...' : ''),
          messagesUrl: `${window.location.origin}/v2/customer/messages`
        }
      });
    } catch (error) {
      console.error('Failed to send new message notification:', error);
    }
  }

  async sendNewsUpdate(userEmail: string, userName: string, newsContent: string): Promise<void> {
    try {
      await this.sendEmail({
        to: userEmail,
        subject: this.emailTemplates.newsUpdate.subject,
        template: this.emailTemplates.newsUpdate.template,
        data: {
          userName,
          newsContent,
          websiteUrl: window.location.origin
        }
      });
    } catch (error) {
      console.error('Failed to send news update:', error);
    }
  }

  async sendWelcomeEmail(userEmail: string, userName: string): Promise<void> {
    try {
      await this.sendEmail({
        to: userEmail,
        subject: this.emailTemplates.welcome.subject,
        template: this.emailTemplates.welcome.template,
        data: {
          userName,
          dashboardUrl: `${window.location.origin}/v2/customer/dashboard`
        }
      });
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }
  }

  async sendPasswordResetEmail(userEmail: string, userName: string, resetToken: string): Promise<void> {
    try {
      await this.sendEmail({
        to: userEmail,
        subject: this.emailTemplates.passwordReset.subject,
        template: this.emailTemplates.passwordReset.template,
        data: {
          userName,
          resetUrl: `${window.location.origin}/v2/reset-password?token=${resetToken}`
        }
      });
    } catch (error) {
      console.error('Failed to send password reset email:', error);
    }
  }

  async sendVerificationEmail(userEmail: string, userName: string, verificationToken: string): Promise<void> {
    try {
      await this.sendEmail({
        to: userEmail,
        subject: this.emailTemplates.accountVerification.subject,
        template: this.emailTemplates.accountVerification.template,
        data: {
          userName,
          verificationUrl: `${window.location.origin}/v2/verify-email?token=${verificationToken}`
        }
      });
    } catch (error) {
      console.error('Failed to send verification email:', error);
    }
  }

  async sendAccountDeactivationEmail(userEmail: string, userName?: string): Promise<void> {
    try {
      const deactivationToken = Math.random().toString(36).substring(2, 15);
      
      await this.sendEmail({
        to: userEmail,
        subject: (this.emailTemplates as any).accountDeactivation.subject,
        template: (this.emailTemplates as any).accountDeactivation.template,
        data: {
          userName: userName || 'User',
          deactivationUrl: `${window.location.origin}/v2/confirm-deactivation?token=${deactivationToken}`
        }
      });
      
      toast({
        title: "📧 Confirmation Email Sent",
        description: "Check your email to confirm account deactivation",
      });
    } catch (error) {
      console.error('Failed to send account deactivation email:', error);
      throw error;
    }
  }

  async sendAccountDeletionEmail(userEmail: string, userName?: string): Promise<void> {
    try {
      const deletionToken = Math.random().toString(36).substring(2, 15);
      
      await this.sendEmail({
        to: userEmail,
        subject: (this.emailTemplates as any).accountDeletion.subject,
        template: (this.emailTemplates as any).accountDeletion.template,
        data: {
          userName: userName || 'User',
          deletionUrl: `${window.location.origin}/v2/confirm-deletion?token=${deletionToken}`
        }
      });
      
      toast({
        title: "📧 Confirmation Email Sent",
        description: "Check your email to confirm permanent account deletion",
        variant: "destructive"
      });
    } catch (error) {
      console.error('Failed to send account deletion email:', error);
      throw error;
    }
  }

  private htmlToText(htmlTemplate: string, data: Record<string, any>): string {
    const interpolated = this.interpolateTemplate(htmlTemplate, data);
    // Basic HTML to text conversion
    return interpolated
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  async sendTestEmail(userEmail: string, userName: string): Promise<void> {
    try {
      const currentTime = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'full',
        timeStyle: 'short'
      });

      await this.sendEmail({
        to: userEmail,
        subject: '✅ Test Notification - BuildHomeMart Squares',
        template: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">🏠 BuildHomeMart Squares</h1>
              <p style="color: white; margin: 10px 0 0 0;">Test Email Notification</p>
            </div>
            
            <div style="padding: 30px; background: #fff;">
              <h2 style="color: #333; margin-bottom: 20px;">Hello ${userName}! 👋</h2>
              
              <p>This is a <strong>test email notification</strong> from your BuildHomeMart Squares account.</p>
              
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #495057;">✅ Email Notifications Working!</h3>
                <p style="margin-bottom: 0;">Your notification settings are properly configured and working correctly.</p>
              </div>
              
              <p><strong>Test Details:</strong></p>
              <ul>
                <li>Sent to: ${userEmail}</li>
                <li>Date & Time: ${currentTime}</li>
                <li>Type: Manual Test Email</li>
              </ul>
              
              <p>If you have any questions or need assistance, please contact our support team.</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; color: #6c757d; font-size: 14px;">
                This test email was sent from BuildHomeMart Squares<br>
                <a href="mailto:support@buildhomemartsquares.com" style="color: #007bff;">support@buildhomemartsquares.com</a>
              </p>
            </div>
          </div>
        `,
        data: {
          userName,
          userEmail,
          testTime: currentTime
        }
      });
    } catch (error) {
      console.error('Failed to send test email:', error);
      throw error;
    }
  }

  getSupportEmail(): string {
    return this.supportEmail;
  }
}

export const emailService = new EmailService();
export default emailService;
