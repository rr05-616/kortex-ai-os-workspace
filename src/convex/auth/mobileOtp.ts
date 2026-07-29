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
    // Send OTP via FastAPI backend
    const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/mobile/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp: token }),
      });
      if (!response.ok) {
        throw new Error(`Failed to send OTP: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Failed to send mobile OTP:", error);
      throw error;
    }
  },
});
