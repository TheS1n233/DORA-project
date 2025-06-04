# DORA Technology Stack

## Backend Development Frameworks

### Primary Language: Python

#### FastAPI (recommended)
- High performance async framework
- Automatic API documentation
- Built-in validation and serialization
- Excellent for microservices

#### Flask (alternative)
- Lightweight and flexible
- Large ecosystem
- Good for simple services

#### Django REST Framework (for complex services)
- Battery-included framework
- Admin interface
- ORM included

### Secondary Language: Node.js

#### Express.js
- Minimal and flexible
- Large middleware ecosystem
- Good for real-time applications

#### Fastify
- High performance
- Schema-based validation
- Plugin architecture

#### NestJS
- Enterprise-grade framework
- TypeScript support
- Microservice decorators

### Performance-Critical Services: Go

#### Gin
- High performance HTTP framework
- Minimal memory footprint
- Excellent for device management

#### Fiber
- Express-inspired Go framework
- Very fast performance
- Good for high-throughput services

---

## Database Technologies

### Relational Database

#### PostgreSQL 13+
- ACID compliance
- JSON support
- Excellent performance
- Strong ecosystem
- ARM64 support

### Time-Series Database

#### InfluxDB 2.0+
- Optimized for time-series data
- Built-in data retention
- Flux query language
- ARM64 compatible
- Perfect for health/IoT data

### Cache & Session Store

#### Redis 6+
- In-memory data structure store
- Pub/Sub messaging
- Session management
- Rate limiting
- WebSocket session handling

### Document Database

#### MongoDB 5+
- Flexible schema
- Aggregation pipeline
- GridFS for file storage
- Change streams
- Good for content management

---

## Security & Authentication

### Custom Python Implementation
- Based on thesis research
- FastAPI integration
- Policy engine
- Session management
- S×C enforcement

### Authentication & JWT

#### PyJWT (Python)
- JSON Web Token implementation
- Algorithm support
- Secure token handling

#### Auth0 (Alternative SaaS)
- Complete identity platform
- Multi-factor authentication
- Enterprise features

### Encryption & Security

#### cryptography (Python)
- Modern cryptographic library
- AES encryption
- Certificate handling

#### HashiCorp Vault
- Secret management
- Dynamic secrets
- Certificate authority

---

## Voice-First Interaction Layer  
| Component | Preferred Option(s) | Rationale |
|-----------|---------------------|-----------|
| Wake-word Engine | Hey, Dora | Offline, low-power activation |
| Speech-to-Text | Google Assistant SDK · Rhasspy (offline) | Multilingual, elderly-speech tuning |
| NLU / Intent | Rasa · spaCy | Local deployment, intent confidence |
| Text-to-Speech | eSpeak-NG · pyttsx3 | Runs on ARM, adjustable rate |
| Dialogue State | Redis Streams | Lightweight context persistence |

---

## Voice Processing & AI

### Speech Recognition

#### Rhasspy (Recommended)
- Privacy-focused
- Offline processing
- Customizable wake words
- Home Assistant integration
- ARM64 support

#### Mycroft (Alternative)
- Open source voice assistant
- Skills framework
- Natural language processing

### Text-to-Speech

#### pyttsx3 (Python)
- Cross-platform TTS
- Voice customization
- Offline processing

#### espeak-ng
- Lightweight TTS engine
- Multiple language support
- ARM64 compatible

### Natural Language Processing

#### spaCy
- Industrial-strength NLP
- Pre-trained models
- Named entity recognition
- Intent classification

#### Hugging Face Transformers
- State-of-the-art models
- Easy integration
- Elderly-optimized models

---

## Wearables & Biometric Sensing  
- Continuous-glucose monitor
- Single-lead ECG chest strap
- SpO₂ / temperature smart ring
- Electro-dermal-activity wristband
- 6-axis fall-detection accelerometer
- **Data path:** Bluetooth LE → MQTT Bridge → gRPC stream
- **Schema:** FHIR *Observation* resources for clinical sharing

---

## Video & Real-time Communication

### Video Calling

#### Jitsi Meet
- Open source video conferencing
- WebRTC based
- Self-hosted option
- Mobile and TV apps
- Healthcare compliant

#### WebRTC Libraries
- Direct peer-to-peer communication
- Low latency
- Browser support
- Mobile integration

### Real-time Communication

#### Socket.IO
- Real-time bidirectional communication
- Fallback mechanisms
- Room management
- Cross-platform support

#### WebSocket (native)
- Low-level WebSocket implementation
- Full control
- High performance

---

## IoT & Device Management

### Home Automation Integration

#### Home Assistant
- Extensive device support
- Local processing
- RESTful API
- WebSocket API
- Add-on ecosystem

#### OpenHAB (Alternative)
- Vendor-neutral platform
- Rule engine
- Extensive bindings

### IoT Communication Protocols

#### MQTT (Eclipse Mosquitto)
- Lightweight messaging
- Publish/Subscribe pattern
- Quality of Service levels
- IoT standard protocol

#### Zigbee/Z-Wave Integration
- Smart home protocols
- Mesh networking
- Low power consumption

