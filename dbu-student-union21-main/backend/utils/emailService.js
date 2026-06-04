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

const sendMemberApprovalEmail = async (email, name, clubName) => {
    const html = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h1 style="color: #10b981;">Welcome to ${clubName}!</h1>
            <p>Hello ${name}, your request to join <strong>${clubName}</strong> has been approved by the Club Representative.</p>
            <p>You are now an official member of the club. Stay tuned for upcoming events and announcements!</p>
            <hr />
            <p style="font-size: 12px; color: #999;">DBU Student Council Management System</p>
        </div>
    `;
    return sendEmail({ to: email, subject: `Welcome to ${clubName}!`, html });
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
