import { Router, Request, Response } from 'express';
import axios from 'axios';
import {
  getCompanyHolidayList,
  addCompanyHoliday,
  removeCompanyHoliday,
} from '../services/holiday.service';

const router = Router();
const NAGER_API = 'https://date.nager.at/api/v3/PublicHolidays';

// GET /api/holidays/public/:year — NL public holidays from Nager.Date
router.get('/public/:year', async (req: Request, res: Response) => {
  try {
    const year = Number(req.params.year);
    const response = await axios.get(`${NAGER_API}/${year}/NL`);
    res.json(response.data);
  } catch {
    res.status(500).json({ error: 'Failed to fetch public holidays from Nager.Date' });
  }
});

// GET /api/holidays/company/:year — company holidays
router.get('/company/:year', async (req: Request, res: Response) => {
  try {
    const year = Number(req.params.year);
    const holidays = await getCompanyHolidayList(year);
    res.json(holidays);
  } catch {
    res.status(500).json({ error: 'Failed to fetch company holidays' });
  }
});

// POST /api/holidays/company — add a company holiday
router.post('/company', async (req: Request, res: Response) => {
  try {
    const { name, date } = req.body;
    if (!name || !date) {
      return res.status(400).json({ error: 'name and date are required' });
    }
    const holiday = await addCompanyHoliday(name, date);
    return res.status(201).json(holiday);
  } catch {
    return res.status(500).json({ error: 'Failed to add company holiday' });
  }
});

// DELETE /api/holidays/company/:id — remove a company holiday
router.delete('/company/:id', async (req: Request, res: Response) => {
  try {
    await removeCompanyHoliday(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to remove company holiday' });
  }
});

export default router;
