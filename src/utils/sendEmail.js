import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const sendEmail = async (options) => {
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

        // IMPLEMENT TIMEOUT: Race against a 3-second timer
        const sendPromise = transporter.sendMail(mailOptions);
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Email timeout (3s limit reached)')), 3000)
        );

        const info = await Promise.race([sendPromise, timeoutPromise]);

        return info;
    } catch (error) {
        // HACKATHON MODE: Don't show scary stack traces for known "account not active" errors
        if (error.response && error.response.includes('502 5.7.0')) {
            console.log('⚠️  SMTP NOTICE: Brevo account is pending activation.');
            console.log('✅  FALLBACK: Simulating email send for smooth testing.');
        } else {
            console.log('⚠️  SMTP CONNECTION FAILED (Running in Offline/Hackathon Mode)');
            console.log('   Error:', error.message);
        }

        // We do NOT want to throw here anymore if we want the backend to treat it as "sent via fallback"
        // But the controller anticipates a throw to add the [Note: ...] to the response.
        // Let's keep throwing but make it a specific error the controller can recognize? 
        // Or just let it throw a simple message.
        throw new Error('Email delivery skipped (Offline Mode)');
    }
};

export default sendEmail;
