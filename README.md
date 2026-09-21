<div align="center">

# 🎓 Alpha Academy

### A connected learning platform for modern education

![Platform](https://img.shields.io/badge/Platform-EduSphere-6C63FF?style=for-the-badge)
![Backend](https://img.shields.io/badge/Backend-.NET%209-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![Frontend](https://img.shields.io/badge/Frontend-Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)

</div>

---

## ✨ Overview

Alpha Academy brings the EduSphere learning experience together in one workspace. It provides a complete flow for managing educational content, supporting learners, and delivering courses through a dedicated web application backed by a secure API.

The workspace contains two connected applications:

| Application | Purpose | Location |
| --- | --- | --- |
| 🛠️ **EduSphare API** | Manages accounts, schools, courses, lessons, learning progress, payments, and platform services. | [`EduSphare/`](EduSphare/) |
| 💻 **EduSphere Web** | The student, teacher, and administrator web experience for browsing and managing learning content. | [`EduSphere-wep/`](EduSphere-wep/) |

## 🚀 Getting Started

For a complete local experience, run both applications:

1. Start the **EduSphare API**.
2. Start the **EduSphere Web** application.
3. Open the web app in your browser and connect using an account from the API environment.

> The web application expects the API to be available locally. Check the web project's configuration if your API uses a different address.

## 🔗 Project Guides

Each application has its own guide with installation instructions, required software, configuration values, and technical details.

| Need help with… | Read this guide |
| --- | --- |
| API setup, database configuration, service keys, and API usage | [Open the EduSphare API guide →](EduSphare/README.md) |
| Web setup, local development, API address, and front-end commands | [Open the EduSphere Web guide →](EduSphere-wep/README.md) |

## 🔐 Shared Development Notes

- Keep API keys, passwords, and local environment settings out of source control.
- Use the project-specific guides for configuration and dependency requirements.
- Run the API before using features in the web application that require live data.

<div align="center">

Built for better learning experiences. 🌟

</div>

## 🔌 Integrations

The platform is integrated with the following services:

| Service | Integration purpose |
| --- | --- |
| **Paymob** | Secure online payment gateway for course purchases. |
| **Deepgram** | Speech-to-text transcription for learning video content. |
| **OpenRouter** | AI-powered features and model access for the platform. |
