import { Router } from 'express';
import { z } from 'zod';
import { wrap } from '../../middleware/asyncHandler';
import { rateLimit } from '../../middleware/rateLimit';
import { validate } from '../../middleware/validate';
import { authService } from './auth.service';
import { otpService } from './otp.service';
import { tokensService } from './tokens.service';

const router = Router();

router.post(
  '/auth/otp/request',
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    key: (req) => req.ip || 'ip',
  }),
  validate({
    body: z
      .object({
        email: z.string().trim().toLowerCase().email(),
      })
      .strict(),
  }),
  wrap(async (req, res) => {
    const result = await otpService.requestOtp(req.body.email);
    res.status(202).json({ data: result });
  }),
);

router.post(
  '/auth/otp/verify',
  validate({
    body: z
      .object({
        email: z.string().trim().toLowerCase().email(),
        code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
      })
      .strict(),
  }),
  wrap(async (req, res) => {
    const { user, isNewUser } = await otpService.verifyOtp(req.body.email, req.body.code);
    const tokens = await tokensService.issueTokens({
      id: user.id,
      role: user.role,
      canteenId: user.canteenId,
    });

    res.status(200).json({
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user,
        isNewUser,
      },
    });
  }),
);

router.post(
  '/auth/login',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    key: (req) => `${req.ip || 'ip'}_${req.body?.email ?? ''}`,
  }),
  validate({
    body: z
      .object({
        email: z.string().trim().toLowerCase().email(),
        password: z.string().min(1, 'Password is required'),
      })
      .strict(),
  }),
  wrap(async (req, res) => {
    const result = await authService.passwordLogin(req.body.email, req.body.password);
    res.status(200).json({ data: result });
  }),
);

router.post(
  '/auth/refresh',
  validate({
    body: z
      .object({
        refreshToken: z.string().min(1, 'Refresh token is required'),
      })
      .strict(),
  }),
  wrap(async (req, res) => {
    const result = await tokensService.rotateRefreshToken(req.body.refreshToken);
    res.status(200).json({ data: result });
  }),
);

router.post(
  '/auth/logout',
  validate({
    body: z
      .object({
        refreshToken: z.string().min(1, 'Refresh token is required'),
      })
      .strict(),
  }),
  wrap(async (req, res) => {
    const result = await tokensService.revokeRefreshToken(req.body.refreshToken);
    res.status(200).json({ data: result });
  }),
);

export default router;
