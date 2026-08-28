# Improvement Changelog

This changelog documents the iterative evolution of our Agentic Workflow solution for the **micro1 Agentic Workflows Hackathon**, comparing each stage against our baseline with measurable evidence.

---

## Progression Summary

| Stage | What you tried and why | Evidence | Decision / Learning |
| :--- | :--- | :--- | :--- |
| **Baseline** | Single-shot prompt (*"Analyze this React codebase and provide a Dockerfile for production"*) with raw context concatenation using Gemini. | Raw output produced a basic single/generic Dockerfile. Missed structural security debt (hardcoded secrets in React), missed React 16 legacy deprecations, provided zero Cloud IAC / deployment scripts. Quality score: **67% (4/6)**. Latency: 11.9s. | **Established starting point.** Single-prompt architectures fail at multi-domain tasks requiring deep static analysis + production-grade DevOps infrastructure. Need specialized multi-agent orchestration. |
| **Iteration 1** | Introduced **Analyst Agent** (`src/agents/analyst/`) with specialized static inspection tools to separate code auditing from infra generation. | Successfully parsed AST & dependencies, detected critical hardcoded API secret (`sk_live_...`), flagged React 16 legacy runtime, and identified `setInterval` memory leak in `App.tsx`. Produced typed `AuditReport` schema. | **Kept and advanced.** Isolating code analysis as an independent agent produces high-precision diagnostic output and actionable remediation. |
| **Iteration 2** | Introduced **DevOps Agent** (`src/agents/devops/`) consuming the typed `AuditReport` to generate complete infrastructure assets. | Generated 5 production-grade assets: Multi-stage Dockerfile (Node builder + Nginx Alpine runner), `nginx.conf` (SPA routing + gzip + security headers), `.dockerignore`, `scripts/deploy.sh` (AWS ECS & GCP Cloud Run), and `docker-compose.yml`. | **Kept.** Multi-stage containerization with explicit SPA routing eliminates blank page runtime errors on client-side routes. |
| **Iteration 3** | Implemented **Human-in-the-Loop Terminal Sandbox Gate** (`src/orchestration/sandbox.ts`) fulfilling Hackathon Ground Rule 04. | Every generated file requires explicit interactive user review and approval (`[y/N]` with line-by-line diff preview) before writing to the workspace. Trajectory tracks all approval checkpoints. | **Kept.** Prevents unverified agent actions, ensures full safety, and meets core hackathon compliance requirements. |
| **Final** | Orchestrated end-to-end multi-agent pipeline (`src/orchestration/workflow.ts`) with automated scorecard comparison against baseline. | Quality score jumped from **67% (Baseline)** to **100% (Multi-Agent)** (6/6 criteria passed). Generated complete audit report + 5 production infra files + comprehensive trajectories (`trajectories/multi_agent_*.json`). | **Final Result.** Proven superiority of orchestrated multi-agent workflows with human-in-the-loop over single-prompt monoliths. |

---

## Detailed Iteration Log

### 1. Stage: Baseline
- **Approach**: Sent full repository contents as a single unformatted context window block to the model with a generic 2-line prompt.
- **Hypothesis**: A general-purpose LLM prompt might generate a usable Dockerfile but will overlook subtle architectural debt, security vulnerabilities, and deployment nuances.
- **Observed Failure Modes**:
  - Lack of domain separation: The model mixes casual commentary with code snippets.
  - Shallow analysis: Overlooked security issues (`sk_live_...` secrets hardcoded in component).
  - Incomplete deployment assets: Generates a single Dockerfile, missing NGINX reverse-proxy configurations, Docker ignore rules, and Cloud deployment scripts (AWS ECS / GCP Cloud Run).
- **Next Steps**: Architect two specialized autonomous agents (Analyst Agent + DevOps Agent) orchestrated with typed message passing and tool-calling capabilities.

### 2. Stage: Iteration 1 (Analyst Agent)
- **What was tried**: Developed a dedicated `AnalystAgent` equipped with repository file gathering tools and a structured prompt enforcing strict JSON output (`AuditReport`).
- **Why**: Static code analysis requires specialized reasoning around vulnerability categories (OWASP), React component lifecycles, and dependency vulnerability scans that generic prompts compress.
- **Evidence**: Detected all 3 synthetic issues injected into `sample-react-app`: Hardcoded secret `sk_live_...`, React 16 legacy render pattern, and uncleaned `setInterval` timer leak.

### 3. Stage: Iteration 2 (DevOps Infrastructure Agent)
- **What was tried**: Created a dedicated `DevOpsAgent` whose prompt receives the structured `AuditReport` from the Analyst.
- **Why**: Production containerization cannot rely solely on generic templates; it must know the exact build engine (`node:18-alpine`), output directory (`dist`), environment variables, and proxy requirements.
- **Evidence**: Synthesized complete, production-ready `Dockerfile`, `nginx.conf`, `.dockerignore`, `scripts/deploy.sh`, and `docker-compose.yml`.

### 4. Stage: Iteration 3 (Human-in-the-Loop Terminal Sandbox)
- **What was tried**: Implemented `SandboxGate` using Node.js `readline` to enforce human authorization for every write operation.
- **Why**: Enforces Hackathon Ground Rule 04 ("Keep consequential actions controlled through a sandbox or simulation. Add human approval before the action happens").
- **Evidence**: Interactive terminal prompt asks for user sign-off with file diff preview, logging `HUMAN_APPROVAL_REQUEST` and `HUMAN_APPROVAL_RESPONSE` in `trajectories/`.

### 5. Final Stage: Multi-Agent Orchestrated Pipeline
- **Synthesis**: Combines Analyst Agent -> Human Checkpoint -> DevOps Agent -> Terminal Sandbox Gate -> Trajectory Logger.
- **Key Metric Improvement**:
  - Quality score increased from **67%** (Baseline) to **100%** (Multi-Agent).
  - Number of generated deployment assets increased from 1 generic file to 5 production-grade manifests.
  - Zero unverified automated writes (100% human-verified execution).

---

## 📌 Main Failure Mode & Hot Take

### Main Failure Mode Observed
Single-prompt monolithic LLM approaches suffer from **Context Smuggling & Verification Blindspots**. In our baseline tests, asking a single prompt to audit code and output a Dockerfile caused the model to gloss over critical security vulnerabilities (e.g., hardcoded tokens and memory leaks) and hallucinate simplified container configurations without essential SPA routing rules or cloud infrastructure scripts.

### The Hot Take
> **"Agentic pipelines should be designed around domain boundaries and human checkpoints, not massive prompts."**
> 
> By decoupling the Auditor (diagnostic domain) from the DevOps Engineer (generative domain) and enforcing strict JSON-schema message passing with a terminal sandbox gate, we turned a 67% incomplete baseline into a 100% production-ready, safe, and verifiable delivery workflow.
