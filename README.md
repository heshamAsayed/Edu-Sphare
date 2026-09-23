# Alpha Academy (EduSphere)

A connected educational platform: manages schools/stages/years, courses, video lessons, student progress, payments, and AI features tied to content.

> Workspace folder names: **Backend** = [`EduSphare/`](EduSphare/) · **Frontend** = [`EduSphere-wep/`](EduSphere-wep/)

| Part | Role | Path |
| --- | --- | --- |
| **EduSphare API** | REST API: accounts, site structure, courses, learning, payments, reports, AI | [`EduSphare/`](EduSphare/) |
| **EduSphere Web** | Angular UI for Student / Teacher / Admin | [`EduSphere-wep/`](EduSphere-wep/) |

Detailed guides for each app: [EduSphare README](EduSphare/README.md) · [EduSphere Web README](EduSphere-wep/README.md)

---

## Overview

- A single (.NET) backend serves the web app via REST under `/api/...` with Swagger.
- The frontend talks to the API (locally or hosted), with support for Student / Teacher roles and content management, learning, and payment flows.
- External integrations actually used in the code: **Bunny Stream** (video), **Deepgram** (speech-to-text), **OpenRouter** (AI questions/quiz), **Paymob** (payments).

---

## Tech Stack

### Backend — `EduSphare/`

| Category | Actually used |
| --- | --- |
| Runtime | .NET 9 (`net9.0`) |
| Web | ASP.NET Core (Controllers API + ControllersWithViews) |
| ORM / DB | Entity Framework Core + SQL Server |
| Identity | ASP.NET Core Identity (`IdentityCore` + Roles + EF stores) |
| Auth | JWT Bearer (`Microsoft.AspNetCore.Authentication.JwtBearer`) — Header and/or HttpOnly cookie |
| Mapping | AutoMapper |
| Docs | Swashbuckle (Swagger / SwaggerUI) |
| PDF | QuestPDF (financial reports) |
| Hashing | BCrypt.Net-Core (OTP) |
| Video | Bunny Stream (HTTP client) |
| STT | Deepgram SDK + `BackgroundService` |
| AI | OpenRouter via `HttpClient` (`AiSetting`) |
| Payments | Paymob via `HttpClient` |

The `Whisper.net` package is present in the `.csproj`, but the active transcription path in the code is Deepgram (the Whisper path is commented out as legacy in the controller).

### Frontend — `EduSphere-wep/`

| Category | Actually used |
| --- | --- |
| Framework | Angular 22 |
| HTTP | `@angular/common/http` (`HttpClient` + `provideHttpClient(withFetch())`) — **no axios** |
| State/reactivity | Angular signals / RxJS |
| UI | Bootstrap 5, Font Awesome, particles.js, player.js |
| Tests | Vitest (`ng test`) |
| Folder structure | `core/` · `features/` · `layout/` · `shared/` |

---

## Architecture

### Backend — clear layers (Clean Architecture within a single project)

The layers exist as folders/namespaces inside `EduSphare` (not a separate multi-project solution):

| Layer | Folder | Contents |
| --- | --- | --- |
| **Presentation** | `Web/` | `Controllers/API/*`, Middleware, `Program.cs`, seeder |
| **Application** | `Application/` | Interfaces + service implementations, DTOs, AutoMapper profiles, DI registration |
| **Domain** | `Domain/` | Entities and domain configuration models (e.g. Paymob options) |
| **Infrastructure** | `Infrastructure/` | `ApplicationDbContext` + Migrations, Unit of Work / Repository, external services (AI / Payment / Bunny), Settings |

Registered via extension methods: `AddApplicationServices()` and `AddInfrastructureServices()`.

Note: some Infrastructure registrations reference interfaces defined under `Application` — normal for this style, but the boundaries aren't "100% pure" across every file.

### Frontend

Not Clean Architecture in the four-layer sense. Organized feature-based:

- `core` — API setup, HTTP helpers, and token handling
- `features/*` — services and components per domain (account, courses, learning, …)
- `layout` — screen pages
- `shared` — shared components

---

## Repository Pattern

Present in the Backend only:

