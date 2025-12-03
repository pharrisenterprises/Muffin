import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../Ui/dialog';
import { Button } from '../Ui/button';
import { Input } from '../Ui/input';
import { Label } from '../Ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../Ui/select';
import { Target } from 'lucide-react';

interface ConditionalConfig {
  buttonTexts: string[];
  timeoutMinutes: number;
  pollIntervalMs: number;
  confidenceThreshold: number;
}

interface ConditionalClickModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (config: ConditionalConfig) => void;
  initialConfig?: ConditionalConfig;
}

const defaultConfig: ConditionalConfig = {
  buttonTexts: ['Allow', 'Keep', 'Continue'],
  timeoutMinutes: 7,
  pollIntervalMs: 500,
  confidenceThreshold: 0.6,
};

export function ConditionalClickModal({
  open,
  onClose,
  onSave,
  initialConfig,
}: ConditionalClickModalProps) {
  const [buttonTextsInput, setButtonTextsInput] = useState(
    initialConfig?.buttonTexts.join(', ') || defaultConfig.buttonTexts.join(', ')
  );
  const [timeoutValue, setTimeoutValue] = useState(
    initialConfig?.timeoutMinutes || defaultConfig.timeoutMinutes
  );
  const [timeoutUnit, setTimeoutUnit] = useState<'seconds' | 'minutes'>('minutes');
  const [pollInterval, setPollInterval] = useState(
    initialConfig?.pollIntervalMs || defaultConfig.pollIntervalMs
  );
  const [confidence, setConfidence] = useState(
    initialConfig?.confidenceThreshold || defaultConfig.confidenceThreshold
  );

  const handleSave = () => {
    const buttonTexts = buttonTextsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
    
    if (buttonTexts.length === 0) {
      alert('Please enter at least one button text to search for.');
      return;
    }
    
    const timeoutMinutes = timeoutUnit === 'seconds' 
      ? timeoutValue / 60 
      : timeoutValue;
    
    onSave({
      buttonTexts,
      timeoutMinutes,
      pollIntervalMs: pollInterval,
      confidenceThreshold: confidence,
    });
    
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen: boolean) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-slate-800 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Target className="w-5 h-5 text-cyan-400" />
            Configure Conditional Click
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Button Texts */}
          <div className="space-y-2">
            <Label htmlFor="buttonTexts" className="text-slate-300">
              Button Texts to Find
            </Label>
            <Input
              id="buttonTexts"
              value={buttonTextsInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setButtonTextsInput(e.target.value)}
              placeholder="Allow, Keep, Continue"
              className="bg-slate-700 border-slate-600 text-white"
            />
            <p className="text-xs text-slate-400">
              Comma-separated list. Will click the first one found.
            </p>
          </div>
          
          {/* Timeout */}
          <div className="space-y-2">
            <Label className="text-slate-300">Timeout</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="1"
                max="60"
                value={timeoutValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTimeoutValue(Number(e.target.value) || 1)}
                className="w-24 bg-slate-700 border-slate-600 text-white"
              />
              <Select value={timeoutUnit} onValueChange={(v: string) => setTimeoutUnit(v as any)}>
                <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="seconds">seconds</SelectItem>
                  <SelectItem value="minutes">minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-slate-400">
              Stop searching after this time if no buttons found.
            </p>
          </div>
          
          {/* Poll Interval */}
          <div className="space-y-2">
            <Label htmlFor="pollInterval" className="text-slate-300">
              Poll Interval (ms)
            </Label>
            <Input
              id="pollInterval"
              type="number"
              min="100"
              max="5000"
              step="100"
              value={pollInterval}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPollInterval(Number(e.target.value) || 500)}
              className="w-32 bg-slate-700 border-slate-600 text-white"
            />
            <p className="text-xs text-slate-400">
              How often to check for buttons (500ms = twice per second).
            </p>
          </div>
          
          {/* Confidence Threshold */}
          <div className="space-y-2">
            <Label htmlFor="confidence" className="text-slate-300">
              Vision Confidence Threshold
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="confidence"
                type="number"
                min="0.1"
                max="1.0"
                step="0.1"
                value={confidence}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfidence(Number(e.target.value) || 0.6)}
                className="w-24 bg-slate-700 border-slate-600 text-white"
              />
              <span className="text-slate-400">
                ({Math.round(confidence * 100)}%)
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Minimum match accuracy for Vision OCR (0.6 = 60%).
            </p>
          </div>
        </div>
        
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            Add Conditional Step
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConditionalClickModal;
