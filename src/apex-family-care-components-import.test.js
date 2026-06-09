import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("Apex Family Care has a standalone PWA entry outside the Apex HQ app", () => {
  const appSource = fs.readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const routeSource = fs.readFileSync(new URL("./app-routing.js", import.meta.url), "utf8");
  const navSource = fs.readFileSync(new URL("./navigation-utils.js", import.meta.url), "utf8");
  const mobileNavSource = fs.readFileSync(new URL("./mobile-nav-utils.js", import.meta.url), "utf8");
  const standaloneSource = fs.readFileSync(new URL("./family-care-main.jsx", import.meta.url), "utf8");
  const htmlSource = fs.readFileSync(new URL("../family-care.html", import.meta.url), "utf8");
  const manifestSource = fs.readFileSync(new URL("../public/family-care.webmanifest", import.meta.url), "utf8");

  assert.match(htmlSource, /<title>Apex Family Care<\/title>/);
  assert.match(htmlSource, /<link rel="manifest" href="\/family-care\.webmanifest"/);
  assert.match(htmlSource, /src="\/src\/family-care-main\.jsx"/);
  assert.match(manifestSource, /"name": "Apex Family Care"/);
  assert.match(manifestSource, /"start_url": "\/family-care"/);
  assert.match(standaloneSource, /ApexFamilyCareStandaloneApp/);
  assert.doesNotMatch(standaloneSource, /from "\.\/App"|from '\.\/App'/);

  assert.doesNotMatch(appSource, /familyCare|ApexFamilyCarePage|apex-family-care-components/);
  assert.doesNotMatch(routeSource, /familyCare: "\/family-care"/);
  assert.doesNotMatch(navSource, /familyCare/);
  assert.doesNotMatch(mobileNavSource, /familyCare/);
});

test("Apex Family Care page contains family screens and no hidden mic APIs", () => {
  const componentSource = fs.readFileSync(new URL("./apex-family-care-components.jsx", import.meta.url), "utf8");

  for (const label of ["Today", "Kitchen Mode", "Add Update", "Voice Update", "Care Timeline", "Doctor Summary", "Family Summary", "Settings", "Test Week", "Family Access", "Apex Health"]) {
    assert.match(componentSource, new RegExp(label));
  }

  assert.match(componentSource, /export function ApexFamilyCareStandaloneApp/);
  assert.match(componentSource, /Opens directly without Apex HQ/);
  assert.match(componentSource, /No raw audio/);
  assert.match(componentSource, /No diagnosis/);
  assert.match(componentSource, /createApexFamilyCareVoiceNoteDraft/);
  assert.match(componentSource, /APEX_FAMILY_CARE_VOICE_POLICY/);
  assert.match(componentSource, /buildApexFamilyCareNotificationState/);
  assert.match(componentSource, /APEX_FAMILY_CARE_NOTIFICATION_POLICY/);
  assert.match(componentSource, /buildApexFamilyCareKitchenModeStatus/);
  assert.match(componentSource, /APEX_FAMILY_CARE_KITCHEN_MODE_POLICY/);
  assert.match(componentSource, /buildApexFamilyCareTestWeekSummary/);
  assert.match(componentSource, /addApexFamilyCareTestWeekFrictionNote/);
  assert.match(componentSource, /Start Voice Update/);
  assert.match(componentSource, /Done Talking \/ Review/);
  assert.match(componentSource, /Save Needs Review/);
  assert.match(componentSource, /One-Tap Care Updates/);
  assert.match(componentSource, /Mute Kitchen/);
  assert.match(componentSource, /Stop Voice State/);
  assert.match(componentSource, /Kitchen Device Health/);
  assert.match(componentSource, /Family Test Week/);
  assert.match(componentSource, /Friction And Useful Notes/);
  assert.match(componentSource, /Human review required/);
  assert.match(componentSource, /Notification Decisions/);
  assert.match(componentSource, /Safe lock-screen copy/);
  assert.match(componentSource, /No live sends/);
  assert.match(componentSource, /Phase 5A delivery later/);
  assert.doesNotMatch(componentSource, /getUserMedia|MediaRecorder|navigator\.mediaDevices|ApexMciWave|windows-mci-waveaudio|native-voice|NetworkInformation|navigator\.usb|navigator\.bluetooth/i);
  assert.doesNotMatch(componentSource, /fetch\(|Notification\.requestPermission|navigator\.serviceWorker|PushManager/i);
});

test("Apex Family Care still uses Phase 2 and Phase 3 shared helpers", () => {
  const componentSource = fs.readFileSync(new URL("./apex-family-care-components.jsx", import.meta.url), "utf8");

  for (const helperName of [
    "addApexFamilyCareNote",
    "buildApexFamilyCareDoctorSummary",
    "buildApexFamilyCareFamilySummary",
    "buildApexFamilyCareTodaySummary",
    "getApexFamilyCareBrainInterfaceSummary",
    "createApexFamilyCareVoiceNoteDraft",
    "buildApexFamilyCareKitchenModeStatus",
    "applyApexFamilyCareKitchenControl",
    "buildApexFamilyCareTestWeekSummary",
    "startApexFamilyCareTestWeek",
    "buildApexFamilyCareNotificationState",
    "getDefaultApexFamilyCareNotificationPreferences",
    "listApexFamilyCareNotes",
  ]) {
    assert.match(componentSource, new RegExp(helperName));
  }

  assert.match(componentSource, /Care Signals/);
  assert.match(componentSource, /Missing update detector/);
  assert.match(componentSource, /Pattern detector/);
  assert.match(componentSource, /Medication control/);
  assert.match(componentSource, /Voice explicit start/);
  assert.match(componentSource, /Voice hidden recording/);
  assert.match(componentSource, /Notification live sends/);
  assert.match(componentSource, /Notification provider sends/);
  assert.match(componentSource, /Lock-screen details/);
  assert.match(componentSource, /Kitchen hidden mic/);
  assert.match(componentSource, /Kitchen device control/);
  assert.match(componentSource, /Test week evidence/);
  assert.doesNotMatch(componentSource, /getUserMedia|MediaRecorder|navigator\.mediaDevices|fetch\(|Notification\.requestPermission|navigator\.serviceWorker|PushManager|NetworkInformation|navigator\.usb|navigator\.bluetooth/i);
});
