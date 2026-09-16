# DBU Student Union Platform

A full-stack digital platform for **Debre Berhan University (DBU)** student clubs and Student Union activities.

The platform is designed to make club discovery, membership registration, communication, administration, and student engagement more accessible through a centralized digital system.

## 🌐 Live Platform

**DBU Student Club Connect:**
https://dbu-ss.vercel.app

## 📌 Overview

The DBU Student Union Platform brings multiple Student Union workflows into one web application.

Students can discover available clubs, register for membership, access information, and interact with Student Union services. Administrators and club leaders can manage relevant activities, memberships, announcements, and other workflows.

The project also includes an **AI-powered Student Union assistant** designed to provide students with information based on the platform's current data.

## ✨ Core Features

* 🔐 Student authentication and account management
* 🏫 DBU student club discovery
* 📝 Online club membership registration
* 👥 Membership approval and status management
* 📢 Club announcements
* 📅 Student activities and events
* 👨‍💼 Leadership and administrative management
* 💬 Student communication
* 📩 Feedback and complaint workflows
* 📱 Responsive web interface
* 🔳 QR-based functionality
* 🤖 AI-powered Student Union assistant
* 🗄️ MongoDB-backed application services
* 🔒 Authentication and authorization controls

## 🤖 AI Student Union Assistant

The platform includes a Generative AI assistant intended to help students obtain information about the DBU Student Union.

The assistant can work with information such as:

* Student clubs
* Club membership
* Student Union services
* Leadership information
* Other university-related Student Union data

### AI Safety and Data Validation

AI-generated actions are not trusted blindly.

For example, when a student asks the assistant to join a club, the backend verifies the requested club against authoritative database information before performing the membership operation.

This architecture helps prevent the AI model from independently selecting or inventing a club when performing a database-changing action.

## 🏗️ Project Architecture

```text
final/
└── dbu-student-union21-main/
    │
    ├── project/              # React frontend
    │
    └── backend/              # Node.js / Express backend
        ├── controllers/
        ├── middleware/
        ├── models/
        ├── routes/
        ├── services/
        └── ...
```

## 🛠️ Technology Stack

### Frontend

* React 18
* Vite
* TypeScript
* React Router
* Tailwind CSS
* Supabase Client
* Framer Motion
* Lucide React
* React QR Code
* HTML5 QR Code
* React Hot Toast

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* Google Generative AI
* JWT
* bcryptjs
* Nodemailer
* Helmet
* Express Rate Limit
* Multer
* Node Cron

## 📂 Main Application

The main application is located inside:

```text
dbu-student-union21-main/
```

### Frontend

```text
dbu-student-union21-main/project/
```

### Backend

```text
dbu-student-union21-main/backend/
```

## 🚀 Running Locally

### Prerequisites

Make sure you have:

* Node.js 18 or newer
* npm
* MongoDB
* Required environment variables

### 1. Clone the repository

```bash
git clone https://github.com/addisuyirdaw/final.git
cd final
```

### 2. Start the frontend

```bash
cd dbu-student-union21-main/project
npm install
npm run dev
```

### 3. Start the backend

Open another terminal:

```bash
cd dbu-student-union21-main/backend
npm install
npm run dev
```

## 🔑 Environment Variables

The application requires environment variables for services such as:

* MongoDB
* JWT authentication
* Google Generative AI
* Email services
* Application configuration

**Never commit real credentials or API keys to GitHub.**

Create a local `.env` file in the backend directory and configure the required variables for your environment.

Recommended practice:

```text
backend/
├── .env              # Local secrets — DO NOT COMMIT
└── .env.example      # Placeholder configuration
```

If a credential has ever been exposed publicly, it should be rotated before being used again.

## 🔒 Security

Security is an important part of the platform architecture.

The backend includes mechanisms such as:

* JWT-based authentication
* Password hashing
* Authentication middleware
* Role-based access controls
* Request validation
* Rate limiting
* HTTP security headers
* Ownership checks
* Database validation before sensitive actions
* AI action validation

Production deployments should always keep credentials and private configuration outside source control.

## 🎯 Project Goals

The project aims to:

1. Make DBU student clubs easier to discover.
2. Allow students to register for clubs online.
3. Improve communication between students, clubs, and the Student Union.
4. Digitize repetitive Student Union workflows.
5. Improve access to university student services.
6. Explore responsible applications of AI in university services.
7. Build a scalable digital foundation for future DBU Student Union services.

## 🗺️ Development Roadmap

### Phase 1 — Foundation

* Student authentication
* Club management
* Online membership registration
* Student Union administration

### Phase 2 — Student Services

* Announcements
* Events
* Feedback
* Complaints
* Communication tools
* QR-based functionality

### Phase 3 — AI Integration

* Student Union AI assistant
* Database-grounded retrieval
* AI-assisted club discovery
* Controlled AI actions
* Conversational student support

### Phase 4 — Expansion

Potential future improvements include:

* Better semantic search
* Improved AI retrieval
* Mobile-first improvements
* Advanced analytics
* More Student Union services
* Improved administrative dashboards
* Integration with additional university systems

## 📊 Development Status

🚧 **Active Development**

The platform is still under development. Features, workflows, database structures, and the AI assistant may continue to evolve as the project is tested with DBU students and Student Union workflows.

## 🔗 Project Links

### Live Application

https://dbu-ss.vercel.app

### GitHub Repository

https://github.com/addisuyirdaw/final

### Developer Portfolio

https://addisudev.vercel.app

### GitHub Profile

https://github.com/addisuyirdaw

### LinkedIn

https://www.linkedin.com/in/addisuyirdaw2025

## 👨‍💻 Developer

**Addisu Yirdaw**

Computer Science student at Debre Berhan University and developer of the DBU Student Union Platform.

The project is focused on applying software engineering, database systems, web development, and responsible AI to practical university problems.

## 🤝 Contributions

The project is currently under active development.

Feedback, testing, bug reports, and practical suggestions from DBU students and other contributors are welcome.

## 📄 License

License information can be added when the project's licensing terms are finalized.
