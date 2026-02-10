/**
 * Update splash helper for macOS.
 *
 * Spawns a lightweight, detached osascript (JXA) process that displays a native
 * floating window while the app restarts during an update.  The splash survives
 * the old Electron process quitting and auto-closes once it detects the new
 * instance of the app (or after a 120-second timeout).
 *
 * The new app instance should call `killUpdateSplash()` on startup to ensure
 * the splash is removed promptly.
 */

import { app } from "electron";
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const SENTINEL_FILENAME = "update-splash.pid";
const TEMP_SCRIPT_NAME = "atomicbot-update-splash.js";

// ---------------------------------------------------------------------------
// JXA script (JavaScript for Automation) that renders a native macOS window.
// Runs via `osascript -l JavaScript <file> <oldPid> <sentinelPath> <bundleId>`.
// ---------------------------------------------------------------------------
const JXA_SCRIPT = /* js */ `
function run(argv) {
  var oldPid = parseInt(argv[0], 10) || 0;
  var sentinelPath = argv[1] || '';
  var bundleId = argv[2] || 'ai.atomicbot.desktop';

  ObjC.import('Cocoa');

  var nsApp = $.NSApplication.sharedApplication;
  // Accessory activation policy = no Dock icon, no menu bar.
  nsApp.setActivationPolicy(2);

  // Write our PID to the sentinel file so the new app instance can kill us.
  if (sentinelPath) {
    var pid = $.NSProcessInfo.processInfo.processIdentifier;
    var pidStr = $.NSString.stringWithFormat('%d', pid);
    // NSUTF8StringEncoding = 4
    pidStr.writeToFileAtomicallyEncodingError(sentinelPath, true, 4, null);
  }

  // ---- Window ----
  var W = 340, H = 150;
  // NSWindowStyleMaskTitled (1) | NSWindowStyleMaskFullSizeContentView (1<<15)
  var styleMask = 1 | (1 << 15);
  var win = $.NSWindow.alloc.initWithContentRectStyleMaskBackingDefer(
    $.NSMakeRect(0, 0, W, H), styleMask, 2 /* NSBackingStoreBuffered */, false
  );

  win.titlebarAppearsTransparent = true;
  win.titleVisibility = 1; // NSWindowTitleHidden
  win.isMovableByWindowBackground = true;
  win.level = 3; // NSFloatingWindowLevel
  win.backgroundColor = $.NSColor.colorWithSRGBRedGreenBlueAlpha(
    0.043, 0.059, 0.078, 1.0 // #0b0f14
  );
  win.hasShadow = true;

  // Force dark appearance so the native spinner is light-on-dark.
  try {
    win.appearance = $.NSAppearance.appearanceNamed('NSAppearanceNameDarkAqua');
  } catch (e) { /* pre-Mojave fallback: ignore */ }

  // Visible on all Spaces / Mission Control desktops.
  win.collectionBehavior = 1 << 0; // NSWindowCollectionBehaviorCanJoinAllSpaces

  var cv = win.contentView;

  // ---- Spinner ----
  var spinner = $.NSProgressIndicator.alloc.initWithFrame(
    $.NSMakeRect((W - 32) / 2, 78, 32, 32)
  );
  spinner.style = 1; // NSProgressIndicatorStyleSpinning
  spinner.displayedWhenStopped = false;
  spinner.startAnimation(null);
  cv.addSubview(spinner);

  // ---- Title label ----
  var titleField = $.NSTextField.alloc.initWithFrame(
    $.NSMakeRect(0, 42, W, 28)
  );
  titleField.stringValue = 'Updating Atomic Bot\\u2026'; // ellipsis
  titleField.alignment = 2; // NSTextAlignmentCenter
  titleField.setBezeled(false);
  titleField.setDrawsBackground(false);
  titleField.setEditable(false);
  titleField.setSelectable(false);
  titleField.textColor = $.NSColor.colorWithSRGBRedGreenBlueAlpha(
    0.9, 0.93, 0.95, 1.0
  );
  titleField.font = $.NSFont.systemFontOfSizeWeight(16, 0.5);
  cv.addSubview(titleField);

  // ---- Subtitle ----
  var subField = $.NSTextField.alloc.initWithFrame(
    $.NSMakeRect(0, 20, W, 20)
  );
  subField.stringValue = 'Please wait\\u2026';
  subField.alignment = 2;
  subField.setBezeled(false);
  subField.setDrawsBackground(false);
  subField.setEditable(false);
  subField.setSelectable(false);
  subField.textColor = $.NSColor.colorWithSRGBRedGreenBlueAlpha(
    0.55, 0.6, 0.65, 1.0
  );
  subField.font = $.NSFont.systemFontOfSize(12);
  cv.addSubview(subField);

  // ---- Show ----
  win.center();
  win.makeKeyAndOrderFront(null);

  // ---- Poll loop: wait for the new app or timeout ----
  var MAX_SECONDS = 120;
  var POLL_INTERVAL = 1.0; // seconds
  var elapsed = 0;
  var oldPidDead = (oldPid === 0);

  while (elapsed < MAX_SECONDS) {
    // Run the Cocoa event loop for POLL_INTERVAL seconds (processes redraws).
    $.NSRunLoop.currentRunLoop.runUntilDate(
      $.NSDate.dateWithTimeIntervalSinceNow(POLL_INTERVAL)
    );
    elapsed += POLL_INTERVAL;

    // Check if the old Electron process has exited.
    if (!oldPidDead) {
      var stillRunning = false;
      var allApps = $.NSWorkspace.sharedWorkspace.runningApplications;
      for (var i = 0; i < allApps.count; i++) {
        if (allApps.objectAtIndex(i).processIdentifier === oldPid) {
          stillRunning = true;
          break;
        }
      }
      if (!stillRunning) {
        oldPidDead = true;
      }
    }

    // Once the old instance is gone, look for a new one.
    if (oldPidDead) {
      var allApps2 = $.NSWorkspace.sharedWorkspace.runningApplications;
      for (var j = 0; j < allApps2.count; j++) {
        var ra = allApps2.objectAtIndex(j);
        var bid = ra.bundleIdentifier;
        if (bid) {
          try {
            if (ObjC.unwrap(bid) === bundleId) {
              // New instance detected. Give it a moment to render its window.
              $.NSRunLoop.currentRunLoop.runUntilDate(
                $.NSDate.dateWithTimeIntervalSinceNow(2.5)
              );
              cleanup(sentinelPath);
              return;
            }
          } catch (e) { /* ignore */ }
        }
      }
    }
  }

  // Timeout reached.
  cleanup(sentinelPath);
}

function cleanup(sentinelPath) {
  if (sentinelPath) {
    try {
      $.NSFileManager.defaultManager.removeItemAtPathError(sentinelPath, null);
    } catch (e) { /* ignore */ }
  }
}
`;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Show the native update splash window.
 *
 * Should be called immediately before `autoUpdater.quitAndInstall()`. The
 * splash runs as a detached osascript process that survives the Electron quit.
 */
