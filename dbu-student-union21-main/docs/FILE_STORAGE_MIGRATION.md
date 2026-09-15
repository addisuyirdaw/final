# File Storage Audit & Migration Plan

## Current Implementation
The application currently handles file uploads via the local filesystem using `multer`.
- **Upload Directories:** `backend/uploads/profiles/`, `backend/uploads/reports/`, `backend/uploads/certificates/`.
- **Database References:** Models (like `User.profileImage`, `ActivityReport.documentUrl`) store relative paths or URLs pointing back to the server's local file system.

## The Production Risk
If the backend is hosted on a cloud provider with an ephemeral file system (like Render, Heroku, or standard Docker containers), **all uploaded files will be permanently deleted every time the server restarts or deploys.**
Currently, a temporary patch is in place (`profileImageData` stores a base64 string backup in the User model to self-heal missing avatars), but this inflates the database significantly and is not scalable for larger documents (like PDFs).

## Recommended Migration Strategy (AWS S3 or Supabase Storage)

To safely migrate file storage off the local disk without disrupting current functionality, follow this phased approach in a future update:

### Phase 1: Integrate Object Storage SDK
1. Add the AWS SDK (or Supabase SDK) to the backend.
2. Create a new utility wrapper `backend/utils/cloudStorage.js` containing upload/delete functions.

### Phase 2: Create a Cloud Multer Storage Engine
1. Replace `multer.diskStorage` in the routes with `multer-s3` (or memory storage that immediately uploads to the cloud).
2. **Impact:** The `req.file.location` will now return a public HTTPS URL (e.g., `https://bucket.aws.com/avatar.jpg`) instead of a local path.

### Phase 3: Database Updates
1. The database models will naturally accept the new cloud URLs since fields like `profileImage` are just strings.
2. (Optional) Run a script to migrate any existing local files from the server disk to the cloud bucket and update existing DB string paths to the new cloud URLs.

### Conclusion
**Do not remove the current local Multer setup until a Cloud bucket is fully provisioned and tested.** The system currently relies heavily on local uploads for avatars and club activity reports.
