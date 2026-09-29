import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { randomBytes } from 'crypto';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { connectDB } from './config/database';
import authRouter from './routes/auth.routes';
import usersRouter from './routes/users.routes';
import requestsRouter from './routes/requests.routes';
import holidaysRouter from './routes/holidays.routes';
import { attachAuthenticatedUser, requireSameOrigin } from './middleware/auth.middleware';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3000;

const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET || (isProduction ? '' : randomBytes(32).toString('hex'));
if (!sessionSecret) throw new Error('SESSION_SECRET must be set in production');
if (!process.env.SESSION_SECRET && !isProduction) console.warn('Using an ephemeral development session secret; sessions expire when the server restarts.');

if (isProduction) app.set('trust proxy', 1);
app.use(express.json());
app.use(session({
  name: 'vacation.sid',
  secret: sessionSecret,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI, collectionName: 'sessions', ttl: 8 * 60 * 60 }),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  },
}));
app.use(attachAuthenticatedUser);
app.use('/api', requireSameOrigin);

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/requests', requestsRouter);
app.use('/api/holidays', holidaysRouter);

connectDB()
  .then(() => {
    console.log('Database connected (MongoDB)');
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });

export default app;
