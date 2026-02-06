import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import connectDB from './src/config/db.js';

import userRoutes from './src/routes/userRoutes.js';
import fileRoutes from './src/routes/fileRoutes.js';
import { notFound, errorHandler } from './src/middleware/errorMiddleware.js';

dotenv.config();

connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Render/Vercel deployment (required for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

app.use(helmet());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api', limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl)
        if (!origin) return callback(null, true);

        // Dynamic Check: Allow Localhost OR any Vercel App
        if (origin.includes('localhost') || origin.includes('vercel.app')) {
            return callback(null, true);
        }

        // Fallback: Check strictly against env var
        if (origin === process.env.FRONTEND_URL) {
            return callback(null, true);
        }

        console.log('BLOCKED BY CORS:', origin);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.get('/health-check', (req, res) => {
    res.send('Server is running!!!');
});

app.use('/api/user', userRoutes);
app.use('/api/files', fileRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});