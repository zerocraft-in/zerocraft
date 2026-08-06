"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconArrowRight,
  IconLoader2,
  IconAlertCircle,
} from "@tabler/icons-react";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";

export function OtpLoginForm() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  const router = useRouter();
  const supabase = createClient();
  const setUser = useAuthStore((state) => state.setUser);
  const setSession = useAuthStore((state) => state.setSession);

  // Resend OTP functionality
  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;

    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      toast.error(signInError.message);
    } else {
      toast.success("Verification code resent to your email.");
      // Start 60-second countdown
      setResendCountdown(60);
      const timer = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      if (signInError) {
        setError(signInError.message);
        toast.error(signInError.message);
      } else {
        toast.success(`Verification code sent to ${email}`);
        setStep("otp");
        setResendCountdown(60);
        // Start countdown timer
        const timer = setInterval(() => {
          setResendCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp) {
      setError("Please enter the verification code.");
      return;
    }

    if (otp.length !== 6) {
      setError("Verification code must be 6 digits.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Try primary token type "email"
      let { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });

      // Fallback to "signup" type if new user creation
      if (
        verifyError &&
        (verifyError.message.toLowerCase().includes("invalid") ||
          verifyError.message.toLowerCase().includes("expired") ||
          verifyError.message.toLowerCase().includes("not found"))
      ) {
        const signupRes = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: "signup",
        });
        if (!signupRes.error) {
          data = signupRes.data;
          verifyError = null;
        } else {
          // Fallback to "magiclink" type
          const magicRes = await supabase.auth.verifyOtp({
            email,
            token: otp,
            type: "magiclink",
          });
          if (!magicRes.error) {
            data = magicRes.data;
            verifyError = null;
          }
        }
      }

      if (verifyError) {
        setError(verifyError.message);
        toast.error(verifyError.message);
        setLoading(false);
      } else {
        toast.success("Successfully verified! Logging you in...");
        if (data?.user && data?.session) {
          setUser(data.user);
          setSession(data.session);
        }
        // Successfully verified - redirect to studio dashboard with refreshed cookies
        window.location.href = "/studio";
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      toast.error("An unexpected error occurred.");
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep("email");
    setOtp("");
    setError(null);
    setResendCountdown(0);
  };

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">
          {step === "email" ? "Sign in" : "Verify your email"}
        </CardTitle>
        <CardDescription>
          {step === "email"
            ? "Enter your email to receive a one-time code."
            : "Enter the code sent to your email."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {step === "email" ? (
          <form onSubmit={handleSendOtp} className="space-y-2">
            <Field>
              <FieldLabel htmlFor="email">Email address</FieldLabel>

              <Input
                id="email"
                className="h-10"
                type="email"
                placeholder="name@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                aria-required="true"
                aria-invalid={!!error}
                aria-describedby={error ? "email-error" : undefined}
              />

              <FieldDescription>
                We'll send a one-time verification code to this email.
              </FieldDescription>

              {error && (
                <FieldError id="email-error" role="alert">
                  <IconAlertCircle className="inline-block h-4 w-4 mr-2" />
                  {error}
                </FieldError>
              )}
            </Field>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading || !email}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <IconLoader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2">Sending...</span>
                </>
              ) : (
                <>
                  Continue
                  <IconArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <FieldSet>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="otp">Verification Code</FieldLabel>
                  <InputOTP
                    id="otp"
                    maxLength={6}
                    pattern={REGEXP_ONLY_DIGITS}
                    value={otp}
                    onChange={setOtp}
                    autoFocus
                    disabled={loading}
                    aria-describedby="otp-description"
                  >
                    <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-12 *:data-[slot=input-otp-slot]:text-lg">
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-12 *:data-[slot=input-otp-slot]:text-lg">
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>

                  <FieldDescription id="otp-description">
                    Enter the 6-digit code sent to <strong>{email}</strong>.
                  </FieldDescription>

                  {error && (
                    <FieldError id="otp-error" role="alert">
                      <IconAlertCircle className="inline-block h-4 w-4 mr-2" />
                      {error}
                    </FieldError>
                  )}
                </Field>
              </FieldGroup>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading || otp.length !== 6}
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <IconLoader2 className="h-4 w-4 animate-spin" />
                    <span className="ml-2">Verifying...</span>
                  </>
                ) : (
                  "Verify & Sign In"
                )}
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={loading || resendCountdown > 0}
                  onClick={handleResendOtp}
                >
                  {resendCountdown > 0
                    ? `Resend in ${resendCountdown}s`
                    : "Resend Code"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  disabled={loading}
                  onClick={handleBackToEmail}
                >
                  Change Email
                </Button>
              </div>
            </FieldSet>
          </form>
        )}
      </CardContent>

      <CardFooter>
        <p className="text-muted-foreground w-full text-center text-xs">
          By signing in, you agree to our{" "}
          <br />
          <a
            href="/terms"
            className="hover:text-primary underline underline-offset-4 transition-colors"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="/privacy"
            className="hover:text-primary underline underline-offset-4 transition-colors"
          >
            Privacy Policy
          </a>
        </p>
      </CardFooter>
    </Card>
  );
}
