const bcrypt = require('bcryptjs');
const express = require('express');
const jwt = require('jsonwebtoken');

const TOKEN_TTL = '8h';
const MAX_NAME_LENGTH = 60;
const MIN_PASSWORD_LENGTH = 8;
// bcrypt ignora lo que pasa de 72 bytes: se rechaza para no aceptar contraseñas que no se verifican completas.
const MAX_PASSWORD_BYTES = 72;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_FAILED_LOGINS = 5;
const LOCK_WINDOW_MS = 15 * 60 * 1000;

const unauthorized = (res, error) => res.status(401).json({ error });

function validateRegistration({ name, email, password }) {
  if (typeof name !== 'string' || name.trim() === '') {
    return 'El nombre es obligatorio';
  }
  if (name.trim().length > MAX_NAME_LENGTH) {
    return `El nombre no puede superar los ${MAX_NAME_LENGTH} caracteres`;
  }
  if (typeof email !== 'string' || email.trim().length > 254 || !EMAIL_PATTERN.test(email.trim())) {
    return 'El correo no es válido';
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }
  if (Buffer.byteLength(password) > MAX_PASSWORD_BYTES) {
    return 'La contraseña es demasiado larga';
  }
  return null;
}

/** Cuenta inicios de sesión fallidos por correo, en memoria (se reinicia con el servidor). */
function createLoginLimiter() {
  const failures = new Map();

  const current = (email) => {
    const entry = failures.get(email);
    if (entry && Date.now() - entry.since > LOCK_WINDOW_MS) {
      failures.delete(email);
      return undefined;
    }
    return entry;
  };

  return {
    isLocked: (email) => (current(email)?.count ?? 0) >= MAX_FAILED_LOGINS,
    fail(email) {
      const entry = current(email) ?? { count: 0, since: Date.now() };
      entry.count++;
      failures.set(email, entry);
    },
    reset: (email) => failures.delete(email),
  };
}

function createAuth({ users, jwtSecret, bcryptRounds }) {
  const limiter = createLoginLimiter();
  // Se compara contra este hash cuando el correo no existe, para que el tiempo de respuesta no lo delate.
  const dummyHash = bcrypt.hashSync('contraseña-inexistente', bcryptRounds);

  const issue = (user) => ({
    token: jwt.sign({ sub: String(user.id), name: user.name, email: user.email }, jwtSecret, {
      algorithm: 'HS256',
      expiresIn: TOKEN_TTL,
    }),
    user,
  });

  function requireAuth(req, res, next) {
    const [scheme, token] = (req.get('Authorization') ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      return unauthorized(res, 'Debes iniciar sesión');
    }

    let payload;
    try {
      payload = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
    } catch {
      return unauthorized(res, 'Tu sesión expiró, inicia sesión de nuevo');
    }

    const user = users.findById(Number(payload.sub));
    if (!user) {
      return unauthorized(res, 'Tu sesión expiró, inicia sesión de nuevo');
    }
    req.user = user;
    next();
  }

  const router = express.Router();

  router.post('/register', (req, res) => {
    const body = req.body ?? {};
    const error = validateRegistration(body);
    if (error) {
      return res.status(400).json({ error });
    }

    const email = body.email.trim().toLowerCase();
    if (users.emailExists(email)) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' });
    }

    const user = users.create({
      name: body.name.trim(),
      email,
      passwordHash: bcrypt.hashSync(body.password, bcryptRounds),
    });
    res.status(201).json(issue(user));
  });

  router.post('/login', (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
    }

    const key = email.trim().toLowerCase();
    if (limiter.isLocked(key)) {
      return res.status(429).json({ error: 'Demasiados intentos, espera unos minutos' });
    }

    const found = users.findCredentialsByEmail(key);
    const valid = bcrypt.compareSync(password, found?.password_hash ?? dummyHash);
    if (!found || !valid) {
      limiter.fail(key);
      return unauthorized(res, 'Correo o contraseña incorrectos');
    }

    limiter.reset(key);
    const { password_hash: _hash, ...user } = found;
    res.json(issue(user));
  });

  router.get('/me', requireAuth, (req, res) => {
    res.json(req.user);
  });

  return { router, requireAuth };
}

module.exports = { createAuth };
