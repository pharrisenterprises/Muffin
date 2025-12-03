import { Button } from '../Ui/button';
import { Input } from '../Ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../Ui/select';
import {
  Circle,
  Square,
  Upload,
  Plus,
} from 'lucide-react';

// VISION: Extended Step interface for dropdown
interface Step {
  id: string;
  label: string;
  name: string;
}

// VISION: Extended props for Vision features
interface RecorderToolbarProps {
  isRecording: boolean;
  onToggleRecording: () => void;
  onAddStep: () => void;
  onExportSteps?: () => void;
  onExportHeader?: () => void;
  // VISION: New props
  steps?: Step[];
  loopStartIndex?: number;
  onLoopStartChange?: (index: number) => void;
  globalDelayMs?: number;
  onGlobalDelayChange?: (delayMs: number) => void;
}

export default function RecorderToolbar({
  isRecording,
  onToggleRecording,
  onAddStep,
  onExportSteps,
  onExportHeader,
  // VISION: New props with defaults
  steps = [],
  loopStartIndex = -1,
  onLoopStartChange,
  globalDelayMs = 0,
  onGlobalDelayChange,
}: RecorderToolbarProps) {
  
  // VISION: Handle delay input change
  const handleDelayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seconds = parseInt(e.target.value, 10) || 0;
    onGlobalDelayChange?.(seconds * 1000); // Convert to ms
  };

  return (
    <div className="flex items-center gap-2 mb-4 p-3 bg-slate-800 rounded-xl border border-slate-700">
      <Button
        onClick={onToggleRecording}
        variant={isRecording ? 'destructive' : 'outline'}
        className={`gap-2 ${isRecording
          ? 'bg-red-500/80 hover:bg-red-500'
          : 'bg-slate-700 border-slate-600 hover:bg-slate-600'
          }`}
      >
        {isRecording ? (
          <Square className="w-4 h-4" />
        ) : (
          <Circle className="w-4 h-4 text-red-500" />
        )}
        {isRecording ? 'Stop' : 'Record'}
      </Button>

      <div className="h-6 w-px bg-slate-600"></div>

      <Button onClick={onAddStep} variant="ghost" className="gap-2 hover:bg-slate-700">
        <Plus className="w-4 h-4" />
        Add Variable
      </Button>
      {onExportSteps && (
        <Button variant="ghost" className="gap-2 hover:bg-slate-700" onClick={onExportSteps}>
          <Upload className="w-4 h-4 rotate-180" /> {/* flipped icon for export */}
          Export Process
        </Button>
      )}

       {onExportHeader && (
        <Button variant="ghost" className="gap-2 hover:bg-slate-700" onClick={onExportHeader}>
          <Upload className="w-4 h-4 rotate-180" />
          Export Header CSV
        </Button>
      )}

      {/* Right side controls */}
      <div className="flex items-center gap-2 ml-auto">
        
        {/* VISION: CSV Loop Start Dropdown - NEW */}
        <span className="text-sm text-slate-400">CSV Loop Start:</span>
        <Select 
          value={loopStartIndex.toString()} 
          onValueChange={(val) => onLoopStartChange?.(parseInt(val, 10))}
        >
          <SelectTrigger className="w-40 h-8 bg-slate-700 border-slate-600">
            <SelectValue placeholder="Select step" />
          </SelectTrigger>
          <SelectContent className="bg-slate-700 border-slate-600 text-white">
            <SelectItem value="-1">No CSV Loop</SelectItem>
            {steps.length === 0 ? (
              <SelectItem value="0" disabled>No steps recorded</SelectItem>
            ) : (
              steps.map((step, index) => (
                <SelectItem key={step.id} value={index.toString()}>
                  Loop from Step {index + 1}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        
        <div className="h-6 w-px bg-slate-600 mx-2"></div>
        
        {/* Delay Input - ENHANCED to use globalDelayMs */}
        <span className="text-sm text-slate-400">Delay:</span>
        <Input
          type="number"
          value={Math.round(globalDelayMs / 1000)}
          onChange={handleDelayChange}
          className="w-16 h-8 bg-slate-700 border-slate-600"
          min={0}
        />
        <Select defaultValue="static">
          <SelectTrigger className="w-28 h-8 bg-slate-700 border-slate-600">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-700 border-slate-600 text-white">
            <SelectItem value="static">Static</SelectItem>
            <SelectItem value="dynamic">Dynamic</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
