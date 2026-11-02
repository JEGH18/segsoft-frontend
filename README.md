<h1 align="center">🛡️ SegSoft · Web App</h1>

<p align="center">
  Single-page app to upload repositories, run security-policy compliance analyses and review the results.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite 5" />
  <img src="https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Vitest%20%2B%20Cypress-tested-6E9F18?style=flat-square&logo=vitest&logoColor=white" alt="Tests" />
  <a href="https://www.segsoft.website/login"><img src="https://img.shields.io/badge/Live-segsoft.website-22C55E?style=flat-square&logo=vercel&logoColor=white" alt="Live" /></a>
</p>

---

## Overview

SegSoft is a security-policy compliance analyzer for source code, built as a capstone project at Icesi University. This repository contains the frontend; the API lives in [segsoft-backend](https://github.com/JEGH18/segsoft-backend) and rule execution in [segsoft-motorpython](https://github.com/JEGH18/segsoft-motorpython).

## What you can do

- 🔐 **Sign up and sign in** with session handling
- 📦 **Add a repository** by uploading a ZIP or importing from Git, and browse its files
- 📋 **Choose policies** one by one or apply a reusable **PolicySet**
- 🧭 **Trace policies** to **ISO/IEC 27002** and **NIST** controls
- ⚡ **Run an analysis** and explore findings by severity, file and policy, with charts
- 📄 **Download reports** in **PDF** or **SARIF**

## Stack

| Concern | Tools |
|---|---|
| UI | React 18, Tailwind CSS, Recharts |
| Routing and data | React Router 6, TanStack Query 5, Axios |
| Forms | React Hook Form + Zod |
| Quality | TypeScript, ESLint, Prettier |
| Tests | Vitest, Testing Library, Cypress |

## Run locally

```bash
cp .env.example .env     # set VITE_API_BASE_URL to the backend URL
npm install
npm run dev              # http://localhost:5173
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Type-check and production build |
| `npm run lint` | ESLint |
| `npm test` | Unit and component tests (Vitest) |
| `npm run test:coverage` | Tests with coverage |
| `npm run test:e2e` | End-to-end tests (Cypress) |

## Deployment

Deployed on **Vercel** from the `main` branch. `vercel.json` proxies `/api/*` to the backend so the session cookie stays on the same origin, and rewrites every other route to the SPA.

## Related repositories

[segsoft-backend](https://github.com/JEGH18/segsoft-backend) · [segsoft-motorpython](https://github.com/JEGH18/segsoft-motorpython) · [segsoft-docs](https://github.com/JEGH18/segsoft-docs) · [SegSoft-Pruebas](https://github.com/JEGH18/SegSoft-Pruebas)

> The official repositories live on Icesi University's p2tools Bitbucket; GitHub hosts a mirror.
