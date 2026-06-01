import { AuthForm } from "@/components/auth/auth-form";

export default function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  return <AuthForm mode="register" searchParamsPromise={searchParams} />;
}
