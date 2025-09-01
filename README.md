# Class Mood Check-In

A tiny Node/Express app for students to submit **motivation / energy / happiness** plus an optional note.  
**Admin page** shows class averages, a snapshot table, CSV export, and supports **immediate purge**.

## Run locally
```bash
npm install
npm start
```
Visit: 
- Student page: `http://localhost:3000/`
- Admin page: `http://localhost:3000/admin` (set ADMIN_TOKEN before start for a custom PIN)
```bash
# Windows (PowerShell)
$env:ADMIN_TOKEN="MyStrongPin2025!"; npm start
# macOS/Linux
ADMIN_TOKEN="MyStrongPin2025!" npm start
```

## Deploy (e.g. Render)
- Create a new Web Service from this repo
- Build: `npm install`
- Start: `node server.js`
- Add env var: `ADMIN_TOKEN`
