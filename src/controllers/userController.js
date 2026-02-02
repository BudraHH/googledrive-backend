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

    try {
        await sendEmail({
            email: user.email,
            subject: 'Account Activation',
            message,
            html: `<h1>Welcome to CloudDrive</h1><p>Please click the link below to activate your account:</p><a href="${activationUrl}">${activationUrl}</a>`
        });

        res.status(201).json({
            message: 'Registration successful. Please check your email to activate your account.'
        });
    } catch (error) {
        console.error('Registration/Email Error DETAILS:', error);
        user.activationToken = undefined;
        user.activationTokenExpire = undefined;
        await user.save();

        res.status(500);
        throw new Error(`Email could not be sent: ${error.message || 'Unknown error'}`);
    }

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

    try {
        await sendEmail({
            email: user.email,
            subject: 'Password Reset Token',
            message,
            html: `<h1>Password Reset</h1><p>Please click the link below to reset your password:</p><a href="${resetUrl}">${resetUrl}</a>`
        });

        res.status(200).json({ message: 'Email sent' });
    } catch (error) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.status(500);
        throw new Error('Email could not be sent');
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