### Smart-Safety Devices  
- Indoor RGB-IR camera + MediaPipe Pose fall detection
- Smart doorbell with two-way VoIP & face whitelist/blacklist
- Gas, smoke & water-leak sensors (LoRa-WAN)
- Smart plugs with overload & “always-on” current alarms
- Voice-linked pathway lighting for night navigation

---

## Computer Vision

#### OpenCV
- Computer vision library
- Fall detection algorithms
- Motion analysis
- ARM64 optimized

#### MediaPipe
- Google's ML framework
- Pose estimation
- Real-time processing
- Mobile optimized

---

## Monitoring & Observability

### Metrics & Monitoring

#### Prometheus
- Time-series metrics database
- Pull-based architecture
- PromQL query language
- Alert manager integration

#### Grafana
- Visualization platform
- Dashboard creation
- Multi-data source support
- Alerting capabilities

### Logging

#### ELK Stack
- Elasticsearch (search & analytics)
- Logstash (log processing)
- Kibana (visualization)
- Beats (data shippers)

#### Loki (Alternative)
- Prometheus-style logs
- Label-based indexing
- Lower resource usage

### Distributed Tracing

#### Jaeger
- End-to-end tracing
- Performance monitoring
- Service dependency mapping
- OpenTracing compatible

---

## Evaluation & Testing Tooling
- **Questionnaires:** SUS · NASA-TLX · WHOQOL-OLD (pre/post)
- **Caregiver Feedback Web App:** Flutter + push prompts
- **Load & chaos:** Locust and k6 (“24 h peak” & “fall-storm” scenarios)
- **Dashboards:** Prometheus → Grafana namespace “DORA-Eval”

---

## Message Queue & Communication

### Message Brokers

#### Redis Pub/Sub
- Simple publish/subscribe
- Real-time messaging
- Pattern-based subscriptions
- Low latency

#### RabbitMQ
- Robust message broker
- Multiple messaging patterns
- Message durability
- Management interface

#### Apache Kafka (for high volume)
- Distributed streaming platform
- High throughput
- Event sourcing

---

## Testing Frameworks

### Python Testing

#### pytest
- Powerful testing framework
- Fixture support
- Plugin ecosystem
- Async testing support

#### pytest-asyncio
- Async test support
- FastAPI testing

#### httpx
- Async HTTP client
- API testing

### Load Testing

#### Locust
- Python-based load testing
- Web UI
- Distributed testing
- Realistic user simulation

#### k6
- JavaScript-based testing
- Cloud and on-premise
- CI/CD integration

---

## CI/CD & DevOps

### CI/CD Platforms

#### GitHub Actions
- Integrated with GitHub
- Matrix builds
- Extensive marketplace
- ARM64 runners

#### GitLab CI/CD
- Built-in CI/CD
- Docker registry
- Auto DevOps

#### Jenkins
- Self-hosted option
- Extensive plugin ecosystem
- Pipeline as code

### Infrastructure as Code

#### Docker Compose
- Multi-container applications
- Environment management
- Simple orchestration

#### Ansible
- Configuration management
- Application deployment
- Raspberry Pi automation

#### Terraform (for cloud)
- Infrastructure provisioning
- Multi-cloud support
- State management

---

## Frontend Technologies

### Smart TV Application

#### Android TV SDK
- Native Android TV development
- Voice recognition integration
- Leanback UI components
- Remote control support

#### React Native TV
- Cross-platform development
- JavaScript/TypeScript
- Shared codebase

### Caregiver Mobile App

#### React Native
- Cross-platform mobile development
- Native performance
- Large ecosystem
- Hot reloading

#### Flutter
- Cross-platform framework
- Single codebase
- High performance

### Web Dashboard

#### React
- Component-based architecture
- Large ecosystem
- Excellent tooling
- TypeScript support

#### Vue.js
- Progressive framework
- Easy learning curve
- Good documentation

---

## Module ↔ Technology Quick-Map
| Module | Core Technology Cluster |
|--------|-------------------------|
| Home Safety | OpenCV + MediaPipe; LoRa sensors; Home Assistant rules |
| Health Monitoring | BLE CGM; InfluxDB; FastAPI gRPC gateway |
| Smart-TV Interaction | Android TV (Kotlin); WebRTC; React Native TV |
| Tele-assistance | Jitsi Meet; Operator Console (React); Notification Svc |

---

## Recommended Technology Stack Summary

### Core Stack
- **Infrastructure**: Docker + Docker Compose + Kong
- **Backend**: FastAPI (Python) + PostgreSQL + Redis
- **Security**: Custom UCS + PyJWT + cryptography
- **Voice**: Rhasspy + pyttsx3 + spaCy
- **Monitoring**: Prometheus + Grafana + ELK Stack
- **Communication**: Redis Pub/Sub + WebSocket

### Additional Components
- **Time-Series Database**: InfluxDB
- **Document Database**: MongoDB
- **Video Communication**: Jitsi Meet
- **IoT Integration**: Home Assistant + MQTT
- **Computer Vision**: OpenCV + MediaPipe
- **Load Testing**: Locust
- **CI/CD**: GitHub Actions
