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
  assert.match(componentSource, /APEX_FAMILY_CARE_LOCAL_STT_BRIDGE_APPROVAL_POLICY/);
  assert.match(componentSource, /buildApexFamilyCareLocalSttBridgeApprovalPacket/);
  assert.match(componentSource, /buildApexFamilyCareNotificationState/);
  assert.match(componentSource, /APEX_FAMILY_CARE_NOTIFICATION_POLICY/);
  assert.match(componentSource, /buildApexFamilyCareKitchenModeStatus/);
  assert.match(componentSource, /APEX_FAMILY_CARE_KITCHEN_MODE_POLICY/);
  assert.match(componentSource, /buildApexFamilyCareAccessReadiness/);
  assert.match(componentSource, /buildApexFamilyCareBoundaryReleasePrep/);
  assert.match(componentSource, /buildApexFamilyCareLocalReleaseSmokeChecklist/);
  assert.match(componentSource, /buildApexFamilyCareTestWeekSummary/);
  assert.match(componentSource, /buildApexFamilyCareTestWeekRunPacket/);
  assert.match(componentSource, /addApexFamilyCareTestWeekFrictionNote/);
  assert.match(componentSource, /buildApexFamilyCareCoordinatorPacket/);
  assert.match(componentSource, /buildApexFamilyCareCoordinatorReviewPacket/);
  assert.match(componentSource, /normalizeApexFamilyCareCoordinatorReviewState/);
  assert.match(componentSource, /applyApexFamilyCareCoordinatorPromptReview/);
  assert.match(componentSource, /APEX_FAMILY_CARE_COORDINATOR_REVIEW_POLICY/);
  assert.match(componentSource, /Access Mode/);
  assert.match(componentSource, /Install Path/);
  assert.match(componentSource, /Boundary Checks/);
  assert.match(componentSource, /Standalone Release Boundary/);
  assert.match(componentSource, /Local Release Smoke/);
  assert.match(componentSource, /Human-run/);
  assert.match(componentSource, /Ready locally/);
  assert.match(componentSource, /Release smoke/);
  assert.match(componentSource, /Release smoke sends/);
  assert.match(componentSource, /Release smoke auth/);
  assert.match(componentSource, /Production blocked/);
  assert.match(componentSource, /Local Preview/);
  assert.match(componentSource, /No deploy/);
  assert.match(componentSource, /No hosting change/);
  assert.match(componentSource, /No provider setup/);
  assert.match(componentSource, /Remote Access/);
  assert.match(componentSource, /No auth change/);
  assert.match(componentSource, /No schema change/);
  assert.match(componentSource, /Start Voice Update/);
  assert.match(componentSource, /Local STT Bridge/);
  assert.match(componentSource, /STT Bridge Approval/);
  assert.match(componentSource, /Family STT bridge approval/);
  assert.match(componentSource, /Family STT endpoint/);
  assert.match(componentSource, /Family STT raw audio/);
  assert.match(componentSource, /Endpoint approval required/);
  assert.match(componentSource, /No browser speech/);
  assert.match(componentSource, /Stop Listening/);
  assert.match(componentSource, /Mute Voice Input/);
  assert.match(componentSource, /Recover To Quiet/);
  assert.match(componentSource, /Done Talking \/ Review/);
  assert.match(componentSource, /Save Needs Review/);
  assert.match(componentSource, /One-Tap Care Updates/);
  assert.match(componentSource, /Mute Kitchen/);
  assert.match(componentSource, /Stop \/ Recover Voice State/);
  assert.match(componentSource, /Kitchen Device Health/);
  assert.match(componentSource, /Household Device Presence/);
  assert.match(componentSource, /Tablet or old phone first/);
  assert.match(componentSource, /Heartbeat only/);
  assert.match(componentSource, /No network scan/);
  assert.match(componentSource, /No device control/);
  assert.match(componentSource, /Local STT bridge pending/);
  assert.match(componentSource, /Family Test Week/);
  assert.match(componentSource, /Run The Week/);
  assert.match(componentSource, /House Screen/);
  assert.match(componentSource, /Mark House Screen Ready/);
  assert.match(componentSource, /Daily Check-Ins/);
  assert.match(componentSource, /Used Days/);
  assert.match(componentSource, /Mark the house screen ready and start the real week before checking off days/);
  assert.match(componentSource, /Review Packet/);
  assert.match(componentSource, /Friction And Useful Notes/);
  assert.match(componentSource, /Apex Care Coordinator/);
  assert.match(componentSource, /Care coordinator/);
  assert.match(componentSource, /Coordinator sends/);
  assert.match(componentSource, /Human review required/);
  assert.match(componentSource, /Human review/);
  assert.match(componentSource, /No sends/);
  assert.match(componentSource, /No medication control/);
  assert.match(componentSource, /Metadata-only receipt/);
  assert.match(componentSource, /Daily Digest Review/);
  assert.match(componentSource, /Draft only/);
  assert.match(componentSource, /Prompt feedback/);
  assert.match(componentSource, /Handled/);
  assert.match(componentSource, /Defer/);
  assert.match(componentSource, /Not Useful/);
  assert.match(componentSource, /Reopen/);
  assert.match(componentSource, /Coordinator command path/);
  assert.match(componentSource, /Coordinator provider payload/);
  assert.match(componentSource, /Coordinator friction text/);
  assert.match(componentSource, /No provider payload/);
  assert.match(componentSource, /Notification Decisions/);
  assert.match(componentSource, /Safe lock-screen copy/);
  assert.match(componentSource, /No live sends/);
  assert.match(componentSource, /Local house device/);
  assert.match(componentSource, /Delivery lane/);
  assert.match(componentSource, /Trust this house screen/);
  assert.match(componentSource, /Family recipients/);
  assert.match(componentSource, /Local House Notices/);
  assert.match(componentSource, /House notices/);
  assert.match(componentSource, /External sends approval/);
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
    "buildApexFamilyCareReviewState",
    "buildApexFamilyCareBoundaryReleasePrep",
    "getApexFamilyCareBrainInterfaceSummary",
    "buildApexFamilyCareCoordinatorPacket",
    "createApexFamilyCareVoiceNoteDraft",
    "buildApexFamilyCareKitchenModeStatus",
    "buildApexFamilyCareHouseholdDevicePresence",
    "applyApexFamilyCareKitchenControl",
    "APEX_FAMILY_CARE_HOUSEHOLD_DEVICE_PRESENCE_POLICY",
    "buildApexFamilyCareTestWeekSummary",
    "buildApexFamilyCareTestWeekRunPacket",
    "startApexFamilyCareTestWeek",
    "buildApexFamilyCareNotificationState",
    "getDefaultApexFamilyCareNotificationPreferences",
    "APEX_FAMILY_CARE_NOTIFICATION_DELIVERY_METHODS",
    "APEX_FAMILY_CARE_NOTIFICATION_DELIVERY_POLICY",
    "listApexFamilyCareNotes",
    "reviseApexFamilyCareNote",
    "updateApexFamilyCareNote",
    "APEX_FAMILY_CARE_LOCAL_VOICE_INPUT_POLICY",
    "applyApexFamilyCareLocalVoiceInputControl",
    "buildApexFamilyCareLocalVoiceInputSession",
  ]) {
    assert.match(componentSource, new RegExp(helperName));
  }

  assert.match(componentSource, /Review Notes/);
  assert.match(componentSource, /Revise Note/);
  assert.match(componentSource, /Corrected note/);
  assert.match(componentSource, /Save Revision/);
  assert.match(componentSource, /Cancel Revision/);
  assert.match(componentSource, /Confirm Reviewed/);
  assert.match(componentSource, /Confirmed/);
  assert.match(componentSource, /Needs Review/);
  assert.match(componentSource, /Restore Active/);
  assert.match(componentSource, /Archive/);
  assert.match(componentSource, /Copy-Safe Doctor Visit Brief/);
  assert.match(componentSource, /doctorVisitSections/);
  assert.match(componentSource, /Manual copy only/);
  assert.match(componentSource, /Care Signals/);
  assert.match(componentSource, /Missing update detector/);
  assert.match(componentSource, /Pattern detector/);
  assert.match(componentSource, /Medication control/);
  assert.match(componentSource, /Voice explicit start/);
  assert.match(componentSource, /Voice hidden recording/);
  assert.match(componentSource, /Notification live sends/);
  assert.match(componentSource, /Notification local delivery/);
  assert.match(componentSource, /House screen trusted/);
  assert.match(componentSource, /External send approval/);
  assert.match(componentSource, /Notification provider sends/);
  assert.match(componentSource, /Lock-screen details/);
  assert.match(componentSource, /Local family preview/);
  assert.match(componentSource, /Production family route/);
  assert.match(componentSource, /Family release approval/);
  assert.match(componentSource, /Kitchen hidden mic/);
  assert.match(componentSource, /Family local STT/);
  assert.match(componentSource, /Family voice auto-listen/);
  assert.match(componentSource, /Family voice controls/);
  assert.match(componentSource, /Household presence/);
  assert.match(componentSource, /Household voice mode/);
  assert.match(componentSource, /Household stop\/mute/);
  assert.match(componentSource, /Household camera/);
  assert.match(componentSource, /Household network scan/);
  assert.match(componentSource, /Kitchen device control/);
  assert.match(componentSource, /Test week evidence/);
  assert.doesNotMatch(componentSource, /getUserMedia|MediaRecorder|navigator\.mediaDevices|fetch\(|Notification\.requestPermission|navigator\.serviceWorker|PushManager|NetworkInformation|navigator\.usb|navigator\.bluetooth/i);
});
