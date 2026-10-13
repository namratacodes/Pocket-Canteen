import { Router } from 'express';
import { z } from 'zod';
import { wrap } from '../../middleware/asyncHandler';
import { authenticate } from '../../middleware/auth';
import { requireStaff } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { menuService } from './menu.service';

const router = Router();

// GET /canteens/:id/menu (Student & Authenticated Users)
router.get(
  '/canteens/:id/menu',
  authenticate,
  validate({
    params: z
      .object({
        id: z.string().uuid(),
      })
      .strict(),
  }),
  wrap(async (req, res) => {
    const result = await menuService.getStudentMenu(req.params.id);
    res.status(200).json({ data: result });
  }),
);

// GET /staff/menu (Staff of that canteen)
router.get(
  '/staff/menu',
  authenticate,
  requireStaff,
  wrap(async (req, res) => {
    const result = await menuService.getStaffMenu(req.canteenId!);
    res.status(200).json({ data: result });
  }),
);

// POST /staff/menu (Staff creates menu item)
router.post(
  '/staff/menu',
  authenticate,
  requireStaff,
  validate({
    body: z
      .object({
        name: z.string().min(1).max(120),
        pricePaise: z.number().int().min(0).max(1000000),
        category: z.string().min(1).max(50),
        imageUrl: z.string().nullable().optional(),
        isAvailable: z.boolean().default(true),
        prep: z
          .object({
            basePrepSeconds: z.number().int().min(30).max(3600).default(180),
            complexityWeight: z.number().min(0.5).max(5).default(1.0),
            cookingStation: z.string().min(1).max(50).default('main_counter'),
            batchable: z.boolean().default(false),
          })
          .default({}),
      })
      .strict(),
  }),
  wrap(async (req, res) => {
    const result = await menuService.createMenuItem(req.canteenId!, req.user!.id, req.body);
    res.status(201).json({ data: result });
  }),
);

// PATCH /staff/menu/:itemId (Staff updates menu item)
router.patch(
  '/staff/menu/:itemId',
  authenticate,
  requireStaff,
  validate({
    params: z
      .object({
        itemId: z.string().uuid(),
      })
      .strict(),
    body: z
      .object({
        name: z.string().min(1).max(120).optional(),
        pricePaise: z.number().int().min(0).max(1000000).optional(),
        category: z.string().min(1).max(50).optional(),
        imageUrl: z.string().nullable().optional(),
        isAvailable: z.boolean().optional(),
        prep: z
          .object({
            basePrepSeconds: z.number().int().min(30).max(3600).optional(),
            complexityWeight: z.number().min(0.5).max(5).optional(),
            cookingStation: z.string().min(1).max(50).optional(),
            batchable: z.boolean().optional(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field must be provided',
      }),
  }),
  wrap(async (req, res) => {
    const result = await menuService.updateMenuItem(
      req.canteenId!,
      req.user!.id,
      req.params.itemId,
      req.body,
    );
    res.status(200).json({ data: result });
  }),
);

// PATCH /staff/menu/:itemId/availability (Staff toggles item availability)
router.patch(
  '/staff/menu/:itemId/availability',
  authenticate,
  requireStaff,
  validate({
    params: z
      .object({
        itemId: z.string().uuid(),
      })
      .strict(),
    body: z
      .object({
        isAvailable: z.boolean(),
      })
      .strict(),
  }),
  wrap(async (req, res) => {
    const result = await menuService.toggleAvailability(
      req.canteenId!,
      req.user!.id,
      req.params.itemId,
      req.body.isAvailable,
    );
    res.status(200).json({ data: result });
  }),
);

export default router;
