/**
 * Recorder Page - Phase 4 Vision Enhancement Integration
 * 
 * Build Cards: FIX-001 through FIX-006
 * 
 * Changes from original:
 * - Uses Vision-enabled RecorderToolbar from components/toolbar/
 * - Tracks full Recording object with Vision fields
 * - Uses StepList with badges instead of StepsTable
 * - Integrates Vision state management
 * - Creates steps with Vision fields
 */

import { useState, useEffect, useCallback } from "react";
import * as XLSX from 'xlsx';
import { Button } from "../components/Ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/Ui/card";
import { Video, ArrowRight, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

// FIX-001: Correct toolbar with Vision features
import RecorderToolbar from "../components/toolbar/RecorderToolbar";

// FIX-004: Step list with Vision badges
import StepList from "../components/recorder/StepList";

// Types with Vision fields
import type { Recording, Step } from "../types/vision";

// Default value generators
import { createStep } from "../lib/defaults";

// Existing components
import LogPanel from "../components/Recorder/LogPanel";
import { Alert, AlertDescription } from "../components/Ui/alert";
import { createPageUrl } from "../utils/index";

interface ProjectType {
  id: string;
  name: string;
  target_url?: string;
  project_url?: string;
  recorded_steps?: Step[];
  loopStartIndex?: number;
  globalDelayMs?: number;
  conditionalDefaults?: any;
  schemaVersion?: number;
  created_date?: string;
  updated_date?: string;
}

interface Log {
  timestamp: string;
  level: string;
  message: string;
}

export default function Recorder() {
  const [currentProject, setCurrentProject] = useState<ProjectType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  
  // FIX-002: Vision-enabled Recording state
  const [recording, setRecording] = useState<Recording | null>(null);

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
        action: "get_project",
        payload: { id: parseInt(projectId, 10) },
      },
      (response) => {
        if (response?.success && response.project) {
          const project = response.project as ProjectType;

          // FIX-002: Initialize Recording with Vision fields
          const fullRecording: Recording = {
            projectId: parseInt(project.id, 10),
            steps: Array.isArray(project.recorded_steps) ? project.recorded_steps : [],
            loopStartIndex: project.loopStartIndex ?? 0,
            globalDelayMs: project.globalDelayMs ?? 0,
            conditionalDefaults: project.conditionalDefaults ?? {
              searchTerms: ['approve', 'confirm', 'accept', 'yes', 'ok'],
              timeoutSeconds: 60,
              confidenceThreshold: 60
            },
            schemaVersion: project.schemaVersion ?? 3,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };

          setCurrentProject(project);
          setRecording(fullRecording);
          addLog("info", `Loaded project: ${project.name}`);
        } else {
          addLog("error", `Failed to load project: ${response?.error || 'Unknown error'}`);
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

  // FIX-002: Update Recording (for toolbar and step changes)
  const handleUpdateRecording = useCallback((updates: Partial<Recording>) => {
    if (!recording) return;
    
    const updatedRecording: Recording = { 
      ...recording, 
      ...updates,
      updatedAt: Date.now()
    };
    setRecording(updatedRecording);
    
    // Save to database
    if (currentProject) {
      chrome.runtime.sendMessage({
        action: "update_project",
        payload: {
          id: parseInt(currentProject.id, 10),
          recorded_steps: updatedRecording.steps,
          loopStartIndex: updatedRecording.loopStartIndex,
          globalDelayMs: updatedRecording.globalDelayMs,
          conditionalDefaults: updatedRecording.conditionalDefaults
        }
      }, (response) => {
        if (response?.success) {
          addLog('info', 'Recording settings saved');
        } else {
          addLog('error', `Failed to save: ${response?.error || 'Unknown error'}`);
        }
      });
    }
  }, [recording, currentProject]);

  const handleToggleRecording = () => {
    setIsRecording(prev => {
      const newRecording = !prev;

      if (newRecording && projectId) {
        // Start recording
        addLog("info", "Starting recording...");
        chrome.runtime.sendMessage({
          action: "open_project_url_and_inject",
          payload: { id: parseInt(projectId, 10) },
        }, (response) => {
          if (response?.success) {
            addLog("success", "Target page opened, recording active");
          } else {
            addLog("error", `Failed to open target: ${response?.error || 'Unknown error'}`);
          }
        });
      } else {
        // Stop recording → close opened tab
        chrome.runtime.sendMessage({ action: "close_opened_tab" });
        setError("Recorded steps have been saved successfully !");
        addLog('info', 'Recording stopped.');
      }

      return newRecording;
    });
  };

  const handleAddStep = () => {
    if (!recording) return;

    // FIX-006: Use correct Step interface with Vision fields
    const newStep = createStep({
      event: 'click',
      xpath: '',
      label: `New Step ${recording.steps.length + 1}`
    });

    const updatedSteps = [...recording.steps, newStep];
    handleUpdateRecording({ steps: updatedSteps });
    addLog('info', 'Added a new step.');
  };

  // FIX-004: Update step with proper typing
  const handleUpdateStep = (index: number, updates: Partial<Step>) => {
    if (!recording) return;

    const updatedSteps = [...recording.steps];
    updatedSteps[index] = { ...updatedSteps[index], ...updates };
    handleUpdateRecording({ steps: updatedSteps });
    addLog('info', `Updated step ${index + 1}.`);
  };

  const handleDeleteStep = (index: number) => {
    if (!recording) return;

    const updatedSteps = recording.steps.filter((_, i) => i !== index);
    const stepName = recording.steps[index]?.label || `Step ${index + 1}`;
    
    // Adjust loopStartIndex if needed
    let newLoopStartIndex = recording.loopStartIndex;
    if (index < recording.loopStartIndex) {
      newLoopStartIndex = Math.max(0, recording.loopStartIndex - 1);
    } else if (index === recording.loopStartIndex && recording.loopStartIndex >= updatedSteps.length) {
      newLoopStartIndex = Math.max(0, updatedSteps.length - 1);
    }
    
    handleUpdateRecording({ 
      steps: updatedSteps,
      loopStartIndex: newLoopStartIndex
    });
    addLog('info', `Deleted step: ${stepName}`);
  };



  const handleSave = async () => {
    if (!currentProject || !recording) return;
    try {
      chrome.runtime.sendMessage({
        action: "update_project",
        payload: {
          id: parseInt(currentProject.id, 10),
          recorded_steps: recording.steps,
          loopStartIndex: recording.loopStartIndex,
          globalDelayMs: recording.globalDelayMs,
          conditionalDefaults: recording.conditionalDefaults
        }
      }, (response) => {
        if (response?.success) {
          addLog("info", `Saved recording successfully`);
          window.location.href = createPageUrl(`index.html#/FieldMapper?project=${currentProject.id}`);
        } else {
          addLog("error", `Failed to save: ${response?.error}`);
        }
      });
    } catch (error: any) {
      addLog("error", `Error saving project: ${error.message}`);
    }
  };

  // FIX-006: Listen for recorded events with Vision fields
  useEffect(() => {
    const listener = (message: any, _sender: any, _sendResponse: any) => {
      if (message.type === "logEvent" && isRecording && recording) {
        const { eventType, xpath, value, label } = message.data;
        console.log("message.data >>>>", message.data);

        // Create step with Vision fields
        const newStep: Step = {
          label: label && label.trim() !== '' ? label : (value ?? eventType),
          event: eventType,
          xpath: xpath || '',
          value: value ?? '',
          // Vision field - how step was recorded
          recordedVia: 'dom',
          timestamp: Date.now(),
          // conditionalConfig and delaySeconds remain undefined unless set
        };

        const updatedSteps = [...recording.steps];
        const lastStep = updatedSteps[updatedSteps.length - 1];
        const url = currentProject?.target_url || currentProject?.project_url || '';

        const isSheet = url.includes("docs.google.com");
        
        // Special case: always push new step if Enter key
        if (eventType === "Enter") {
          updatedSteps.push(newStep);
        } else {
          const result = !isSheet;
          if (result) {
            // Only update if last step has the same xpath
            if (lastStep && lastStep.xpath === xpath) {
              updatedSteps[updatedSteps.length - 1] = {
                ...lastStep,
                value: value ?? lastStep.value,
                label: label ?? lastStep.label,
                event: eventType ?? lastStep.event,
                timestamp: Date.now()
              };
            } else {
              updatedSteps.push(newStep);
            }
          } else {
            // Make sure lastStep exists before checking `.label`
            if (lastStep && lastStep.label && lastStep.label === label) {
              updatedSteps[updatedSteps.length - 1] = {
                ...lastStep,
                value: value ?? lastStep.value,
                label: label ?? lastStep.label,
                event: eventType ?? lastStep.event,
                timestamp: Date.now()
              };
            } else {
              updatedSteps.push(newStep);
            }
          }
        }

        handleUpdateRecording({ steps: updatedSteps });
        addLog("info", `Captured ${eventType} at ${xpath}`);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, [isRecording, recording, currentProject, handleUpdateRecording]);

  const handleExportSteps = () => {
    if (!recording || !recording.steps.length) {
      addLog("info", "No steps to export.");
      return;
    }

    // Convert data to worksheet
    const worksheet = XLSX.utils.json_to_sheet(recording.steps);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Steps");

    // Export to file
    const filename = `ProjectSteps_${currentProject?.name || "Untitled"}.xlsx`;
    XLSX.writeFile(workbook, filename);

    addLog("success", "Steps exported to Excel successfully!");
  };

  const handleExportHeader = () => {
    if (!recording || !recording.steps.length) {
      addLog("info", "No steps to export.");
      return;
    }

    // Collect labels and values (skip "open page")
    const validSteps = recording.steps.filter(
      step => step.label?.trim() && step.label.toLowerCase() !== "open page"
    );

    if (!validSteps.length) {
      addLog("info", "No valid labels found for headers.");
      return;
    }

    // Headers from labels
    const headers = validSteps.map(step => step.label?.trim());

    // Row values from step.value
    const values = validSteps.map(step => step.value || "");

    // Create worksheet with headers (row 1) and values (row 2)
    const worksheet = XLSX.utils.aoa_to_sheet([headers, values]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Steps");

    // Save as CSV
    const filename = `ProjectSteps_Labels_${currentProject?.name || "Untitled"}.csv`;
    XLSX.writeFile(workbook, filename, { bookType: "csv" });

    addLog("success", "Headers and values exported to CSV successfully!");
  };

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading project...</p>
        </div>
      </div>
    );
  }

  // No project found
  if (!currentProject || !recording) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white gap-4">
        <p className="text-slate-400">Project not found</p>
        <Button onClick={() => window.location.href = createPageUrl('index.html#/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
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
        <Button onClick={handleSave} disabled={!recording || recording.steps.length === 0} className="bg-green-500 hover:bg-green-600 flex items-center gap-2">
          Continue with field mapping
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {/* FIX-001: Vision-enabled Toolbar */}
      <RecorderToolbar
        recording={recording}
        isRecording={isRecording}
        onToggleRecording={handleToggleRecording}
        onUpdateRecording={handleUpdateRecording}
        onAddStep={handleAddStep}
        onExportSteps={handleExportSteps}
        onExportHeader={handleExportHeader}
        disabled={false}
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
            <CardTitle className="flex items-center justify-between text-lg">
              <span>Recorded Steps ({recording.steps.length})</span>
              {recording.loopStartIndex > 0 && (
                <span className="text-sm font-normal text-slate-400">
                  Loop starts at step {recording.loopStartIndex + 1}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-grow p-0 overflow-auto">
            {recording.steps.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p>No steps recorded yet.</p>
                <p className="text-sm mt-2">
                  Click "Record" to start capturing actions, or "Add Step" to create manually.
                </p>
              </div>
            ) : (
              /* FIX-004: Use StepList with badges */
              <StepList
                recording={recording}
                onUpdateStep={handleUpdateStep}
                onDeleteStep={handleDeleteStep}
              />
            )}
          </CardContent>
        </Card>
        <LogPanel logs={logs as any} onClear={() => setLogs([])} />
      </div>
    </div>
  );
}
