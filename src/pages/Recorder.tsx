import { useState, useEffect } from "react";
import * as XLSX from 'xlsx';
import { Button } from "../components/Ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/Ui/card";
import { Disc, Video, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import RecorderToolbar from "../components/Recorder/RecorderToolbar";
import StepsTable from "../components/Recorder/StepsTable";
import LogPanel from "../components/Recorder/LogPanel";
import ConditionalClickModal from "../components/Recorder/ConditionalClickModal";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { createPageUrl } from "../utils/index";
import { TableHead, TableHeader, TableRow } from "../components/Ui/table"
import { Alert, AlertDescription } from "../components/Ui/alert";

// ============================================
// FIX 3 & 4: Post-Recording Cleanup
// Normalizes labels and detects patterns
// ============================================

interface CleanupChange {
  stepIndex: number;
  field: 'label' | 'value';
  oldValue: string;
  newValue: string;
  reason: string;
}

interface Step {
  id: string;
  name: string;
  event: string;
  path: string;
  value: string;
  label: string;
  x:number;
  y:number;
  bundle?: LocatorBundle;
  // VISION: Added fields for Phase 4
  delaySeconds?: number;
  visionFallback?: boolean;
  conditionalConfig?: {
    enabled: boolean;
    searchTerms: string[];
    maxWaitSeconds: number;
    pollingIntervalMs: number;
  };
}

interface LocatorBundle {
  tag: string;
  id: string | null;
  name: string | null;
  placeholder: string | null;
  aria: string | null;
  dataAttrs: Record<string, string>;
  text: string;
  css: string;
  xpath: string;
  classes: string[];
  pageUrl: string;
  //framePath: number[] | null;
}

interface Log {
  timestamp: string;
  level: string;
  message: string;
}

interface ProjectType {
  id: string;
  name: string;
  recorded_steps: Step[];
  target_url: string;
  // VISION: Added fields for Phase 4
  loopStartIndex?: number;
  globalDelayMs?: number;
}

// ============================================
// Cleanup Helper Functions
// ============================================

function extractBaseLabel(label: string | undefined): string {
  if (!label) return '';
  // Remove counter suffix: "search_28" → "search"
  return label.replace(/_\d+$/, '');
}

function isDropdownClick(step: Step): boolean {
  const xpath = step.path || '';
  const bundle = step.bundle || {};
  
  const bundleXPath = (bundle && typeof bundle === 'object' && 'xpath' in bundle) ? (bundle as any).xpath : '';
  
  return (
    xpath.includes('pac-item') ||
    xpath.includes('option') ||
    xpath.includes('listbox') ||
    xpath.includes('menu-item') ||
    xpath.includes('dropdown') ||
    (typeof bundleXPath === 'string' && bundleXPath.includes('pac-item')) ||
    false
  );
}

function isMatchingPreviousInput(
  currentStep: Step,
  previousSteps: Step[]
): { isMatch: boolean; matchedStepIndex?: number } {
  
  if (currentStep.event !== 'click') {
    return { isMatch: false };
  }
  
  const clickedText = (currentStep.value || currentStep.label || '').toLowerCase();
  if (!clickedText || clickedText.length < 3) {
    return { isMatch: false };
  }
  
  // Look at last 5 steps for matching input
  const recentInputs = previousSteps
    .map((step, idx) => ({ step, idx }))
    .filter(({ step }) => step.event === 'input' && step.value)
    .slice(-5);
  
  for (const { step: inputStep, idx } of recentInputs) {
    const inputValue = (inputStep.value || '').toLowerCase();
    if (!inputValue || inputValue.length < 2) continue;
    
    // Check if clicked text contains the input value
    const inputWords = inputValue.split(/\s+/);
    const firstWord = inputWords[0];
    
    if (
      clickedText.includes(inputValue) ||
      clickedText.startsWith(firstWord) ||
      inputValue.includes(clickedText.substring(0, 10))
    ) {
      return { isMatch: true, matchedStepIndex: idx };
    }
  }
  
  return { isMatch: false };
}

function cleanupRecordedSteps(steps: Step[]): { steps: Step[]; changes: CleanupChange[] } {
  const changes: CleanupChange[] = [];
  const labelCounters = new Map<string, number>();
  
  const getSequentialLabel = (base: string): string => {
    const key = base.toLowerCase();
    const count = labelCounters.get(key) || 0;
    labelCounters.set(key, count + 1);
    return count === 0 ? base : `${base}_${count}`;
  };
  
  const cleanedSteps = steps.map((step, index) => {
    const cleaned = { ...step };
    const previousSteps = steps.slice(0, index);
    
    // === RULE 1: Enter key → "submit" ===
    if (step.event === 'enter' || step.event === 'Enter') {
      const newLabel = getSequentialLabel('submit');
      if (cleaned.label !== newLabel) {
        changes.push({
          stepIndex: index,
          field: 'label',
          oldValue: cleaned.label || '',
          newValue: newLabel,
          reason: 'Enter key standardized to submit'
        });
        cleaned.label = newLabel;
      }
      return cleaned;
    }
    
    // === RULE 2: Click events ===
    if (step.event === 'click') {
      const matchResult = isMatchingPreviousInput(step, previousSteps);
      
      if (matchResult.isMatch) {
        // Click matches a previous input (autocomplete selection)
        const newLabel = getSequentialLabel('match_input');
        changes.push({
          stepIndex: index,
          field: 'label',
          oldValue: cleaned.label || '',
          newValue: newLabel,
          reason: `Matches input from step ${matchResult.matchedStepIndex! + 1}`
        });
        cleaned.label = newLabel;
        
        // Replace value with descriptor
        if (cleaned.value) {
          changes.push({
            stepIndex: index,
            field: 'value',
            oldValue: cleaned.value,
            newValue: '[matched selection]',
            reason: 'Click value not used in playback'
          });
          cleaned.value = '[matched selection]';
        }
      } else if (isDropdownClick(step)) {
        // Independent dropdown selection
        const newLabel = getSequentialLabel('select');
        changes.push({
          stepIndex: index,
          field: 'label',
          oldValue: cleaned.label || '',
          newValue: newLabel,
          reason: 'Dropdown selection'
        });
        cleaned.label = newLabel;
      } else {
        // Regular click (button, link, etc.)
        const baseLabel = extractBaseLabel(cleaned.label) || 'click';
        const newLabel = getSequentialLabel(baseLabel);
        if (cleaned.label !== newLabel) {
          changes.push({
            stepIndex: index,
            field: 'label',
            oldValue: cleaned.label || '',
            newValue: newLabel,
            reason: 'Sequential click label'
          });
          cleaned.label = newLabel;
        }
      }
      return cleaned;
    }
    
    // === RULE 3: Input events ===
    if (step.event === 'input') {
      const baseLabel = extractBaseLabel(cleaned.label) || 'input';
      const newLabel = getSequentialLabel(baseLabel);
      if (cleaned.label !== newLabel) {
        changes.push({
          stepIndex: index,
          field: 'label',
          oldValue: cleaned.label || '',
          newValue: newLabel,
          reason: 'Sequential input label'
        });
        cleaned.label = newLabel;
      }
      return cleaned;
    }
    
    // === RULE 4: Open/navigation events ===
    if (step.event === 'open' || step.event === 'open page') {
      cleaned.label = 'open_page';
      return cleaned;
    }
    
    // Default: keep as-is with sequential numbering
    const baseLabel = extractBaseLabel(cleaned.label) || step.event || 'step';
    cleaned.label = getSequentialLabel(baseLabel);
    return cleaned;
  });
  
  return { steps: cleanedSteps, changes };
}

export default function Recorder() {
  const [currentProject, setCurrentProject] = useState<ProjectType | null>(null);
  const [recordedSteps, setRecordedSteps] = useState<Step[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  
  // VISION: Added state for loop start index (B-39: Changed default to -1 for no loop)
  const [loopStartIndex, setLoopStartIndex] = useState<number>(-1);
  // VISION: Added state for global delay
  const [globalDelayMs, setGlobalDelayMs] = useState<number>(0);
  const [delayMode, setDelayMode] = useState<'static' | 'dynamic'>('static');
  // FIX 7C: Conditional Click modal state
  const [conditionalModalOpen, setConditionalModalOpen] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.hash.split("?")[1]);
    const projectId = urlParams.get("project");
    console.log("projectId >>>", projectId);
    if (projectId) {
      loadProject(projectId);
      setProjectId(projectId);
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadProject = async (projectId: string) => {
    setIsLoading(true);

    chrome.runtime.sendMessage(
      {
        action: "get_project_by_id",
        payload: { id: parseInt(projectId, 10) },
      },
      (response) => {
        if (response?.success) {
          const project = response.project;

          // Ensure recorded_steps is always an array
          const steps = Array.isArray(project.recorded_steps) ? project.recorded_steps : [];

          // Optionally update the DB if recorded_steps was missing
          if (!project.recorded_steps) {
            chrome.runtime.sendMessage({
              action: "update_project_steps",
              payload: {
                id: parseInt(project.id),
                recorded_steps: [],
              }
            });
          }

          setCurrentProject(project);
          setRecordedSteps(steps);
          
          // VISION: Load Vision fields from project (B-39: Default -1 for no loop)
            setLoopStartIndex(project.loopStartIndex ?? -1);
            setGlobalDelayMs(project.globalDelayMs ?? 0);
            setDelayMode((project as any).delayMode || 'static');
        } else {
          //console.error("Failed to load project:", response?.error);
          addLog("error", `Failed to load project: ${response?.error}`);
        }
        setIsLoading(false);
      }
    );
  };

  const addLog = (level: string, message: string) => {
    const newLog: Log = {
      timestamp: format(new Date(), 'HH:mm:ss'),
      level,
      message
    };
    setLogs(prev => [...prev, newLog]);
  };

  const handleToggleRecording = () => {
    setIsRecording(prev => {
      const newRecording = !prev;

      if (newRecording && projectId) {
        // Start recording
        chrome.runtime.sendMessage({
          action: "open_project_url_and_inject",
          payload: { id: parseInt(projectId, 10) },
        });
      } else {
        // Stop recording → close opened tab
        chrome.runtime.sendMessage({ action: "close_opened_tab" });
        
        // FIX 3 & 4: Post-recording cleanup
        const { steps: cleanedSteps, changes } = cleanupRecordedSteps(recordedSteps);
        
        if (changes.length > 0) {
          console.log('[TestFlow] Post-recording cleanup applied:', changes);
          addLog('info', `Cleaned up ${changes.length} step labels for better CSV export`);
          
          // Update state with cleaned steps
          setRecordedSteps(cleanedSteps);
          
          // Save to project
          if (currentProject) {
            updateProjectSteps(
              parseInt(currentProject.id),
              cleanedSteps,
              () => {
                addLog('info', 'Cleaned steps saved to project.');
              },
              (error) => {
                addLog("error", `Failed to save cleaned steps: ${error}`);
              }
            );
          }
        }
        
        setError("Recorded steps have been saved successfully !");
      }

      addLog('info', newRecording ? 'Recording started...' : 'Recording stopped.');
      return newRecording;
    });
  };

  const handleAddStep = () => {
    const newStep: Step = {
      id: `step_${Date.now()}`,
      name: `New Step ${recordedSteps.length + 1}`,
      event: 'Click',
      path: '',
      value: '',
      label: '',
      x: 0,
      y: 0,
      // VISION: Initialize Vision fields
      visionFallback: false,
    };

    const updatedSteps = [...recordedSteps, newStep];
    setRecordedSteps(updatedSteps);

    if (!currentProject) return;

    updateProjectSteps(
      parseInt(currentProject.id),
      updatedSteps, // ✅ send the correct updated steps
      () => {
        addLog('info', 'Added a new step.');
      },
      (error) => {
        addLog("error", `Failed to save: ${error}`);
      }
    );
  };

  // FIX 7C: Handler for adding conditional click step
  const handleAddConditionalClick = (config: any) => {
    const newStep: Step = {
      id: `step_${Date.now()}`,
      name: `Conditional Click ${recordedSteps.filter(s => s.event === 'conditional-click').length + 1}`,
      event: 'conditional-click',
      path: '',
      value: config.buttonTexts.join(', '),
      label: `conditional_${recordedSteps.filter(s => s.event === 'conditional-click').length + 1}`,
      x: 0,
      y: 0,
      visionFallback: true,
      conditionalConfig: {
        enabled: true,
        searchTerms: config.buttonTexts,
        maxWaitSeconds: config.timeoutMinutes * 60,
        pollingIntervalMs: config.pollIntervalMs,
      },
    };

    const updatedSteps = [...recordedSteps, newStep];
    setRecordedSteps(updatedSteps);

    if (currentProject) {
      updateProjectSteps(
        parseInt(currentProject.id),
        updatedSteps,
        () => {
          addLog('info', `Added conditional click step: looking for "${config.buttonTexts.join(', ')}"`);
        },
        (error) => {
          addLog("error", `Failed to save: ${error}`);
        }
      );
    }
  };

  const handleUpdateStep = (index: number, updatedField: Partial<Step>) => {
    const updatedSteps = [...recordedSteps];
    updatedSteps[index] = { ...updatedSteps[index], ...updatedField };
    setRecordedSteps(updatedSteps);

    if (!currentProject) return;

    updateProjectSteps(
      parseInt(currentProject.id),
      updatedSteps,
      () => {
        addLog('info', `Updated step ${index + 1}.`);
      },
      (error) => {
        addLog("error", `Failed to save: ${error}`);
      }
    );
  };

  const handleDeleteStep = (index: number) => {
    if (!currentProject) return;

    const updatedSteps = recordedSteps.filter((_, i) => i !== index);
    const stepName = recordedSteps[index]?.name || `Step ${index + 1}`;
    setRecordedSteps(updatedSteps);

    // VISION: Adjust loopStartIndex if needed
    if (index < loopStartIndex) {
      setLoopStartIndex(Math.max(-1, loopStartIndex - 1));
    } else if (index === loopStartIndex && loopStartIndex >= updatedSteps.length) {
      setLoopStartIndex(Math.max(-1, updatedSteps.length - 1));
    }

    updateProjectSteps(
      parseInt(currentProject.id),
      updatedSteps,
      () => {
        addLog('info', `Deleted step: ${stepName}`);
      },
      (error) => {
        addLog("error", `Failed to save: ${error}`);
      }
    );
  };
  const handleSave = async () => {
    if (!currentProject) return;
    try {
      // Update through background script (not Dexie directly here)

      if (!currentProject) return;

      updateProjectSteps(
        parseInt(currentProject.id),
        recordedSteps,
        () => {
          addLog("info", `Captured step and updated project successfully`);
          window.location.href = createPageUrl(`index.html#/FieldMapper?project=${currentProject.id}`);
        },
        (error) => {
          addLog("error", `Failed to save: ${error}`);
        }
      );
    } catch (error: any) {
      addLog("error", `Error saving project: ${error.message}`);
    }
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(recordedSteps);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setRecordedSteps(items);
    
    // VISION: Adjust loopStartIndex when dragging
    const oldIndex = result.source.index;
    const newIndex = result.destination.index;
    if (oldIndex === loopStartIndex) {
      setLoopStartIndex(newIndex);
    } else if (oldIndex < loopStartIndex && newIndex >= loopStartIndex) {
      setLoopStartIndex(loopStartIndex - 1);
    } else if (oldIndex > loopStartIndex && newIndex <= loopStartIndex) {
      setLoopStartIndex(loopStartIndex + 1);
    }
    
    if (!currentProject) return;
    updateProjectSteps(
      parseInt(currentProject.id),
      items,
      () => {
      },
      (error) => {
        addLog("error", `Failed to save: ${error}`);
      }
    );
  };

  useEffect(() => {
    const listener = (message: any, _sender: any, _sendResponse: any) => {
      if (message.type === "logEvent" && isRecording && currentProject) {
        const { eventType, xpath, value, label, x, y, bundle} = message.data;
        console.log("message.data >>>>",message.data);
        const newStep: Step = {
          id: `step_${Date.now()}`,
          name: `${eventType} Event`,
          event: eventType,
          label: label && label.trim() !== "" ? label : value ?? "",
          path: xpath,
          value: value ?? "",
          x: x ?? "",
          y: y ?? "",
          bundle: bundle,
          // VISION: Initialize Vision fields for recorded steps
          visionFallback: false,
        };

        const updatedSteps = [...recordedSteps];
        const lastStep = updatedSteps[updatedSteps.length - 1];
        const url = currentProject.target_url;

        const isSheet = url.includes("docs.google.com");
        // --- Special case: always push new step if Enter key ---
        if (eventType === "Enter") {
          updatedSteps.push(newStep);
        } else {
          const result = !isSheet;
          if (result) {
            //Only update if last step has the same path
            if (lastStep && lastStep.path === xpath) {
              updatedSteps[updatedSteps.length - 1] = {
                ...lastStep,
                value: value ?? lastStep.value,
                label: label ?? lastStep.label,
                event: eventType ?? lastStep.event,
                name: `${eventType} Event` || lastStep.name,
              };
            } else {
              updatedSteps.push(newStep); // otherwise, add new step
            }
          } else {
            //Make sure lastStep exists before checking `.label`
            if (lastStep && lastStep.label && lastStep.label === label) {
              updatedSteps[updatedSteps.length - 1] = {
                ...lastStep,
                value: value ?? lastStep.value,
                label: label ?? lastStep.label,
                event: eventType ?? lastStep.event,
                name: `${eventType} Event` || lastStep.name,
              };
            } else {
              updatedSteps.push(newStep); // otherwise, add new step
            }
          }
        }
        setRecordedSteps(updatedSteps);
        updateProjectSteps(
          parseInt(currentProject.id),
          updatedSteps,
          () => {
            addLog("info", `Captured ${eventType} at ${xpath}`);
          },
          (error) => {
            addLog("error", `Failed to save: ${error}`);
          }
        );
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, [isRecording, currentProject, recordedSteps]);

  const updateProjectSteps = (
    projectId: number,
    steps: Step[],
    onSuccess: () => void,
    onError: (error: string) => void
  ) => {
    chrome.runtime.sendMessage(
      {
        action: "update_project_steps",
        payload: {
          id: projectId,
          recorded_steps: steps,
          // VISION: Include Vision fields in save
          loopStartIndex: loopStartIndex,
          globalDelayMs: globalDelayMs,
        },
      },
      (response) => {
        if (response?.success) {
          onSuccess();
        } else {
          onError(response?.error || "Unknown error");
        }
      }
    );
  };

  // VISION: Handler for loop start change
  const handleLoopStartChange = (index: number) => {
    setLoopStartIndex(index);
    if (currentProject) {
      chrome.runtime.sendMessage({
        action: "update_project_steps",
        payload: {
          id: parseInt(currentProject.id),
          recorded_steps: recordedSteps,
          loopStartIndex: index,
          globalDelayMs: globalDelayMs,
        },
      });
      addLog('info', `Loop start set to step ${index + 1}`);
    }
  };

  // VISION: Handler for global delay change
  const handleGlobalDelayChange = (delayMs: number) => {
    setGlobalDelayMs(delayMs);
    if (currentProject) {
      chrome.runtime.sendMessage({
        action: "update_project_steps",
        payload: {
          id: parseInt(currentProject.id),
          recorded_steps: recordedSteps,
          loopStartIndex: loopStartIndex,
          globalDelayMs: delayMs,
        },
      });
    }
  };

  // VISION: Handler for setting per-step delay
  const handleSetStepDelay = (index: number, delaySeconds: number) => {
    const updatedSteps = [...recordedSteps];
    updatedSteps[index] = { ...updatedSteps[index], delaySeconds };
    setRecordedSteps(updatedSteps);
    
    if (currentProject) {
      updateProjectSteps(
        parseInt(currentProject.id),
        updatedSteps,
        () => {
          addLog('info', `Set ${delaySeconds}s delay before step ${index + 1}`);
        },
        (error) => {
          addLog("error", `Failed to save: ${error}`);
        }
      );
    }
  };

  const handleExportSteps = () => {
    if (!recordedSteps.length) {
      addLog("info", "No steps to export.");
      return;
    }

    // Convert data to worksheet
    const worksheet = XLSX.utils.json_to_sheet(recordedSteps);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Steps");

    // Export to file
    const filename = `ProjectSteps_${currentProject?.name || "Untitled"}.xlsx`;
    XLSX.writeFile(workbook, filename);

    addLog("success", "Steps exported to Excel successfully!");
  };

  const handleExportHeader = () => {
    if (!recordedSteps.length) {
      addLog("info", "No steps to export.");
      return;
    }

    // Collect labels and values (skip "open page")
    const validSteps = recordedSteps.filter(
      step => step.label?.trim() && step.label.toLowerCase() !== "open page"
    );

    if (!validSteps.length) {
      addLog("info", "No valid labels found for headers.");
      return;
    }

    // Headers from labels
    const headers = validSteps.map(step => step.label.trim());

    // Row values from step.value
    const values = validSteps.map(step => step.value || "");

    // Create worksheet with headers (row 1) and values (row 2)
    const worksheet = XLSX.utils.aoa_to_sheet([headers, values]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Steps");

    // 🔹 Save as CSV
    const filename = `ProjectSteps_Labels_${currentProject?.name || "Untitled"}.csv`;
    XLSX.writeFile(workbook, filename, { bookType: "csv" });

    addLog("success", "Headers and values exported to CSV successfully!");
  };



  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(""); // Hide alert
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, setError]);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Video className="w-8 h-8 text-red-400" />
              Recorded Script Manager
            </h1>
            {currentProject && (
              <p className="text-slate-400 text-lg line-clamp-1">
                Process: <span className="text-red-400 font-semibold">{currentProject.name}</span>
              </p>
            )}
          </div>
          <Button onClick={handleSave} disabled={!recordedSteps || recordedSteps.length === 0} className="bg-green-500 hover:bg-green-600 flex items-center gap-2">
            Continue with field mapping
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        {/* VISION: Added loopStartIndex, steps, and handlers to toolbar */}
        <RecorderToolbar
          isRecording={isRecording}
          onToggleRecording={handleToggleRecording}
          onAddStep={handleAddStep}
          onExportSteps={handleExportSteps}
          onExportHeader={handleExportHeader}
          steps={recordedSteps}
          loopStartIndex={loopStartIndex}
          onLoopStartChange={handleLoopStartChange}
          globalDelayMs={globalDelayMs}
          onGlobalDelayChange={handleGlobalDelayChange}
          delayMode={delayMode}
          onDelayModeChange={setDelayMode}
          onAddConditionalClick={() => setConditionalModalOpen(true)}
        />

        {error && (
          <Alert
            variant={error.toLowerCase().includes('successfully') ? 'default' : 'destructive'}
            className={
              error.toLowerCase().includes('successfully')
                ? 'bg-green-500/10 border-green-500/30 text-green-300 mb-4'
                : 'bg-red-500/10 border-red-500/30 text-red-300 mb-4'
            }
          >
            {error.toLowerCase().includes('successfully') ? (
              <CheckCircle className="h-4 w-4 text-green-400" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-400" />
            )}
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex-grow flex flex-col pb-[20px]">
          <Card className="flex-grow glass-effect bg-slate-800/30 border-slate-700/50 flex flex-col max-h-[735px] h-[735px] max-[1600px]:max-h-[430px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Disc className="w-5 h-5" /> Record Steps
              </CardTitle>
            </CardHeader>
            <TableHeader className="sticky top-0 custom-table">
              <TableRow className="bg-slate-700/50 hover:bg-slate-700/50 border-slate-600">
                <TableHead className="text-slate-300 font-semibold">LABEL</TableHead>
                <TableHead className="text-slate-300 font-semibold text-center">EVENT</TableHead>
                <TableHead className="text-slate-300 font-semibold">PATH</TableHead>
                <TableHead className="text-slate-300 font-semibold">INPUT</TableHead>
              </TableRow>
            </TableHeader>
            <CardContent className="flex-grow p-0 overflow-auto">
              {isLoading ? (
                <div className="text-center p-8">Loading...</div>
              ) : (
                /* VISION: Added loopStartIndex, onSetStepDelay, and onSetLoopStart to StepsTable */
                <StepsTable
                  steps={recordedSteps}
                  onUpdateStep={handleUpdateStep as any}
                  onDeleteStep={handleDeleteStep}
                  loopStartIndex={loopStartIndex}
                  onSetStepDelay={handleSetStepDelay}
                  onSetLoopStart={handleLoopStartChange}
                />
              )}
            </CardContent>
          </Card>
          <LogPanel logs={logs as any} onClear={() => setLogs([])} />
        </div>
      </div>

      {/* FIX 7C: Conditional Click Modal */}
      <ConditionalClickModal
        open={conditionalModalOpen}
        onClose={() => setConditionalModalOpen(false)}
        onSave={handleAddConditionalClick}
      />
    </DragDropContext>
  );
}
