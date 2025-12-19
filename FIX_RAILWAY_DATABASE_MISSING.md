# Fix: Railway Database Not Found (P1001 Error)

## Problem

Your backend keeps crashing with:
```
Error: P1001: Can't reach database server at `postgres.railway.internal:5432`
```

This means **no PostgreSQL database exists** in your Railway project.

## Solution: Add PostgreSQL Database

### **Step 1: Add PostgreSQL Service**

1. Go to **https://railway.app**
2. Select your project
3. Click **"+ New"** button (top right)
4. Select **"Database"**
5. Choose **"PostgreSQL"**
6. Click **"Add PostgreSQL"**

Railway will create a new PostgreSQL service in your project.

### **Step 2: Link Database to Backend**

Railway should automatically create a `DATABASE_URL` variable for your backend service. Let's verify:

1. Click on your **backend service**
2. Go to **"Variables"** tab
3. Check if `DATABASE_URL` exists

**If DATABASE_URL exists:**
- It should look like: `postgresql://postgres:password@postgres.railway.internal:5432/railway`
- ✅ You're good! Skip to Step 3.

**If DATABASE_URL is missing:**
1. Go back to your PostgreSQL service
2. Click **"Variables"** tab
3. Find the `DATABASE_URL` variable
4. Copy its value
5. Go to your backend service → **"Variables"** tab
6. Click **"+ New Variable"**
7. Name: `DATABASE_URL`
8. Value: (paste the copied value)
9. Click **"Add"**

### **Step 3: Verify Connection**

After adding the database:

1. Railway will automatically redeploy your backend
2. Wait 2-3 minutes for deployment
3. Check the **logs** in your backend service
4. Look for:
   ```
   ✅ Database is ready
   ✅ Database connection established
   🚀 Server running on http://0.0.0.0:5000
   ```

### **Step 4: Test Health Check**

Once deployed, test the connection:

```bash
# Replace with your Railway backend URL
curl https://your-backend.up.railway.app/health
```

**Expected response:**
```json
{
  "status": "ok",
  "database": {
    "status": "connected",
    "error": null
  }
}
```

## Alternative: Use Railway CLI

If you prefer using the CLI:

```bash
# Navigate to backend directory
cd backend

# Link to your Railway project (if not already linked)
railway link

# Add PostgreSQL
railway add

# Select "PostgreSQL" from the list

# Deploy
railway up
```

## Troubleshooting

### Issue: "DATABASE_URL not found"

**Solution:** Manually set it in Railway dashboard:
1. Backend service → Variables → + New Variable
2. Name: `DATABASE_URL`
3. Value: Get from PostgreSQL service variables
4. Save and redeploy

### Issue: "Can't connect to postgres.railway.internal"

**Solution:** Ensure database and backend are in the **same Railway project**.
- If database is in a different project, either:
  - Move backend to that project, OR
  - Use the public DATABASE_URL (less secure)

### Issue: Database takes too long to start

**Solution:** The `wait-for-db.js` script retries for 60 seconds (30 attempts × 2 seconds).
- If it still fails, check Railway dashboard for database status
- Database might be stopped or failed to provision

### Issue: "Connection refused" or "timeout"

**Solution:** Check Railway service status:
1. Go to PostgreSQL service
2. Check if it's running (should have green dot)
3. If stopped, click "Deploy" to restart it

## Verification Checklist

✅ PostgreSQL service added to Railway project  
✅ PostgreSQL service is running (green dot in dashboard)  
✅ DATABASE_URL variable exists in backend service  
✅ DATABASE_URL points to `postgres.railway.internal:5432`  
✅ Backend and database are in the same Railway project  
✅ Backend deployment successful (no P1001 errors in logs)  
✅ `/health` endpoint returns `"database": {"status": "connected"}`  

## What Railway Should Look Like

Your Railway project should have **at least 2 services**:
1. **Backend** - Your Node.js/Express API
2. **PostgreSQL** - Your database

You might also have:
3. **Frontend** - Your React app (optional)

## Cost Note

Railway PostgreSQL:
- **Hobby Plan**: $5/month for PostgreSQL + usage-based compute
- **Free Trial**: 500 hours compute + $5 credit (enough to test)

If you're worried about cost, Railway will pause services when not in use (hobby plan).

## Next Steps

After database is connected:
1. Test photo upload functionality
2. Monitor memory usage (should be stable with our fixes)
3. Check `/health` endpoint periodically
4. Review logs for any errors

---

**Need more help?** Check Railway docs: https://docs.railway.app/databases/postgresql
