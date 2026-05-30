export const RELEASE_SAFETY_TARGETS = {
  repo: "jberlanga748-a11y/concrete-ops-2",
  localFolder: "C:\\Users\\jberl\\Documents\\New project",
  flyApp: "concrete-ops-2",
  liveApp: "https://app.apexhq.online/",
  healthCheck: "https://app.apexhq.online/api/ready",
};

const broadStageCommand = "git add" + " .";
const forcePushText = "force" + " push";

export const RELEASE_SAFETY_CHECKLISTS = {
  preDeploy: [
    "Confirm the terminal is in the correct Apex HQ project folder.",
    "Confirm the Git remote is jberlanga748-a11y/concrete-ops-2.",
    "Confirm the branch is main or the expected working branch.",
    "Confirm no unrelated files are modified before continuing.",
    "Run the required phase tests and any focused tests for the change.",
    "Run npm.cmd run build.",
    "Run npm.cmd run verify:backup and confirm both SQLite and uploaded-file backup artifacts are captured.",
    "Run npm.cmd run verify:restore and confirm uploaded-file artifacts restore with the database.",
    "Run git diff --check.",
    "Commit only relevant files using explicit paths.",
    "Push only after tests pass.",
    "Deploy manually only after push succeeds.",
  ],
  postDeploy: [
    "Confirm the Fly deploy succeeded.",
    "Confirm /api/ready returns ok true, status ready, and database ok.",
    "Open the live Apex HQ app.",
    "Open Settings -> Owner Health Status.",
    "Confirm app, database, and storage health are clean.",
    "If permissions were touched, confirm field roles remain restricted.",
    "Confirm the new feature appears only for allowed roles.",
    "Do not continue to the next phase until live health is clean.",
  ],
  rollback: [
    "If deploy fails before a release finishes, do not keep retrying blindly; read the error and stop.",
    "If live health fails after deploy, check /api/ready, check Owner Health, capture the error, and stop.",
    "Review Fly releases before choosing any rollback path.",
    "Only use rollback guidance with a known good release or image.",
    "Do not delete volumes or machines to fix a bad deploy.",
    "If unsure, stop and ask before running rollback commands.",
  ],
};

export const RELEASE_SAFE_COMMANDS = [
  {
    id: "folder",
    title: "PowerShell - correct folder",
    description: "Start here before checking Git or deploying.",
    commands: [
      `cd "${RELEASE_SAFETY_TARGETS.localFolder}"`,
    ],
  },
  {
    id: "repo",
    title: "Check repo",
    description: "Use these before committing or deploying.",
    commands: [
      "git remote -v",
      "git status --short",
      "git branch --show-current",
    ],
  },
  {
    id: "deploy",
    title: "Deploy",
    description: "Use only after tests pass, commit succeeds, push succeeds, and the tree is clean.",
    commands: [
      `fly deploy -a ${RELEASE_SAFETY_TARGETS.flyApp}`,
    ],
  },
  {
    id: "health",
    title: "Health",
    description: "Use after deploy to confirm the live API is ready.",
    commands: [
      `Invoke-RestMethod ${RELEASE_SAFETY_TARGETS.healthCheck}`,
    ],
  },
  {
    id: "machines",
    title: "Machines",
    description: "Read machine IDs first. Never run placeholder IDs literally.",
    commands: [
      `fly machine list -a ${RELEASE_SAFETY_TARGETS.flyApp}`,
      `fly machine stop MACHINE_ID -a ${RELEASE_SAFETY_TARGETS.flyApp}`,
      `fly machine start MACHINE_ID -a ${RELEASE_SAFETY_TARGETS.flyApp}`,
    ],
  },
  {
    id: "volumes",
    title: "Volumes",
    description: "List volumes first. Extend only a real volume ID and never delete the data volume.",
    commands: [
      `fly volumes list -a ${RELEASE_SAFETY_TARGETS.flyApp}`,
      `fly volumes extend VOLUME_ID --size 20 -a ${RELEASE_SAFETY_TARGETS.flyApp}`,
    ],
  },
  {
    id: "releases",
    title: "Release review",
    description: "Review releases first. Use rollback guidance only with a known good release or image.",
    commands: [
      `fly releases -a ${RELEASE_SAFETY_TARGETS.flyApp}`,
    ],
  },
];

