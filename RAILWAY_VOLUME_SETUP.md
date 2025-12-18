# Configurare Volum Persistent pe Railway

## Problema

Pe Railway, filesystem-ul este **efemer** - la fiecare redeploy, toate fișierele din sistemul de fișiere sunt șterse. Acest lucru înseamnă că fișierele încărcate (fotografii, PDF-uri) sunt pierdute la fiecare redeploy.

## Soluție: Volum Persistent

Un volum persistent este un spațiu de stocare care persista între redeploy-uri.

## ✅ Configurare Completă

Volumul persistent a fost deja configurat! Detalii:
- **Volum**: `nodejs-volume`
- **Mount Path**: `/app/backend/uploads`
- **Variabile setate**: `UPLOAD_DIR=/app/backend/uploads`, `PDF_DIR=/app/backend/pdfs`

## Pași pentru configurare (dacă trebuie să reconfigurezi)

1. Mergi la https://railway.app
2. Selectează proiectul tău
3. Selectează serviciul **backend** (nu frontend)

### 2. Adaugă Volum Persistent

#### Opțiunea A: Via Railway Dashboard (Recomandat)

1. În serviciul backend, mergi la tab-ul **"Volumes"** sau **"Settings" → "Volumes"**
2. Click pe butonul **"Add Volume"** sau **"Create Volume"**
3. Completează:
   - **Name**: `uploads-persistent` (sau alt nume descriptiv)
   - **Mount Path**: `/app/backend/uploads` (sau `/uploads`)
   - **Size**: 1 GB sau mai mult (în funcție de câte fotografii vei stoca)

4. Click **"Create"** sau **"Add"**

#### Opțiunea B: Via Railway CLI (Folosit deja)

```bash
# Navighează la directorul backend
cd backend

# Link la proiectul Railway (dacă nu e deja link-at)
railway link

# Creează volumul (COMANDĂ FOLOSITĂ DEJA)
railway volume add -m /app/backend/uploads

# Setează variabilele (COMANDĂ FOLOSITĂ DEJA)
railway variables --set "UPLOAD_DIR=/app/backend/uploads"
railway variables --set "PDF_DIR=/app/backend/pdfs"
```

### 3. Verifică Variabilele de Mediu

1. În serviciul backend, mergi la tab-ul **"Variables"**
2. Verifică dacă există variabila `UPLOAD_DIR`
3. Dacă nu există sau este diferită, adaugă/actualizează:
   ```
   UPLOAD_DIR=/app/backend/uploads
   ```
   (sau `/uploads` dacă ai montat volumul acolo)

### 4. Verifică PDF_DIR (opțional)

Dacă dorești să păstrezi și PDF-urile generate persistent, poți crea un volum separat sau folosi același:

```
PDF_DIR=/app/backend/pdfs
```

Sau pentru a folosi același volum:
```
PDF_DIR=/app/backend/uploads
```

### 5. Redeploy

După configurarea volumului, fă un redeploy:

#### Via Dashboard:
- Click pe serviciul backend → **"Deployments"** → **"Redeploy"**

#### Via Git:
- Fă un commit gol sau modificare minoră și push:
  ```bash
  git commit --allow-empty -m "Trigger redeploy for volume setup"
  git push
  ```

## Verificare

După redeploy, poți verifica dacă volumul funcționează:

1. Încarcă o fotografie nouă prin aplicație
2. Verifică log-urile Railway pentru mesajele `[Railway Debug]`
3. Fă un redeploy
4. Verifică dacă fotografia încă există și poate fi descărcată

## Limitări și Alternative

### Limitări Volume Persistent Railway:
- Volumul este legat de serviciu (nu se sincronizează între servicii)
- Poate deveni costisitor pentru multe fișiere
- Limită de dimensiune (depinde de plan)

### Alternative (Recomandate pentru producție):

1. **AWS S3** - Scalabil, ieftin, redundanță
2. **Cloudinary** - Optimizare imagini automată
3. **DigitalOcean Spaces** - Compatibil S3, simplu
4. **Azure Blob Storage** - Integrare bună cu Azure

Pentru implementare cu storage cloud, consultă documentația fiecărui serviciu.

## Troubleshooting

### Volumul nu se montează

1. Verifică că mount path-ul este corect
2. Verifică că variabila `UPLOAD_DIR` corespunde cu mount path-ul
3. Verifică log-urile pentru erori de montare

### Fișierele tot dispăr

1. Verifică că volumul este creat și montat corect
2. Verifică log-urile pentru path-urile încercate
3. Asigură-te că codul folosește `UPLOAD_DIR` și nu path-uri hardcodate

### Nu pot accesa fișierele

1. Verifică permisiunile volumului
2. Verifică că endpoint-ul static `/uploads` este configurat corect în `server.ts`
3. Verifică log-urile pentru erori 404