export function showUpdateSplash(): void {
  if (process.platform !== "darwin") {
    return;
  }

  try {
    const stateDir = path.join(app.getPath("userData"), "openclaw");
    fs.mkdirSync(stateDir, { recursive: true });

    const sentinelPath = path.join(stateDir, SENTINEL_FILENAME);
    const scriptPath = path.join(os.tmpdir(), TEMP_SCRIPT_NAME);

    // Write the JXA script to a temp file so osascript can read it.
    fs.writeFileSync(scriptPath, JXA_SCRIPT, "utf-8");

    const bundleId = "ai.atomicbot.desktop";

    const child = spawn(
      "osascript",
      ["-l", "JavaScript", scriptPath, String(process.pid), sentinelPath, bundleId],
      { detached: true, stdio: "ignore" },
    );
    child.unref();
  } catch {
    // Splash is best-effort; never block the update.
  }
}

/**
 * Kill a lingering update splash (if any).
 *
 * Call this early during app startup so the splash disappears as soon as the
 * new app instance is alive.
 */
export function killUpdateSplash(): void {
  if (process.platform !== "darwin") {
    return;
  }

  try {
    const stateDir = path.join(app.getPath("userData"), "openclaw");
    const sentinelPath = path.join(stateDir, SENTINEL_FILENAME);

    if (!fs.existsSync(sentinelPath)) {
      return;
    }

    const raw = fs.readFileSync(sentinelPath, "utf-8").trim();
    const pid = parseInt(raw, 10);

    if (pid > 0) {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        // Process already gone.
      }
    }

    fs.unlinkSync(sentinelPath);
  } catch {
    // Best-effort cleanup.
  }
}
