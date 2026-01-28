import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "One number", test: (p) => /[0-9]/.test(p) },
  { label: "One special character (!@#$%^&*)", test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export const getPasswordStrength = (password: string): number => {
  return requirements.filter((req) => req.test(password)).length;
};

export const isPasswordStrong = (password: string): boolean => {
  return getPasswordStrength(password) === requirements.length;
};

const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  
  const strengthLabel = useMemo(() => {
    if (password.length === 0) return "";
    if (strength <= 1) return "Very Weak";
    if (strength === 2) return "Weak";
    if (strength === 3) return "Fair";
    if (strength === 4) return "Good";
    return "Strong";
  }, [strength, password.length]);

  const strengthColor = useMemo(() => {
    if (strength <= 1) return "bg-destructive";
    if (strength === 2) return "bg-orange-500";
    if (strength === 3) return "bg-yellow-500";
    if (strength === 4) return "bg-lime-500";
    return "bg-green-500";
  }, [strength]);

  if (password.length === 0) return null;

  return (
    <div className="space-y-3 mt-2">
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Password strength</span>
          <span className={cn(
            "text-xs font-medium",
            strength <= 2 ? "text-destructive" : strength <= 3 ? "text-yellow-600" : "text-green-600"
          )}>
            {strengthLabel}
          </span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((index) => (
            <div
              key={index}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-200",
                index <= strength ? strengthColor : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      {/* Requirements list */}
      <ul className="space-y-1">
        {requirements.map((req, index) => {
          const isMet = req.test(password);
          return (
            <li
              key={index}
              className={cn(
                "flex items-center gap-2 text-xs transition-colors",
                isMet ? "text-green-600" : "text-muted-foreground"
              )}
            >
              {isMet ? (
                <Check className="w-3 h-3" />
              ) : (
                <X className="w-3 h-3" />
              )}
              {req.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default PasswordStrengthIndicator;
