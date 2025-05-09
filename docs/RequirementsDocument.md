# Requirements Document - Dora

Date:

Version: 

| Version number | Change |
| :------------: | :----: |
|                |        |

# Contents

- [Requirements Document - Dora](#requirements-document---dora)
- [Contents](#contents)
- [Informal description](#informal-description)
- [Business Model](#business-model)
- [Stakeholders](#stakeholders)
- [Context Diagram and interfaces](#context-diagram-and-interfaces)
  - [Context Diagram](#context-diagram)
  - [Interfaces](#interfaces)
- [Stories and personas](#stories-and-personas)
  - [Persona 1: Maria (Older Adult)](#persona-1-maria-older-adult)
  - [Persona 2: Paolo (Family Caregiver)](#persona-2-paolo-family-caregiver)
  - [Persona 3: Dr. Bianchi (Healthcare Provider)](#persona-3-dr-bianchi-healthcare-provider)
  - [Persona 4: Elena (Remote Operator)](#persona-4-elena-remote-operator)
- [Functional and non functional requirements](#functional-and-non-functional-requirements)
  - [Functional Requirements](#functional-requirements)
  - [Non Functional Requirements](#non-functional-requirements)
- [Access Rights](#access-rights)
- [Use case diagram and use cases](#use-case-diagram-and-use-cases)
  - [Use case diagram](#use-case-diagram)
  - [Home Safety Module Use Cases](#home-safety-module-use-cases)
    - [Use case 1, UC-HS1: Fall Detection and Response](#use-case-1-uc-hs1-fall-detection-and-response)
      - [Scenario 1.1: Detected Fall with User Response](#scenario-11-detected-fall-with-user-response)
      - [Scenario 1.2: Detected Fall with Emergency Response](#scenario-12-detected-fall-with-emergency-response)
    - [Use case 2, UC-HS2: Environmental Hazard Monitoring](#use-case-2-uc-hs2-environmental-hazard-monitoring)
  - [Smart-TV Interaction Module Use Cases](#smart-tv-interaction-module-use-cases)
    - [Use case 1, UC-TV1: Cognitive Game Playing](#use-case-1-uc-tv1-cognitive-game-playing)
      - [Scenario 1.1: Basic Cognitive Game Session](#scenario-11-basic-cognitive-game-session)
    - [Use case 2, UC-TV2: Video Call Management](#use-case-2-uc-tv2-video-call-management)
      - [Scenario 2.1: Initiating Outgoing Video Call](#scenario-21-initiating-outgoing-video-call)
      - [Scenario 2.2: Receiving Incoming Video Call](#scenario-22-receiving-incoming-video-call)
    - [Use case 3, UC-HS3: Home Security Management](#use-case-3-uc-hs3-home-security-management)
      - [Scenario 3.1: Visitor Identification](#scenario-31-visitor-identification)
      - [Scenario 3.2: Unusual Access Detection](#scenario-32-unusual-access-detection)
    - [Use case 4, UC-HS4: Spam Call and Scam Prevention](#use-case-4-uc-hs4-spam-call-and-scam-prevention)
      - [Scenario 4.1: Spam Call Interception](#scenario-41-spam-call-interception)
  - [Smart-TV Interaction Module more (later added) Use Cases](#smart-tv-interaction-module-more-later-added-use-cases)
    - [Use case 3, UC-TV3: Calendar and Reminder Management](#use-case-3-uc-tv3-calendar-and-reminder-management)
      - [Scenario 3.1: Calendar Review and Event Addition](#scenario-31-calendar-review-and-event-addition)
    - [Use case 4, UC-TV4: Health Data Visualization](#use-case-4-uc-tv4-health-data-visualization)
      - [Scenario 4.1: Reviewing Weekly Health Trends](#scenario-41-reviewing-weekly-health-trends)
    - [Use case 5, UC-TV5: Media Content Management and Shared Viewing](#use-case-5-uc-tv5-media-content-management-and-shared-viewing)
      - [Scenario 5.1: Shared Media Viewing with Family](#scenario-51-shared-media-viewing-with-family)
- [Glossary](#glossary)
  - [Key Terms and Concepts](#key-terms-and-concepts)
- [System Design](#system-design)
- [System Design](#system-design-1)
  - [Architectural Layers](#architectural-layers)
    - [1. Device Layer](#1-device-layer)
    - [2. Integration Layer](#2-integration-layer)
    - [3. Service Layer](#3-service-layer)
    - [4. Intelligence Layer](#4-intelligence-layer)
    - [5. Interface Layer](#5-interface-layer)
    - [6. Security and Privacy Layer](#6-security-and-privacy-layer)
  - [Data Flow](#data-flow)
  - [Fault Tolerance and Reliability](#fault-tolerance-and-reliability)
- [Deployment Diagram](#deployment-diagram)
  - [Physical Component Deployment](#physical-component-deployment)
    - [User Home Environment](#user-home-environment)
    - [External Components](#external-components)
  - [Communication Pathways](#communication-pathways)

# Informal description

DORA is a home automation system designed to support older adults in their homes through voice interaction and smart technology. The system aims to improve quality of life from physical, psychological, and cognitive perspectives, allowing elderly individuals to maintain their independence without relocating for assistance. 

The platform integrates a commercial voice assistant, Android TV, IoT sensors, indoor cameras, smart plugs, wearables, and a local server into a cohesive ecosystem. DORA's modular design includes four key service blocks:

1. **Home Safety**: Uses sensors and automated responses to prevent accidents and detect emergencies
2. **Health Monitoring**: Tracks vital signs through wearables to monitor wellbeing
3. **Smart-TV Interaction**: Provides cognitive exercises and social engagement through a familiar interface
4. **Tele-assistance**: Connects users with remote operators for personalized support

DORA primarily uses voice commands for interaction, making it accessible to older adults with limited technology experience.

# Business Model

DORA addresses the growing market need for aging-in-place solutions with a modular service approach:

- **Target Market**: Primarily older adults (65+) and their caregivers, with particular focus on the 60% of seniors with chronic conditions and the 44% who live alone.

- **Value Proposition**: 
  1. For older adults: Increased independence, safety, and quality of life
  2. For caregivers: Reduced worry and physical/financial burden
  3. For healthcare systems: Decreased hospitalization rates and institutional care costs

- **Revenue Model**: 
  1. Base package including essential Home Safety features
  2. Optional add-on modules (Health Monitoring, Smart-TV Interaction, Tele-assistance)
  3. Subscription service for ongoing monitoring and updates
  4. Professional installation and setup services

- **Cost Structure**:
  1. Hardware (sensors, wearables, smart home devices)
  2. Software development and maintenance
  3. Cloud infrastructure for data processing
  4. Customer support and remote operator services

- **Strategic Partnerships**:
  1. Healthcare providers for medical monitoring integration
  2. Insurance companies for potential subsidization
  3. Voice assistant platform providers (e.g., Google, Amazon)
  4. Local senior service organizations for distribution

# Stakeholders

| Stakeholder name | Description |
| :--------------: | :---------: |
| Older Adults | Primary users of the system who benefit from increased safety, health monitoring, cognitive stimulation, and social connection while maintaining independence at home |
| Family Caregivers | Individuals responsible for monitoring and supporting older adults, benefiting from reduced physical and emotional burden |
| Healthcare Providers | Doctors and medical professionals who receive health data and can respond to emergencies or health concerns |
| Remote Operators | Staff who provide tele-assistance services through the system |
| System Administrators | Technical personnel responsible for maintaining and troubleshooting the system |
| Technology Providers | Companies supplying hardware components (sensors, wearables, etc.) and software integrations |
| Emergency Services | First responders who may be contacted automatically during emergencies |
| Insurance Companies | Organizations potentially subsidizing the system to reduce hospitalization costs |
| Regulatory Bodies | Entities defining standards for healthcare technology, data privacy, and home safety |
| Research Institutions | Organizations studying the effectiveness of the system and contributing to improvements |

# Context Diagram and interfaces

## Context Diagram

![UML Context Diagram](images/UML_Context_Diagram.png)

The context diagram illustrates the interaction between the DORA system and external actors including the Older Adult (primary user), Family Caregiver, Healthcare Provider, Remote Operator, Emergency Services, and System Administrator. Each actor has specific interactions 

## Interfaces

| Actor | Logical Interface | Physical Interface |
| :---: | :---------------: | :----------------: |
| Older Adult | Voice commands, visual feedback | Voice assistant device, Smart TV, wearable devices, environmental sensors |
| Family Caregiver | Mobile application, notifications, dashboard | Smartphone, tablet, web browser |
| Healthcare Provider | Medical dashboard, notifications | Web browser, smartphone application |
| Remote Operator | Administration console, video chat | Computer workstation, headset |
| Emergency Services | Automated alerts | API integration with emergency systems |
| System Administrator | Management console | Web browser, SSH connection |

# Stories and personas

## Persona 1: Maria (Older Adult)
Maria is a 78-year-old widow living alone in her apartment. She has mild arthritis that makes using small buttons difficult and wears glasses for reading. She has a basic mobile phone but struggles with touch screens and complex interfaces. Maria values her independence but her children worry about her safety.

**Story**: Maria wakes up and says "Good morning, DORA" to activate the system. DORA responds with a greeting, today's weather, and a reminder about her doctor's appointment. When Maria gets up to make breakfast, she accidentally drops a pan, which makes a loud noise. DORA asks if she's okay, and Maria confirms she is fine. Later, Maria asks DORA to call her daughter for their weekly chat, and the call appears on her TV. In the afternoon, Maria feels like stimulating her mind, so she asks DORA to start a crossword puzzle on the TV, which she controls entirely through voice commands.

## Persona 2: Paolo (Family Caregiver)
Paolo is Maria's 52-year-old son who lives 30 minutes away. He works full-time and has his own family but checks on his mother regularly. He is comfortable with technology and uses a smartphone daily.

**Story**: While at work, Paolo receives a notification that his mother's medication reminder was acknowledged. Later, he uses the DORA family app to check if his mother has been active today and sees that her routine seems normal. When he notices that the system detected a minor fall yesterday (which didn't require emergency response), he initiates a video call through the app to check on her. The call connects to his mother's TV, and they have a brief conversation where she assures him she's fine.

## Persona 3: Dr. Bianchi (Healthcare Provider)
Dr. Bianchi is Maria's general practitioner who has been treating her for hypertension and diabetes for several years. She reviews patient data remotely when flagged by the system.

**Story**: Dr. Bianchi receives an alert that Maria's blood pressure readings have been elevated for three consecutive days. She reviews the data on her medical dashboard and notices the pattern began after a change in medication. She schedules a tele-health appointment through DORA, which notifies Maria on her TV. During their video consultation, Dr. Bianchi adjusts the prescription and DORA updates Maria's medication reminder schedule automatically.

## Persona 4: Elena (Remote Operator)
Elena works for the DORA tele-assistance service, providing remote support to several older adults including Maria. She has training in elder care and basic emergency protocols.

**Story**: Elena receives a scheduled reminder to check in with Maria, who hasn't had a social call in several days. She initiates a video call through the operator console, which connects to Maria's TV. They chat about Maria's week and recent activities. Maria mentions she's been having trouble sleeping, so Elena suggests a gentle stretching routine that DORA can guide her through before bedtime. Elena also notices that Maria might enjoy a new card game that's been added to the system and helps her access it before ending their call.

# Functional and non functional requirements

## Functional Requirements

| ID | Description |
| :---: | :--------- |
| **Home Safety Module** |  |
| FR-HS1 | DETECT FALLS using wearable devices and motion sensors |
| FR-HS2 | ALERT CAREGIVERS when falls or emergencies are detected |
| FR-HS3 | MONITOR ENVIRONMENTAL HAZARDS including gas leaks, smoke, and water leaks |
| FR-HS4 | CONTROL LIGHTING automatically based on user presence and through voice commands |
| FR-HS5 | SECURE HOME ENTRANCES by monitoring doors and windows |
| FR-HS6 | DETECT UNUSUAL INACTIVITY patterns that may indicate an emergency |
| FR-HS7 | FILTER SPAM CALLS and identify potential scam attempts |
| FR-HS8 | IDENTIFY VISITORS through smart doorbell integration |
| FR-HS9 | INITIATE EMERGENCY CALLS through voice commands or automatic triggers |
| FR-HS10 | MANAGE POWER OUTAGES with backup systems and notifications |
| **Smart-TV Interaction Module** |  |
| FR-TV1 | DISPLAY COGNITIVE GAMES and activities controlled by voice |
| FR-TV2 | INITIATE VIDEO CALLS to contacts through voice commands |
| FR-TV3 | SHOW CALENDAR with appointments, birthdays, and reminders |
| FR-TV4 | RECOMMEND CONTENT based on user preferences and activity patterns |
| FR-TV5 | ENABLE SHARED VIEWING experiences with remote participants |
| FR-TV6 | DISPLAY HEALTH INFORMATION when requested by the user |
| FR-TV7 | PROVIDE NEWS AND WEATHER updates through voice requests |
| FR-TV8 | CONTROL MEDIA PLAYBACK through voice commands |
| FR-TV9 | CREATE CUSTOM SHORTCUTS for frequently used TV functions |
| FR-TV10 | INTEGRATE WITH STREAMING SERVICES for entertainment content |

## Non Functional Requirements

| ID | Type | Description | Refers to |
| :---: | :---: | :--------- | :---: |
| NFR1 | Usability | The system MUST use voice as the primary interface, requiring no technical knowledge to operate. Voice commands must be recognized with at least 95% accuracy for users over 65 years old, including those with regional accents. | All FR |
| NFR2 | Usability | The system MUST provide auditory confirmations for all critical actions to accommodate users with visual impairments. | FR-HS1, FR-HS2, FR-HS3, FR-HS9, FR-TV2 |
| NFR3 | Reliability | The Home Safety module MUST function during internet outages for at least 12 hours using local processing and backup power. | FR-HS1, FR-HS3, FR-HS5, FR-HS6, FR-HS9 |
| NFR4 | Reliability | The system MUST maintain a 99.9% uptime for safety-critical functions (fall detection, environmental hazards, emergency calls). | FR-HS1, FR-HS2, FR-HS3, FR-HS9 |
| NFR5 | Performance | Voice commands MUST be processed and executed within 2 seconds under normal operating conditions. | All FR |
| NFR6 | Performance | Fall detection alerts MUST be sent to caregivers within 10 seconds of detection. | FR-HS1, FR-HS2 |
| NFR7 | Security | All health and personal data MUST be encrypted both at rest and in transit using industry-standard encryption (minimum AES-256). | All FR |
| NFR8 | Security | The system MUST implement role-based access control for all user interfaces and APIs. | All FR |
| NFR9 | Privacy | The system MUST provide clear voice prompts when monitoring or recording is active, and offer simple commands to temporarily disable monitoring. | FR-HS1, FR-HS6 |
| NFR10 | Privacy | Voice recordings MUST be processed locally when possible and stored for no longer than 30 days unless explicitly saved by the user. | All FR |
| NFR11 | Scalability | The system MUST support at least 50 connected devices without performance degradation. | All FR |
| NFR12 | Maintainability | The system MUST be modular, allowing individual components to be updated or replaced without affecting the entire system. | All FR |
| NFR13 | Localization | The voice interface MUST support at least Italian and English, with capability to add additional languages. | All FR |
| NFR14 | Compatibility | The Smart-TV application MUST function on Android TV versions 9.0 and above. | FR-TV1 to FR-TV10 |
| NFR15 | Compatibility | The system MUST integrate with at least one major commercial voice assistant platform (Google Assistant, Amazon Alexa, or Apple Siri). | All FR |
| NFR16 | Accessibility | The Smart-TV interface MUST comply with WCAG 2.1 AA standards for accessibility. | FR-TV1 to FR-TV10 |
| NFR17 | Recovery | The system MUST automatically recover from errors and restart critical services without user intervention. | All FR |
| NFR18 | Energy Efficiency | The system SHOULD optimize energy usage by deactivating non-essential functions when not in use. | All FR |
| NFR19 | Learnability | The system MUST adapt to user speech patterns and preferences over time to improve recognition accuracy and personalization. | All FR |
| NFR20 | Regulatory Compliance | The system MUST comply with GDPR for data protection and relevant medical device regulations if collecting health data. | All FR |

# Access Rights

| ID | FR name | Older Adult | Family Caregiver | Healthcare Provider | Remote Operator | System Administrator |
| :---: | :--------- | :---: | :---: | :---: | :---: | :---: |
| **Home Safety Module** |  |  |  |  |  |  |
| FR-HS1 | DETECT FALLS | ✅ | ⚪ | ⚪ | ⚪ | ⚪ |
| FR-HS2 | ALERT CAREGIVERS | ✅ | ✅ | ✅ | ✅ | ✅ |
| FR-HS3 | MONITOR ENVIRONMENTAL HAZARDS | ✅ | ⚪ | ⚪ | ⚪ | ⚪ |
| FR-HS4 | CONTROL LIGHTING | ✅ | ❌ | ❌ | ❌ | ✅ |
| FR-HS5 | SECURE HOME ENTRANCES | ✅ | ⚪ | ❌ | ⚪ | ✅ |
| FR-HS6 | DETECT UNUSUAL INACTIVITY | ✅ | ✅ | ✅ | ✅ | ✅ |
| FR-HS7 | FILTER SPAM CALLS | ✅ | ✅ | ❌ | ✅ | ✅ |
| FR-HS8 | IDENTIFY VISITORS | ✅ | ✅ | ❌ | ✅ | ✅ |
| FR-HS9 | INITIATE EMERGENCY CALLS | ✅ | ✅ | ❌ | ✅ | ✅ |
| FR-HS10 | MANAGE POWER OUTAGES | ✅ | ✅ | ❌ | ✅ | ✅ |
| **Smart-TV Interaction Module** |  |  |  |  |  |  |
| FR-TV1 | DISPLAY COGNITIVE GAMES | ✅ | ❌ | ❌ | ✅ | ✅ |
| FR-TV2 | INITIATE VIDEO CALLS | ✅ | ✅ | ✅ | ✅ | ✅ |
| FR-TV3 | SHOW CALENDAR | ✅ | ✅ | ✅ | ✅ | ✅ |
| FR-TV4 | RECOMMEND CONTENT | ✅ | ❌ | ❌ | ✅ | ✅ |
| FR-TV5 | ENABLE SHARED VIEWING | ✅ | ✅ | ❌ | ✅ | ✅ |
| FR-TV6 | DISPLAY HEALTH INFORMATION | ✅ | ✅ | ✅ | ✅ | ✅ |
| FR-TV7 | PROVIDE NEWS AND WEATHER | ✅ | ❌ | ❌ | ✅ | ✅ |
| FR-TV8 | CONTROL MEDIA PLAYBACK | ✅ | ❌ | ❌ | ✅ | ✅ |
| FR-TV9 | CREATE CUSTOM SHORTCUTS | ✅ | ✅ | ❌ | ✅ | ✅ |
| FR-TV10 | INTEGRATE WITH STREAMING SERVICES | ✅ | ❌ | ❌ | ✅ | ✅ |

✅ - Full access (can use, view, modify)
⚪ - Read-only access (can view but not modify)
❌ - No access

# Use case diagram and use cases

## Use case diagram

\<define here UML Use case diagram UCD summarizing all use cases, and their relationships>

## Home Safety Module Use Cases

### Use case 1, UC-HS1: Fall Detection and Response

| Actors Involved | Older Adult, Family Caregiver, Healthcare Provider, Remote Operator |
| :-------------: | :------------------------------------------------------------------ |
| Precondition | Wearable device is active and connected to the system, fall detection is enabled |
| Post condition | Fall is detected, appropriate response initiated, and incident is logged |
| Nominal Scenario | 1. Wearable device detects sudden changes in acceleration and orientation<br>2. System evaluates the data to confirm a potential fall<br>3. System initiates voice interaction with Older Adult: "I've detected a possible fall. Are you okay?"<br>4. System waits for response for 30 seconds<br>5. If no response or negative response, system escalates to alert<br>6. System sends notification to Family Caregiver with incident details<br>7. If configured, system notifies Healthcare Provider<br>8. System logs the incident with all relevant data |
| Variants | - Older Adult confirms they are fine: System cancels the alert but logs the event<br>- Older Adult manually activates help: System immediately escalates to emergency protocol<br>- Severe fall detected: System skips confirmation and immediately alerts caregivers |
| Exceptions | - Wearable device has low battery: System sends preventive notification to all parties<br>- False positive detection: System allows user to flag incident as false alarm<br>- Connection failure: System attempts to use alternative communication channels |

#### Scenario 1.1: Detected Fall with User Response

| Scenario 1.1 | Fall is detected but user confirms they are okay |
| :----------: | :------------------------------------------- |
| Precondition | Wearable device is active and connected, fall detection is enabled |
| Post condition | Fall event is recorded, no emergency response is initiated |
| Step# | Description |
| 1 | Older Adult (Maria) accidentally drops something and quickly bends to pick it up |
| 2 | Wearable device registers sudden movement pattern similar to a fall |
| 3 | System processes data and determines possible fall event |
| 4 | System announces through nearest speaker: "Maria, I've detected a possible fall. Are you okay?" |
| 5 | Maria responds: "Yes, I'm fine, just dropped something" |
| 6 | System confirms: "Glad you're okay. I'll make a note of this but won't send any alerts" |
| 7 | System logs the event as "Possible fall - user confirmed safe" in activity history |
| 8 | Low-priority notification is sent to Family Caregiver's app for awareness |

#### Scenario 1.2: Detected Fall with Emergency Response

| Scenario 1.2 | Fall is detected, user needs assistance |
| :----------: | :----------------------------------- |
| Precondition | Wearable device is active and connected, fall detection is enabled |
| Post condition | Emergency protocol activated, help is dispatched |
| Step# | Description |
| 1 | Older Adult (Maria) slips in the bathroom and falls |
| 2 | Wearable device registers fall pattern (sudden acceleration followed by impact) |
| 3 | System processes data and confirms probable fall |
| 4 | System announces: "Maria, I've detected a fall. Are you okay?" |
| 5 | Maria responds: "No, I need help" (or no response is received within 30 seconds) |
| 6 | System announces: "I'm alerting your emergency contacts now" |
| 7 | High-priority alert with location data sent to Family Caregiver's app with option to call emergency services |
| 8 | Notification sent to configured Healthcare Provider with fall data |
| 9 | If enabled, system initiates call to emergency services with pre-recorded message including address and situation |
| 10 | System maintains open voice channel to allow communication between Maria and responders |
| 11 | System logs complete incident with timestamps and response details |

### Use case 2, UC-HS2: Environmental Hazard Monitoring

| Actors Involved | Older Adult, Family Caregiver, Remote Operator |
| :-------------: | :-------------------------------------------- |
| Precondition | Environmental sensors are operational and calibrated |
| Post condition | Hazard is detected, reported, and mitigating actions are taken |
| Nominal Scenario | 1. Environmental sensors detect abnormal condition (gas, smoke, water leak, extreme temperature)<br>2. System evaluates sensor data against defined thresholds<br>3. System initiates appropriate alert based on severity<br>4. System announces hazard to Older Adult with specific safety instructions<br>5. System sends notifications to designated contacts<br>6. For severe hazards, system takes automatic preventive measures if possible<br>7. System continues monitoring to detect if hazard condition is resolved |
| Variants | - Minor hazard (slight temperature deviation): Low-priority notification, no emergency response<br>- Critical hazard (gas leak): Full emergency protocol, automatic shutdown of relevant systems<br>- Hazard with confirmation request: System asks user to verify certain hazards (e.g., small water leak) |
| Exceptions | - Sensor malfunction: System reports possible malfunction and continues monitoring with other sensors<br>- Power outage: System switches to backup power for critical monitoring<br>- Multiple simultaneous hazards: System prioritizes by danger level |

## Smart-TV Interaction Module Use Cases

### Use case 1, UC-TV1: Cognitive Game Playing

| Actors Involved | Older Adult, Remote Operator |
| :-------------: | :--------------------------- |
| Precondition | Smart TV is powered on and connected to the system, cognitive games are installed |
| Post condition | User completes game session, progress is recorded |
| Nominal Scenario | 1. Older Adult initiates game request through voice command: "DORA, I'd like to play a game"<br>2. System responds with available game options based on user preferences<br>3. User selects specific game through voice command<br>4. System launches selected game on Smart TV<br>5. System provides voice instructions on how to play<br>6. User interacts with game through voice commands<br>7. System tracks performance metrics during gameplay<br>8. Upon completion, system saves results and offers feedback<br>9. System offers to start another game or return to main menu |
| Variants | - System suggests game based on cognitive health goals: "Would you like to try a memory game today?"<br>- Learning mode for new games with extended instructions<br>- Multi-player mode connecting with family members or other system users |
| Exceptions | - Voice recognition errors: System offers simplified commands or alternative input methods<br>- Smart TV connectivity issues: System suggests troubleshooting or alternative activities<br>- User difficulty: System dynamically adjusts difficulty level based on performance |

#### Scenario 1.1: Basic Cognitive Game Session

| Scenario 1.1 | User plays a word puzzle game |
| :----------: | :--------------------------- |
| Precondition | Smart TV is on, system is operational, user profile exists |
| Post condition | Game session completed, results saved to user profile |
| Step# | Description |
| 1 | Maria says: "DORA, I want to play a word game" |
| 2 | System responds: "Would you like to play Crossword, Word Search, or Anagrams today?" |
| 3 | Maria responds: "Let's do the Crossword" |
| 4 | System launches Crossword application on Smart TV |
| 5 | System explains: "I've loaded today's crossword puzzle. You can say 'clue' followed by a number to hear the clue, and 'enter' followed by your answer to fill it in" |
| 6 | Maria says: "Clue 1 across" |
| 7 | System reads: "1 across: Capital of Italy, 4 letters" |
| 8 | Maria responds: "Enter Rome" |
| 9 | System fills in "ROME" in the crossword grid and confirms: "Correct! '1 across' is Rome" |
| 10 | Gameplay continues until Maria says: "Save and exit" |
| 11 | System saves progress and displays summary: "Great job today! You completed 65% of the puzzle and learned 3 new words" |
| 12 | System asks: "Would you like to play another game or do something else?" |
| 13 | Maria responds: "That's enough for now" |
| 14 | System returns to main Smart TV interface |

### Use case 2, UC-TV2: Video Call Management

| Actors Involved | Older Adult, Family Caregiver, Healthcare Provider, Remote Operator |
| :-------------: | :------------------------------------------------------------------ |
| Precondition | Smart TV is on, system is connected to internet, contact list is configured |
| Post condition | Video call is successfully initiated, conducted, and terminated |
| Nominal Scenario | 1. Older Adult requests video call through voice command: "DORA, call my daughter"<br>2. System identifies contact from user's list<br>3. System confirms: "Calling your daughter, Anna"<br>4. System initiates call and displays connection status on TV<br>5. Once connected, system activates camera and microphone<br>6. Video call proceeds with participants visible on TV screen<br>7. Either party can end call, or Older Adult uses voice command: "DORA, end call"<br>8. System terminates call and returns to previous screen |
| Variants | - Incoming call: System announces caller and asks if user wants to accept<br>- Scheduled call: System reminds user of upcoming scheduled call<br>- Call with shared content viewing: System enables both parties to watch same content<br>- Call with healthcare provider: System offers to display recent health data |
| Exceptions | - Connection failure: System provides troubleshooting steps and offers to try again<br>- Contact unavailable: System offers to leave message or schedule call for later<br>- Privacy mode: System allows user to disable camera but keep audio |

#### Scenario 2.1: Initiating Outgoing Video Call

| Scenario 2.1 | User initiates video call to family member |
| :----------: | :--------------------------------------- |
| Precondition | Smart TV is on, system is online, contact list includes family member |
| Post condition | Video call is successfully connected |
| Step# | Description |
| 1 | Maria says: "DORA, call Paolo" |
| 2 | System confirms: "Calling your son Paolo on his mobile" |
| 3 | System displays "Calling..." status on TV with Paolo's contact information |
| 4 | System activates the TV-connected camera and microphone |
| 5 | Paolo answers the call on his smartphone |
| 6 | System establishes connection and displays Paolo's video feed on the TV |
| 7 | System announces: "Paolo has joined the call" |
| 8 | Maria and Paolo conduct their conversation |
| 9 | Maria says: "DORA, end call" when finished |
| 10 | System confirms: "Ending call with Paolo" and terminates the connection |
| 11 | System returns to the previous TV screen |

#### Scenario 2.2: Receiving Incoming Video Call

| Scenario 2.2 | User receives incoming video call |
| :----------: | :------------------------------- |
| Precondition | System is operational, Smart TV can be activated if not already on |
| Post condition | Video call is received and completed |
| Step# | Description |
| 1 | Family Caregiver (Paolo) initiates video call to Maria through their app |
| 2 | If TV is off, system activates TV (if this feature is enabled) |
| 3 | System announces: "Incoming video call from Paolo" |
| 4 | System asks: "Would you like to answer?" |
| 5 | Maria responds: "Yes, answer" |
| 6 | System connects the call and displays Paolo's video feed on TV |
|.7 | System activates camera and microphone |
| 8 | Maria and Paolo conduct their conversation |
| 9 | Paolo ends the call from his end |
| 10 | System announces: "Call ended" and returns to previous screen or standby mode |
| 11 | System logs the call in communication history |

### Use case 3, UC-HS3: Home Security Management

| Actors Involved | Older Adult, Family Caregiver, Remote Operator |
| :-------------: | :-------------------------------------------- |
| Precondition | Security sensors (door/window sensors, smart doorbell, motion detectors) are operational |
| Post condition | Security event is detected, evaluated, and appropriate response taken |
| Nominal Scenario | 1. Security sensor detects activity (door opening, doorbell ring, unusual motion)<br>2. System evaluates if activity matches expected patterns or authorized access<br>3. For expected events, system logs activity with no alert<br>4. For unexpected events, system notifies Older Adult via voice announcement<br>5. System waits for user confirmation or takes automated action based on severity<br>6. For potential security threats, system notifies designated contacts<br>7. System maintains monitoring to track resolution of situation |
| Variants | - Authorized visitor: System announces visitor identity through smart doorbell recognition<br>- Unexpected entry: System asks user for verification before alerting others<br>- Scheduled service provider: System recognizes expected visit pattern |
| Exceptions | - False alarm: System learns from incidents marked as false alarms<br>- Power or connectivity loss: System issues backup alerts through alternative channels<br>- Simultaneous events: System prioritizes based on threat level |

#### Scenario 3.1: Visitor Identification

| Scenario 3.1 | System identifies visitor at the door |
| :----------: | :---------------------------------- |
| Precondition | Smart doorbell is operational, visitor database is configured |
| Post condition | Visitor is identified and user is informed |
| Step# | Description |
| 1 | Visitor presses smart doorbell |
| 2 | Smart doorbell camera captures visitor's image |
| 3 | System analyzes image and compares with known contacts |
| 4 | System identifies visitor as Maria's neighbor Elena |
| 5 | System announces: "Elena is at your front door" |
| 6 | Maria responds: "Let me know what she wants" |
| 7 | System activates two-way communication with doorbell |
| 8 | System announces to visitor: "Hello Elena, Maria wants to know the purpose of your visit" |
| 9 | Elena responds: "I brought some homemade cookies" |
| 10 | System relays to Maria: "Elena says she brought some homemade cookies" |
| 11 | Maria says: "Tell her I'll be right there" |
| 12 | System relays message and logs the interaction |

#### Scenario 3.2: Unusual Access Detection

| Scenario 3.2 | System detects unexpected home access |
| :----------: | :---------------------------------- |
| Precondition | Door/window sensors are active, expected schedule is configured |
| Post condition | Unexpected access is verified and appropriate action taken |
| Step# | Description |
| 1 | Sensor detects back door opening during unusual time (2:00 AM) |
| 2 | System checks if this matches any expected pattern or scheduled event |
| 3 | System determines this is unexpected and potentially concerning |
| 4 | System immediately announces: "Maria, the back door has been opened. Is this expected?" |
| 5 | Maria does not respond within 30 seconds |
| 6 | System escalates to medium alert level |
| 7 | System calls Maria's primary phone with alert message |
| 8 | Maria answers and says: "It's just me getting some air" |
| 9 | System confirms: "Thank you for confirming. I'll update the log" |
| 10 | System creates event log marking this as "unusual but confirmed safe" |
| 11 | System asks: "Would you like me to add this to your regular patterns?" |
| 12 | Maria responds: "No, this is not regular" |
| 13 | System acknowledges and maintains current pattern recognition |

### Use case 4, UC-HS4: Spam Call and Scam Prevention

| Actors Involved | Older Adult, Family Caregiver, Remote Operator |
| :-------------: | :-------------------------------------------- |
| Precondition | Home phone integration is configured, spam detection is enabled |
| Post condition | Potentially harmful calls are intercepted and handled securely |
| Nominal Scenario | 1. Incoming call is received on resident's phone<br>2. System intercepts call and analyzes caller information<br>3. System checks against known spam databases and previous call patterns<br>4. If call is from known contact, system allows normal ring-through<br>5. If call is suspected spam/scam, system activates enhanced screening<br>6. System answers with screening message requesting purpose of call<br>7. System analyzes response for red flags and known scam patterns<br>8. System either blocks call or forwards to user with warning label<br>9. System logs call details and outcome for future reference |
| Variants | - Known scam number: Automatic blocking without screening<br>- Uncertain classification: Enhanced monitoring during call if forwarded<br>- User preference: Different levels of screening based on user comfort |
| Exceptions | - False positive: System learns from calls marked as legitimate<br>- System unavailable: Default phone behavior with post-call analysis<br>- Caller manipulates screening: Secondary detection during actual conversation |

#### Scenario 4.1: Spam Call Interception

| Scenario 4.1 | System identifies and blocks spam call |
| :----------: | :----------------------------------- |
| Precondition | Phone integration is active, spam detection enabled |
| Post condition | Potentially harmful call is blocked without disturbing the user |
| Step# | Description |
| 1 | Incoming call is received from unknown number |
| 2 | System intercepts call before standard ring |
| 3 | System checks number against spam databases and finds it flagged as suspicious |
| 4 | System activates enhanced screening and answers call |
| 5 | System plays message: "This call is being screened. Please state your name and purpose" |
| 6 | Caller states: "This is the tax office calling about an outstanding payment" |
| 7 | System analyzes response and identifies multiple scam indicators (urgency, impersonation of authority) |
| 8 | System responds to caller: "This number is protected. Your call has been logged and reported" |
| 9 | System terminates call without involving Maria |
| 10 | System logs call details including recording of caller's stated purpose |
| 11 | System creates notification for Family Caregiver showing blocked call attempt |
| 12 | Later, system provides brief summary to Maria: "I blocked a suspicious call today claiming to be from the tax office" |

## Smart-TV Interaction Module more (later added) Use Cases

### Use case 3, UC-TV3: Calendar and Reminder Management

| Actors Involved | Older Adult, Family Caregiver, Healthcare Provider, Remote Operator |
| :-------------: | :------------------------------------------------------------------ |
| Precondition | Smart TV is operational, calendar system is configured, user profile exists |
| Post condition | Calendar events and reminders are managed effectively |
| Nominal Scenario | 1. User requests calendar view through voice command: "DORA, show my calendar"<br>2. System displays calendar view on Smart TV<br>3. User can navigate through dates with voice commands<br>4. System highlights important upcoming events with visual cues<br>5. User can request details about specific events<br>6. User can add new events through guided voice dialogue<br>7. System synchronizes calendar across all devices<br>8. System provides timely reminders based on event importance |
| Variants | - Daily briefing: Automated summary of day's schedule during morning routine<br>- Healthcare appointments: Enhanced reminders with preparation instructions<br>- Social events: Integration with video call system for event participation<br>- Remote management: Family members adding events through their app |
| Exceptions | - Conflicting events: System highlights conflicts and suggests alternatives<br>- Missed events: Follow-up protocol for unacknowledged important events<br>- Connectivity issues: Local caching ensures critical reminders still function |

#### Scenario 3.1: Calendar Review and Event Addition

| Scenario 3.1 | User reviews calendar and adds new event |
| :----------: | :-------------------------------------- |
| Precondition | Smart TV is on, calendar system is configured |
| Post condition | Calendar is viewed and new event is added successfully |
| Step# | Description |
| 1 | Maria says: "DORA, show me my calendar" |
| 2 | System displays current month's calendar on TV with current date highlighted |
| 3 | System summarizes: "You have 3 events this week: Doctor's appointment tomorrow at 10 AM, hair salon on Thursday at 2 PM, and video call with Paolo on Friday at 6 PM" |
| 4 | Maria says: "I need to add lunch with Elena on Wednesday" |
| 5 | System responds: "Adding a lunch with Elena on Wednesday. What time will this be?" |
| 6 | Maria says: "12:30 PM" |
| 7 | System asks: "How long will the lunch last?" |
| 8 | Maria responds: "About two hours" |
| 9 | System asks: "Would you like to add a location?" |
| 10 | Maria says: "At her house" |
| 11 | System shows event preview on TV and asks: "I'll add 'Lunch with Elena' on Wednesday at 12:30 PM for 2 hours at her house. Is this correct?" |
| 12 | Maria confirms: "Yes, that's right" |
| 13 | System adds event and confirms: "Event added to your calendar. Would you like a reminder?" |
| 14 | Maria responds: "Yes, remind me one hour before" |
| 15 | System sets reminder and updates display: "I'll remind you at 11:30 AM on Wednesday" |

### Use case 4, UC-TV4: Health Data Visualization

| Actors Involved | Older Adult, Family Caregiver, Healthcare Provider |
| :-------------: | :---------------------------------------------- |
| Precondition | Wearable devices are paired, health monitoring is active, Smart TV is operational |
| Post condition | Health data is visualized and understood by the user |
| Nominal Scenario | 1. User requests health information: "DORA, show me my health data"<br>2. System authenticates user through voice recognition<br>3. System retrieves recent health metrics from wearables and sensors<br>4. System generates appropriate visualizations for the TV display<br>5. System presents data with simplified explanations and trends<br>6. User can request specific metrics or timeframes through voice commands<br>7. System highlights significant changes or concerning patterns<br>8. System provides context and general recommendations |
| Variants | - Specific metric request: "Show me my blood pressure for the last week"<br>- Healthcare sharing: Preparing data package for upcoming doctor appointment<br>- Goal tracking: Visualization of progress toward health goals<br>- Medication correlation: Relating health metrics to medication schedule |
| Exceptions | - Missing data: System explains gaps and suggests troubleshooting<br>- Concerning readings: System offers to share with healthcare provider<br>- Privacy mode: Quick hiding of sensitive information when others are present |

#### Scenario 4.1: Reviewing Weekly Health Trends

| Scenario 4.1 | User reviews weekly health data summary |
| :----------: | :------------------------------------ |
| Precondition | Health monitoring is active, data is being collected |
| Post condition | User understands current health status and trends |
| Step# | Description |
| 1 | Maria says: "DORA, show me my health report for this week" |
| 2 | System verifies voice identity as an authentication measure |
| 3 | System responds: "Preparing your weekly health summary" and retrieves data |
| 4 | System displays a dashboard on TV with key metrics: steps, heart rate, sleep quality, and blood pressure |
| 5 | System provides audio summary: "This week, you averaged 5,200 steps per day, which is 15% more than last week. Your heart rate has been stable, and you've had an average of 7.1 hours of sleep nightly" |
| 6 | System highlights a pattern: "I notice your blood pressure readings have been slightly higher in the mornings. Would you like to see those details?" |
| 7 | Maria responds: "Yes, show me the blood pressure readings" |
| 8 | System displays blood pressure chart with morning vs. evening comparison |
| 9 | System asks: "Would you like me to prepare this information to share with Dr. Bianchi at your appointment next week?" |
| 10 | Maria responds: "Yes, please do that" |
| 11 | System confirms: "I'll prepare a health summary for your appointment. Is there anything specific you'd like me to highlight?" |
| 12 | Maria says: "Just the blood pressure changes" |
| 13 | System acknowledges: "I'll focus on blood pressure trends in the summary" |
| 14 | Maria asks: "What's my step goal for tomorrow?" |
| 15 | System replies: "Your daily step goal is 5,500. You've reached your goal 4 out of 7 days this week" |

### Use case 5, UC-TV5: Media Content Management and Shared Viewing

| Actors Involved | Older Adult, Family Caregiver, Remote Operator |
| :-------------: | :-------------------------------------------- |
| Precondition | Smart TV is on, streaming services are configured, internet connection is active |
| Post condition | User successfully accesses and enjoys media content, potentially with remote participants |
| Nominal Scenario | 1. User requests content through voice: "DORA, find something to watch"<br>2. System analyzes user preferences and viewing history<br>3. System presents personalized content recommendations<br>4. User selects content through voice commands<br>5. System launches appropriate streaming service and content<br>6. User controls playback through voice commands<br>7. System monitors engagement to improve future recommendations |
| Variants | - Specific content request: "Play the news" or "Find a gardening documentary"<br>- Shared viewing session: Synchronizing content with remote family member<br>- Voice commentary: Enabling conversation during synchronized viewing<br>- Content exploration: Browsing by genre, topic, or mood |
| Exceptions | - Content not found: System suggests alternatives<br>- Service unavailable: System suggests content from available services<br>- Voice control confusion: System provides on-screen guidance |

#### Scenario 5.1: Shared Media Viewing with Family

| Scenario 5.1 | User participates in shared viewing experience |
| :----------: | :------------------------------------------- |
| Precondition | Smart TV is on, video calling and streaming services are configured |
| Post condition | Shared viewing session is successfully completed |
| Step# | Description |
| 1 | Maria receives notification: "Paolo is inviting you to watch a show together. Would you like to join?" |
| 2 | Maria responds: "Yes, I'll join him" |
| 3 | System initiates video call connection with Paolo |
| 4 | System splits the TV screen with Paolo's video feed in corner and main area for content |
| 5 | System announces: "Paolo suggests watching 'The Crown' Season 4 Episode 3. Is this okay?" |
| 6 | Maria confirms: "Yes, that sounds good" |
| 7 | System synchronizes streaming content between both participants |
| 8 | System begins playback simultaneously for both viewers |
| 9 | During viewing, Maria says: "DORA, pause" to comment on a scene |
| 10 | System pauses content for both viewers and highlights the video call portion |
| 11 | After discussion, Maria says: "DORA, continue" |
| 12 | System resumes synchronized playback |
| 13 | When episode ends, system asks: "Would you like to watch the next episode?" |
| 14 | Maria and Paolo both need to agree to continue or end session |
| 15 | Upon ending, system saves watching progress and terminates shared session |

..

# Glossary

![UML Class Diagram](images/UML_Class_Diagram.png)

This class diagram defines the key concepts and their relationships in the DORA system. The diagram shows the inheritance hierarchy of different modules, the association between users and system components, and the relationships between physical devices, health metrics, and alerts.

## Key Terms and Concepts

| Term | Definition |
| :--- | :--------- |
| **Voice User Interface (VUI)** | The primary interaction method for DORA, allowing users to control the system and receive information through spoken commands and responses rather than traditional graphical interfaces. |
| **Smart Home** | A home equipped with internet-connected devices that enable remote monitoring and management of appliances and systems. |
| **Home Assistant** | The open-source home automation platform that serves as the foundation for DORA, capable of integrating various devices and services. |
| **Internet of Things (IoT)** | The network of physical objects embedded with sensors, software, and connectivity that enables them to connect and exchange data. |
| **Wearable Device** | A portable technology worn on the body that monitors physical parameters such as movement, heart rate, or temperature. |
| **Fall Detection** | The capability to automatically identify when a person has fallen using sensors that detect sudden changes in acceleration, orientation, and impact. |
| **Environmental Hazard** | Potentially dangerous conditions in the home environment such as gas leaks, smoke, excessive heat/cold, or water leaks. |
| **Cognitive Exercise** | Activities designed to maintain or improve mental functions like memory, attention, problem-solving, and language skills. |
| **Remote Monitoring** | The capability to observe and assess a user's wellbeing, environment, or activities from a distance using connected sensors and devices. |
| **Tele-assistance** | Remote support provided by a human operator to assist with technical issues, provide companionship, or coordinate emergency response. |
| **User Profile** | A collection of personalized settings, preferences, health parameters, and behavioral patterns unique to each older adult using the system. |
| **Alert Protocol** | A predefined sequence of actions the system takes in response to detected emergencies or concerning situations, including whom to notify and how. |
| **Activity Pattern** | The system's learned understanding of a user's normal daily activities, used to detect potentially concerning deviations. |
| **Health Metric** | Quantifiable measurements of physical parameters that indicate health status, such as heart rate, blood pressure, blood glucose, and sleep quality. |
| **Shared Viewing** | A feature allowing synchronous media consumption between the older adult and remote family members, combined with video communication. |
| **Voice Assistant** | Commercial voice recognition and response technology integrated into DORA (e.g., Google Assistant, Amazon Alexa) that handles natural language processing. |
| **Android TV** | The operating system for Smart TVs that runs DORA's visual interface and cognitive applications. |
| **System Module** | One of the four functional blocks of DORA: Home Safety, Health Monitoring, Smart-TV Interaction, or Tele-assistance. |
| **Caregiver App** | Mobile application used by family caregivers to receive alerts, monitor the older adult's wellbeing, and communicate through the DORA system. |
| **Local Server** | The on-premises computing device that processes data locally to ensure functionality during internet outages and protect privacy. |


# System Design

# System Design

The DORA system follows a layered architecture that integrates various hardware components, software services, and user interfaces into a cohesive platform centered around voice interaction for older adults.

## Architectural Layers

### 1. Device Layer
- **Hardware Components**: This layer includes all physical devices that interact with the environment and the user:
  - Voice assistant devices (smart speakers)
  - Environmental sensors (motion, temperature, gas, smoke, water, door/window)
  - Wearable devices (smartwatch, medical sensors)
  - Smart TV (Android TV-based)
  - Smart doorbell and cameras
  - Smart plugs and lighting controls
  - Local server (for processing and storage)

### 2. Integration Layer
- **Home Assistant Core**: The central integration platform that connects all devices:
  - Device drivers and protocols (Zigbee, Z-Wave, Wi-Fi, Bluetooth)
  - State management and device coordination
  - Event processing and automation rules
  - Local API for inter-component communication

### 3. Service Layer
- **Functional Modules**: The four main service blocks implementing DORA's capabilities:
  - **Home Safety Module**:
    - Fall detection service
    - Environmental monitoring service
    - Security management service
    - Emergency response coordination
  - **Health Monitoring Module**:
    - Vital signs monitoring service
    - Health data analysis service
    - Medication management service
    - Healthcare provider integration
  - **Smart-TV Interaction Module**:
    - Cognitive games service
    - Video communication service
    - Media content management service
    - Calendar and reminder service
  - **Tele-assistance Module**:
    - Remote operator interface
    - Video call management service
    - Emergency coordination service
    - Activity suggestion service

### 4. Intelligence Layer
- **AI and Analytics**: Advanced processing components that enable DORA's adaptive behavior:
  - Voice recognition and processing
  - User behavior pattern learning
  - Anomaly detection
  - Health trend analysis
  - Personalization engine

### 5. Interface Layer
- **User Interfaces**: How users interact with the system:
  - Primary Voice User Interface (VUI)
  - Smart TV visual interface
  - Caregiver mobile/web application
  - Healthcare provider portal
  - System administration interface

### 6. Security and Privacy Layer
- **Protection Mechanisms**: Cross-cutting concerns that apply to all components:
  - Data encryption (at rest and in transit)
  - Authentication and authorization
  - Audit logging
  - Privacy controls
  - Regulatory compliance

## Data Flow

1. **Input Collection**:
   - User voice commands are captured by microphones
   - Environmental data is collected from sensors
   - Health metrics are gathered from wearables
   - Video input comes from cameras and Smart TV

2. **Local Processing**:
   - Voice commands are processed by the voice assistant
   - Sensor data is analyzed by the local server
   - Rules engine evaluates conditions against thresholds
   - Pattern recognition identifies anomalies

3. **Action Determination**:
   - System decides appropriate responses based on input
   - Urgent situations trigger alert protocols
   - Routine interactions follow standard workflows
   - AI enhances decisions based on learned preferences

4. **Response Execution**:
   - Voice responses are delivered through speakers
   - Visual information is displayed on Smart TV
   - Notifications are sent to appropriate contacts
   - Actions are taken on connected devices (lights, locks, etc.)

5. **Data Persistence**:
   - Critical information is stored locally for privacy
   - Non-sensitive data is synchronized to cloud when appropriate
   - Historical patterns are preserved for trend analysis
   - Logs are maintained for audit and improvement

## Fault Tolerance and Reliability

The system implements multiple layers of redundancy and fallback mechanisms:

1. **Local Operation Mode**: 
   - Core safety functions operate without internet connectivity
   - Local caching ensures continuity during cloud service disruptions
   - Prioritized functions receive backup power during outages

2. **Degraded Service Mode**:
   - If specific components fail, the system continues with reduced functionality
   - Critical alerts can be routed through alternative communication channels
   - Simple voice commands remain functional even when advanced features are unavailable

3. **Monitoring and Self-healing**:
   - System continuously monitors component health
   - Automatic restart attempts for failed services
   - Notifications to system administrators for persistent issues
   - Periodic data integrity checks

4. **Manual Override**:
   - Physical controls exist for critical functions in case of voice system failure
   - Emergency call button works independently of main system
   - Caregiver app can remotely restart system components if needed

# Deployment Diagram

![DORA System Deployment](images/UML_Deployment_Diagram.png)

This diagram illustrates the physical arrangement of DORA components, showing how different devices and services interact within the user's home environment and connect to external systems. It depicts the local home network containing the server, smart TV, wearable devices, IoT sensors, and voice assistant components, as well as their connections to cloud services and external stakeholders.

## Physical Component Deployment

### User Home Environment
- **Smart Speakers**: Strategically placed in main living areas (living room, bedroom, kitchen, bathroom)
  - Voice input/output capabilities
  - Connection: Wi-Fi to local network
  - Purpose: Primary voice interface points

- **Smart TV**: Located in the primary living area
  - Android TV operating system
  - Connection: Wi-Fi/Ethernet to local network
  - Purpose: Visual interface, cognitive games, video communication

- **Local Server**: Secured location within the home
  - Home Assistant OS
  - Connection: Ethernet to local network
  - Purpose: Local processing, data storage, system coordination
  
- **IoT Sensors**: Distributed throughout the home
  - Environmental sensors (temperature, humidity, gas, smoke, water)
  - Motion and presence sensors
  - Door/window sensors
  - Connection: Zigbee/Z-Wave to central hub or Wi-Fi to local network
  - Purpose: Environmental monitoring and activity detection

- **Smart Doorbell/Cameras**: Entry points and key monitoring areas
  - Video and audio capabilities
  - Connection: Wi-Fi to local network
  - Purpose: Security monitoring and visitor identification

- **Wearable Devices**: Worn by the older adult
  - Health sensors (heart rate, fall detection, etc.)
  - Connection: Bluetooth to local hub or Wi-Fi to local network
  - Purpose: Health monitoring and emergency detection

- **Smart Plugs/Switches**: Connected to key appliances and lighting
  - Power control capabilities
  - Connection: Zigbee/Z-Wave or Wi-Fi
  - Purpose: Remote control of home environment

- **Network Infrastructure**:
  - Router with backup connectivity option (e.g., cellular failover)
  - Local network segregation for security
  - Battery backup for critical networking components
  - Purpose: Reliable connectivity for all system components

### External Components
- **Cloud Services**:
  - Voice assistant processing (Google, Amazon)
  - Data backup and synchronization
  - Software updates
  - Connection: Internet from user's home
  - Purpose: Advanced processing and service integration

- **Caregiver Devices**:
  - Mobile phones/tablets running caregiver app
  - Web browsers accessing caregiver portal
  - Connection: Internet to cloud services
  - Purpose: Remote monitoring and communication

- **Healthcare Provider Systems**:
  - Electronic Health Record integration
  - Provider portals
  - Connection: Secure API to cloud services
  - Purpose: Medical data sharing and telehealth

- **Remote Operator Workstations**:
  - Computers with specialized operator interface
  - Professional headsets
  - Connection: Secure connection to cloud services
  - Purpose: Tele-assistance and emergency coordination

## Communication Pathways

1. **Internal Home Communication**:
   - Local Wi-Fi network for high-bandwidth devices
   - Zigbee/Z-Wave mesh network for low-power sensors
   - Bluetooth for personal wearable devices
   - Wired Ethernet for critical infrastructure

2. **External Communication**:
   - Broadband internet as primary connection
   - Optional cellular backup for critical alerts
   - Encrypted VPN for sensitive data transmission
   - WebRTC for video communication

3. **Failure Handling**:
   - Local mesh network maintains partial functionality during internet outage
   - Critical alerts can be sent via SMS if internet is unavailable
   - Local processing continues for safety functions regardless of connectivity