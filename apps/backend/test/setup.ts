process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://pc:pc@localhost:5432/pocketcanteen_test';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-0123456789abcdef';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-0123456789abcdef';
process.env.PICKUP_SECRET ??= 'test-pickup-secret-0123456789abcdef';
process.env.PAYMENT_GATEWAY ??= 'fake';
