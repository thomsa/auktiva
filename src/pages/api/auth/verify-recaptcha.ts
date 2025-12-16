import type { NextApiRequest, NextApiResponse } from "next";

type ResponseData = {
  success: boolean;
  message: string;
  score?: number;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Only POST requests allowed" });
  }

  const { token } = req.body;
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  // If reCAPTCHA is not configured, bypass verification
  if (!secretKey || !siteKey) {
    console.log("reCAPTCHA not configured, bypassing verification");
    return res.status(200).json({ success: true, message: "Bypassed" });
  }

  if (!token) {
    return res
      .status(400)
      .json({ success: false, message: "reCAPTCHA token not provided" });
  }

  try {
    const response = await fetch(
      `https://www.google.com/recaptcha/api/siteverify`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `secret=${secretKey}&response=${token}`,
      },
    );

    const data = await response.json();

    if (data.success) {
      // For reCAPTCHA v3, check the score (v2 doesn't have score)
      const score = data.score;
      if (score !== undefined && score < 0.5) {
        return res.status(400).json({
          success: false,
          message:
            "Verification failed. Please try again or contact support if the issue persists.",
          score,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Verification successful",
        score,
      });
    } else {
      console.error("reCAPTCHA verification failed:", data["error-codes"]);
      return res.status(400).json({
        success: false,
        message:
          "Verification failed. Please try again or contact support if the issue persists.",
      });
    }
  } catch (error) {
    console.error("reCAPTCHA verification error:", error);
    return res.status(500).json({
      success: false,
      message:
        "Unable to verify reCAPTCHA. Please try again or contact support.",
    });
  }
}