- General interface: `Infrastructure/UnitOfWork/DataControll/IRepository<T>`
- Implementation: `Repository<T>` on top of `ApplicationDbContext` (CRUD + queries + `Include`)
- **Unit of Work**: `IUnitOfWork` / `UOW` exposes repositories for entities (`Users`, `Courses`, `Videos`, …) and `SaveChangesAsync` / transactions
- Registration: `AddScoped(typeof(IRepository<>), typeof(Repository<>))` and `AddScoped<IUnitOfWork, UOW>()`
- Usage: Application services inject `IUnitOfWork` for data access instead of dealing directly with the DbContext in most paths

---

## Design Patterns

Patterns confirmed from the code only:

| Pattern | Where |
| --- | --- |
| **Repository + Unit of Work** | `Infrastructure/UnitOfWork/` |
| **Dependency Injection** | ASP.NET Core DI + `ServiceContainer` in Application/Infrastructure; Frontend via `providedIn: 'root'` |
| **Options pattern** | `IOptions<T>` for Bunny / Deepgram / AI / Paymob / Attachments |
| **Background worker + in-memory queue** | `VideoTranscriptionQueue` (`Channel`, registered as Singleton) + `BackgroundTranscriptionService` (`BackgroundService`) |
| **Typed / named HttpClients** | Bunny upload, OpenRouter AI, Deepgram, Paymob |
| **Middleware** | `CourseLessonBridgeMiddleware` |
| **Design-time factory** | `ApplicationDbContextFactory` (`IDesignTimeDbContextFactory`) for EF tooling only |

Not present / not clear from the code:

- **CQRS / MediatR** — not used
- **Runtime business-object factory** — unclear (beyond design-time EF and `IHttpClientFactory`)
- Any other patterns not listed above — not assumed

---

## Frontend–Backend Integration

| Item | What the code actually does |
| --- | --- |
| API type | **REST** — Controllers with `[Route("api/[controller]")]` (e.g. `/api/Account`, `/api/Courses`, `/api/Learning`, …) |
| GraphQL | Not present |
| HTTP client | Angular **HttpClient** (built on fetch via `withFetch()`). Some logout calls use `fetch` directly |
| Base URL | `src/app/core/config/api-config.ts` → currently `https://edusphare.runasp.net/api` |
| Auth | JWT: the API sets the token in an **HttpOnly cookie** at login; most web requests send `withCredentials: true`. The API also accepts `Authorization: Bearer`. The video upload path has extra support for a Bearer token from `localStorage` under the key `AlphaGen_Token` |
| CORS | `AngularPolicy` policy for `http://localhost:4200` and `https://heshamasayed.github.io` with `AllowCredentials` |

---

## How to Run

Full local run:

1. Start the API first (`EduSphare`).
2. Start the web app (`EduSphere-wep`).
3. Open `http://localhost:4200` — make sure `API_CONFIG.BASE_URL` matches your local API address if needed.

### Backend

Requirements: .NET SDK 9 + SQL Server (LocalDB / Express / an available instance).

```bash
cd EduSphare
dotnet restore
dotnet ef database update
dotnet run
```

Put local values in `appsettings.Development.json` or User Secrets (Connection string, JWT, Bunny, Deepgram, AI, Paymob). Details and tables in [EduSphare/README.md](EduSphare/README.md).

Swagger appears at the `dotnet run` address (usually the host root). In Development, `POST /api/development/seed-sample-data` can be used to seed sample data.

### Frontend

```bash
cd EduSphere-wep
npm install
ng serve
```

Then open `http://localhost:4200/`. Build/test commands are in [EduSphere-wep/README.md](EduSphere-wep/README.md).

### Shared notes

- Never commit API keys or passwords to source control.
- Run the API before using web features that depend on live data.
- The `EduSphere.Playwright/` and `ScreenRecorder/` folders are helper tools (E2E / screen recording), not part of the core platform runtime.

---

## Integrations

| Service | Used in the code for |
| --- | --- |
| **Paymob** | Payment gateway for purchasing/enrolling in courses |
| **Deepgram** | Speech-to-text for learning videos (background) |
| **OpenRouter** | Generating attention questions / video quiz |
| **Bunny Stream** | Uploading and streaming course videos |
