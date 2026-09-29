import { Router, Request, Response } from 'express';
import { HolidayRequest, IHolidayRequest } from '../entities/HolidayRequest';
import { User } from '../entities/User';
import { countWorkdaysBreakdown } from '../services/workday.service';
import {
  sendManagerNotification,
  buildHREmailDraft,
  sendHRNotification,
} from '../services/email.service';
import { requireAuth, requireRoles } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

type YearlyWorkdayMap = Record<number, number>;

function addYearlyWorkdays(target: YearlyWorkdayMap, source: YearlyWorkdayMap): void {
  for (const [year, days] of Object.entries(source)) {
    const yearKey = Number(year);
    target[yearKey] = (target[yearKey] ?? 0) + days;
  }
}

async function getApprovedUsageByYear(userId: string, excludeRequestId?: string): Promise<YearlyWorkdayMap> {
  const approvedRequests = await HolidayRequest.find({ userId, status: 'approved' });

  const relevantRequests = excludeRequestId === undefined
    ? approvedRequests
    : approvedRequests.filter((request) => request.id !== excludeRequestId);

  const usageByYear: YearlyWorkdayMap = {};
  const breakdowns = await Promise.all(
    relevantRequests.map((request) => countWorkdaysBreakdown(request.startDate, request.endDate)),
  );

  breakdowns.forEach((breakdown) => addYearlyWorkdays(usageByYear, breakdown.byYear));
  return usageByYear;
}

function findExceededYear(
  totalHolidayDays: number,
  approvedUsageByYear: YearlyWorkdayMap,
  requestedUsageByYear: YearlyWorkdayMap,
): { year: number; remaining: number; requested: number } | null {
  const years = Object.keys(requestedUsageByYear)
    .map(Number)
    .sort((a, b) => a - b);

  for (const year of years) {
    const requested = requestedUsageByYear[year] ?? 0;
    const used = approvedUsageByYear[year] ?? 0;
    const remaining = totalHolidayDays - used;

    if (used + requested > totalHolidayDays) {
      return { year, remaining, requested };
    }
  }

  return null;
}

// Flattens a (possibly populated) request document into the shape the frontend expects.
function serializeRequest(doc: IHolidayRequest) {
  const obj = doc.toObject({ virtuals: true }) as Record<string, any>;
  const userVal = obj.userId;
  const isPopulated = userVal && typeof userVal === 'object' && userVal._id;
  return {
    id: obj._id.toString(),
    userId: isPopulated ? userVal._id.toString() : userVal.toString(),
    user: isPopulated
      ? {
          id: userVal._id.toString(),
          name: userVal.name,
          email: userVal.email,
          role: userVal.role,
          totalHolidayDays: userVal.totalHolidayDays,
        }
      : undefined,
    startDate: obj.startDate,
    endDate: obj.endDate,
    workdaysCount: obj.workdaysCount,
    status: obj.status,
    reason: obj.reason,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

// GET /api/requests — all requests (manager view)
router.get('/', requireRoles('manager', 'hr'), async (_req: Request, res: Response) => {
  try {
    const requests = await HolidayRequest.find().sort({ createdAt: -1 }).populate('userId');
    res.json(requests.map(serializeRequest));
  } catch {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// GET /api/requests/mine — requests for the authenticated user
router.get('/mine', async (req: Request, res: Response) => {
  try {
    const requests = await HolidayRequest.find({ userId: req.authUser!.id })
      .sort({ createdAt: -1 })
      .populate('userId');
    res.json(requests.map(serializeRequest));
  } catch {
    res.status(500).json({ error: 'Failed to fetch user requests' });
  }
});

// POST /api/requests — submit a new vacation request
router.post('/', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, reason } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const user = req.authUser!;
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check remaining balance
    const approvedUsageByYear = await getApprovedUsageByYear(user.id);
    const requestedBreakdown = await countWorkdaysBreakdown(startDate, endDate);
    const exceededYear = findExceededYear(user.totalHolidayDays, approvedUsageByYear, requestedBreakdown.byYear);

    if (exceededYear) {
      return res.status(400).json({
        error: `Insufficient balance for ${exceededYear.year}. Remaining: ${exceededYear.remaining} days, Requested: ${exceededYear.requested} days`,
      });
    }

    const saved = await HolidayRequest.create({
      userId: user.id,
      startDate,
      endDate,
      workdaysCount: requestedBreakdown.total,
      status: 'pending',
      reason: reason || '',
    });

    // Notify manager via email — look up manager from DB
    const manager = await User.findOne({ role: 'manager' });
    if (manager) {
      await sendManagerNotification({
        employeeName: user.name,
        employeeEmail: user.email,
        startDate,
        endDate,
        workdaysCount: requestedBreakdown.total,
        reason,
        requestId: saved.id,
        managerEmail: manager.email,
      });
    }

    return res.status(201).json(serializeRequest(await saved.populate('userId')));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create request';
    return res.status(500).json({ error: message });
  }
});

// PATCH /api/requests/:id/approve — manager approves
router.patch('/:id/approve', requireRoles('manager', 'hr'), async (req: Request, res: Response) => {
  try {
    const request = await HolidayRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending requests can be approved' });
    }

    const user = await User.findById(request.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const approvedUsageByYear = await getApprovedUsageByYear(user.id);
    const requestedBreakdown = await countWorkdaysBreakdown(request.startDate, request.endDate);
    const exceededYear = findExceededYear(user.totalHolidayDays, approvedUsageByYear, requestedBreakdown.byYear);

    if (exceededYear) {
      return res.status(400).json({
        error: `Insufficient balance for ${exceededYear.year}. Remaining: ${exceededYear.remaining} days, Requested: ${exceededYear.requested} days`,
      });
    }

    request.status = 'approved';
    await request.save();
    return res.json(serializeRequest(await request.populate('userId')));
  } catch {
    return res.status(500).json({ error: 'Failed to approve request' });
  }
});

// PATCH /api/requests/:id/reject — manager rejects
router.patch('/:id/reject', requireRoles('manager', 'hr'), async (req: Request, res: Response) => {
  try {
    const request = await HolidayRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending requests can be rejected' });
    }

    request.status = 'rejected';
    await request.save();
    return res.json(serializeRequest(await request.populate('userId')));
  } catch {
    return res.status(500).json({ error: 'Failed to reject request' });
  }
});

// PATCH /api/requests/:id — employee edits own pending request
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const requestId = req.params.id;
    const { startDate, endDate, reason } = req.body as {
      startDate?: string;
      endDate?: string;
      reason?: string;
    };

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ error: 'startDate must be on or before endDate' });
    }

    const request = await HolidayRequest.findById(requestId);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    if (request.userId.toString() !== req.authUser!.id) {
      return res.status(403).json({ error: 'You can only edit your own requests' });
    }

    if (request.status === 'rejected') {
      return res.status(400).json({ error: 'Rejected requests cannot be edited' });
    }

    const user = req.authUser!;

    const approvedUsageByYear = await getApprovedUsageByYear(user.id, request.id);
    const requestedBreakdown = await countWorkdaysBreakdown(startDate, endDate);
    const exceededYear = findExceededYear(user.totalHolidayDays, approvedUsageByYear, requestedBreakdown.byYear);

    if (exceededYear) {
      return res.status(400).json({
        error: `Insufficient balance for ${exceededYear.year}. Remaining: ${exceededYear.remaining} days, Requested: ${exceededYear.requested} days`,
      });
    }

    request.startDate = startDate;
    request.endDate = endDate;
    request.workdaysCount = requestedBreakdown.total;
    request.reason = reason || '';
    // Editing an approved request requires manager approval again.
    if (request.status === 'approved') {
      request.status = 'pending';
    }

    await request.save();
    return res.json(serializeRequest(await request.populate('userId')));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to edit request';
    return res.status(500).json({ error: message });
  }
});

