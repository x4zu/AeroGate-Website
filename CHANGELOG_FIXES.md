# CHANGELOG_FIXES

Catatan perbaikan bug, terbaru di atas. Cari dulu dengan `grep -n -i "<gejala>" CHANGELOG_FIXES.md` sebelum memperbaiki bug.

### Fix #1 — Canvas 3D kosong: `mergeGeometries` gagal pada topi crowd (indexed vs non-indexed)

| | |
|---|---|
| **Tanggal** | 2026-11-09 |
| **File** | `src/components/three/Crowd.tsx` (`buildBodyGeometries` → `hat`) |
| **Masalah** | Setelah rewrite karakter crowd jadi gaya clay, seluruh scene WebGL blank. Label HTML tetap muncul. Console: 1× error `mergeGeometries() failed with geometry at index 1`, lalu exception `Uncaught` berulang (>25×) di render loop. |
| **Akar** | `hat` menggabungkan `CylinderGeometry` (indexed) dengan `RoundedBoxGeometry` (non-indexed). `mergeGeometries` mengembalikan `null` dan instancedMesh menerima geometry null, sehingga tiap frame throw. Kesalahan sendiri di sesi yang sama dengan rewrite crowd. |
| **Fix** | `CylinderGeometry(...).toNonIndexed()` sebelum merge. `RoundedBoxGeometry` sudah non-indexed (memanggil `toNonIndexed()` di situ hanya memicu warning). |
| **Verifikasi** | Headless Chrome + CDP (`next start`, tunggu 30 s). Sebelum: canvas blank, 25+ exception. Sesudah: 0 error/exception, canvas `1422x804` webgl2 merender terminal, crowd, langit, dan awan di 6 posisi scroll. |
| **Pelajaran** | Sebelum `mergeGeometries`, samakan status index semua input. Geometry dari `three/examples` (RoundedBox) non-indexed, geometry bawaan (Sphere/Cylinder/Capsule) indexed. Verifikasi scene 3D lewat console browser, karena `tsc`/`eslint`/`next build` semuanya lolos untuk bug ini. |
| **Log Keyword** | `mergeGeometries`, `index attribute`, canvas blank, crowd, hat |
| **Deploy** | ✅ LIVE 2026-11-09 — commit `d4b4150`, Vercel production Ready (25 s), aerogate-website.vercel.app |
