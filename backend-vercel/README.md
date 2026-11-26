# HadirKu Backend (Vercel)

Backend HadirKu Sprint 4 — menggantikan Firebase Cloud Functions karena Blaze butuh kartu kredit yang tidak tersedia.

## Jalankan Lokal

```powershell
cd backend-vercel
npm install
# Isi backend-vercel/.env.local dari .env.local.example dulu
npx vercel dev
```

Server jalan di http://localhost:3000. Endpoint tersedia di `/api/midtrans-create`, `/api/midtrans-webhook`, dll.

## Deploy ke Production

```powershell
cd backend-vercel
vercel deploy --prod
```

## Env Vars (set di Vercel Dashboard)

| Nama | Keterangan |
|---|---|
| `MIDTRANS_SERVER_KEY` | Dari dashboard Midtrans Sandbox > Settings > Access Keys |
| `MIDTRANS_CLIENT_KEY` | Boleh dibaca publik; diduplikasi di appConfig/runtime |
| `MIDTRANS_IS_PRODUCTION` | `false` untuk sandbox |
| `FIREBASE_PROJECT_ID` | `hadirku-8aa3e` |
| `FIREBASE_CLIENT_EMAIL` | Dari service-account.json |
| `FIREBASE_PRIVATE_KEY` | Dari service-account.json, biarkan `\n` escaped |
| `CRON_SECRET` | Random 48 char, juga di-set di cron-job.org header |
| `ALLOWED_ORIGIN` | `*` untuk dev, nanti perketat |

## Pattern Autentikasi

Setiap endpoint yang butuh auth pengguna:

```typescript
import { applyCors, AuthError, verifyIdToken } from "../lib/auth";

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const uid = await verifyIdToken(req);
    // ... logic
    return res.status(200).json({ ... });
  } catch (err) {
    if (err instanceof AuthError) return res.status(401).json({ error: err.message });
    return res.status(500).json({ error: (err as Error).message });
  }
}
```

Client aplikasi mengirim token lewat header:

```typescript
const user = auth().currentUser;
const idToken = await user?.getIdToken();
await fetch(`${BASE_URL}/api/midtrans-create`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${idToken}`,
  },
  body: JSON.stringify({ fineId }),
});
```

## Pattern Firestore via Admin SDK

```typescript
import { adminDb } from "../lib/firebase-admin";

const db = adminDb();
const fine = await db.collection("fines").doc(fineId).get();
if (!fine.exists) return res.status(404).json({ error: "Fine tidak ditemukan" });
```

Admin SDK bypass firestore.rules, jadi hati-hati — selalu cek ownership manual sebelum baca/tulis.

## Cron Endpoint (cleanup-sessions)

Dipanggil cron-job.org tiap 6 jam. Pengamanan: header `x-cron-secret` wajib sama dengan env var `CRON_SECRET`.

Test manual:

```powershell
curl -X POST https://hadirku-backend.vercel.app/api/cleanup-sessions `
  -H "x-cron-secret: <nilai CRON_SECRET>"
```

## Catatan untuk Yustinus (SRS4-07)

- File yang perlu kamu isi: `api/midtrans-create.ts`, `api/midtrans-webhook.ts`, `api/refresh-fine-status.ts`
- Semua STUB sudah return dummy response jadi client tidak error saat development
- Pakai `midtrans-client` npm package (`new Snap({ ... })`)
- Signature verification di webhook: `crypto.createHash('sha512').update(orderId + statusCode + grossAmount + serverKey).digest('hex')`

## Catatan untuk Annis (SRS4-04)

- File yang perlu kamu isi: `api/cleanup-sessions.ts`
- Trigger notifikasi (`sesi_dibuka`, `izin_diterima`, dll) **TIDAK** dipindah ke sini — tetap panggil Expo Push dari client aplikasi, pattern sama seperti Sprint 1-3
