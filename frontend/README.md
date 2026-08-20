# Frontend application

This React + Vite frontend provides the project interface for the groundwater depletion and artificial recharge assessment application.

## Technology

- React
- Vite
- JavaScript
- React Router

## Install dependencies

```bash
cd /workspaces/groundwater-ai/frontend
npm install
```

## Run in development mode

```bash
cd /workspaces/groundwater-ai/frontend
npm run dev -- --host 0.0.0.0 --port 5173
```

The app runs at:

- http://127.0.0.1:5173

## Backend connection

The frontend connects to the FastAPI backend at:

- http://127.0.0.1:8000

Make sure the backend is running before using the API-powered pages.

## Available pages

- Home
- Prediction
- Recharge Assessment
- Explainability
- About

## Notes

- The Home page checks backend connectivity and displays project summary information.
- The Prediction page submits to POST /predict using the model metadata contract.
- The Recharge page uses the project recharge assessment endpoints.
- The Explainability page displays coefficient and permutation importance from the real backend responses.
- The About page explains the project workflow and responsible interpretation.
