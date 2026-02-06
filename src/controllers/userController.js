import asyncHandler from 'express-async-handler';
import crypto from 'crypto';
import User from '../models/UserModel.js';
import generateToken from '../utils/generateToken.js';
import sendEmail from '../utils/sendEmail.js';

export const registerUser = asyncHandler(async (req, res) => {
    const { firstName, lastName, email, password } = req.body;

    let user = await User.findOne({ email });

    if (user && user.isActive) {
        res.status(400);
        throw new Error('User already exists');
    }

    if (!user) {
        user = new User({
            firstName,
            lastName,
            email,
            password,
            isActive: false
        });
    } else {
        // User exists but is not active - update details and generate new token
        user.firstName = firstName;
        user.lastName = lastName;
        user.password = password;
        user.isActive = false;
    }


    // Generate Activation Token
    const activationToken = user.getActivationToken();
    await user.save();

    // Create activation URL
    const activationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${activationToken}`;

    const message = `Welcome to CloudDrive! \n\n Please activate your account by clicking the link below: \n\n ${activationUrl}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; }
            .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eee; }
            .logo { font-size: 24px; font-weight: bold; color: #2563eb; text-decoration: none; }
            .content { padding: 30px 0; line-height: 1.6; }
            .btn { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
            .footer { font-size: 12px; color: #666; text-align: center; padding-top: 20px; border-top: 1px solid #eee; }
            .link { word-break: break-all; color: #2563eb; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <a href="#" class="logo">CloudDrive</a>
            </div>
            <div class="content">
                <h2>Welcome to CloudDrive, ${user.firstName}!</h2>
                <p>Thank you for signing up. To complete your registration and start securing your files, please activate your account by clicking the button below:</p>
                <div style="text-align: center;">
                    <a href="${activationUrl}" class="btn">Activate Account</a>
                </div>
                <p style="margin-top: 30px;">If the button doesn't work, you can copy and paste the following link into your browser:</p>
                <p class="link">${activationUrl}</p>
                <p>This link will expire in 24 hours.</p>
            </div>
            <div class="footer">
                <p>If you didn't create an account with CloudDrive, you can safely ignore this email.</p>
                <p>&copy; ${new Date().getFullYear()} CloudDrive Inc. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    // Fire-and-Forget: Send email in background without blocking response
    sendEmail({
        email: user.email,
        subject: 'Activate Your CloudDrive Account',
        message,
        html
    }).catch(error => console.log('Background Email Error:', error.message));

    res.status(201).json({
        message: 'Registration successful. Please check your email to activate your account.'
    });

});


export const activateUser = asyncHandler(async (req, res) => {
    // Get hashed token
    const activationToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    const user = await User.findOne({
        activationToken,
        activationTokenExpire: { $gt: Date.now() }
    });

    if (!user) {
        // Double check if account is already active (maybe they clicked twice)
        // Note: This is tricky because we clear the token. 
        // We could look for users with that email if we had it, but we only have the token.
        res.status(400);
        throw new Error('Invalid or expired activation token');
    }

    user.isActive = true;
    user.activationToken = undefined;
    user.activationTokenExpire = undefined;
    await user.save();

    res.status(200).json({
        message: 'Account activated successfully! You can now log in.'
    });
});


export const authUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
        res.status(401);
        throw new Error('Unregistered user');
    }


    if (!user.isActive) {
        res.status(401);
        throw new Error('Account not active. Please check your email for the activation link.');
    }

    if (user && (await user.matchPassword(password))) {
        generateToken(res, user._id);

        res.json({
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
        });
    } else {
        res.status(401);
        throw new Error('Invalid email or password');
    }
});

export const forgotPassword = asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
        res.status(404);
        throw new Error('There is no user with that email');
    }

    const resetToken = user.getResetPasswordToken();
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please click the link below: \n\n ${resetUrl}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; }
            .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eee; }
            .logo { font-size: 24px; font-weight: bold; color: #2563eb; text-decoration: none; }
            .content { padding: 30px 0; line-height: 1.6; }
            .btn { display: inline-block; padding: 12px 24px; background-color: #ef4444; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
            .footer { font-size: 12px; color: #666; text-align: center; padding-top: 20px; border-top: 1px solid #eee; }
            .link { word-break: break-all; color: #2563eb; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <a href="#" class="logo">CloudDrive</a>
            </div>
            <div class="content">
                <h2>Password Reset Request</h2>
                <p>Hello ${user.firstName},</p>
                <p>We received a request to reset your password for your CloudDrive account. Click the button below to choose a new password:</p>
                <div style="text-align: center;">
                    <a href="${resetUrl}" class="btn">Reset Password</a>
                </div>
                <p style="margin-top: 30px;">If you didn't request a password reset, please ignore this email. Your current password will remain safe.</p>
                <p>For security reasons, this link will expire in 1 hour.</p>
                <p class="link">${resetUrl}</p>
            </div>
            <div class="footer">
                <p>CloudDrive Security Team</p>
                <p>&copy; ${new Date().getFullYear()} CloudDrive Inc. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    try {
        await sendEmail({
            email: user.email,
            subject: 'Reset Your CloudDrive Password',
            message,
            html
        });

        res.status(200).json({ message: 'Email sent' });
    } catch (error) {
        console.error('Password reset email failed, but continuing for hackathon safety:', error.message);

        // Preserve tokens so the link in console works
        res.status(200).json({
            message: `Reset request received. [Note: Email service is offline. Use this link: ${resetUrl}]`
        });
    }
});

export const resetPassword = asyncHandler(async (req, res) => {
    // Get hashed token
    const resetPasswordToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
        res.status(400);
        throw new Error('Invalid or expired token');
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ message: 'Password reset successful!' });
});

export const logoutUser = (req, res) => {
    res.cookie('jwt', '', {
        httpOnly: true,
        expires: new Date(0),
    });
    res.status(200).json({ message: 'Logged out successfully' });
};

export const getUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        res.json({
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

export const updateUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        user.firstName = req.body.firstName || user.firstName;
        user.lastName = req.body.lastName || user.lastName;
        user.email = req.body.email || user.email;

        if (req.body.password) {
            user.password = req.body.password;
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            email: updatedUser.email,
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});