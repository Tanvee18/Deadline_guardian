# Deadline Guardian

> **"It doesn't remind you. It replans your day."**

Deadline Guardian is an AI-powered intelligent deadline management system that goes beyond traditional reminder applications. Instead of simply notifying users, it continuously analyzes tasks, predicts scheduling conflicts, and dynamically reorganizes schedules using a collaborative multi-agent architecture.

---

# Demo

**Live Frontend**

https://deadline-guardian-frontend.vercel.app

---

# Problem Statement

Students and professionals frequently miss deadlines because conventional task management tools only provide reminders.

They do not:

- Understand workload
- Detect scheduling conflicts
- Reorganize existing plans
- Continuously adapt schedules

Deadline Guardian solves this by introducing autonomous AI agents that monitor deadlines, extract tasks, generate schedules, detect drift, and intelligently replan the day.

---

# Key Features

- AI-powered deadline extraction
- Intelligent schedule generation
- Automatic replanning
- Dynamic conflict detection
- Multi-agent collaboration
- Firebase Authentication
- Firestore database integration
- Cloud Functions backend
- Responsive React interface
- Real-time schedule monitoring

---

# System Architecture

```
                   Gmail / Manual Input
                           │
                           ▼
                 Deadline Extraction Agent
                           │
                           ▼
                    Planner Agent
                           │
                           ▼
                    Scheduler Agent
                           │
                           ▼
                Monitor & Drift Agent
                           │
                           ▼
                   Replanner Agent
                           │
                           ▼
                 Communicator Agent
```

All agents are coordinated by the **Orchestrator**, which manages task flow and inter-agent communication.

---

# Technology Stack

## Frontend

- React
- Vite
- Tailwind CSS
- Firebase Authentication

## Backend

- Firebase Cloud Functions
- Firebase Firestore

## AI Components

- Deadline Extraction Agent
- Planner Agent
- Scheduler Agent
- Monitor Agent
- Replanner Agent
- Communicator Agent
- Orchestrator

---

# Project Structure

```
Deadline_guardian
│
├── frontend/
│   ├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── .env
│
├── functions/
│   ├── agents/
│   ├── index.js
│   └── package.json
│
├── firebase.json
├── .firebaserc
├── README.md
└── LICENSE
```

---

# Installation

Clone the repository

```bash
git clone https://github.com/Tanvee18/Deadline_guardian.git
```

Move into the project

```bash
cd Deadline_guardian
```

Install frontend dependencies

```bash
cd frontend
npm install
```

Run the frontend

```bash
npm run dev
```

---

# Firebase Backend Setup

This project uses **Firebase Cloud Functions** as its backend.

To enable all AI-powered features, configure your own Firebase project.

## Step 1

Create a Firebase Project

https://console.firebase.google.com

Enable:

- Authentication
- Firestore
- Cloud Functions

---

## Step 2

Install Firebase CLI

```bash
npm install -g firebase-tools
```

Login

```bash
firebase login
```

---

## Step 3

Select your project

```bash
firebase use --add
```

---

## Step 4

Deploy Cloud Functions

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

Firebase will generate a URL similar to

```
https://us-central1-your-project.cloudfunctions.net/api
```

---

## Step 5

Configure Frontend Environment

Create

```
frontend/.env
```

Example

```env
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT
VITE_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID

VITE_API_URL=https://us-central1-your-project.cloudfunctions.net/api
```

---

## Step 6

Deploy Frontend

Example using Vercel

```bash
vercel
```

---

## Step 7

Authorize Deployment Domain

Firebase Authentication blocks unknown domains.

Navigate to

Authentication

↓

Settings

↓

Authorized Domains

Add your deployed domain.

Example

```
deadline-guardian-frontend.vercel.app
```

or

```
your-project.vercel.app
```

---

# Environment Variables

```
VITE_FIREBASE_API_KEY

VITE_FIREBASE_AUTH_DOMAIN

VITE_FIREBASE_PROJECT_ID

VITE_FIREBASE_STORAGE_BUCKET

VITE_FIREBASE_MESSAGING_SENDER_ID

VITE_FIREBASE_APP_ID

VITE_API_URL
```

---

# Current Workflow

```
User Input
      │
      ▼
Deadline Extraction
      │
      ▼
Task Prioritization
      │
      ▼
Schedule Generation
      │
      ▼
Monitoring
      │
      ▼
Conflict Detection
      │
      ▼
Automatic Replanning
      │
      ▼
Updated Schedule
```

---

# Future Improvements

- Calendar synchronization
- Email parsing
- Mobile application
- Push notifications
- Voice assistant
- Offline support
- Team collaboration
- LLM-powered explanations

---

# License

Licensed under the Apache 2.0 License.

---

# Author

**P. Tanvee Satya**

GitHub

https://github.com/Tanvee18

---

# Acknowledgements

- Firebase
- React
- Vite
- Google Cloud
- Tailwind CSS
