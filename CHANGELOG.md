# Improvement Changelog

This changelog documents the iterative evolution of our Agentic Workflow solution for the **micro1 Agentic Workflows Hackathon**, comparing each stage against our baseline with measurable evidence.

---

## Progression Summary

| Stage | What you tried and why | Evidence | Decision / Learning |
| :--- | :--- | :--- | :--- |
| **Baseline** | Single-shot prompt (*"Analiza este código y dame un Dockerfile"*) with raw context concatenation using Gemini. | Raw output produced a basic single/generic Dockerfile. Missed structural security debt (hardcoded secrets in React), missed React 16 legacy deprecations, provided zero Cloud IAC / deployment scripts. Quality score: ~33-50%. | **Established starting point.** Single-prompt architectures fail at multi-domain tasks requiring deep static analysis + production-grade DevOps infrastructure. Need specialized multi-agent orchestration. |
| **Iteration 1** | *(Pending)* Introduce **Analyst Agent** with static analysis tools and structured AST / dependency debt inspection. | *(To be evaluated)* | *(To be decided)* |
| **Iteration 2** | *(Pending)* Introduce **DevOps Agent** that consumes the Analyst report to generate isolated Dockerfile, NGINX config, and Cloud deployment manifests. | *(To be evaluated)* | *(To be decided)* |
| **Iteration 3** | *(Pending)* Implement **Human-in-the-Loop Sandbox Approval Gate** for command executions & file generation. | *(To be evaluated)* | *(To be decided)* |
| **Final** | *(Pending)* Orchestrated Multi-Agent Pipeline with verified end-to-end execution. | *(To be evaluated)* | *(Final synthesis)* |

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
