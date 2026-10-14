import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getSupabase } from './supabase';

const SECRET = process.env.JWT_SECRET || 'fallback-secret';

export function signToken(user) {
  return jwt.sign(
    { user_id: user.user_id, email: user.email, role: user.role },
    SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request) {
  const auth = request.headers.get('authorization') || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

export async function getCurrentUser(request) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const sb = getSupabase();
  const { data, error } = await sb
    .from('users')
    .select('user_id,email,name,role,picture')
    .eq('user_id', payload.user_id)
    .single();
  if (error) return null;
  return data;
}

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain, hash) {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}
