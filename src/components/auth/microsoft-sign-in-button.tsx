import { signIn } from "next-auth/react";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface MicrosoftSignInButtonProps {
  callbackUrl?: string;
}

export function MicrosoftSignInButton({
  callbackUrl = "/dashboard",
}: MicrosoftSignInButtonProps) {
  const t = useTranslations("auth");
  const [isLoading, setIsLoading] = useState(false);

  const handleMicrosoftSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("azure-ad", { callbackUrl });
    } catch {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleMicrosoftSignIn}
      disabled={isLoading}
      className="btn btn-outline w-full gap-3 bg-white hover:bg-gray-50 text-gray-700 border-gray-300 hover:border-gray-400"
    >
      {isLoading ? (
        <span className="loading loading-spinner loading-sm"></span>
      ) : (
        <svg className="size-5" viewBox="0 0 23 23">
          <path fill="#f35325" d="M1 1h10v10H1z" />
          <path fill="#81bc06" d="M12 1h10v10H12z" />
          <path fill="#05a6f0" d="M1 12h10v10H1z" />
          <path fill="#ffba08" d="M12 12h10v10H12z" />
        </svg>
      )}
      {t("continueWithMicrosoft")}
    </button>
  );
}
