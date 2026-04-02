import { createFileRoute } from "@tanstack/react-router";

import OtpLoginForm from "@/components/otp-login-form";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <OtpLoginForm />;
}
