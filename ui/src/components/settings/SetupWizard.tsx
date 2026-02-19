import { useState } from "react";
import { Telescope, ArrowRight, ArrowLeft, Check, SkipForward } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SetupWizardProps {
  open: boolean;
  onComplete: (config: Record<string, string>) => void;
}

export function SetupWizard({ open, onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(0);
  const [claudeKey, setClaudeKey] = useState("");
  const [siliconKey, setSiliconKey] = useState("");

  const handleFinish = () => {
    const config: Record<string, string> = {};
    if (claudeKey) config.claude_api_key = claudeKey;
    if (siliconKey) config.siliconflow_api_key = siliconKey;
    onComplete(config);
  };

  const steps = [
    // Step 0: Welcome
    <div key="welcome" className="space-y-4 py-2">
      <div className="flex justify-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary-50">
          <Telescope className="size-8 text-primary-500" />
        </div>
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-neutral-800">
          Welcome to DeepLens
        </h3>
        <p className="mt-2 text-sm text-neutral-500">
          DeepLens analyzes your codebase and generates comprehensive documentation.
          Let's set up your API keys to get started.
        </p>
      </div>
    </div>,

    // Step 1: Claude API Key
    <div key="claude" className="space-y-4 py-2">
      <div className="text-center">
        <h3 className="text-base font-semibold text-neutral-800">
          Claude API Key
        </h3>
        <p className="mt-1 text-xs text-neutral-500">
          Required for code analysis and documentation generation
        </p>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600">API Key</label>
        <Input
          type="password"
          value={claudeKey}
          onChange={(e) => setClaudeKey(e.target.value)}
          placeholder="sk-ant-..."
          className="h-9 text-sm"
          autoFocus
        />
        <p className="text-[10px] text-neutral-400">
          Get your key from console.anthropic.com
        </p>
      </div>
    </div>,

    // Step 2: SiliconFlow (optional)
    <div key="silicon" className="space-y-4 py-2">
      <div className="text-center">
        <h3 className="text-base font-semibold text-neutral-800">
          SiliconFlow API Key
        </h3>
        <p className="mt-1 text-xs text-neutral-500">
          Optional. Enables embedding-based Q&A after analysis.
        </p>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-600">
          API Key (optional)
        </label>
        <Input
          type="password"
          value={siliconKey}
          onChange={(e) => setSiliconKey(e.target.value)}
          placeholder="sk-..."
          className="h-9 text-sm"
          autoFocus
        />
        <p className="text-[10px] text-neutral-400">
          Skip this step if you don't need the Q&A feature
        </p>
      </div>
    </div>,

    // Step 3: Done
    <div key="done" className="space-y-4 py-2">
      <div className="flex justify-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-success-bg">
          <Check className="size-8 text-success" />
        </div>
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-neutral-800">
          All Set!
        </h3>
        <p className="mt-2 text-sm text-neutral-500">
          You can change these settings anytime from the settings panel.
        </p>
      </div>
    </div>,
  ];

  const isLastStep = step === steps.length - 1;
  const canNext =
    step === 0 || step === 2 || step === 3 || (step === 1 && claudeKey.trim().length > 0);

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Setup Wizard</DialogTitle>
          <DialogDescription className="sr-only">
            Configure DeepLens API keys
          </DialogDescription>
        </DialogHeader>

        {/* Step content */}
        {steps[step]}

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`size-1.5 rounded-full transition-colors ${
                i === step ? "bg-primary-500" : "bg-neutral-200"
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          {step > 0 && !isLastStep ? (
            <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="size-3.5" />
              Back
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {step === 2 && !siliconKey && (
              <Button variant="ghost" size="sm" onClick={() => setStep(3)}>
                <SkipForward className="size-3.5" />
                Skip
              </Button>
            )}
            {isLastStep ? (
              <Button size="sm" onClick={handleFinish}>
                Get Started
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setStep(step + 1)}
                disabled={!canNext}
              >
                Next
                <ArrowRight className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
