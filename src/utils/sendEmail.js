import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (options) => {
    try {
        const data = await resend.emails.send({
            from: 'CloudDrive <onboarding@resend.dev>', // Default Resend test email
            to: options.email,
            subject: options.subject,
            html: options.html || `<p>${options.message}</p>`,
        });

        return data;
    } catch (error) {
        console.error('Resend Error:', error);
        throw new Error('Email failed to send');
    }
};

export default sendEmail;