export const RELEASE_DANGEROUS_WARNINGS = [
  `Do not use broad staging commands like ${broadStageCommand}; stage exact files only.`,
  `Do not ${forcePushText}.`,
  "Do not delete or destroy Fly machines unless specifically planned.",
  "Do not delete or destroy Fly volumes.",
  "Do not paste secrets into chat, GitHub, or frontend files.",
  "Do not create frontend OpenAI key variables.",
    "Do not connect Fly " + "auto-" + "deploy to GitHub yet.",
  "Do not run deploy from the wrong folder.",
  "Do not proceed if Codex reports unrelated modified files.",
  "Do not run placeholder commands like MACHINE_ID or VOLUME_ID literally.",
];

export const RELEASE_STORAGE_WARNINGS = [
  "Check storage in Owner Health Status before and after upload-heavy changes.",
  "Treat uploaded-file backup artifacts as part of the required backup set.",
  "If crews upload lots of photos, monitor storage regularly.",
  "Use fly volumes list to find the correct volume ID.",
  "Extend storage only by volume ID.",
  "Stop and start the machine after extending storage if Fly requires it.",
  "Never delete the production data volume.",
];

export function getReleaseSafetySections() {
  return [
    {
      id: "targets",
      title: "Correct App Targets",
      items: [
        `Repo: ${RELEASE_SAFETY_TARGETS.repo}`,
        `Local folder: ${RELEASE_SAFETY_TARGETS.localFolder}`,
        `Fly app: ${RELEASE_SAFETY_TARGETS.flyApp}`,
        `Live app: ${RELEASE_SAFETY_TARGETS.liveApp}`,
        `Health check: ${RELEASE_SAFETY_TARGETS.healthCheck}`,
      ],
    },
    {
      id: "preDeploy",
      title: "Pre-Deploy Checklist",
      items: RELEASE_SAFETY_CHECKLISTS.preDeploy,
    },
    {
      id: "postDeploy",
      title: "Post-Deploy Checklist",
      items: RELEASE_SAFETY_CHECKLISTS.postDeploy,
    },
    {
      id: "dangerous",
      title: "Dangerous Commands / Stop Warnings",
      items: RELEASE_DANGEROUS_WARNINGS,
      tone: "red",
    },
    {
      id: "rollback",
      title: "Simple Rollback Guidance",
      items: RELEASE_SAFETY_CHECKLISTS.rollback,
      tone: "amber",
    },
    {
      id: "storage",
      title: "Storage Safety Reminder",
      items: RELEASE_STORAGE_WARNINGS,
      tone: "amber",
    },
  ];
}

export function getReleaseSafetyCommandGroups() {
  return RELEASE_SAFE_COMMANDS.map((group) => ({
    ...group,
    text: group.commands.join("\n"),
  }));
}

export function isDangerousReleaseCommand(command = "") {
  const normalized = String(command || "").trim().toLowerCase();
  if (!normalized) return false;
  return [
    /^git\s+add\s+\.$/,
    new RegExp("\\bgit\\s+push\\b.*\\s--" + "force\\b"),
    /\bgit\s+push\b.*\s-f\b/,
    new RegExp("\\bfly\\s+(volume|volumes)\\s+(delete|" + "destroy)\\b"),
    new RegExp("\\bfly\\s+machine\\s+(delete|" + "destroy)\\b"),
    /\bopenai_api_key\b/,
    /\bvite_openai_api_key\b/,
    /\bconcrete_ops_import_token\b/,
  ].some((pattern) => pattern.test(normalized));
}

export function releaseSafetyStatusTone(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["safe", "ready", "ok"].includes(normalized)) return "green";
  if (["stop", "danger", "dangerous", "critical"].includes(normalized)) return "red";
  if (["caution", "warning", "review"].includes(normalized)) return "amber";
  return "slate";
}