// DELETE /api/requests/:id — employee deletes own request
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const requestId = req.params.id;

    const request = await HolidayRequest.findById(requestId);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    if (request.userId.toString() !== req.authUser!.id) {
      return res.status(403).json({ error: 'You can only delete your own requests' });
    }

    await request.deleteOne();
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Failed to delete request' });
  }
});

// GET /api/requests/:id/hr-email — get pre-composed HR email draft
router.get('/:id/hr-email', requireRoles('manager', 'hr'), async (req: Request, res: Response) => {
  try {
    const request = await HolidayRequest.findById(req.params.id).populate('userId');
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'approved') {
      return res.status(400).json({ error: 'Request must be approved before sending HR email' });
    }

    const hrUser = await User.findOne({ role: 'hr' });
    if (!hrUser) return res.status(404).json({ error: 'No HR user found in the system. Add one via Admin.' });

    const hrFirstName = hrUser.name.split(' ')[0];
    const employee = request.userId as any;

    const draft = buildHREmailDraft(
      {
        employeeName: employee.name,
        employeeEmail: employee.email,
        startDate: request.startDate,
        endDate: request.endDate,
        workdaysCount: request.workdaysCount,
        reason: request.reason,
        requestId: request.id,
        managerEmail: '',
      },
      hrUser.email,
      hrFirstName,
    );

    return res.json(draft);
  } catch {
    return res.status(500).json({ error: 'Failed to build HR email draft' });
  }
});

// POST /api/requests/:id/send-hr — employee sends HR email after reviewing draft
router.post('/:id/send-hr', requireRoles('manager', 'hr'), async (req: Request, res: Response) => {
  try {
    const request = await HolidayRequest.findById(req.params.id).populate('userId');
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'approved') {
      return res.status(400).json({ error: 'Request must be approved' });
    }

    const hrUser = await User.findOne({ role: 'hr' });
    if (!hrUser) return res.status(404).json({ error: 'No HR user found in the system.' });

    const hrFirstName = hrUser.name.split(' ')[0];
    const employee = request.userId as any;

    const draft = buildHREmailDraft(
      {
        employeeName: employee.name,
        employeeEmail: employee.email,
        startDate: request.startDate,
        endDate: request.endDate,
        workdaysCount: request.workdaysCount,
        reason: request.reason,
        requestId: request.id,
        managerEmail: '',
      },
      hrUser.email,
      hrFirstName,
    );

    await sendHRNotification(draft, employee.name);
    return res.json({ success: true, message: 'HR notified successfully' });
  } catch {
    return res.status(500).json({ error: 'Failed to send HR email' });
  }
});

export default router;

