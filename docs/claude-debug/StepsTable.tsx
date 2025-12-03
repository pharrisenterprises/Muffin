import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "../Ui/table";
import { Input } from '../Ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../Ui/select';
import { Button } from '../Ui/button';
import { GripVertical, MoreVertical, Clock, RotateCcw, Edit, Trash, Target } from 'lucide-react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../Ui/dropdown-menu';

const eventTypes = ["open", "click", "input", "select", "Enter"];

// VISION: Badge components for step indicators
const LoopStartBadge = () => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
    </svg>
    Loop Start
  </span>
);

const DelayBadge = ({ seconds }: { seconds: number }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
    </svg>
    {seconds}s
  </span>
);

// FIX 7D: Conditional Click Badge
const ConditionalBadge = () => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
    <Target className="w-3 h-3" />
    Conditional
  </span>
);

interface Step {
  id?: string | number;
  name: string;
  event: string;
  path: string;
  value: string;
  label: string;
  // VISION: Added fields
  delaySeconds?: number;
}

interface StepsTableProps {
  steps: Step[];
  onUpdateStep: (index: number, updatedFields: Partial<Step>) => void;
  onDeleteStep: (index: number) => void;
  // VISION: Add these new props
  loopStartIndex?: number;
  onSetStepDelay?: (index: number, delaySeconds: number) => void;
  onSetLoopStart?: (index: number) => void;
}

export default function StepsTable({ 
  steps, 
  onUpdateStep, 
  onDeleteStep, 
  loopStartIndex = -1,
  onSetStepDelay,
  onSetLoopStart 
}: StepsTableProps) {
  const inputClass = "bg-slate-200 text-slate-900 border-slate-400 placeholder:text-slate-500 focus:bg-white focus:border-blue-500 focus:ring-blue-500";

  return (
    <div className="h-full">
      <Table>
        <Droppable droppableId="steps-droppable">
          {(provided) => (
            <TableBody {...provided.droppableProps} ref={provided.innerRef}>
              {steps.map((step, index) => (
                <Draggable key={String(step.id ?? index)} draggableId={String(step.id ?? index)} index={index}>
                  {(provided, snapshot) => (
                    <TableRow
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="border-b-0"
                      style={{
                        ...provided.draggableProps.style,
                        backgroundColor: snapshot.isDragging ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                      }}
                    >
                      <TableCell className="w-10 cursor-move py-2" {...provided.dragHandleProps}>
                        <GripVertical className="text-slate-500" />
                      </TableCell>
                      <TableCell className="w-1/4 py-2">
                        {/* VISION: Added badges next to label */}
                        <div className="flex flex-col gap-1">
                          <Input
                            value={
                              step.event === "open" && !step.label
                                ? "Open Page"
                                : step.label
                            }
                            onChange={(e) => onUpdateStep(index, {
                              label: e.target.value,
                              name: step.name
                            })}
                            className={inputClass}
                          />
                          <div className="flex items-center gap-1">
                            {loopStartIndex >= 0 && loopStartIndex === index && <LoopStartBadge />}
                            {step.delaySeconds && step.delaySeconds > 0 && (
                              <DelayBadge seconds={step.delaySeconds} />
                            )}
                            {/* FIX 7D: Conditional Click Badge */}
                            {step.event === 'conditional-click' && <ConditionalBadge />}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="w-48 py-2">
                        <Select
                          value={step.event}
                          onValueChange={(value) => onUpdateStep(index, { event: value, name: value })}
                        >
                          <SelectTrigger className={inputClass}>
                            <SelectValue placeholder="Select event" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700 text-white">
                            {eventTypes.map(type => (
                              <SelectItem key={type} value={type} className="hover:bg-slate-700">
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="w-1/3 py-2">
                        <Input
                          value={step.path}
                          onChange={(e) => onUpdateStep(index, { path: e.target.value })}
                          placeholder="URL or element selector..."
                          className={inputClass}
                        />
                      </TableCell>
                      <TableCell className="w-1/4 py-2">
                        <Input
                          value={step.value}
                          onChange={(e) => onUpdateStep(index, { value: e.target.value })}
                          placeholder="Input value..."
                          //disabled={step.event !== 'Input' && step.event !== 'Select'}
                          className={inputClass}
                        />
                      </TableCell>
                      <TableCell className="w-20 text-right py-2">
                        {/* VISION: 3-dot dropdown menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white">
                            {onSetStepDelay && (
                              <DropdownMenuItem
                                onClick={() => {
                                  const seconds = prompt('Enter delay in seconds before this step:', '0');
                                  if (seconds !== null) {
                                    onSetStepDelay(index, parseInt(seconds, 10) || 0);
                                  }
                                }}
                                className="hover:bg-slate-700 cursor-pointer"
                              >
                                <Clock className="w-4 h-4 mr-2" />
                                Set Delay Before Step
                              </DropdownMenuItem>
                            )}
                            {onSetLoopStart && (
                              <DropdownMenuItem
                                onClick={() => onSetLoopStart(index)}
                                className="hover:bg-slate-700 cursor-pointer"
                              >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Set as Loop Start
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="bg-slate-700" />
                            <DropdownMenuItem
                              onClick={() => {
                                // Focus on the label input for editing
                                const labelInput = document.querySelector(`input[value="${step.label}"]`) as HTMLInputElement;
                                labelInput?.focus();
                              }}
                              className="hover:bg-slate-700 cursor-pointer"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Step
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onDeleteStep(index)}
                              className="hover:bg-red-900/50 text-red-400 cursor-pointer"
                            >
                              <Trash className="w-4 h-4 mr-2" />
                              Delete Step
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </TableBody>
          )}
        </Droppable>
      </Table>
    </div>
  );
}
