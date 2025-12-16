import { ButtonHTMLAttributes, forwardRef, ReactNode } from "react";
import { useTranslations } from "next-intl";

type ButtonVariant =
  | "neutral"
  | "primary"
  | "secondary"
  | "accent"
  | "info"
  | "success"
  | "warning"
  | "error";

type ButtonStyle = "outline" | "dash" | "soft" | "ghost" | "link";

type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

type ButtonModifier = "wide" | "block" | "square" | "circle";

interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  /** Text shown when not loading */
  children: ReactNode;
  /** Text shown when loading (defaults to "Loading...") */
  loadingText?: string;
  /** Whether the button is in loading state */
  isLoading?: boolean;
  /** Button color variant */
  variant?: ButtonVariant;
  /** Button style */
  buttonStyle?: ButtonStyle;
  /** Button size */
  size?: ButtonSize;
  /** Button modifier */
  modifier?: ButtonModifier;
  /** Icon to show before text (hidden when loading) */
  icon?: ReactNode;
  /** Icon to show after text (hidden when loading) */
  iconRight?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      loadingText,
      isLoading = false,
      variant,
      buttonStyle,
      size,
      modifier,
      icon,
      iconRight,
      className = "",
      disabled,
      ...props
    },
    ref,
  ) => {
    const t = useTranslations("common");
    const variantClass = variant ? `btn-${variant}` : "";
    const styleClass = buttonStyle ? `btn-${buttonStyle}` : "";
    const sizeClass = size ? `btn-${size}` : "";
    const modifierClass = modifier ? `btn-${modifier}` : "";

    const classes = [
      "btn",
      variantClass,
      styleClass,
      sizeClass,
      modifierClass,
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <span className="loading loading-spinner"></span>
            {loadingText || t("loading")}
          </>
        ) : (
          <>
            {icon}
            {children}
            {iconRight}
          </>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button };
export type { ButtonProps };
