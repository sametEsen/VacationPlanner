import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from './config/database';
import usersRouter from './routes/users.routes';
import requestsRouter from './routes/requests.routes';
import holidaysRouter from './routes/holidays.routes';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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
