import { Button } from "@notify/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@notify/ui/components/card";
import { Input } from "@notify/ui/components/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  REGEXP_ONLY_DIGITS,
} from "@notify/ui/components/input-otp";
import { Label } from "@notify/ui/components/label";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

import Loader from "./loader";

function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0]?.trim();
  if (local && local.length > 0) {
    return local;
  }
  return email;
}

export default function OtpLoginForm() {
  const navigate = useNavigate({ from: "/" });
  const { data: sessionData, isPending: sessionPending } = authClient.useSession();

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const verifyLock = useRef(false);

  useEffect(() => {
    if (sessionData?.user) {
      navigate({ to: "/events" });
    }
  }, [sessionData, navigate]);

  const sendCode = async () => {
    const trimmed = email.trim();
    if (!trimmed.includes("@")) {
      toast.error("Enter a valid email address.");
      return;
    }
    setSending(true);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: trimmed,
        type: "sign-in",
      });
      if (error) {
        toast.error(error.message ?? "Could not send code.");
        return;
      }
      setEmail(trimmed);
      setOtp("");
      setStep("otp");
      toast.success("Check your inbox for a 6-digit code.");
    } finally {
      setSending(false);
    }
  };

  const verify = async (code: string) => {
    if (verifyLock.current || code.length !== 6) {
      return;
    }
    verifyLock.current = true;
    setVerifying(true);
    try {
      const { error } = await authClient.signIn.emailOtp({
        email: email.trim(),
        otp: code,
        name: displayNameFromEmail(email.trim()),
      });
      if (error) {
        toast.error(error.message ?? "Invalid or expired code.");
        verifyLock.current = false;
        return;
      }
      toast.success("Signed in");
      navigate({ to: "/events" });
    } finally {
      setVerifying(false);
      verifyLock.current = false;
    }
  };

  const handleOtpChange = (value: string) => {
    setOtp(value);
    if (value.length === 6) {
      void verify(value);
    }
  };

  if (sessionPending) {
    return <Loader />;
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-md px-4 py-6 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Sign in to Notify</CardTitle>
          <CardDescription>
            {step === "email"
              ? "Enter your work email. We’ll email you a one-time code."
              : `Enter the code sent to ${email}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-5">
          {step === "email" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void sendCode();
                    }
                  }}
                />
              </div>
              <p className="text-muted-foreground text-xs">
                First time here? After you verify your email, your account is created automatically.
              </p>
              <Button type="button" className="w-full" disabled={sending} onClick={() => void sendCode()}>
                {sending ? "Sending…" : "Continue"}
              </Button>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2.5">
                <Label htmlFor="otp">One-time code</Label>
                <InputOTP
                  id="otp"
                  maxLength={6}
                  pattern={REGEXP_ONLY_DIGITS}
                  value={otp}
                  onChange={handleOtpChange}
                  disabled={verifying}
                >
                  <InputOTPGroup>
                    {Array.from({ length: 6 }, (_, i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button
                type="button"
                className="h-11 w-full text-sm font-medium motion-safe:transition-colors motion-safe:duration-150"
                disabled={verifying || otp.length !== 6}
                onClick={() => void verify(otp)}
              >
                {verifying ? "Verifying…" : "Verify"}
              </Button>
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 pt-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto min-h-11 px-2 py-1.5 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground sm:min-h-9"
                  disabled={sending}
                  onClick={() => void sendCode()}
                >
                  Resend code
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto min-h-11 px-2 py-1.5 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground sm:min-h-9"
                  onClick={() => {
                    setStep("email");
                    setOtp("");
                  }}
                >
                  Use a different email
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
