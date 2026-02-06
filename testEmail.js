import sendEmail from './src/utils/sendEmail.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const testEmail = async () => {
    console.log('🚀 Starting Email Service Test...');
    console.log('USING SMTP_USER:', process.env.SMTP_USER);

    try {
        await sendEmail({
            email: process.env.SMTP_USER || 'test@example.com',
            subject: 'Test Email from CloudDrive',
            message: 'This is a test email to verify the email service configuration.',
            html: '<h1>Test Successful</h1><p>Your email service is correctly configured. <a href="http://localhost:5173/verify-email?token=test-token">Verify Link Test</a></p>'
        });
        console.log('✅ TEST PASSED: Check your inbox or terminal logs.');
    } catch (error) {
        console.error('❌ TEST FAILED:', error.message);
    }
};

testEmail();
