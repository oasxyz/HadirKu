// Inisialisasi Firebase Admin SDK sekali per cold-start function.
// Credential diambil dari env vars (bukan file service-account.json) supaya Vercel
// tidak perlu mengunggah file rahasia ke repo.
//
// Private key di dashboard Vercel ditulis dengan `\n` escaped - helper replace di sini
// mengembalikannya ke newline asli yang dibutuhkan oleh Node crypto.

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function readPrivateKey(): string {
  const raw = process.env.FIREBASE_PRIVATE_KEY;
  if (!raw) {
    throw new Error(
      "FIREBASE_PRIVATE_KEY belum di-set. Isi di dashboard Vercel Settings > Environment Variables.",
    );
  }
  return raw.replace(/\\n/g, "\n");
}

export function initAdmin(): void {
  if (getApps().length > 0) return;
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: readPrivateKey(),
    }),
  });
}

export function adminDb() {
  initAdmin();
  return getFirestore();
}

export function adminAuth() {
  initAdmin();
  return getAuth();
}
