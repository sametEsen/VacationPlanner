import { Router, Request, Response } from 'express';
import { User } from '../entities/User';
import { HolidayRequest } from '../entities/HolidayRequest';
import { countWorkdaysBreakdown } from '../services/workday.service';

const router = Router();

type YearlyWorkdayMap = Record<number, number>;

function addYearlyWorkdays(target: YearlyWorkdayMap, source: YearlyWorkdayMap): void {
  for (const [year, days] of Object.entries(source)) {
    const yearKey = Number(year);
    target[yearKey] = (target[yearKey] ?? 0) + days;
  }
}

async function getApprovedUsageByYear(userId: string): Promise<YearlyWorkdayMap> {
  const approvedRequests = await HolidayRequest.find({ userId, status: 'approved' });

  const usageByYear: YearlyWorkdayMap = {};
  const breakdowns = await Promise.all(
    approvedRequests.map((request) => countWorkdaysBreakdown(request.startDate, request.endDate)),
  );

  breakdowns.forEach((breakdown) => addYearlyWorkdays(usageByYear, breakdown.byYear));
  return usageByYear;
}

// GET /api/users — list all users
router.get('/', async (_req: Request, res: Response) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/:id/balance — get holiday balance for a user
router.get('/:id/balance', async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const currentYear = new Date().getFullYear();
    const usageByYear = await getApprovedUsageByYear(user.id);
    const usedDays = Object.values(usageByYear).reduce((sum, days) => sum + days, 0);
    const usedDaysCurrentYear = usageByYear[currentYear] ?? 0;
    const usedDaysOutsideCurrentYear = usedDays - usedDaysCurrentYear;
    const remainingDays = user.totalHolidayDays - usedDaysCurrentYear;

    return res.json({
      userId: user.id,
      name: user.name,
      totalHolidayDays: user.totalHolidayDays,
      currentYear,
      usedDays,
      usedDaysCurrentYear,
      usedDaysOutsideCurrentYear,
      remainingDays,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

// POST /api/users — create a new user
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, role = 'employee', totalHolidayDays = 25 } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'name and email are required' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'A user with this email already exists' });

    const saved = await User.create({ name, email, role, totalHolidayDays });
    return res.status(201).json(saved);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/users/:id — update a user
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { name, email, role, totalHolidayDays } = req.body;

    if (email && email !== user.email) {
      const conflict = await User.findOne({ email });
      if (conflict) return res.status(409).json({ error: 'Another user with this email already exists' });
    }

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (role !== undefined) user.role = role;
    if (totalHolidayDays !== undefined) user.totalHolidayDays = Number(totalHolidayDays);

    const saved = await user.save();
    return res.json(saved);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update user' });
  }
});


router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const requestCount = await HolidayRequest.countDocuments({ userId: user.id });
    if (requestCount > 0) {
      return res.status(409).json({
        error: `Cannot delete user — they have ${requestCount} holiday request(s). Remove the requests first.`,
      });
    }

    await user.deleteOne();
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
