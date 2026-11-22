# Usulan firestore.rules: kelas praktikum dan pindah kelas

Untuk: Yoas (pemegang `firestore.rules`). Dari: Annis (PIC B).

Fitur yang butuh aturan ini:

- Praktikan memilih kelas (A1–F2) satu kali saat daftar atau di Profil, disimpan di `users/{uid}.kelas`.
- Pindah kelas lewat koleksi baru `pengajuanKelas/{uid}`. Hanya asisten yang memegang praktikan itu
  (tercantum di `asistenIds`) yang boleh memutuskan. Bila diterima, asisten mengganti `users/{uid}.kelas`.

Tanpa aturan ini, koleksi `pengajuanKelas` ditolak semua (default deny), dan asisten tidak bisa
mengganti kelas praktikan.

## 1. Ganti aturan `update` di `match /users/{uid}`

```
      // Pemilik: role tidak boleh diubah, dan kelas hanya boleh diisi sekali
      // (pindah kelas harus lewat pengajuanKelas).
      // Asisten pemegang praktikan: hanya field kelas, sesuai pengajuan pindah kelas miliknya.
      allow update: if signedIn() && (
        (request.auth.uid == uid
          && request.resource.data.role == resource.data.role
          && (!('kelas' in resource.data)
              || request.resource.data.get('kelas', null) == resource.data.kelas))
        || (isAsisten()
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['kelas'])
          && request.auth.uid in get(/databases/$(database)/documents/pengajuanKelas/$(uid)).data.asistenIds
          && request.resource.data.kelas == get(/databases/$(database)/documents/pengajuanKelas/$(uid)).data.kelasBaru)
      );
```

## 2. Tambah blok baru (misalnya sebelum `match /notifications/{notificationId}`)

```
    // Koleksi Pengajuan Pindah Kelas (PIC B — Annis)
    // ID dokumen = uid praktikan; satu pengajuan terbaru per praktikan.
    match /pengajuanKelas/{uid} {
      allow read: if signedIn() && (
        request.auth.uid == uid
        || (isAsisten() && (resource == null || request.auth.uid in resource.data.asistenIds))
      );

      allow create: if signedIn() && request.auth.uid == uid
        && request.resource.data.userId == uid
        && request.resource.data.status == 'menunggu'
        && request.resource.data.kelasBaru is string
        && request.resource.data.asistenIds is list;

      allow update: if signedIn() && (
        // Praktikan mengajukan lagi setelah pengajuan sebelumnya diputuskan
        (request.auth.uid == uid
          && resource.data.status != 'menunggu'
          && request.resource.data.userId == uid
          && request.resource.data.status == 'menunggu'
          && request.resource.data.kelasBaru is string
          && request.resource.data.asistenIds is list)
        // Asisten pemegang memutuskan pengajuan yang masih menunggu
        || (isAsisten()
          && request.auth.uid in resource.data.asistenIds
          && resource.data.status == 'menunggu'
          && request.resource.data.status in ['diterima', 'ditolak']
          && request.resource.data.diff(resource.data).affectedKeys()
               .hasOnly(['status', 'diputuskanOleh', 'diputuskanAt']))
      );

      allow delete: if false;
    }
```

## Catatan

- `asistenIds` diisi aplikasi praktikan dari sesi yang mencantumkannya. Aturan tidak bisa
  memeriksa daftar itu terhadap koleksi sessions, jadi praktikan secara teori bisa menulis
  uid asisten lain. Untuk skala tugas ini dianggap cukup.
- Keputusan asisten menulis `pengajuanKelas` dan `users` dalam satu batch; `get()` membaca
  dokumen pengajuan sebelum batch, dan `kelasBaru`/`asistenIds` memang tidak berubah saat diputuskan.
- Setelah diubah, aturan perlu di-publish lewat Firebase Console (Firestore > Rules) atau
  `firebase deploy --only firestore:rules`.
