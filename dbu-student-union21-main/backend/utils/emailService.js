const nodemailer = require("nodemailer");

// Build transporter using explicit SMTP config (supports Gmail App Passwords)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
        rejectUnauthorized: false, // allow self-signed certs in dev
    },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
});

// Verify SMTP connection on startup
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ SMTP Connection FAILED:', error.message);
        console.error('   Check EMAIL_USER, EMAIL_PASSWORD, SMTP_HOST, SMTP_PORT in .env');
    } else {
        console.log('✅ SMTP Server is ready to send emails');
    }
});

const sendEmail = async (options) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            throw new Error("SMTP credentials (EMAIL_USER/EMAIL_PASSWORD) are not configured. Cannot send email.");
        }
        const info = await transporter.sendMail({
            from: `"DBU Student Council" <${process.env.EMAIL_USER}>`,
            to: options.to,
            subject: options.subject,
            html: options.html,
        });
        console.log("Email sent successfully:", info.messageId);
        return info;
    } catch (error) {
        console.error("❌ EMAIL SENDING FAILED:", error.message);
        throw error;
    }
};

const sendRepresentativeAppointmentEmail = async (email, name, clubName) => {
    const html = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h1 style="color: #2563eb;">Congratulations, ${name}!</h1>
            <p>You have been officially appointed as the <strong>Club Representative (President)</strong> for <strong>${clubName}</strong>.</p>
            <p>You now have access to the "Manage Club" dashboard where you can approve members and submit activity reports.</p>
            <div style="margin: 20px 0;">
                <a href="http://localhost:5173/clubs" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Dashboard</a>
            </div>
            <p>Keep up the great work!</p>
            <hr />
            <p style="font-size: 12px; color: #999;">DBU Student Council Management System</p>
        </div>
    `;
    return sendEmail({ to: email, subject: "New Role: Club Representative Appointment", html });
};

const sendMemberApprovalEmail = async (email, name, clubName, telegramLink = null) => {
    const telegramSection = telegramLink ? `
        <div style="margin-top: 20px; padding: 18px; background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px;">
            <p style="margin: 0 0 6px 0; font-weight: bold; color: #0284c7; font-size: 15px;">⚜️ Official Telegram Community</p>
            <p style="margin: 0 0 14px 0; font-size: 13px; color: #334155; line-height: 1.5;">
                As an approved member, you are invited to join the official Rotaract Telegram group. Note that group administrators review and approve all join requests upon entry.
            </p>
            <a href="${telegramLink}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #0088cc; color: #ffffff; padding: 11px 22px; text-decoration: none; border-radius: 7px; font-weight: bold; font-size: 13px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                Join Official Telegram Group
            </a>
        </div>
    ` : '';

    const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 600px; margin: 0 auto; color: #1e293b;">
            <div style="margin-bottom: 20px;">
                <span style="background-color: #dcfce7; color: #15803d; font-size: 12px; font-weight: bold; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em;">Membership Approved</span>
            </div>
            <h1 style="color: #059669; margin: 0 0 16px 0; font-size: 22px;">🎉 Congratulations & Welcome to ${clubName}!</h1>
            <p style="font-size: 15px; line-height: 1.6; margin: 0 0 12px 0;">Hello <strong>${name}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 14px 0;">
                Congratulations! Your application to join <strong>${clubName}</strong> has been officially approved by the club leadership.
            </p>
            <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 14px 0;">
                You are now an official member of the club. We are excited to have you contribute, connect with peers, and take part in upcoming activities, workshops, and initiatives.
            </p>
            ${telegramSection}
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
                <p style="margin: 0;">DBU Student Union • Student Council Management System</p>
                <p style="margin: 4px 0 0 0;">Debre Berhan University, Ethiopia</p>
            </div>
        </div>
    `;
    return sendEmail({ to: email, subject: `🎉 Congratulations & Welcome to ${clubName}!`, html });
};

const sendRestrictionEmail = async (email, name, reason) => {
    const html = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h1 style="color: #ef4444;">Important Account Notice</h1>
            <p>Hello ${name},</p>
            <p>Your account on the DBU Student Union platform has been <strong>restricted</strong> by the Coordinator.</p>
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold; color: #991b1b;">Reason for Restriction:</p>
                <p style="margin: 5px 0 0; color: #b91c1c;">${reason || "No specific reason provided."}</p>
            </div>
            <p>During this period, your access to the platform will be limited. Please contact the Student Union office to resolve this matter.</p>
            <hr />
            <p style="font-size: 12px; color: #999;">DBU Student Council Management System</p>
        </div>
    `;
    return sendEmail({ to: email, subject: "Important Notice: Account Restricted", html });
};

const sendUnrestrictionEmail = async (email, name) => {
    const html = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h1 style="color: #10b981;">Account Restored</h1>
            <p>Hello ${name},</p>
            <p>Good news! Your account restrictions have been lifted by the DBU Student Union Coordinator.</p>
            <p>You can now log in and access all platform features as usual.</p>
            <div style="margin: 20px 0;">
                <a href="http://localhost:5173/login" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Log In Now</a>
            </div>
            <hr />
            <p style="font-size: 12px; color: #999;">DBU Student Council Management System</p>
        </div>
    `;
    return sendEmail({ to: email, subject: "Account Restored: Access Granted", html });
};

module.exports = {
    transporter,
    sendEmail,
    sendRepresentativeAppointmentEmail,
    sendMemberApprovalEmail,
    sendRestrictionEmail,
    sendUnrestrictionEmail
};
