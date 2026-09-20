# EduSphare

EduSphare is an Arabic-first education platform for organizing schools, stages, academic years, courses, teachers, and student learning. It gives education teams one backend for course delivery, protected access, and payments instead of managing these workflows separately.

## Quick Start

Requirements: .NET SDK 9.0 and SQL Server (LocalDB, SQL Express, or a reachable SQL Server instance).

```bash
git clone <your-repository-url>
cd EduSphare
dotnet restore
dotnet ef database update
dotnet run
```

Create `appsettings.Development.json` (or use .NET user secrets) with your local values before running:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\MSSQLLocalDB;Database=EduSphareDb;Trusted_Connection=True;TrustServerCertificate=True"
  },
  "Jwt": {
    "Key": "replace-with-a-long-random-development-key",
    "Issuer": "EduSphare",
    "Audience": "EduSphareUsers"
  },
  "BunnySetting": {
    "AccessKey": "your-bunny-access-key",
    "LibraryID": "your-bunny-library-id"
  },
  "DeepgramSetting": {
    "ApiKey": "your-deepgram-api-key"
  },
  "AiSetting": {
    "AccessKey": "your-ai-provider-api-key"
  },
  "Paymob": {
    "SecretKey": "your-paymob-secret-key",
    "PublicKey": "your-paymob-public-key",
    "HmacSecret": "your-paymob-hmac-secret"
  }
}
```

The app exposes Swagger at the URL printed by `dotnet run` (typically `https://localhost:<port>/`).

## Usage

Apply database migrations and start the API:

```bash
dotnet ef database update
dotnet run --environment Development
```

On an empty development database, add the sample catalog through Swagger or:

```bash
curl -X POST https://localhost:<port>/api/development/seed-sample-data
```

The sample seed endpoint is available only in the `Development` environment.

## Configuration

| Variable | Description | Default |
| --- | --- | --- |
| `ConnectionStrings__DefaultConnection` | SQL Server connection string | Required |
| `Jwt__Key` | JWT signing key | Required |
| `Jwt__Issuer` | JWT issuer | Required |
| `Jwt__Audience` | JWT audience | Required |
| `BunnySetting__AccessKey` | Bunny Stream API key for video uploads | Required for video features |
| `BunnySetting__LibraryID` | Bunny Stream library ID | Required for video features |
