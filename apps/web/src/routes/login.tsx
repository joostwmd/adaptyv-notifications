import { createFileRoute } from "@tanstack/react-router";

import OtpLoginForm from "@/components/otp-login-form";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  return <OtpLoginForm />;
}
