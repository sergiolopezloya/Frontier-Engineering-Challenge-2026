# React Codebase Audit & DevOps Infrastructure Agentic Workflow
> **micro1 Agentic Workflows Hackathon Submission**

An orchestrated multi-agent workflow designed for full-stack and DevOps engineering teams. It takes a React codebase, audits it for technical debt, security issues, and obsolete dependencies using an **Analyst Agent**, and automatically provisions production-grade containerization and cloud deployment infrastructure (Dockerfiles, NGINX configs, AWS/GCP scripts) using a **DevOps Agent**, safeguarded by a **Human-in-the-Loop Terminal Sandbox Approval Gate**.

---

## 🎯 The Four Key Questions

1. **Who has this problem?**
   - Full-stack developers, engineering leads, and DevOps engineers who inherit legacy React repositories or need to transition applications from local development into production cloud environments rapidly and safely.

2. **What bottleneck makes it worth solving?**
   - Auditing unfamiliar codebases for security vulnerabilities, obsolete dependencies (e.g. React 16 legacy patterns, memory leaks), and writing production-ready multi-stage container & cloud deployment configurations manually takes hours of human review and is error-prone.

3. **Does the agent solve it well?**
   - Yes. By splitting responsibilities between a specialized **Analyst Agent** (deep code & dependency audit) and a **DevOps Agent** (infrastructure synthesis), we achieve complete domain coverage, verified outputs, and full trajectory accountability.

4. **Can another person reproduce the result?**
   - Yes. Clear commands, synthetic test repositories, and structured trajectories make this 100% reproducible from a clean environment.

---

## 🏗 System Architecture

```text
  ┌─────────────────────────────────────────────────────────┐
  │                    React Codebase                       │
  └────────────────────────────┬────────────────────────────┘
                               │
                               ▼
  ┌─────────────────────────────────────────────────────────┐
  │                 🕵️‍♂️ Analyst Agent                       │
  │  - Static analysis & dependency debt audit              │
  │  - Security flaw detection (hardcoded secrets)         │
  │  - Generates Structured Audit Report                    │
  └────────────────────────────┬────────────────────────────┘
                               │
                               ▼
  ┌─────────────────────────────────────────────────────────┐
  │                  🛠️ DevOps Agent                         │
  │  - Multi-stage production Dockerfile                    │
  │  - NGINX SPA routing configuration                      │
  │  - Cloud deployment manifests (AWS ECS / GCP Cloud Run) │
  └────────────────────────────┬────────────────────────────┘
                               │
                               ▼
  ┌─────────────────────────────────────────────────────────┐
  │       🛡️ Human-in-the-Loop Terminal Sandbox Gate       │
  │  - Interactive terminal approval before file creation   │
  │  - Trajectory logger captures all decisions & traces    │
  └─────────────────────────────────────────────────────────┘
```

---

## 🚀 Quickstart & Reproduction Guide

### Prerequisites
- Node.js >= 18.x
- Gemini API Key (`GEMINI_API_KEY`)

### Obtaining a Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click on **"Get API key"** in the top left/sidebar.
4. Click **"Create API key"** (you can create one in a new Google Cloud project or an existing one).
5. Copy the generated API key string.

### Setup & Configuration
```bash
# 1. Clone repository & install dependencies
git clone <repo-url>
cd Frontier-Engineering-Challenge-2026
npm install

# 2. Configure Environment
# Copy the example environment file:
cp .env.example .env

# Open .env in your editor and set your key:
# GEMINI_API_KEY=AIzaSy...
```

### Running the Baseline
```bash
npm run baseline
```

### Running the Multi-Agent System
```bash
npm run agents
```

---

## 📁 Repository Structure

```text
├── CHANGELOG.md               # Continuous improvement log with evidence
├── README.md                  # Reproduction guide & problem statement
├── package.json
├── tsconfig.json
├── src/
│   ├── baseline/
│   │   └── baseline.ts        # Single-prompt comparison baseline
│   ├── agents/
│   │   ├── analyst/           # Analyst Agent prompt & tools
│   │   └── devops/            # DevOps Agent prompt & tools
│   ├── orchestration/         # Multi-agent orchestrator & Human approval gate
│   └── logger/
│       └── trajectoryLogger.ts# Structured Trajectory Logger (.json and .log)
├── test-repos/                # Synthetic test cases for benchmark evaluation
│   └── sample-react-app/
└── trajectories/              # Generated agent trajectories
```
