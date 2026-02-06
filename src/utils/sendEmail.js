import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const sendEmail = async (options) => {
    // Validate SMTP credentials are configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log('❌ SMTP CREDENTIALS MISSING!');
        console.log('   SMTP_USER:', process.env.SMTP_USER ? '✅ Set' : '❌ NOT SET');
        console.log('   SMTP_PASS:', process.env.SMTP_PASS ? '✅ Set (hidden)' : '❌ NOT SET');
        throw new Error('Email service not configured - SMTP credentials missing');
    }

    console.log('📤 Attempting to send email via Gmail SMTP...');
    console.log('   Using SMTP_USER:', process.env.SMTP_USER);

    // 1. Create a transporter for Gmail SMTP
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.SMTP_USER, // Your Gmail address
            pass: process.env.SMTP_PASS, // Your Gmail App Password
        },
    });

    try {
        const mailOptions = {
            // Gmail automatically overrides the 'from' address to the authenticated user, 
            // but we can set a display name.
            from: `"CloudDrive" <${process.env.SMTP_USER}>`,
            to: options.email,
            subject: options.subject,
            html: options.html || `<p>${options.message}</p>`,
        };

        // HACKATHON SAFETY: Always log the link to terminal in case of delivery issues
        console.log('-----------------------------------------');
        console.log('📧 EMAIL SENT TO:', options.email);
        console.log('🔗 SUBJECT:', options.subject);
        if (options.html) {
            // Find the first href that actually looks like a URL (not just "#")
            const links = options.html.match(/href="([^"|#][^"]+)"/g);
            if (links && links.length > 0) {
                const activationLink = links[0].match(/"([^"]+)"/)[1];
                console.log('📍 ACTION LINK (COPY THIS):');
                console.log('\x1b[36m%s\x1b[0m', activationLink); // Cyan color
            }
        }
        console.log('-----------------------------------------');

        // TIMEOUT: Race against a 15-second timer (since it's background, we can wait longer)
        const sendPromise = transporter.sendMail(mailOptions);
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection timeout')), 15000)
        );

        const info = await Promise.race([sendPromise, timeoutPromise]);

        console.log('✅ EMAIL SENT SUCCESSFULLY!');
        console.log('   Message ID:', info.messageId);
        return info;
    } catch (error) {
        console.log('❌ SMTP ERROR OCCURRED:');
        console.log('   Error Name:', error.name);
        console.log('   Error Message:', error.message);
        console.log('   Error Code:', error.code || 'N/A');
        console.log('   Response Code:', error.responseCode || 'N/A');
        console.log('   Response:', error.response || 'N/A');

        // Common Gmail errors
        if (error.code === 'EAUTH') {
            console.log('   🔑 AUTHENTICATION FAILED - Check SMTP_USER and SMTP_PASS');
            console.log('   💡 Make sure you are using a Gmail App Password, not your regular password');
        } else if (error.code === 'ESOCKET' || error.code === 'ECONNECTION') {
            console.log('   🌐 CONNECTION FAILED - Network or firewall issue');
        } else if (error.message === 'Connection timeout') {
            console.log('   ⏱️ TIMEOUT - Gmail took too long to respond');
        }

        throw new Error('Email delivery failed: ' + error.message);
    }
};

export default sendEmail;
