# 🎬 Hackathon Solution Video Guide & Script (Max 5 Minutes)
> **micro1 Agentic Workflows Hackathon - Deliverable 03**

This document provides a second-by-second presentation script and recording checklist for your 5-minute submission video.

---

## ⏱️ Video Timeline Breakdown (5 Minutes Total)

| Timestamp | Section | Key Visual / Screen | What to Say / Focus |
| :--- | :--- | :--- | :--- |
| **0:00 - 0:45** | **1. The Problem & Intended User** | Slide / VS Code overview of legacy React repo | Who has this problem? DevOps & Full-stack teams inheriting legacy React apps with security debt. |
| **0:45 - 1:30** | **2. The Baseline (Starting Point)** | Terminal running `npm run baseline` | Show single-prompt output (67% score, missed secrets, basic Dockerfile). |
| **1:30 - 3:00** | **3. The Multi-Agent System Live Demo** | Terminal running `npm run agents` | Show Analyst Agent audit + DevOps synthesis + Human Sandbox approval gate (`y/N`). |
| **3:00 - 4:00** | **4. Changelog & Scorecard Comparison** | `CHANGELOG.md` & Comparative Scorecard table | Show metric jump from 67% to 100%, 5 infra assets generated vs 1 generic. |
| **4:00 - 4:40** | **5. Key Experiment Kept vs. Removed** | Code in `src/orchestration/` | Highlight the **Human Sandbox Gate** (kept) vs. single monolithic prompt (removed). |
| **4:40 - 5:00** | **6. Hot Take & Conclusion** | Slide or camera | Share the Hot Take: Specialization & domain boundaries beat massive context stuffing. |

---

## 🎙️ Spoken Script (Word-for-Word Guide)

### Part 1: The Problem & Intended User (0:00 - 0:45)
> *"Hello judges! Welcome to our submission for the micro1 Agentic Workflows Hackathon. Today, full-stack and DevOps engineering teams face a massive bottleneck when taking legacy React repositories into cloud production. Auditing unknown codebases for vulnerabilities, React version deprecations, and writing multi-stage Dockerfiles and cloud deployment scripts by hand takes hours of tedious, error-prone manual work. We built an orchestrated multi-agent system with Gemini and Human-in-the-Loop approval to solve this end-to-end."*

### Part 2: The Baseline (0:45 - 1:30)
> *(Action: Run `npm run baseline` on terminal)*  
> *"To measure our impact rigorously, we started with a simple baseline: a single prompt asking Gemini to analyze the code and give us a Dockerfile. As you can see on screen, the baseline scored only 67%. It gave a generic Dockerfile, but completely missed our hardcoded API token in `App.tsx`, missed the `setInterval` memory leak, and produced zero cloud deployment manifests. Monolithic prompts simply fail at multi-domain tasks."*

### Part 3: Live Multi-Agent Execution & Sandbox Gate (1:30 - 3:00)
> *(Action: Run `npm run agents` on terminal)*  
> *"Now let's run our Multi-Agent Workflow. Watch what happens:*  
> *First, our **Analyst Agent** performs deep static inspection. It extracts the exact health score (40/100), flags the critical hardcoded token, and catches the uncleaned timer leak.*  
> *Second, our **DevOps Agent** takes this structured audit and synthesizes 5 production-grade assets: a multi-stage Dockerfile with Node builder and Nginx Alpine runner, an NGINX SPA routing configuration, `.dockerignore`, and an automated deployment script for AWS ECS and GCP Cloud Run.*  
> *Third, following Hackathon Ground Rule 04, our **Sandbox Gate** halts execution and asks for interactive terminal approval with a live diff before writing any file to disk.*  
> *(Action: Type `y` to approve each file)*  
> *Fourth, our autonomous **Quality Assurance Gate** validates the 4 enterprise quality pillars: TypeScript strict typing, ESLint (zero any), Prettier formatting, dead code scans with Knip, and 100% unit test coverage.*  
> *Everything is logged in real-time into our structured `trajectories/` directory."*

### Part 4: Changelog & Measured Improvement (3:00 - 4:00)
> *(Action: Show `CHANGELOG.md` and terminal comparison table)*  
> *"In our improvement changelog, you can track our exact journey from the Baseline through iterations 1, 2, and 3. Our quality score jumped from 67% to a perfect 100%. We went from a single fragile Dockerfile to a complete, verified infrastructure suite with zero unapproved writes."*

### Part 5: Experiment Kept vs. Removed (4:00 - 4:40)
> *"The experiment that contributed most to our success was **typed domain separation**: separating the Auditor from the DevOps Engineer using strict JSON schemas. The experiment we removed was attempting to do code remediation and infra generation in a single agent step, which caused hallucination loops."*

### Part 6: Hot Take & Wrap-up (4:40 - 5:00)
> *"Our hot take: **Specialization beats context stuffing every single time, but only when sealed with a human sandbox gate.** Thank you for watching, and you can reproduce this entire solution in less than 30 seconds from our repository!"*

---

## 🎥 Recording Checklist
- [ ] Terminal font size is clear and readable (16px+).
- [ ] `.env` is configured with a valid `GEMINI_API_KEY`.
- [ ] Run `npm run baseline` in terminal.
- [ ] Run `npm run agents` and approve files with `y`.
- [ ] Show `CHANGELOG.md` and `README.md`.
- [ ] Video duration is under 5:00 minutes.
