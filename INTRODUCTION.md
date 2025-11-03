# Setup Guide

**Tools: VS Code + Docker**

- Download Docker and install by default, then execute in terminal: `wsl --update` or `wsl --install`
- VS Code: Install Dev Containers and Docker extensions
- Clone repository in terminal: `git clone https://github.com/TheS1n233/DORA-project.git`

## Opening DORA Project in VS Code

1. In the page terminal, switch to yujie-test branch: `git checkout test-yujie`
2. Click the green button in the bottom left → Reopen in Container (wait for installation)

## Home Assistant Installation

Home Assistant installation tutorial: https://www.home-assistant.io/installation/windows

## Frontend

### TV End - Android Studio

Download link: https://developer.android.com/studio

---

# Introduction

- Dora extends Home Assistant (https://www.home-assistant.io) to create a voice-first smart home environment that helps elderly people maintain safety, health, and social connections while living at home. The platform integrates commercial voice assistants, Android TV, IoT sensors, indoor cameras, smart plugs, wearable devices, and small local servers.

## Module 1: Home Safety

- Sensing and Detection
  - **Fall Detection (wearable devices/camera posture)**
  - Environment and Presence: human body/motion/door sensors/presence sensors
  - **Hazard Factors: gas leaks, water leaks/seepage, smoke/fire**
  - **Usage Anomalies: gas/water/electricity anomalies (forgotten valve closure, device malfunctions, etc.)**
  - Inactivity detection / prolonged lack of activity (potential accidents or help signals)
- Preventive Actions
  - Automatic lighting (contactless lighting for scenarios like getting up at night/returning home)
  - Smart plug coordination (working with sensor events for arrival reminders or safety power-off reminders)
- Access Control and Call Security
  - Video doorbell identifies suspicious persons and alerts
  - Spam/harassment call identification and prompts (marking, silent alerts, or suggest rejection)
- Alerts and Response
  - **Multi-channel notifications: voice announcements, TV popups, mobile/relative alerts, operator panel**
  - Escalation strategy: no response → repeat alerts/change channels → notify operator/relatives
  - Voice help commands ("Dora, help/I fell")
- Logging and Audit
  - Event logs and backtracking (timeline, sensor snapshots, response results)

## Module 2: Health Monitoring

- Data Collection (wearable/medical-grade devices)
  - **Steps, heart rate, body temperature, blood oxygen (SpO₂), blood glucose, ECG, skin electrical activity (EDA), sleep quality**
- Assessment and Alerts
  - Threshold alerts (instant notifications for single-point anomalies)
  - Trend identification (sustained increases/decreases, circadian rhythm abnormalities, poor recovery, etc.)
- Notifications and Coordination
  - Self-health reminders for elderly (voice/TV prompts)
  - Concern alerts for relatives
  - Suggest referral/packaging and forwarding data to doctors (with authorization)
- Lifestyle Guidance
  - Step count/daily exercise reminders ("You still need 1,200 steps today, keep it up!")

## Module 3: Smart TV Interaction

- Cognitive Games and Brain Training (fully voice-controlled)
  - Sudoku, word puzzles/word chains, math quizzes, crossword puzzles, etc.
  - Progress/score retention and light incentives
- Interest Reminders and Content Presentation
  - Interest preference discovery based on voice assistant
  - Recommend/remind related programs, news, music, photo memories, etc.
- Calendar and Reminders
  - Birthday, appointment/follow-up event prompts and TV reminder cards
- Convenient Video Calls (for elderly - "active communication")
  - Voice call: "Dora, call Agnese"
  - One-touch answer/large button interface
- Co-watch and Parallel Calls
  - Shared media sessions with family/friends while watching and chatting
  - Simplified joining, synchronized playback control (pause/resume/next segment)

## Module 4: Tele-assistance

- Operator Video Calls (for operator - "passive/active care")
  - Proactively initiate greeting/companionship calls (chatting, reminiscing, topic guidance)
  - Combined with TV display, ensuring large fonts and simplified connection
- Coordinated Response and Emergency Command
  - Receive alerts from home safety module, verify situations
  - Contact emergency services and relatives as needed, record response process
- Activities and Social Participation
  - Interest-based local activity recommendations and registration assistance
  - Encourage going out/interaction, enhance self-esteem and independence

---

# Completed Features (Functionality → API → Code)

## 1. Unified Event Stream (Redis Streams)

- Health and Security Event Writing and Aggregation:
  - Writing: home-safety-svc writes to both safety_events and unified events in parallel at /emergency/trigger and in subscriber; health-svc subscribes to physiological/environmental data and writes to vitals/events.
  
  - Aggregation: health-svc exposes GET /events supporting kinds=...&since=...&limit=... to aggregate unified events (tests configured).
  
  - Code:
    - Writing end: server/home-safety-svc/app/api/emergency.py, server/home-safety-svc/app/subscriber.py; server/health-svc/app/subscriber.py (bridging and normalization).
    - Aggregation end: server/health-svc/app/api/events.py, server/health-svc/app/main.py (factory create_app, route registration).
    - Tests: server/health-svc/tests/test_events_api.py, server/home-safety-svc/tests/test_events_bridge.py (all passed).

- FHIR Export and Filtering
  - GET /export/fhir (supports since, metric, limit, maps unified metric codes/display names), unit tests passed.
  - Code: server/health-svc/app/api/export.py, tests server/health-svc/tests/test_fhir_export.py.
  
- TV Commands and Intent
  - POST /api/intent (tv-svc) parses "play/pause/…/cowatch" into action;
  - Code: server/tv-svc/app/api/intent.py, server/tv-svc/app/intent_rules.py.
  
- Tele-assistance Summary Service
  - GET /api/summary/events (tele-assist-svc) pulls 24h statistics from health-svc:/events and generates summary text;
  - Code: server/tele-assist-svc/app/index.js.
  
- Frontend (React/Vite)
  - TV end: Event banner TvEventsTicker (polls tele-assist-svc:/api/summary/events + broadcasts from unified event stream), TV main page: client/src/app-tv.jsx; components: client/src/components/TvEventsTicker.jsx, etc.
  - Admin end (Caregiver): Event timeline EventsTimeline (calls health-svc:/events), plus health/FHIR export, device panel, etc.
    - Code: client/src/components/EventsTimeline.jsx, client/src/routes/CaregiverPage.jsx, client/src/components/FhirExportButton.jsx, etc.
  
- Compose and Local Development Scripts
  - ops/compose/*.yml stack-based startup, unified network/environment variables; scripts scripts/*.sh and data push scripts (publish_vitals.py, publish_hazard.py, etc.) self-tested and passed.

## 2. Frontend TV End + Admin End

### 2.1 TV End - Current APIs and Workflow

- Event summary banner: GET http://<TA_HOST>:8300/api/summary/events (text), implemented in tele-assist-svc/app/index.js. Native side uses OkHttp/Retrofit periodic polling or foreground Service to pull → Toast/Snackbar/Banner display.
  
- Event-by-event: GET http://<HM_HOST>:8100/events?kinds=vitals,hazard,emergency&since=24h&limit=... (structured list), implemented in health-svc/app/api/events.py → use RecyclerView list or local persistence.
  
- Intent control: POST http://<TV_HOST>:8200/api/intent (e.g., {"text":"play","room":"demo"}), parsed and executed in tv-svc.
  
- Emergency reporting (demo/debugging): POST http://<HS_HOST>:8000/emergency/trigger, writes to two streams (safety_events, events) → TV end can observe Ticker and statistical changes.
  
- Calls: tele-assist-svc/app/routes/livekit-token.js provides token route, native side can use LiveKit Android SDK to get room token and connect directly.

### 2.2 Admin End

#### 2.2.1 Required Pages
- 1) Dashboard (today's overview, alert count, devices online, recent event cards).
- 2) Alerts (filter by day/level).
- 3) Health (metric cards + FHIR export).
- 4) Tele-assist (call/co-watch entry, recent event summary broadcast button).
- 5) Devices (device status/online rate/recent heartbeat).
- 6) Settings (account/room/thresholds).
- 7) Events (timeline view, basic list implemented).

#### 2.2.2 First Implemented Page
- Page: client/src/routes/CaregiverPage.jsx.
- Used features/APIs:
- EventsTimeline (client/src/components/EventsTimeline.jsx) → GET /events (health-svc).
- FHIR export button (client/src/components/FhirExportButton.jsx) → GET /export/fhir.
- WS status indicator (WsProvider.jsx/HUD component), used to display connection status
