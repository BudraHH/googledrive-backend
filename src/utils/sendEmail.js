import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const sendEmail = async (options) => {
    // HACKATHON SAFETY: Always log the link to terminal in case of delivery issues
    console.log('-----------------------------------------');
    console.log('📧 EMAIL SENDING TO:', options.email);
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

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
        console.log('⚠️  RESEND_API_KEY not configured - running in offline mode');
        console.log('📋 To enable emails, add RESEND_API_KEY to your environment variables');
        console.log('🔗 Get your free API key at: https://resend.com');
        // Don't throw error - allow registration to continue, link is logged above
        return { id: 'offline-mode', message: 'Email skipped - API key not configured' };
    }

    console.log('📤 Sending email via Resend API...');

    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        const { data, error } = await resend.emails.send({
            from: process.env.FROM_EMAIL || 'CloudDrive <onboarding@resend.dev>',
            to: options.email,
            subject: options.subject,
            html: options.html || `<p>${options.message}</p>`,
        });

        if (error) {
            console.log('❌ RESEND API ERROR:');
            console.log('   Error:', JSON.stringify(error, null, 2));
            throw new Error(error.message || 'Resend API error');
        }

        console.log('✅ EMAIL SENT SUCCESSFULLY!');
        console.log('   Email ID:', data.id);
        return data;

    } catch (error) {
        console.log('❌ EMAIL SEND FAILED:');
        console.log('   Error Name:', error.name);
        console.log('   Error Message:', error.message);

        // Don't throw - let registration continue, the link is logged to console
        return { id: 'error-fallback', message: error.message };
    }
};

export default sendEmail;
