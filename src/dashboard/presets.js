const PRESETS = [
  // === Debug & Explore ===
  { id: 'explore', name: 'Explore Codebase', desc: 'Get oriented in an unfamiliar project', prompt: '/goat-debug onboard me to this codebase — start with an overview and ask me what I want to understand', cat: 'debug & explore', guided: true, guidedFields: [
    { key: 'area', label: 'Interested in?', type: 'input', placeholder: 'e.g., auth flow, database layer, API, or leave blank for full overview' },
    { key: 'depth', label: 'Depth', type: 'select', options: ["bird's-eye overview", 'moderate detail', 'deep trace'], default: "bird's-eye overview" }
  ], guidedTemplate: '/goat-debug onboard me to this codebase — focus on: {area}. Depth: {depth}.' },
  { id: 'error', name: 'Diagnose Error', desc: 'Paste an error and get root cause analysis', prompt: '/goat-debug I have an error I want to diagnose — ask me to paste the error message and any relevant context', cat: 'debug & explore', guided: true, guidedFields: [
    { key: 'error', label: 'Paste the error', type: 'textarea', placeholder: 'Paste the full error message or stack trace' },
    { key: 'area', label: 'Which file or area?', type: 'input', placeholder: 'e.g., src/auth/login.ts, or leave blank' }
  ], guidedTemplate: '/goat-debug diagnose mode — error: {error}. Area: {area}.' },
  { id: 'fix-bug', name: 'Fix Bug', desc: 'Diagnose and fix a specific bug', prompt: '/goat-debug diagnose mode — I have a bug to fix, ask me for the symptom and relevant file', cat: 'debug & explore', guided: true, guidedFields: [
    { key: 'symptom', label: 'Describe the symptom', type: 'textarea', placeholder: 'e.g., Login returns 500 after the auth changes' },
    { key: 'area', label: 'Which file or area?', type: 'input', placeholder: 'e.g., src/auth/login.ts, or leave blank' },
    { key: 'tried', label: 'What have you tried?', type: 'input', placeholder: 'e.g., checked logs, restarted server, or nothing yet' },
    { key: 'urgency', label: 'Urgency', type: 'select', options: ['blocking', 'annoying', 'just noticed'], default: 'annoying' }
  ], guidedTemplate: '/goat-debug diagnose mode — {symptom} in {area}, tried: {tried}, urgency: {urgency}' },
  { id: 'user-flow', name: 'User Flow Diagram', desc: 'Create a Mermaid flow diagram for a GitHub issue', prompt: 'I need a user flow diagram for a GitHub issue. Ask me about the feature, then create a Mermaid flowchart that fits in one viewport (8-12 nodes). Show what the user does and what the system does.', cat: 'debug & explore', guided: true, guidedFields: [
    { key: 'feature', label: 'What feature or change?', type: 'input', placeholder: 'e.g., password reset flow, checkout process, user onboarding' },
    { key: 'issue', label: 'GitHub issue context (optional)', type: 'textarea', placeholder: 'Paste the issue description, or describe what the user should be able to do' },
    { key: 'scope', label: 'Scope', type: 'select', options: ['happy path only', 'happy path + error cases', 'full flow with edge cases'], default: 'happy path + error cases' }
  ], guidedTemplate: 'I need a user flow diagram for: {feature}\n\nContext:\n{issue}\n\nScope: {scope}\n\nCreate a Mermaid flowchart that:\n- Shows what the USER does and what the SYSTEM does\n- Fits in a single viewport when rendered in a GitHub issue comment (aim for 8-12 nodes max)\n- Uses clear labels a non-developer can understand\n- Marks decision points and error paths\n\nOutput the Mermaid code block ready to paste into a GitHub issue comment, followed by a one-paragraph summary of the flow.' },

  // === Review ===
  { id: 'review', name: 'Code Review', desc: 'Review changes with severity-ordered findings', prompt: '/goat-review review my recent changes — ask me what to focus on', cat: 'review', guided: true, guidedFields: [
    { key: 'files', label: 'Which files or PR?', type: 'input', placeholder: 'e.g., src/auth/, PR #42, or leave blank for git diff' },
    { key: 'concern', label: 'What\'s the concern?', type: 'input', placeholder: 'e.g., security, performance, correctness, or general' },
    { key: 'mode', label: 'Review type', type: 'select', options: ['standard', 'audit', 'simplify'], default: 'standard' }
  ], guidedTemplate: '/goat-review {mode} mode — files: {files}, concern: {concern}' },
  { id: 'simplify', name: 'Simplify Code', desc: 'Improve readability without changing behavior', prompt: '/goat-review simplify mode — find code that can be cleaned up', cat: 'review', guided: true, guidedFields: [
    { key: 'target', label: 'Which file or area?', type: 'input', placeholder: 'e.g., src/auth/login.ts, or leave blank for most-changed files' },
    { key: 'focus', label: 'Focus on', type: 'select', options: ['naming', 'nesting/complexity', 'dead code', 'general cleanup'], default: 'general cleanup' }
  ], guidedTemplate: '/goat-review simplify mode — target: {target}. Focus on: {focus}.' },
  { id: 'uncommitted', name: 'Review Uncommitted', desc: 'Quick review of uncommitted changes', prompt: '/goat-review review my uncommitted changes', cat: 'review', guided: true, guidedFields: [
    { key: 'concern', label: 'Focus area?', type: 'input', placeholder: 'e.g., security, performance, correctness, or leave blank for general' }
  ], guidedTemplate: '/goat-review review my uncommitted changes — focus on: {concern}.' },
  { id: 'review-instructions', name: 'Review Instructions', desc: 'Check if instruction files are stale or contradictory', prompt: '/goat-review instruction mode — check my instruction files for staleness, stale paths, and rules that don\'t match the current code.', cat: 'review', guided: true, guidedFields: [
    { key: 'trigger', label: 'What prompted this?', type: 'input', placeholder: 'e.g., agent keeps repeating the same mistake, paths changed recently, general checkup' },
    { key: 'target', label: 'Which files?', type: 'select', options: ['all instruction files', 'CLAUDE.md only', 'skills only', 'coding standards only'], default: 'all instruction files' }
  ], guidedTemplate: '/goat-review instruction mode — trigger: {trigger}. Scope: {target}.' },
  { id: 'critique', name: 'Critique GOAT Flow', desc: 'Audit the goat-flow setup quality in this project', prompt: '/goat-review instruction mode — critique the GOAT Flow setup in this project. Review CLAUDE.md/AGENTS.md for staleness and drift. Then audit each skill for quality. Be thorough and specific. Score the system 0-100 (usefulness, signal-to-noise, adaptability, learnability). List top 5 improvements.', cat: 'review', guided: true, guidedFields: [
    { key: 'scope', label: 'Scope', type: 'select', options: ['full system', 'instruction files only', 'skills only', 'hooks + enforcement only'], default: 'full system' },
    { key: 'strictness', label: 'Strictness', type: 'select', options: ['constructive', 'thorough', 'brutal'], default: 'thorough' }
  ], guidedTemplate: '/goat-review instruction mode — critique the GOAT Flow setup. Scope: {scope}. Strictness: {strictness}. Score 0-100 and list top 5 improvements.' },

  // === Plan ===
  { id: 'plan', name: 'Plan Feature', desc: 'Plan a new feature through guided questions', prompt: '/goat-plan I want to add a new feature', cat: 'plan', guided: true, guidedFields: [
    { key: 'problem', label: 'What problem does this solve?', type: 'textarea', placeholder: 'e.g., Users can\'t reset their password without contacting support' },
    { key: 'users', label: 'Who\'s affected?', type: 'input', placeholder: 'e.g., end users, admin team, or all developers' },
    { key: 'constraints', label: 'Any constraints?', type: 'input', placeholder: 'e.g., must be backwards compatible, deadline Friday' },
    { key: 'done', label: 'What does done look like?', type: 'input', placeholder: 'e.g., users can reset via email link, admin sees audit log' },
    { key: 'complexity', label: 'How big is this?', type: 'select', options: ['hotfix (1-2 files)', 'small feature', 'standard', 'system change', 'infrastructure'], default: 'standard' }
  ], guidedTemplate: '/goat-plan plan feature — problem: {problem}, affects: {users}, constraints: {constraints}, done: {done}, complexity: {complexity}' },
  { id: 'refactor', name: 'Plan Refactor', desc: 'Plan a restructure with blast radius analysis', prompt: '/goat-plan refactor mode — ask me what to restructure', cat: 'plan', guided: true, guidedFields: [
    { key: 'what', label: 'What to restructure?', type: 'textarea', placeholder: 'e.g., rename UserService to AccountService, extract auth into its own module' },
    { key: 'type', label: 'Change type', type: 'select', options: ['rename', 'extract module', 'move files', 'change interface'], default: 'extract module' },
    { key: 'files', label: 'Which files/areas?', type: 'input', placeholder: 'e.g., src/auth/, or leave blank for auto-detect' }
  ], guidedTemplate: '/goat-plan refactor mode — {type}: {what}. Target area: {files}.' },
  { id: 'sbao', name: 'SBAO Ranking', desc: 'Critique a plan with sub-agents, rank ideas, synthesize', prompt: '/goat-plan — skip to Phase 3 (SBAO). I have a plan to critique. Launch sub-agents to generate competing improvement ideas, rank them, then ask me what to keep/drop/decide before synthesizing.', cat: 'plan', guided: true, guidedFields: [
    { key: 'plan', label: 'Paste your plan or brief', type: 'textarea', placeholder: 'Paste the feature brief, technical plan, or requirements to critique' },
    { key: 'focus', label: 'What concerns you?', type: 'input', placeholder: 'e.g., scalability, too complex, missing edge cases, or general critique' }
  ], guidedTemplate: '/goat-plan — skip to Phase 3 (SBAO). Here is the plan to critique:\n\n{plan}\n\nFocus: {focus}\n\nLaunch 3 sub-agents: two using the core trio (SKEPTIC/ANALYST/STRATEGIST), one with fresh context as a control group. Rank all improvement ideas, summarize agreement and disagreement, then ask me clarifying questions before synthesizing the prime plan.' },

  // === Test ===
  { id: 'test', name: 'Test Plan', desc: 'Generate a 3-phase test plan for recent changes', prompt: '/goat-test generate a test plan for my recent changes', cat: 'test', guided: true, guidedFields: [
    { key: 'changed', label: 'What changed?', type: 'input', placeholder: 'e.g., src/cli/config/, or leave blank for git diff' },
    { key: 'risk', label: 'What\'s the risk?', type: 'input', placeholder: 'e.g., validation could miss edge cases, auth could break' },
    { key: 'covered', label: 'What\'s already tested?', type: 'input', placeholder: 'e.g., unit tests in test/config/, or nothing yet' },
    { key: 'level', label: 'Risk level', type: 'select', options: ['hotfix', 'standard', 'system'], default: 'standard' }
  ], guidedTemplate: '/goat-test test plan — changed: {changed}, risk: {risk}, already tested: {covered}, risk level: {level}' },
  { id: 'quick-test', name: 'Quick Test', desc: 'Focused test plan for the most recent commit', prompt: '/goat-test quick mode — generate a focused test plan for my most recent commit', cat: 'test' },
  { id: 'qa-gaps', name: 'QA Testing Gaps', desc: 'Find code change risk and coverage gaps for QA', prompt: '/goat-test I need a QA-focused gap analysis. Ask me about the changes, then map what\'s tested vs what\'s not, ranked by risk.', cat: 'test', guided: true, guidedFields: [
    { key: 'changes', label: 'What changed?', type: 'textarea', placeholder: 'Paste the GitHub issue, PR description, or describe the changes' },
    { key: 'timeBudget', label: 'Testing time budget', type: 'select', options: ['1 hour (critical paths only)', '2 hours (critical + high risk)', 'full coverage'], default: '2 hours (critical + high risk)' },
    { key: 'alreadyTested', label: "What's already tested?", type: 'input', placeholder: 'e.g., unit tests pass, auth flow verified, or nothing yet' }
  ], guidedTemplate: '/goat-test — QA focus. Here are the changes:\n\n{changes}\n\nTime budget: {timeBudget}. Already tested: {alreadyTested}.\n\nFor each gap: explain the risk, what could break, and exactly how to test it. Separate what automation covers from what needs manual verification. Skip items already caught by static analysis or linters.' },

  // === Security ===
  { id: 'security', name: 'Security Audit', desc: 'Run a threat model on this project', prompt: '/goat-security run a threat model on this project', cat: 'security', guided: true, guidedFields: [
    { key: 'component', label: 'Which component?', type: 'input', placeholder: 'e.g., src/auth/, API endpoints, or whole project' },
    { key: 'deployment', label: 'Deployment context?', type: 'select', options: ['web app (public)', 'internal tool', 'CLI', 'library', 'API service'], default: 'web app (public)' },
    { key: 'concern', label: 'Specific threat concern?', type: 'input', placeholder: 'e.g., injection, auth bypass, data exposure, or general audit' }
  ], guidedTemplate: '/goat-security threat model {component} — deployment: {deployment}, concern: {concern}' },
  { id: 'dep-scan', name: 'Dependency Scan', desc: 'Scan for known CVEs and outdated packages', prompt: '/goat-security — focus on dependency CVEs and outdated packages. Skip the full threat surface scan.', cat: 'security', guided: true, guidedFields: [
    { key: 'concern', label: 'Specific concern?', type: 'input', placeholder: 'e.g., critical CVEs only, or all outdated packages' }
  ], guidedTemplate: '/goat-security — focus on dependency CVEs and outdated packages. Concern: {concern}. Skip the full threat surface scan.' },
  { id: 'compliance', name: 'Compliance Check', desc: 'Check code against HIPAA, GDPR, SOC2, or PCI-DSS', prompt: '/goat-security compliance mode — check this project for regulatory compliance issues. Ask me which regulations apply.', cat: 'security', guided: true, guidedFields: [
    { key: 'regulation', label: 'Which regulation?', type: 'select', options: ['not sure — help me identify', 'HIPAA (healthcare/PHI)', 'GDPR (EU data protection)', 'SOC 2', 'PCI DSS (payments)'], default: 'not sure — help me identify' },
    { key: 'component', label: 'Which component?', type: 'input', placeholder: 'e.g., patient data flow, payment processing, user consent, or whole project' },
    { key: 'concern', label: 'Specific concern?', type: 'input', placeholder: 'e.g., data retention, consent tracking, audit logging, or general' }
  ], guidedTemplate: '/goat-security compliance mode — regulation: {regulation}. Component: {component}. Concern: {concern}.' },

  // === Utility ===
  { id: 'triage', name: 'Triage Ideas', desc: 'Sort ideas into excellent / okay / bad', prompt: "I'll paste a plan below. Categorise every idea into: excellent (keep as-is), okay (worth doing but needs refinement), bad (drop or rethink). For each, explain why in one sentence.", cat: 'utility', guided: true, guidedFields: [
    { key: 'plan', label: 'Paste your plan or ideas', type: 'textarea', placeholder: 'Paste the plan, feature list, or ideas to categorize' }
  ], guidedTemplate: 'Categorize every idea in this plan as excellent / okay / bad. For each, give a one-sentence justification. Present as a sorted table.\n\n{plan}' },
];
