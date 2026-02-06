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

    // Check if Brevo API key is configured
    if (!process.env.BREVO_API_KEY) {
        console.log('⚠️  BREVO_API_KEY not configured - running in offline mode');
        console.log('📋 To enable emails, add BREVO_API_KEY to your environment variables');
        console.log('🔗 Get your free API key at: https://app.brevo.com/settings/keys/api');
        // Don't throw error - allow registration to continue, link is logged above
        return { messageId: 'offline-mode', message: 'Email skipped - API key not configured' };
    }

    console.log('📤 Sending email via Brevo API...');

    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': process.env.BREVO_API_KEY,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                sender: {
                    name: 'CloudDrive',
                    email: process.env.FROM_EMAIL || 'noreply@clouddrive.com'
                },
                to: [{ email: options.email }],
                subject: options.subject,
                htmlContent: options.html || `<p>${options.message}</p>`,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.log('❌ BREVO API ERROR:');
            console.log('   Status:', response.status);
            console.log('   Response:', JSON.stringify(data, null, 2));
            throw new Error(data.message || 'Brevo API error');
        }

        console.log('✅ EMAIL SENT SUCCESSFULLY!');
        console.log('   Message ID:', data.messageId);
        return data;

    } catch (error) {
        console.log('❌ EMAIL SEND FAILED:');
        console.log('   Error Name:', error.name);
        console.log('   Error Message:', error.message);

        // Don't throw - let registration continue, the link is logged to console
        return { messageId: 'error-fallback', message: error.message };
    }
};

export default sendEmail;
