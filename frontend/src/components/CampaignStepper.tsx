import { useCampaignStore } from "@/lib/campaign-store";
import { Check } from "lucide-react";

const steps = [
  { label: "Create" },
  { label: "Review" },
  { label: "Send" },
];

export function CampaignStepper() {
  const { currentStep } = useCampaignStore();

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, index) => (
        <div key={step.label} className="flex items-center gap-1">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-xs font-semibold transition-all duration-300 ${
                index < currentStep
                  ? "text-primary"
                  : index === currentStep
                  ? "text-white"
                  : "text-white/50"
              }`}
            >
              {index + 1}.
            </span>
            <span
              className={`text-xs font-medium transition-all duration-300 ${
                index <= currentStep ? "text-white" : "text-white/50"
              }`}
            >
              {step.label}
            </span>
            {index < currentStep && (
              <Check className="h-3 w-3 text-primary" />
            )}
          </div>
          {index < steps.length - 1 && (
            <span className="text-white/30 mx-1">—</span>
          )}
        </div>
      ))}
    </div>
  );
}
