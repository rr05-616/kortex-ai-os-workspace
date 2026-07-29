import { Phone } from "@convex-dev/auth/providers/Phone";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";

export const mobileOtp = Phone({
  id: "mobile-otp",
  maxAge: 60 * 5, // 5 minutes
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes: Uint8Array) {
        crypto.getRandomValues(bytes);
      },
    };
    const alphabet = "0123456789";
    return generateRandomString(random, alphabet, 6);
  },
  async sendVerificationRequest({ identifier: phone, token }) {
    // For development: log OTP to console
    // In production, integrate with Twilio, Vonage, or another SMS provider
    console.log(`[OTP] Phone: ${phone}, Code: ${token}`);
  },
});
