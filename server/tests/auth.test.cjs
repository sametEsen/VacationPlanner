const assert = require('node:assert/strict');
const test = require('node:test');
const { requireAuth, requireRoles, requireSameOrigin } = require('../dist/middleware/auth.middleware.js');
const { hashPassword, verifyPassword, createTemporaryPassword } = require('../dist/services/password.service.js');

function responseSpy() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('password hashes are salted and verify only the original password', async () => {
  const password = createTemporaryPassword();
  const firstHash = await hashPassword(password);
  const secondHash = await hashPassword(password);

  assert.notEqual(firstHash, secondHash);
  assert.equal(await verifyPassword(password, firstHash), true);
  assert.equal(await verifyPassword('wrong password', firstHash), false);
  assert.equal(firstHash.includes(password), false);
});

test('protected routes reject anonymous sessions and gate temporary passwords by environment', () => {
  const previousSetting = process.env.ENFORCE_TEMP_PASSWORD_CHANGE;
  const anonymousResponse = responseSpy();
  let calledNext = false;
  requireAuth({ authUser: undefined }, anonymousResponse, () => { calledNext = true; });
  assert.equal(anonymousResponse.statusCode, 401);
  assert.equal(calledNext, false);

  delete process.env.ENFORCE_TEMP_PASSWORD_CHANGE;
  const localResponse = responseSpy();
  requireAuth({ authUser: { mustChangePassword: true } }, localResponse, () => { calledNext = true; });
  assert.equal(calledNext, true);

  process.env.ENFORCE_TEMP_PASSWORD_CHANGE = 'true';
  const temporaryResponse = responseSpy();
  calledNext = false;
  requireAuth({ authUser: { mustChangePassword: true } }, temporaryResponse, () => { calledNext = true; });
  assert.equal(temporaryResponse.statusCode, 403);
  assert.equal(temporaryResponse.body.code, 'PASSWORD_CHANGE_REQUIRED');
  if (previousSetting === undefined) delete process.env.ENFORCE_TEMP_PASSWORD_CHANGE;
  else process.env.ENFORCE_TEMP_PASSWORD_CHANGE = previousSetting;
});

test('role middleware blocks employees from privileged operations', () => {
  const response = responseSpy();
  let calledNext = false;
  requireRoles('manager', 'hr')({ authUser: { role: 'employee', mustChangePassword: false } }, response, () => { calledNext = true; });
  assert.equal(response.statusCode, 403);
  assert.equal(calledNext, false);
});

test('unsafe requests require an explicitly allowed browser origin', () => {
  process.env.APP_ORIGINS = 'https://planner.example.com';
  const rejected = responseSpy();
  let calledNext = false;
  requireSameOrigin({ method: 'POST', get: () => 'https://attacker.example' }, rejected, () => { calledNext = true; });
  assert.equal(rejected.statusCode, 403);
  assert.equal(calledNext, false);

  const accepted = responseSpy();
  requireSameOrigin({ method: 'POST', get: () => 'https://planner.example.com' }, accepted, () => { calledNext = true; });
  assert.equal(calledNext, true);
});