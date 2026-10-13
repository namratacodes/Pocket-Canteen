import argon2 from 'argon2';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '../../src/config/env';
import * as cryptoLib from '../../src/lib/crypto';
import { verifyAccessToken } from '../../src/lib/jwt';
import { fromPaise } from '../../src/lib/money';
import { prisma } from '../../src/lib/prisma';
import identityModule from '../../src/modules/identity';
import { appWith, bearer, makeCanteen, makeUser, resetDb } from '../helpers';

describe('Phase 1: Identity & Platform Admin', () => {
  const app = appWith(identityModule);

  beforeEach(async () => {
    await resetDb();
    vi.restoreAllMocks();
  });

  // 1. OTP request: 4th request within 10 minutes is 429; disallowed domain is 403
  it('1. OTP request: rate limits at 3 per 10m (4th is 429) and rejects disallowed domains with 403', async () => {
    const email = 'student1@college.edu';

    // 1st request -> 202
    const res1 = await app.post('/api/v1/auth/otp/request').send({ email });
    expect(res1.status).toBe(202);
    expect(res1.body.data.sent).toBe(true);

    // 2nd request -> 202
    const res2 = await app.post('/api/v1/auth/otp/request').send({ email });
    expect(res2.status).toBe(202);

    // 3rd request -> 202
    const res3 = await app.post('/api/v1/auth/otp/request').send({ email });
    expect(res3.status).toBe(202);

    // 4th request within 10 minutes -> 429 RATE_LIMITED
    const res4 = await app.post('/api/v1/auth/otp/request').send({ email });
    expect(res4.status).toBe(429);
    expect(res4.body.error.code).toBe('RATE_LIMITED');

    // Test disallowed email domain
    env.ALLOWED_EMAIL_DOMAINS = 'college.edu,campus.ac.in';
    const disallowedRes = await app
      .post('/api/v1/auth/otp/request')
      .send({ email: 'hacker@gmail.com' });
    expect(disallowedRes.status).toBe(403);
    expect(disallowedRes.body.error.code).toBe('EMAIL_DOMAIN_NOT_ALLOWED');
    env.ALLOWED_EMAIL_DOMAINS = ''; // reset
  });

  // 2. OTP verify: success creates student & wallet; reusing fails; 5 wrong codes locks; expired code is 400
  it('2. OTP verify: creates student & wallet, rejects replay, locks after 5 failures, rejects expired', async () => {
    const email = 'newstudent@college.edu';

    vi.spyOn(cryptoLib, 'randomDigits').mockReturnValue('654321');

    await app.post('/api/v1/auth/otp/request').send({ email });

    // 2a. Verify with correct code -> creates student and wallet
    const verifyRes = await app.post('/api/v1/auth/otp/verify').send({ email, code: '654321' });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.isNewUser).toBe(true);
    expect(verifyRes.body.data.user.email).toBe(email);
    expect(verifyRes.body.data.user.role).toBe('student');
    expect(verifyRes.body.data.accessToken).toBeDefined();
    expect(verifyRes.body.data.refreshToken).toBeDefined();

    // Check user & wallet in DB
    const dbUser = await prisma.user.findUnique({ where: { email } });
    expect(dbUser).not.toBeNull();
    const dbWallet = await prisma.wallet.findUnique({ where: { userId: dbUser!.id } });
    expect(dbWallet).not.toBeNull();
    expect(Number(dbWallet!.balance)).toBe(0);

    // 2b. Reusing the same code fails (400 OTP_INVALID)
    const replayRes = await app.post('/api/v1/auth/otp/verify').send({ email, code: '654321' });
    expect(replayRes.status).toBe(400);
    expect(replayRes.body.error.code).toBe('OTP_INVALID');

    // 2c. 5 wrong codes lock the challenge (429 OTP_LOCKED)
    const email2 = 'bruteforce@college.edu';
    vi.spyOn(cryptoLib, 'randomDigits').mockReturnValue('112233');
    await app.post('/api/v1/auth/otp/request').send({ email: email2 });

    for (let i = 0; i < 4; i++) {
      const wrongRes = await app.post('/api/v1/auth/otp/verify').send({ email: email2, code: '000000' });
      expect(wrongRes.status).toBe(400);
      expect(wrongRes.body.error.code).toBe('OTP_INVALID');
      expect(wrongRes.body.error.details.attemptsLeft).toBe(4 - i);
    }

    // 5th wrong attempt -> 400 with 0 attempts left
    const fifthWrong = await app.post('/api/v1/auth/otp/verify').send({ email: email2, code: '000000' });
    expect(fifthWrong.status).toBe(400);
    expect(fifthWrong.body.error.code).toBe('OTP_INVALID');
    expect(fifthWrong.body.error.details.attemptsLeft).toBe(0);

    // 6th attempt -> 429 OTP_LOCKED
    const lockedRes = await app.post('/api/v1/auth/otp/verify').send({ email: email2, code: '112233' });
    expect(lockedRes.status).toBe(429);
    expect(lockedRes.body.error.code).toBe('OTP_LOCKED');

    // 2d. Expired code -> 400 OTP_EXPIRED
    const email3 = 'expired@college.edu';
    vi.spyOn(cryptoLib, 'randomDigits').mockReturnValue('999999');
    await app.post('/api/v1/auth/otp/request').send({ email: email3 });

    // Manually expire the challenge in DB
    await prisma.otpChallenge.updateMany({
      where: { email: email3 },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const expiredRes = await app.post('/api/v1/auth/otp/verify').send({ email: email3, code: '999999' });
    expect(expiredRes.status).toBe(400);
    expect(expiredRes.body.error.code).toBe('OTP_EXPIRED');
  });

  // 3. A staff email trying OTP login gets 403
  it('3. Staff email trying OTP login gets 403 FORBIDDEN', async () => {
    const canteen = await makeCanteen();
    const staff = await makeUser('staff', { canteenId: canteen.id, email: 'staff1@college.edu' });

    vi.spyOn(cryptoLib, 'randomDigits').mockReturnValue('123456');
    await app.post('/api/v1/auth/otp/request').send({ email: staff.email });

    const res = await app.post('/api/v1/auth/otp/verify').send({ email: staff.email, code: '123456' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // 4. Password login: success for staff and admin; wrong password/email is 401; inactive is 403
  it('4. Password login: success for staff & admin; wrong credentials return 401; inactive returns 403', async () => {
    const canteen = await makeCanteen();
    const password = 'SecretPassword123!';
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

    const staff = await prisma.user.create({
      data: {
        name: 'Staff Member',
        email: 'staff.auth@test.edu',
        role: 'staff',
        canteenId: canteen.id,
        passwordHash,
      },
    });

    const admin = await prisma.user.create({
      data: {
        name: 'Admin Member',
        email: 'admin.auth@test.edu',
        role: 'admin',
        passwordHash,
      },
    });

    // 4a. Staff login success -> access token carries canteenId
    const staffLogin = await app.post('/api/v1/auth/login').send({
      email: staff.email,
      password,
    });
    expect(staffLogin.status).toBe(200);
    expect(staffLogin.body.data.user.role).toBe('staff');
    expect(staffLogin.body.data.user.canteenId).toBe(canteen.id);
    const staffPayload = verifyAccessToken(staffLogin.body.data.accessToken);
    expect(staffPayload.canteenId).toBe(canteen.id);

    // 4b. Admin login success -> access token carries null canteenId
    const adminLogin = await app.post('/api/v1/auth/login').send({
      email: admin.email,
      password,
    });
    expect(adminLogin.status).toBe(200);
    expect(adminLogin.body.data.user.role).toBe('admin');
    expect(adminLogin.body.data.user.canteenId).toBeNull();
    const adminPayload = verifyAccessToken(adminLogin.body.data.accessToken);
    expect(adminPayload.canteenId).toBeNull();

    // 4c. Wrong password -> 401 INVALID_CREDENTIALS
    const wrongPass = await app.post('/api/v1/auth/login').send({
      email: staff.email,
      password: 'WrongPassword',
    });
    expect(wrongPass.status).toBe(401);
    expect(wrongPass.body.error.code).toBe('INVALID_CREDENTIALS');

    // 4d. Unknown email -> 401 INVALID_CREDENTIALS
    const unknownEmail = await app.post('/api/v1/auth/login').send({
      email: 'nonexistent@test.edu',
      password,
    });
    expect(unknownEmail.status).toBe(401);
    expect(unknownEmail.body.error.code).toBe('INVALID_CREDENTIALS');

    // 4e. Inactive user -> 403 ACCOUNT_DISABLED
    await prisma.user.update({ where: { id: staff.id }, data: { isActive: false } });
    const inactiveLogin = await app.post('/api/v1/auth/login').send({
      email: staff.email,
      password,
    });
    expect(inactiveLogin.status).toBe(403);
    expect(inactiveLogin.body.error.code).toBe('ACCOUNT_DISABLED');
  });

  // 5. Refresh rotates; reusing old refresh token revokes the whole family
  it('5. Refresh token rotation & family revocation on reuse', async () => {
    const admin = await makeUser('admin');
    const password = 'AdminPassword123!';
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    await prisma.user.update({ where: { id: admin.id }, data: { passwordHash } });

    // Initial login
    const loginRes = await app.post('/api/v1/auth/login').send({ email: admin.email, password });
    const token1 = loginRes.body.data.refreshToken;

    // First refresh -> success, returns token2
    const refresh1 = await app.post('/api/v1/auth/refresh').send({ refreshToken: token1 });
    expect(refresh1.status).toBe(200);
    const token2 = refresh1.body.data.refreshToken;
    expect(token2).not.toBe(token1);

    // Reuse token1 -> 401 UNAUTHORIZED and revokes all user tokens
    const reuse = await app.post('/api/v1/auth/refresh').send({ refreshToken: token1 });
    expect(reuse.status).toBe(401);
    expect(reuse.body.error.code).toBe('UNAUTHORIZED');

    // Now token2 should also be revoked (family revocation)
    const refresh2 = await app.post('/api/v1/auth/refresh').send({ refreshToken: token2 });
    expect(refresh2.status).toBe(401);
    expect(refresh2.body.error.code).toBe('UNAUTHORIZED');

    // Test logout endpoint
    const logoutRes = await app.post('/api/v1/auth/logout').send({ refreshToken: 'any-token' });
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.data.ok).toBe(true);
  });

  // 6. /me returns walletBalancePaise for students and null for staff
  it('6. /me returns walletBalancePaise for student, null for staff, and PATCH /me updates profile', async () => {
    const student = await makeUser('student', { balancePaise: 7500 });
    const canteen = await makeCanteen();
    const staff = await makeUser('staff', { canteenId: canteen.id });

    // Student /me
    const studentMe = await app.get('/api/v1/me').set(bearer(student));
    expect(studentMe.status).toBe(200);
    expect(studentMe.body.data.email).toBe(student.email);
    expect(studentMe.body.data.walletBalancePaise).toBe(7500);

    // Staff /me
    const staffMe = await app.get('/api/v1/me').set(bearer(staff));
    expect(staffMe.status).toBe(200);
    expect(staffMe.body.data.email).toBe(staff.email);
    expect(staffMe.body.data.walletBalancePaise).toBeNull();

    // PATCH /me
    const patchRes = await app
      .patch('/api/v1/me')
      .set(bearer(student))
      .send({ name: 'Updated Student Name', phone: '+919876543210' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.name).toBe('Updated Student Name');
    expect(patchRes.body.data.phone).toBe('+919876543210');

    // Duplicate phone on staff user -> 409 CONFLICT
    const duplicatePhone = await app
      .patch('/api/v1/me')
      .set(bearer(staff))
      .send({ phone: '+919876543210' });
    expect(duplicatePhone.status).toBe(409);
    expect(duplicatePhone.body.error.code).toBe('CONFLICT');
  });

  // 7. Admin creates canteen (+ payment account atomically); duplicate tokenPrefix is 409; swapping payment account leaves exactly one active
  it('7. Admin creates canteen (+ payment account); duplicate prefix is 409; payment account swap', async () => {
    const admin = await makeUser('admin');

    const canteenPayload = {
      name: 'North Campus Canteen',
      location: 'North Block',
      tokenPrefix: 'N',
      fssaiLicenseNo: 'FSSAI-N-12345',
      operatingHours: { open: '08:00', close: '21:00' },
      paymentAccount: {
        razorpayAccountRef: 'acc_NORTH123',
        bankAccountLast4: '5566',
      },
    };

    // Create canteen
    const createRes = await app
      .post('/api/v1/admin/canteens')
      .set(bearer(admin))
      .send(canteenPayload);
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.name).toBe(canteenPayload.name);
    expect(createRes.body.data.tokenPrefix).toBe('N');
    expect(createRes.body.data.paymentAccount.razorpayAccountRef).toBe('acc_NORTH123');
    expect(createRes.body.data.paymentAccount.bankAccountLast4).toBe('5566');

    const canteenId = createRes.body.data.id;

    // Duplicate tokenPrefix -> 409 CONFLICT
    const dupRes = await app
      .post('/api/v1/admin/canteens')
      .set(bearer(admin))
      .send(canteenPayload);
    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error.code).toBe('CONFLICT');

    // Update canteen & swap payment account
    const patchRes = await app
      .patch(`/api/v1/admin/canteens/${canteenId}`)
      .set(bearer(admin))
      .send({
        name: 'North Campus Food Court',
        paymentAccount: {
          razorpayAccountRef: 'acc_NORTH999',
          bankAccountLast4: '9999',
        },
      });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.name).toBe('North Campus Food Court');
    expect(patchRes.body.data.paymentAccount.razorpayAccountRef).toBe('acc_NORTH999');

    // Ensure exactly ONE payment account is active for this canteen
    const activeAccounts = await prisma.canteenPaymentAccount.findMany({
      where: { canteenId, isActive: true },
    });
    expect(activeAccounts.length).toBe(1);
    expect(activeAccounts[0].razorpayAccountRef).toBe('acc_NORTH999');

    // GET /canteens lists canteens with openNow and operatingHours
    const listRes = await app.get('/api/v1/canteens').set(bearer(admin));
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    const listed = listRes.body.data.find((c: any) => c.id === canteenId);
    expect(listed).toBeDefined();
    expect(listed.openNow).toBeDefined();
  });

  // 8. Staff creation returns temporary password that works on /auth/login and JWT with canteenId
  it('8. Staff creation returns temporary password that works on login and JWT carries canteenId', async () => {
    const admin = await makeUser('admin');
    const canteen = await makeCanteen();

    const staffEmail = 'chef.ramsay@canteen.test';
    const staffRes = await app
      .post(`/api/v1/admin/canteens/${canteen.id}/staff`)
      .set(bearer(admin))
      .send({
        name: 'Gordon Ramsay',
        email: staffEmail,
        phone: '+919988776655',
      });

    expect(staffRes.status).toBe(201);
    expect(staffRes.body.data.user.email).toBe(staffEmail);
    expect(staffRes.body.data.user.role).toBe('staff');
    expect(staffRes.body.data.user.canteenId).toBe(canteen.id);
    const tempPassword = staffRes.body.data.temporaryPassword;
    expect(typeof tempPassword).toBe('string');
    expect(tempPassword.length).toBeGreaterThan(5);

    // Login with temporary password
    const loginRes = await app.post('/api/v1/auth/login').send({
      email: staffEmail,
      password: tempPassword,
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.canteenId).toBe(canteen.id);
    const jwtPayload = verifyAccessToken(loginRes.body.data.accessToken);
    expect(jwtPayload.canteenId).toBe(canteen.id);
    expect(jwtPayload.role).toBe('staff');
  });

  // 9. Non-admin gets 403 on every /admin/* route; no token gets 401
  it('9. Non-admin gets 403 on /admin/*; unauthenticated gets 401', async () => {
    const student = await makeUser('student');
    const canteen = await makeCanteen();
    const staff = await makeUser('staff', { canteenId: canteen.id });

    // No token -> 401
    const noToken = await app.post('/api/v1/admin/canteens').send({});
    expect(noToken.status).toBe(401);
    expect(noToken.body.error.code).toBe('UNAUTHORIZED');

    // Student token -> 403
    const studentCall = await app.post('/api/v1/admin/canteens').set(bearer(student)).send({});
    expect(studentCall.status).toBe(403);
    expect(studentCall.body.error.code).toBe('FORBIDDEN');

    // Staff token -> 403
    const staffCall = await app.post('/api/v1/admin/canteens').set(bearer(staff)).send({});
    expect(staffCall.status).toBe(403);
    expect(staffCall.body.error.code).toBe('FORBIDDEN');
  });

  // 10. Deactivating a user revokes refresh tokens
  it('10. Deactivating user revokes all refresh tokens; self-deactivation by admin rejected', async () => {
    const admin = await makeUser('admin');
    const student = await makeUser('student');

    // Student logs in via OTP
    vi.spyOn(cryptoLib, 'randomDigits').mockReturnValue('111111');
    await app.post('/api/v1/auth/otp/request').send({ email: student.email });
    const verifyRes = await app.post('/api/v1/auth/otp/verify').send({ email: student.email, code: '111111' });
    const studentRefreshToken = verifyRes.body.data.refreshToken;

    // Admin deactivates student
    const deactivateRes = await app
      .patch(`/api/v1/admin/users/${student.id}/active`)
      .set(bearer(admin))
      .send({ isActive: false });
    expect(deactivateRes.status).toBe(200);

    // Refresh token should now be revoked
    const refreshRes = await app.post('/api/v1/auth/refresh').send({ refreshToken: studentRefreshToken });
    expect(refreshRes.status).toBe(401);

    // Admin cannot deactivate themselves (409 CONFLICT)
    const selfDeactivate = await app
      .patch(`/api/v1/admin/users/${admin.id}/active`)
      .set(bearer(admin))
      .send({ isActive: false });
    expect(selfDeactivate.status).toBe(409);
    expect(selfDeactivate.body.error.code).toBe('CONFLICT');
  });
});
