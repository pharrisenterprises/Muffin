import { DB } from "../common/services/indexedDB";
import { handleVisionMessage } from './visionMessageHandler';

async function ensurePersistentStorage() {
  if ('storage' in navigator && navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persisted();
    console.log("Storage persisted?", isPersisted);
    if (!isPersisted) {
      const granted = await navigator.storage.persist();
      console.log("Persistence granted:", granted);
    }
  } else {
    console.log("navigator.storage.persist not available in this context");
  }
}


//Call this ONCE when service worker starts
ensurePersistentStorage();

let openedTabId: number | null = null;
const trackedTabs = new Set<number>();

// ============================================
// BATCH B-40: Vision Recording Support
// Captures screenshots for OCR during recording
// ============================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'VISION_CAPTURE_FOR_RECORDING') {
    (async () => {
      try {
        if (!sender.tab?.windowId) {
          sendResponse({ error: 'No window context' });
          return;
        }
        
        // Capture the visible tab
        const screenshot = await chrome.tabs.captureVisibleTab(
          sender.tab.windowId,
          { format: 'png' }
        );
        
        // For now, return screenshot and let content script handle OCR
        // (Tesseract works better in content script context)
        sendResponse({
          screenshot: screenshot,
          bounds: message.bounds,
          text: null // Content script will extract via DOM first
        });
        
      } catch (error) {
        console.error('[TestFlow Background] Screenshot capture failed:', error);
        sendResponse({ error: String(error) });
      }
    })();
    
    return true; // Keep channel open for async response
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[Background] Message received:", message, "from sender:", sender);
  
  // Handle Vision messages first
  const visionResponse = handleVisionMessage(message, sender);
  if (visionResponse !== undefined) {
    console.log("[Background] Handling as Vision message");
    // Return true to indicate async response
    Promise.resolve(visionResponse).then(sendResponse);
    return true;
  }
  
  if (!message.action) {
    console.log("[Background] No action specified, returning false");
    return false;
  }
  
  console.log("[Background] Processing action:", message.action);
  try {
    //const senderTabId = sender?.tab?.id;
    if (message.action === "add_project") {
      console.log("Background: Received add_project request", message.payload);
      const newProject = {
        ...message.payload,
        recorded_steps: [],
        parsed_fields: [],
        csv_data: []
      };
      DB.addProject(newProject)
        .then(id => {
          console.log("Background: Project added successfully with ID:", id);
          sendResponse({ success: true, id });
        })
        .catch(error => {
          console.error("Background: Error adding project:", error);
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }

    if (message.action === "update_project") {
      const { id, ...updates } = message.payload;
      
      // Support both old and new field names, and Vision fields
      const projectUpdates: any = {};
      if (updates.name || updates.projectName) {
        projectUpdates.projectName = updates.name || updates.projectName;
      }
      if (updates.target_url || updates.project_url) {
        projectUpdates.project_url = updates.target_url || updates.project_url;
      }
      if (updates.recorded_steps !== undefined) {
        projectUpdates.recorded_steps = updates.recorded_steps;
      }
      if (updates.loopStartIndex !== undefined) {
        projectUpdates.loopStartIndex = updates.loopStartIndex;
      }
      if (updates.globalDelayMs !== undefined) {
        projectUpdates.globalDelayMs = updates.globalDelayMs;
      }
      if (updates.conditionalDefaults !== undefined) {
        projectUpdates.conditionalDefaults = updates.conditionalDefaults;
      }
      if (updates.schemaVersion !== undefined) {
        projectUpdates.schemaVersion = updates.schemaVersion;
      }
      
      DB.updateProject(id, projectUpdates)
        .then(() => sendResponse({ success: true }))
        .catch(error =>
          sendResponse({ success: false, error: error.message })
        );
      return true;
    }
    
    if (message.action === "get_project") {
      const projectId = message.payload?.id;
      DB.projects.get(projectId)
        .then((project) => {
          if (project) {
            sendResponse({ success: true, project });
          } else {
            sendResponse({ success: false, error: 'Project not found' });
          }
        })
        .catch(error =>
          sendResponse({ success: false, error: error.message })
        );
      return true;
    }

    if (message.action === "get_all_projects") {
      DB.getAllProjects()
        .then(projects => sendResponse({ success: true, projects }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    }

    if (message.action === "delete_project") {
      const projectId = message.payload?.projectId;
      DB.deleteProject(projectId)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    }

    if (message.action === "get_project_by_id") {
      const id = message.payload?.id;
      DB.projects.get(id)
        .then((project) => {
          if (project) {
            sendResponse({ success: true, project });
          } else {
            sendResponse({ success: false, error: "Process  not found" });
          }
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }

    if (message.action === "open_project_url_and_inject") {
      const projectId = message.payload?.id;
      DB.getAllProjects()
        .then((projects) => {
          const project = projects.find(p => p.id === projectId);
          if (!project) {
            sendResponse({ success: false, error: "Process not found" });
            return;
          }

          // FIX-003: Support both target_url and project_url field names
          const targetUrl = (project as any).target_url || project.project_url;
          if (!targetUrl) {
            sendResponse({ success: false, error: 'No target URL configured for project' });
            return;
          }

          chrome.tabs.create({ url: targetUrl }, (tab) => {
            if (tab?.id) {
              openedTabId = tab.id;
              trackedTabs.add(tab.id);
              injectMain(tab.id);
              sendResponse({ success: true, tabId: tab.id });
            } else {
              sendResponse({ success: false, error: 'Failed to create tab' });
            }
          });
        })
        .catch((err) => {
          sendResponse({ success: false, error: err.message });
        });
      return true;
    }

    if (message.action === "update_project_steps") {
      const { id, recorded_steps, loopStartIndex, globalDelayMs, delayMode } = message.payload;

      DB.projects.update(id, {
        recorded_steps,
        // VISION: Save Vision fields
          ...(loopStartIndex !== undefined && { loopStartIndex }),
          ...(globalDelayMs !== undefined && { globalDelayMs }),
          ...(delayMode !== undefined && { delayMode }),
        ...(delayMode !== undefined && { delayMode }), // B-43: Add this
        updated_date: new Date().toISOString()
      })
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }

    if (message.action === "update_project_fields") {
      const { id, parsed_fields } = message.payload;

      DB.projects.update(id, { parsed_fields })
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });

      return true;
    }

    if (message.action === "update_project_csv") {
      const { id, csv_data } = message.payload;

      DB.projects.update(id, { csv_data })
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });

      return true;
    }

    if (message.action === 'createTestRun') {
      (async () => {
        try {
          const id = await DB.testRuns.add(message.payload);
          const testRun = await DB.testRuns.get(id);
          sendResponse({ success: true, testRun });
        } catch (err) {
          //console.error("Error creating test run:", err);
          sendResponse({ success: false, error: err });
        }
      })();
      return true;
    }

    if (message.action === 'updateTestRun') {
      (async () => {
        try {
          await DB.testRuns.update(message.id, message.payload);
          sendResponse({ success: true });
        } catch (err) {
          sendResponse({ success: false, error: err });
        }
      })();
      return true;
    }

    if (message.action === "getTestRunsByProject") {
      const projectId = message.projectId;

      DB.getTestRunsByProject(projectId)
        .then((runs) => {
          sendResponse({ success: true, data: runs });
        })
        .catch((error) => {
          //console.error("Error fetching test runs:", error);
          sendResponse({ success: false, error: error.message });
        });

      return true;
    }

    if (message.action === "openTab") {
      const target_url = message.url;

      // Create new tab
      chrome.tabs.create({ url: target_url }, (tab) => {
        if (chrome.runtime.lastError) {
          console.error("Failed to create tab:", chrome.runtime.lastError.message);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }

        if (!tab?.id) {
          sendResponse({ success: false, error: "No tab ID returned" });
          return;
        }

        // Once tab is created, inject your content script
        injectMain(tab.id, (result) => {
          if (result.success) {
            console.log("Injected into tab", tab.id);
            if (tab?.id) {
              openedTabId = tab.id;
              trackedTabs.add(tab.id);
              sendResponse({ success: true, tabId: tab.id });
            }
          } else {
            console.error("Injection failed:", result.error);
            sendResponse({ success: false, error: result.error });
          }
        });
      });

      // Return true so sendResponse stays alive (async)
      return true;
    }
    if (message.action === "close_opened_tab") {
      if (openedTabId !== null) {
        chrome.tabs.remove(openedTabId, () => {
          openedTabId = null;
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: false, error: "No opened tab to close" });
      }
      return true;
    }

    if (message.action === "openDashBoard") {
      chrome.tabs.create({ url: chrome.runtime.getURL("pages.html") }, () => {
        sendResponse({ success: true });
      });
      return true;
    }

    // Unknown action
    console.warn("Background: Unknown action:", message.action);
    sendResponse({ success: false, error: `Unknown action: ${message.action}` });
    return false;

  } catch (err: any) {
    console.error("Background: Exception in message handler:", err);
    sendResponse({ success: false, error: err.message });
    return false;
  }
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: chrome.runtime.getURL("pages.html"),
  });
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({
      url: chrome.runtime.getURL("pages.html#dashboard"),
    });
  }
});

// helper function
function injectMain(tabId: number, cb?: (result: any) => void) {
  chrome.scripting.executeScript(
    {
      target: { tabId, allFrames: true },
      files: ["js/main.js"]
    },
    () => {
      if (chrome.runtime.lastError) {
        console.warn("Inject failed:", chrome.runtime.lastError.message);
        cb?.({ success: false });
      } else {
        console.log("Injected main.js into tab", tabId);
        cb?.({ success: true });
      }
    }
  );
}

// Reinjection on navigation (main or iframe)
chrome.webNavigation.onCommitted.addListener((details) => {
  if (trackedTabs.has(details.tabId)) {
    console.log("Frame navigated:", details.frameId, details.url);
    injectMain(details.tabId);
  }
});