import { useState, useEffect, useRef } from "react";
import { Button } from "../components/Ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/Ui/card";
import { Badge } from "../components/Ui/badge";
import { Progress } from "../components/Ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/Ui/tabs";
import {
  Play,
  Square,
  RotateCcw,
  Clock,
  CheckCircle,
  XCircle,
  Terminal,
  Activity,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import TestConsole from "../components/Runner/TestConsole";
import TestResults from "../components/Runner/TestResults";
import TestSteps from "../components/Runner/TestSteps";

interface LogEntry {
  timestamp: string;
  level: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

interface TestStep {
  event: string;
  id: number;
  name: string;
  type: string;
  selector: string;
  preview_data: any;
  status: 'pending' | 'running' | 'passed' | 'failed';
  duration: number;
  error_message: string | null;
}

type Project = {
  id: string;
  name: string;
  target_url: string;
  csv_data: [];
  recorded_steps: [];
  parsed_fields: [];
  globalDelayMs?: number;
  loopStartIndex?: number;
  delayMode?: 'static' | 'dynamic';
};

type TestRun = {
  passed_steps: number;
  failed_steps: number;
  id: string;
  status: string;
  projectId: string;
  createdAt: string;
};

type FieldMapping = {
  mapped: boolean;
  field_name: string;
  inputvarfields: string;
}

export default function TestRunner() {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentTestRun] = useState<TestRun | null>(null);
  const [testHistory, setTestHistory] = useState<TestRun[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [testSteps, setTestSteps] = useState<TestStep[]>([]);
  const [activeTab, setActiveTab] = useState<string>("console");
  const isRunningRef = useRef(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.hash.split("?")[1]);
    const projectId = urlParams.get("project");
    if (projectId) {
      loadProject(projectId);
      loadTestHistory(projectId);
    }
  }, []);

  const loadProject = async (projectId: string) => {
    try {
      chrome.runtime.sendMessage(
        {
          action: "get_project_by_id",
          payload: { id: parseInt(projectId, 10) },
        },
        (response) => {
          if (response?.success) {
            const project = response.project;
            console.log('Loaded project:', project);
            setCurrentProject(project);
          } else {
            //console.error("Failed to load project:", response?.error);
          }
        }
      );
    } catch (error) {
      //console.error('Error loading project:', error);
    }
  };

  const loadTestHistory = async (projectId: string) => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "getTestRunsByProject",
        projectId: projectId,
      });

      if (response.success) {
        setTestHistory(
          response.data.map((run: any) => ({
            ...run,
            status: run.status ?? "pending",
            createdAt: run.createdAt || run.created_date || run.start_time || Date.now(),
          }))
        );
      } else {
        //console.error("Failed to load test history:", response.error);
      }
    } catch (error) {
      //console.error("Error communicating with background:", error);
    }
  };

  const runTest = async () => {
    if (!currentProject) {
      addLog("warning", "No project selected for testing");
      return;
    }

    // Initialization
    isRunningRef.current = true;
    setIsRunning(true);
    setProgress(0);
    setLogs([]);
    setActiveTab("console");

    try {
      const { csv_data, recorded_steps, parsed_fields, target_url } = currentProject;
      
      // B-42: Read delay and loop settings from project
      const globalDelayMs = currentProject.globalDelayMs ?? 0;
      const loopStartIndex = currentProject.loopStartIndex ?? -1;
      const delayMode = (currentProject as any).delayMode || 'static';
      addLog("info", `Settings: Delay mode=${delayMode}, Global delay=${globalDelayMs}ms, Loop start=${loopStartIndex === -1 ? 'No loop' : 'Step ' + (loopStartIndex + 1)}`);

      // B-43: Dynamic page ready detection
      const waitForPageReady = async (tabId: number, maxWaitMs: number = 30000): Promise<void> => {
        const startTime = Date.now();
        addLog("info", "⏳ Dynamic: Waiting for page to be ready...");
        while (Date.now() - startTime < maxWaitMs) {
          try {
            const response = await chrome.tabs.sendMessage(tabId, { type: 'checkPageReady' });
            if (response?.ready) {
              addLog("info", "✓ Dynamic: Page is ready");
              return;
            }
          } catch (e) {
            // Tab might not be ready yet, keep trying
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        addLog("warning", "⚠ Dynamic: Max wait time reached, proceeding anyway");
      };

      // Validate required data
      if (!recorded_steps || !target_url) {
        addLog("error", "Missing required project data (steps or target URL)");
        throw new Error("Missing required project data");
      }

      const stepsLabels = (recorded_steps as { label: string }[]).map(step => step.label);
      const fieldMappings: FieldMapping[] = parsed_fields as FieldMapping[] || [];

      // Create mapping lookup
      const mappingLookup: Record<string, string> = {};
      fieldMappings.forEach(mapObj => {
        if (mapObj.mapped && mapObj.field_name && mapObj.inputvarfields) {
          mappingLookup[mapObj.field_name] = mapObj.inputvarfields;
        }
      });

      // Decide rows → either CSV rows or one empty row if no CSV
      const rowsToProcess: Record<string, any>[] = (Array.isArray(csv_data) && csv_data.length > 0) ? csv_data : [{}];

      for (let rowIndex = 0; rowIndex < rowsToProcess.length; rowIndex++) {
        if (!isRunningRef.current) break;
        
        // B-42: Handle no-loop mode - skip rows 2+ when loopStartIndex is -1
        if (loopStartIndex === -1 && rowIndex > 0) {
          addLog("info", `No CSV loop - skipping row ${rowIndex + 1}`);
          continue;
        }

        const row = rowsToProcess[rowIndex];
        const rowKeys = Object.keys(row);

        // Setup steps
        const steps: any = recorded_steps?.map((steps: { label: any; selector: any; event: any; }, index: number) => ({
          id: index + 1,
          name: `Interact with ${steps.label}`,
          selector: steps.selector,
          event: steps.event,
          status: 'pending' as const,
          duration: 0,
          error_message: null
        })) || [];

        setTestSteps(steps);

        // Validate row against step labels (skip only for CSV case)
        if (csv_data && csv_data.length > 0) {
          const isValidRow = rowKeys.some(key =>
            stepsLabels.includes(key) ||
            (mappingLookup[key] && stepsLabels.includes(mappingLookup[key]))
          );

          if (!isValidRow) {
            addLog("info", `CSV row ${rowIndex + 1} skipped - no matching labels found`);
            continue;
          }
        }

        addLog("info", csv_data && csv_data.length > 0
          ? `Starting test execution for CSV row ${rowIndex + 1}`
          : `Starting test execution without CSV data`
        );

        // Open new browser tab
        let tabId;
        try {
          const response = await chrome.runtime.sendMessage({
            action: "openTab",
            url: target_url
          });

          if (!response.success || !response.tabId) {
            throw new Error("Failed to open browser tab or inject content.js");
          }

          tabId = response.tabId;
        } catch (error) {
          addLog("error", `Failed to open browser tab: ${error}`);
          continue;
        }

        // Clone steps
        const testSteps = JSON.parse(JSON.stringify(recorded_steps));
        let prev_step = {};
        
        // B-42: Determine starting step based on loop mode
        const startStepIndex = (rowIndex > 0 && loopStartIndex >= 0) ? loopStartIndex : 0;
        if (startStepIndex > 0) {
          addLog("info", `Row ${rowIndex + 1}: Starting from step ${startStepIndex + 1} (loop mode)`);
        }
        
        // Execute steps
        for (let stepIndex = startStepIndex; stepIndex < testSteps.length; stepIndex++) {
          if (!isRunningRef.current) break;
          const step = testSteps[stepIndex];
          step.status = "pending";

          try {
            // B-42: Apply per-step delay BEFORE executing step
            const perStepDelay = step.delaySeconds || 0;
            if (perStepDelay > 0) {
              addLog("info", `⏳ Waiting ${perStepDelay}s before step ${stepIndex + 1}...`);
              await new Promise(r => setTimeout(r, perStepDelay * 1000));
            }

            // B-47: Handle conditional-click steps with polling loop
            if (step.event === 'conditional-click') {
              const config = step.conditionalConfig || {
                searchTerms: ['Allow', 'Keep', 'Continue'],
                timeoutSeconds: step.delaySeconds || 300,
                pollIntervalMs: 500
              };
              
              addLog('info', '🔍 Starting conditional click: ' + config.searchTerms.join(', '));
              addLog('info', '⏱️ Timeout: ' + config.timeoutSeconds + 's, Poll: ' + config.pollIntervalMs + 'ms');
              addLog('info', '👀 Watching for buttons... (this will take up to ' + config.timeoutSeconds + ' seconds)');
              
              try {
                const result = await new Promise<{ buttonsClicked: number; timedOut: boolean; pollCount: number }>((resolve) => {
                  // Set a safety timeout slightly longer than the configured timeout
                  const safetyTimeout = setTimeout(() => {
                    resolve({ buttonsClicked: 0, timedOut: true, pollCount: 0 });
                  }, (config.timeoutSeconds + 60) * 1000);
                  
                  chrome.tabs.sendMessage(tabId, {
                    type: 'CONDITIONAL_CLICK_START',
                    config
                  }, (response) => {
                    clearTimeout(safetyTimeout);
                    if (chrome.runtime.lastError) {
                      console.error('Conditional click error:', chrome.runtime.lastError);
                      resolve({ buttonsClicked: 0, timedOut: true, pollCount: 0 });
                    } else {
                      resolve(response || { buttonsClicked: 0, timedOut: true, pollCount: 0 });
                    }
                  });
                });
                
                addLog('success', '✅ Conditional complete: ' + result.buttonsClicked + ' buttons clicked after ' + result.pollCount + ' polls');
                
                if (result.buttonsClicked > 0) {
                  addLog('info', '🎉 Successfully clicked ' + result.buttonsClicked + ' button(s)');
                }
                
                step.status = "passed";
                updateStepStatus(stepIndex, "passed", 0);
              } catch (error) {
                addLog('error', '❌ Conditional click error: ' + String(error));
                step.status = "failed";
                updateStepStatus(stepIndex, "failed", 0, String(error));
              }
              
              setProgress(((stepIndex + 1) / testSteps.length) * 100);
              prev_step = { ...step, bundle: step.bundle || {} } as any;
              
              // Continue to next step after conditional completes
              continue;
            }

            if (step.event === "input" || step.event === "click") {
              let inputValue: string | undefined;

                console.log("[CSV DEBUG] Row keys:", Object.keys(row));
                console.log("[CSV DEBUG] Step label:", step.label);
                console.log("[CSV DEBUG] Direct lookup:", row[step.label]);
                console.log("[CSV DEBUG] MappingLookup:", mappingLookup);
              if (csv_data && csv_data.length > 0) {
                // ✅ CSV mode → mapping se value nikalna
                if (row[step.label] !== undefined) {
                  inputValue = row[step.label];
                } else {
                  const mappedKey = Object.keys(mappingLookup).find(
                    key => mappingLookup[key] === step.label
                  );
                  if (mappedKey && row[mappedKey] !== undefined) {
                    inputValue = row[mappedKey];
                  }
                }

                if (inputValue !== undefined) {
                  step.value = inputValue;
                } else {
                  if (step.event === "input") {
                    // ⛔️ input skip agar CSV me value missing hai
                    addLog("warning", `Skipping step ${stepIndex + 1} - no value found in CSV`);
                    step.status = "skipped";
                    continue;
                  } else {
                    step.value = ""; // click allow kare bina value
                  }
                }
              } else {
                // 🚀 No CSV mode → recorded value hi use karo
                step.value = step.value ?? "";
              }
            }

            // Add random delay
            await new Promise(resolve =>
              setTimeout(resolve, 1000 + Math.random() * 2000)
            );
            if (!isRunningRef.current) break;


            const stepData = {
              event: step.event,
              path: step.path,
              value: step.value,
              selector: step.selector,
              label: step.label,
              x: step.x,
              y: step.y,
              bundle: {
                ...step.bundle,
                // B-43: Explicitly include vision fields if not already present
                ...(!(step.bundle?.recordedVia) && { recordedVia: step.recordedVia || 'dom' }),
                ...(!(step.bundle?.coordinates) && { coordinates: step.coordinates || (step.x && step.y ? { x: step.x, y: step.y } : undefined) }),
                ...(!(step.bundle?.visionCapture) && { visionCapture: step.visionCapture || false }),
              },
            };

            // B-43: Debug log
            console.log('[TestRunner DEBUG] Sending step:', {
              event: stepData.event,
              label: stepData.label,
              bundleVision: {
                recordedVia: stepData.bundle.recordedVia,
                visionCapture: stepData.bundle.visionCapture,
                hasCoordinates: !!stepData.bundle.coordinates
              }
            });

            let stepSuccess = false;
            let executionError: any = "";
            const startTime = Date.now();

            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
            if (stepData.event !== "open") {
              try {
                await chrome.tabs.sendMessage(tabId, {
                  type: "runStep",
                  data: stepData,
                  prevStep : prev_step
                });
                stepSuccess = true;
              } catch (error: any) {
                executionError = error.message;
                addLog("error", `Step ${stepIndex + 1} execution failed: ${executionError}`);
              }
            } else {
              stepSuccess = true;
            }

            const duration = Date.now() - startTime;

            if (stepSuccess) {
              step.status = "passed";
              updateStepStatus(stepIndex, "passed", duration);
              addLog("success", `✓ Step ${stepIndex + 1} completed`);
            } else {
              step.status = "failed";
              updateStepStatus(stepIndex, "failed", duration, executionError);
            }

            setProgress(((stepIndex + 1) / testSteps.length) * 100);
            prev_step = stepData;
            
            // B-43: Apply delay based on mode
            if (stepIndex < testSteps.length - 1) {
              if (delayMode === 'dynamic') {
                // Dynamic: Wait for page to be ready
                await waitForPageReady(tabId, 30000);
              } else if (globalDelayMs > 0) {
                // Static: Fixed delay
                addLog("info", `⏳ Static delay ${globalDelayMs}ms...`);
                await new Promise(resolve => setTimeout(resolve, globalDelayMs));
              }
            }
            
          } catch (stepError) {
            addLog("error", `Unexpected error in step ${stepIndex + 1}: ${stepError}`);
            step.status = "failed";
            continue;
          }
        }


        // Calculate results
        const passedSteps = testSteps.filter((s: { status: string; }) => s.status === "passed").length;
        const failedSteps = testSteps.filter((s: { status: string; }) => s.status === "failed").length;
        const skippedSteps = testSteps.filter((s: { status: string; }) => s.status === "skipped").length;

        addLog("info",
          `${csv_data && csv_data.length > 0 ? "CSV row " + (rowIndex + 1) : "Test"} completed: ${passedSteps} passed, ${failedSteps} failed, ${skippedSteps} skipped`
        );

        // Close the tab after test
        // try {
        //   if (tabId) {
        //     await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 5000));
        //     await chrome.tabs.remove(tabId);
        //   }
        // } catch (tabError) {
        //   addLog("warning", `Could not close tab: ${tabError}`);
        // }
      }
    } catch (mainError) {
      addLog("error", `Test execution failed: ${mainError}`);
    } finally {
      isRunningRef.current = false;
      setIsRunning(false);
      if (currentProject?.id) {
        loadTestHistory(currentProject.id);
      }
    }
  };



  const stopTest = () => {
    isRunningRef.current = false;
    setIsRunning(false);
    addLog('warning', 'Test execution stopped by user');
  };

  const resetTest = () => {
    isRunningRef.current = false;
    setIsRunning(false);
    setProgress(0);
    setLogs([]);
    setTestSteps([]);
    addLog('warning', 'Test execution reset by user');
  };

  const addLog = (level: LogEntry['level'], message: string) => {
    const newLog: LogEntry = {
      timestamp: format(new Date(), 'HH:mm:ss'),
      level,
      message
    };
    setLogs(prev => [...prev, newLog]);
  };

  const updateStepStatus = (index: number, status: TestStep['status'], duration: number = 0, errorMessage: string | null = null) => {
    setTestSteps(prev => prev.map((step, i) =>
      i === index
        ? { ...step, status, duration, error_message: errorMessage }
        : step
    ));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Activity className="w-4 h-4 text-blue-400 animate-pulse" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'completed': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'failed': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Play className="w-8 h-8 text-green-400" />
              Test Runner
            </h1>
            {currentProject && (
              <p className="text-slate-400 text-lg">
                Project: <span className="text-green-400 font-semibold">{currentProject.name}</span>
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={runTest}
              disabled={isRunning || !currentProject}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            >
              <Play className="w-4 h-4 mr-2" />
              {isRunning ? 'Running...' : 'Run Process'}
            </Button>

            {isRunning && (
              <Button
                onClick={stopTest}
                variant="destructive"
                className="bg-red-500 hover:bg-red-600"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop
              </Button>
            )}

            <Button
              onClick={resetTest}
              variant="outline"
              className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>

        {/* Test Status Overview */}
        <div className="grid md:grid-cols-4 gap-6">
          <Card className="glass-effect bg-slate-800/30 border-slate-700/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Status
              </CardTitle>
              {getStatusIcon(isRunning ? 'running' : currentTestRun?.status || 'pending')}
            </CardHeader>
            <CardContent>
              <Badge
                variant="outline"
                className={getStatusColor(isRunning ? 'running' : currentTestRun?.status || 'pending')}
              >
                {isRunning ? 'Running' : currentTestRun?.status || 'Ready'}
              </Badge>
            </CardContent>
          </Card>

          <Card className="glass-effect bg-slate-800/30 border-slate-700/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Progress
              </CardTitle>
              <Activity className="w-4 h-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">
                {Math.round(progress)}%
              </div>
              <Progress value={progress} className="mt-2 h-2" />
            </CardContent>
          </Card>

          <Card className="glass-effect bg-slate-800/30 border-slate-700/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Steps Passed
              </CardTitle>
              <CheckCircle className="w-4 h-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                {testSteps.filter(s => s.status === 'passed').length}
                <span className="text-sm text-slate-400">/{testSteps.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-effect bg-slate-800/30 border-slate-700/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Steps Failed
              </CardTitle>
              <XCircle className="w-4 h-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">
                {testSteps.filter(s => s.status === 'failed').length}
                <span className="text-sm text-slate-400">/{testSteps.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Panel - Test Steps */}
          <div className="lg:col-span-1">
            <TestSteps
              steps={testSteps}
              isRunning={isRunning}
            />
          </div>

          {/* Right Panel - Console and Results */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 bg-slate-700">
                <TabsTrigger value="console" className="data-[state=active]:bg-green-500">
                  <Terminal className="w-4 h-4 mr-2" />
                  Console
                </TabsTrigger>
                <TabsTrigger value="results" className="data-[state=active]:bg-green-500">
                  <FileText className="w-4 h-4 mr-2" />
                  Results
                </TabsTrigger>
                <TabsTrigger value="history" className="data-[state=active]:bg-green-500">
                  <Clock className="w-4 h-4 mr-2" />
                  History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="console" className="mt-6">
                <TestConsole
                  logs={logs}
                  isRunning={isRunning}
                />
              </TabsContent>

              <TabsContent value="results" className="mt-6">
                <TestResults
                  testRun={currentTestRun}
                  steps={testSteps}
                />
              </TabsContent>

              <TabsContent value="history" className="mt-6">
                <Card className="glass-effect bg-slate-800/30 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-white">Test History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {testHistory.map((run, index) => (
                        <div
                          key={run.id}
                          className="p-4 rounded-lg bg-slate-700/50 border border-slate-600/50"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {getStatusIcon(run.status)}
                              <div>
                                <p className="text-white font-medium">
                                  Test Run #{testHistory.length - index}
                                </p>
                                <p className="text-sm text-slate-400">
                                  {run.createdAt && !isNaN(new Date(run.createdAt).getTime())
                                    ? format(new Date(run.createdAt), 'MMM d, yyyy HH:mm')
                                    : 'Invalid Date'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-green-400">
                                {run.passed_steps || 0} passed
                              </p>
                              <p className="text-sm text-red-400">
                                {run.failed_steps || 0} failed
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}