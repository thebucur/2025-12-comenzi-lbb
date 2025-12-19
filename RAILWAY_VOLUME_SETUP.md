# Railway Persistent Volume Setup

## Problem

On Railway, the filesystem is **ephemeral** - on every redeploy, all files in the filesystem are wiped. This means uploaded files (photos, PDFs) are lost on every redeploy.

## Solution: Persistent Volume

A persistent volume is a storage space that persists between redeploys.

## Setup Instructions

### Step 1: Create Persistent Volume via Railway Dashboard (Recommended)

1. Go to https://railway.app
2. Select your project
3. Select the **backend** service (not frontend)

4. Go to the **"Volumes"** tab (or **"Settings" → "Volumes"**)
5. Click **"Add Volume"** or **"Create Volume"**
6. Configure:
   - **Name**: `storage-persistent` (or any descriptive name)
   - **Mount Path**: `/app/storage`
   - **Size**: 2 GB or more (depending on how many photos/PDFs you'll store)

7. Click **"Create"** or **"Add"**

### Step 2: Set Environment Variables

In the backend service, go to **"Variables"** tab and add/update:

```
STORAGE_BASE=/app/storage
UPLOAD_DIR=/app/storage/uploads
PDF_DIR=/app/storage/pdfs
```

**Note**: The code will automatically create `uploads` and `pdfs` subdirectories inside the mounted volume.

### Step 3: Alternative - Setup via Railway CLI

If you prefer using the CLI:

```bash
# Navigate to backend directory
cd backend

# Link to Railway project (if not already linked)
railway link

# Create the persistent volume
railway volume add -m /app/storage

# Set environment variables
railway variables --set "STORAGE_BASE=/app/storage"
railway variables --set "UPLOAD_DIR=/app/storage/uploads"
railway variables --set "PDF_DIR=/app/storage/pdfs"
```

### Step 4: Redeploy

After configuring the volume, redeploy the service:

#### Via Dashboard:
- Click on backend service → **"Deployments"** → **"Redeploy"**

#### Via Git:
- Make an empty commit or minor change and push:
  ```bash
  git commit --allow-empty -m "Configure persistent volume"
  git push
  ```

## Verification

After redeploy, verify the volume is working:

1. Upload a new photo through the application
2. Check Railway logs for storage path messages (you should see `📁 Storage configuration:` with the paths)
3. Perform a redeploy
4. Verify the photo still exists and can be downloaded

## How It Works

- **Development**: Files are stored in local `uploads/` and `pdfs/` directories
- **Production (Railway)**: Files are stored in the persistent volume at `/app/storage/uploads` and `/app/storage/pdfs`
- The code automatically detects the environment and uses the appropriate paths
- Static file serving is configured to serve from the persistent volume paths

## File Structure

```
/app/storage/          (Persistent volume mount point)
├── uploads/          (Photos stored here)
│   ├── [uuid].jpg
│   └── ...
└── pdfs/             (PDFs stored here)
    ├── order-1.pdf
    └── ...
```

## Limitations and Alternatives

### Railway Persistent Volume Limitations:
- Volume is tied to the service (doesn't sync between services)
- Can become expensive for many files
- Size limit depends on your plan
- Single point of failure (if volume is lost, files are lost)

### Alternatives (Recommended for production at scale):

1. **AWS S3** - Scalable, cheap, redundant
2. **Cloudinary** - Automatic image optimization
3. **DigitalOcean Spaces** - S3-compatible, simple
4. **Azure Blob Storage** - Good Azure integration

For cloud storage implementation, consult each service's documentation.

## Troubleshooting

### Volume not mounting

1. Verify the mount path is correct (`/app/storage`)
2. Verify environment variables match the mount path
3. Check logs for mounting errors
4. Ensure the volume is created and attached to the backend service

### Files still disappearing

1. Verify the volume is created and mounted correctly
2. Check logs for the storage paths being used (look for `📁 Storage configuration:`)
3. Ensure code uses environment variables, not hardcoded paths
4. Verify environment variables are set correctly in Railway dashboard

### Cannot access files

1. Verify volume permissions
2. Check that static file endpoints `/uploads` and `/pdfs` are configured correctly in `server.ts`
3. Check logs for 404 errors
4. Verify the files actually exist in the volume (you can check via Railway's file explorer if available)

### Storage paths in logs

On startup, you should see:
```
📁 Storage configuration:
   STORAGE_BASE: /app/storage
   UPLOAD_DIR: /app/storage/uploads
   PDF_DIR: /app/storage/pdfs
```

If you see different paths, check your environment variables.
