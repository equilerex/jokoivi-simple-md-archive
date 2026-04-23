import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import * as dotenv from 'dotenv';
dotenv.config();

const AUTH_USERNAME = process.env.AUTH_USERNAME || 'user';
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'pass';
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'jokoivi-auth-token';
const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;

interface AuthTokenPayload {
  sub: string;
  exp: number;
}

@Injectable()
export class AuthService {
  login(username: string, password: string) {
    if (!this.isValidCredential(username, AUTH_USERNAME) || !this.isValidCredential(password, AUTH_PASSWORD)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const expiresAt = Date.now() + THIRTY_DAYS_MS;
    const token = this.signToken({ sub: AUTH_USERNAME, exp: expiresAt });

    return {
      token,
      expiresAt,
      username: AUTH_USERNAME,
    };
  }

  verifyToken(token: string): AuthTokenPayload {
    const [payloadPart, signaturePart] = token.split('.');
    if (!payloadPart || !signaturePart) {
      throw new UnauthorizedException('Invalid token');
    }

    const expectedSignature = this.sign(payloadPart);
    if (!this.safeEquals(signaturePart, expectedSignature)) {
      throw new UnauthorizedException('Invalid token');
    }

    let payload: AuthTokenPayload;
    try {
      payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as AuthTokenPayload;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    if (payload.sub !== AUTH_USERNAME || payload.exp <= Date.now()) {
      throw new UnauthorizedException('Token expired');
    }

    return payload;
  }

  private signToken(payload: AuthTokenPayload): string {
    const payloadPart = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const signaturePart = this.sign(payloadPart);
    return `${payloadPart}.${signaturePart}`;
  }

  private sign(value: string): string {
    return createHmac('sha256', TOKEN_SECRET).update(value).digest('base64url');
  }

  private isValidCredential(input: string, expected: string): boolean {
    return this.safeEquals(input, expected);
  }

  private safeEquals(a: string, b: string): boolean {
    const aBuffer = Buffer.from(a, 'utf8');
    const bBuffer = Buffer.from(b, 'utf8');
    if (aBuffer.length !== bBuffer.length) {
      return false;
    }

    return timingSafeEqual(aBuffer, bBuffer);
  }
}
