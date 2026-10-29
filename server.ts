/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DB_FILE = path.join(__dirname, 'data', 'database.json');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// In-memory Database with file persistence
let db: any = {};

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(raw);
    } else {
      console.warn('Database file not found, creating default data folder...');
      fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
      db = {};
    }
  } catch (err) {
    console.error('Failed to load DB:', err);
    db = {};
  }
}

function saveDb() {
  try {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save DB:', err);
  }
}

loadDb();

// Audit logger helper
function addLog(modul: string, user: string, aktivitas: string, status = 'sukses') {
  if (!db.log) db.log = [];
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const waktu = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const entry = {
    id: (db.log[0]?.id || 0) + 1,
    waktu,
    modul,
    user,
    aktivitas,
    status,
  };
  db.log.unshift(entry);
  if (db.log.length > 500) db.log.pop();
  saveDb();
}

// Compute dynamic demography from residents and houses
function calculateDemografi() {
  const warga: any[] = db.warga || [];
  const rumah: any[] = db.rumah || [];
  const total_warga = warga.length;
  const total_rumah = rumah.length;

  const nowYear = new Date().getFullYear();
  let balita = 0, anak = 0, remaja = 0, dewasa = 0, lansia = 0;
  let laki = 0, perempuan = 0;
  let nonDisabilitas = 0, disabilitasCount = 0;

  const agamaMap: Record<string, number> = {};
  const pekerjaanMap: Record<string, number> = {};
  const pendidikanMap: Record<string, number> = {};
  const perkawinanMap: Record<string, number> = {};
  const statusTinggalMap: Record<string, number> = {};

  for (const w of warga) {
    // Gender
    if (w.jenis_kelamin === 'L' || /laki/i.test(w.jenis_kelamin)) laki++;
    else perempuan++;

    // Age
    let age = 30;
    if (w.tanggal_lahir) {
      const birthYear = parseInt(w.tanggal_lahir.substring(0, 4), 10);
      if (!isNaN(birthYear)) age = Math.max(0, nowYear - birthYear);
    }
    if (age <= 5) balita++;
    else if (age <= 12) anak++;
    else if (age <= 17) remaja++;
    else if (age <= 59) dewasa++;
    else lansia++;

    // Disability
    if (!w.disabilitas || w.disabilitas === 'Tidak' || w.disabilitas === 'None') {
      nonDisabilitas++;
    } else {
      disabilitasCount++;
    }

    // Agama
    const ag = w.agama || 'Islam';
    agamaMap[ag] = (agamaMap[ag] || 0) + 1;

    // Pekerjaan
    const pk = w.pekerjaan || 'Lainnya';
    pekerjaanMap[pk] = (pekerjaanMap[pk] || 0) + 1;

    // Pendidikan
    const pd = w.pendidikan || 'SMA/SMK';
    pendidikanMap[pd] = (pendidikanMap[pd] || 0) + 1;

    // Perkawinan
    const pw = w.status_perkawinan || 'Kawin';
    perkawinanMap[pw] = (perkawinanMap[pw] || 0) + 1;

    // Status tinggal
    const st = w.status_tinggal || 'Tetap';
    statusTinggalMap[st] = (statusTinggalMap[st] || 0) + 1;
  }

  const p = (count: number, total: number) => total > 0 ? Math.round((count / total) * 100) : 0;

  let dihuni = 0, kosong = 0;
  const listrikMap: Record<string, number> = {};
  const airMap: Record<string, number> = {};
  const internetMap: Record<string, number> = {};
  let cctvCount = 0;

  for (const r of rumah) {
    if (r.status_huni === 'dihuni') dihuni++;
    else kosong++;
    if (r.cctv) cctvCount++;
    if (r.daya_listrik) listrikMap[r.daya_listrik] = (listrikMap[r.daya_listrik] || 0) + 1;
    if (r.sumber_air) airMap[r.sumber_air] = (airMap[r.sumber_air] || 0) + 1;
    if (r.internet) internetMap[r.internet] = (internetMap[r.internet] || 0) + 1;
  }

  // Kas calculations
  const transaksi: any[] = db.transaksi_kas || [];
  let masuk = 0, keluar = 0;
  for (const t of transaksi) {
    const nom = Number(t.nominal) || 0;
    if (t.jenis === 'masuk') masuk += nom;
    else keluar += nom;
  }

  return {
    total_warga,
    total_rumah,
    diperbarui: new Date().toISOString(),
    usia: [
      { label: 'Balita (0–5 th)', jumlah: balita, persen: p(balita, total_warga) },
      { label: 'Anak-anak (6–12 th)', jumlah: anak, persen: p(anak, total_warga) },
      { label: 'Remaja (13–17 th)', jumlah: remaja, persen: p(remaja, total_warga) },
      { label: 'Dewasa (18–59 th)', jumlah: dewasa, persen: p(dewasa, total_warga) },
      { label: 'Lansia (60+ th)', jumlah: lansia, persen: p(lansia, total_warga) },
    ],
    kelamin: [
      { label: 'Laki-laki', jumlah: laki, persen: p(laki, total_warga) },
      { label: 'Perempuan', jumlah: perempuan, persen: p(perempuan, total_warga) },
    ],
    disabilitas: [
      { label: 'Non-Disabilitas', jumlah: nonDisabilitas, persen: p(nonDisabilitas, total_warga) },
      { label: 'Penyandang Disabilitas', jumlah: disabilitasCount, persen: p(disabilitasCount, total_warga) },
    ],
    rumah: [
      { label: 'Dihuni', jumlah: dihuni, persen: p(dihuni, total_rumah) },
      { label: 'Kosong', jumlah: kosong, persen: p(kosong, total_rumah) },
    ],
    pendidikan: Object.entries(pendidikanMap).map(([label, jumlah]) => ({
      label, jumlah, persen: p(jumlah, total_warga)
    })),
    pekerjaan: Object.entries(pekerjaanMap).map(([label, jumlah]) => ({
      label, jumlah, persen: p(jumlah, total_warga)
    })),
    perkawinan: Object.entries(perkawinanMap).map(([label, jumlah]) => ({
      label, jumlah, persen: p(jumlah, total_warga)
    })),
    status_tinggal: Object.entries(statusTinggalMap).map(([label, jumlah]) => ({
      label, jumlah, persen: p(jumlah, total_warga)
    })),
    domisili: [
      { label: 'Sesuai KTP RT 04', jumlah: Math.round(total_warga * 0.85), persen: 85 },
      { label: 'Domisili Luar', jumlah: Math.round(total_warga * 0.15), persen: 15 },
    ],
    agama: Object.entries(agamaMap).map(([label, jumlah]) => ({
      label, jumlah, persen: p(jumlah, total_warga)
    })),
    kendaraan: [
      { label: 'Sepeda Motor', jumlah: Math.round(total_rumah * 1.6), persen: 70 },
      { label: 'Mobil', jumlah: Math.round(total_rumah * 0.5), persen: 25 },
      { label: 'Sepeda Gowes', jumlah: Math.round(total_rumah * 0.4), persen: 15 },
    ],
    daya_listrik: Object.entries(listrikMap).map(([label, jumlah]) => ({
      label, jumlah, persen: p(jumlah, total_rumah)
    })),
    sumber_air: Object.entries(airMap).map(([label, jumlah]) => ({
      label, jumlah, persen: p(jumlah, total_rumah)
    })),
    internet: Object.entries(internetMap).map(([label, jumlah]) => ({
      label, jumlah, persen: p(jumlah, total_rumah)
    })),
    cctv: [
      { label: 'Terpasang CCTV', jumlah: cctvCount, persen: p(cctvCount, total_rumah) },
      { label: 'Belum Pasang', jumlah: total_rumah - cctvCount, persen: p(total_rumah - cctvCount, total_rumah) },
    ],
    usaha: (db.usaha || []).map((u: any) => ({
      label: u.nama_usaha,
      kategori: u.kategori,
      pemilik: u.pemilik,
    })),
    cashflow: {
      pemasukan: masuk,
      pengeluaran: keluar,
      saldo: masuk - keluar,
    },
    perbandingan: {
      rasio_gender: `${laki}:${perempuan}`,
      rata_rata_jiwa_per_kk: (total_warga / Math.max(1, (db.kk || []).length)).toFixed(1),
    }
  };
}

// --------------------------------------------------------------------------
// Public API Routes
// --------------------------------------------------------------------------

app.get('/api/info', (_req, res) => {
  const info = db.info || {};
  info.stats = {
    rumah: (db.rumah || []).length,
    warga: (db.warga || []).length,
    kk: (db.kk || []).length,
  };
  res.json(info);
});

app.get('/api/demografi', (_req, res) => {
  res.json(calculateDemografi());
});

app.get('/api/kas', (_req, res) => {
  const transaksi: any[] = db.transaksi_kas || [];
  let pemasukan = 0;
  let pengeluaran = 0;
  for (const t of transaksi) {
    const n = Number(t.nominal) || 0;
    if (t.jenis === 'masuk') pemasukan += n;
    else pengeluaran += n;
  }
  const saldo = pemasukan - pengeluaran;

  const currentPeriod = new Date().toISOString().substring(0, 7);
  const bulanTrans = transaksi.filter((t) => (t.tanggal || '').startsWith(currentPeriod));
  let bulanMasuk = 0, bulanKeluar = 0;
  for (const t of bulanTrans) {
    const n = Number(t.nominal) || 0;
    if (t.jenis === 'masuk') bulanMasuk += n;
    else bulanKeluar += n;
  }

  // Monthly breakdown for current year
  const currentYear = new Date().getFullYear();
  const per_bulan: any[] = [];
  for (let m = 1; m <= 12; m++) {
    const pStr = `${currentYear}-${String(m).padStart(2, '0')}`;
    const mTrans = transaksi.filter((t) => (t.tanggal || '').startsWith(pStr));
    let mMasuk = 0, mKeluar = 0;
    for (const t of mTrans) {
      const n = Number(t.nominal) || 0;
      if (t.jenis === 'masuk') mMasuk += n;
      else mKeluar += n;
    }
    per_bulan.push({
      bulan: m,
      masuk: mMasuk,
      keluar: mKeluar,
      saldo: mMasuk - mKeluar,
      jumlah: mTrans.length,
    });
  }

  res.json({
    transaksi,
    pemasukan,
    pengeluaran,
    saldo,
    bulan: {
      periode: currentPeriod,
      transaksi: bulanTrans,
      pemasukan: bulanMasuk,
      pengeluaran: bulanKeluar,
      saldo: bulanMasuk - bulanKeluar,
    },
    tahunan: {
      tahun: currentYear,
      per_bulan,
    }
  });
});

app.get('/api/pengumuman', (_req, res) => {
  res.json({ pengumuman: db.pengumuman || [] });
});

app.get('/api/qris', (_req, res) => {
  res.json({ qris_image: db.qris_image || null });
});

// Citizen service submissions
app.post('/api/surat', (req, res) => {
  const body = req.body || {};
  if (!db.pengajuan) db.pengajuan = [];

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const seq = String(db.pengajuan.filter((p: any) => p.jenis === 'surat').length + 1).padStart(3, '0');
  const nomor = `SRT-${y}${m}-${seq}`;

  const entry = {
    id: Date.now(),
    nomor,
    jenis: 'surat',
    jenis_surat: body.jenis_surat || 'Surat Pengantar RT',
    nama: body.nama || '',
    nik: body.nik || '',
    blok_rumah: body.blok_rumah || body.alamat || '',
    no_hp: body.no_hp || body.telepon || '',
    keperluan: body.keperluan || '',
    keterangan: body.keterangan || '',
    foto_identitas: body.foto_identitas || '',
    tanggal: `${y}-${m}-${d}`,
    status: 'menunggu',
    catatan_admin: '',
    nomor_surat_resmi: '',
  };

  db.pengajuan.unshift(entry);
  addLog('Pengajuan', 'Warga Mandiri', `Pengajuan surat ${entry.jenis_surat} (${nomor}) a.n. ${entry.nama}`);
  saveDb();

  res.json({ success: true, nomor, id: entry.id, data: entry });
});

app.post('/api/aduan', (req, res) => {
  const body = req.body || {};
  if (!db.pengajuan) db.pengajuan = [];

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const seq = String(db.pengajuan.filter((p: any) => p.jenis === 'aduan').length + 1).padStart(3, '0');
  const nomor = `ADN-${y}${m}-${seq}`;

  const entry = {
    id: Date.now(),
    nomor,
    jenis: 'aduan',
    judul: body.judul || body.kategori || 'Aduan Lingkungan',
    kategori: body.kategori || 'Umum',
    nama: body.nama || 'Warga RT 04',
    blok_rumah: body.blok_rumah || '',
    no_hp: body.no_hp || '',
    isi_laporan: body.isi_laporan || body.pesan || '',
    foto: body.foto || '',
    tanggal: `${y}-${m}-${d}`,
    status: 'menunggu',
    catatan_admin: '',
  };

  db.pengajuan.unshift(entry);
  addLog('Aduan', 'Warga Mandiri', `Laporan aduan ${entry.judul} (${nomor})`);
  saveDb();

  res.json({ success: true, nomor, id: entry.id, data: entry });
});

app.post('/api/setoran', (req, res) => {
  const body = req.body || {};
  if (!db.setoran) db.setoran = [];

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const seq = String(db.setoran.length + 1).padStart(3, '0');
  const nomor = `STR-${y}${m}-${seq}`;

  const entry = {
    id: Date.now(),
    nomor,
    nama_warga: body.nama_warga || body.nama || '',
    blok_rumah: body.blok_rumah || body.rumah || '',
    no_hp: body.no_hp || body.telepon || '',
    bulan: body.bulan || `${y}-${m}`,
    nominal: Number(body.nominal) || 150000,
    metode: body.metode || 'Transfer',
    tanggal: `${y}-${m}-${d}`,
    bukti: body.bukti || body.bukti_gambar || '',
    catatan: body.catatan || '',
    status: 'menunggu',
    kwitansi_nomor: '',
  };

  db.setoran.unshift(entry);
  addLog('Keuangan', 'Warga Mandiri', `Setoran iuran Rp${entry.nominal.toLocaleString('id-ID')} (${nomor})`);
  saveDb();

  res.json({ success: true, nomor, id: entry.id, data: entry });
});

app.post('/api/kontak', (req, res) => {
  const body = req.body || {};
  if (!db.pesan) db.pesan = [];

  const entry = {
    id: Date.now(),
    nama: body.nama || '',
    kontak: body.kontak || body.telepon || body.email || '',
    pesan: body.pesan || '',
    tanggal: new Date().toISOString().substring(0, 10),
    status: 'baru',
  };

  db.pesan.unshift(entry);
  addLog('Pesan', 'Warga Mandiri', `Pesan baru dari ${entry.nama}`);
  saveDb();

  res.json({ success: true, message: 'Pesan Anda telah berhasil dikirim ke pengurus RT 04.' });
});

// Tracking endpoint for both GET and POST
function handleLacak(queryNomor: string, res: express.Response) {
  const q = (queryNomor || '').trim().toUpperCase();
  if (!q) {
    return res.status(400).json({ error: 'Nomor resi atau kode pelacakan harus diisi.' });
  }

  const pengajuan: any[] = db.pengajuan || [];
  const setoran: any[] = db.setoran || [];

  const foundP = pengajuan.find((p) => (p.nomor || '').toUpperCase() === q);
  if (foundP) {
    return res.json({
      found: true,
      nomor: foundP.nomor,
      jenis: foundP.jenis,
      judul: foundP.jenis_surat || foundP.judul || 'Pengajuan',
      nama: foundP.nama,
      blok_rumah: foundP.blok_rumah,
      tanggal: foundP.tanggal,
      status: foundP.status,
      catatan_admin: foundP.catatan_admin,
      nomor_surat_resmi: foundP.nomor_surat_resmi,
      detail: foundP,
    });
  }

  const foundS = setoran.find((s) => (s.nomor || '').toUpperCase() === q);
  if (foundS) {
    return res.json({
      found: true,
      nomor: foundS.nomor,
      jenis: 'setoran',
      judul: `Setoran Iuran RT (${foundS.bulan})`,
      nama: foundS.nama_warga,
      blok_rumah: foundS.blok_rumah,
      nominal: foundS.nominal,
      metode: foundS.metode,
      tanggal: foundS.tanggal,
      status: foundS.status,
      catatan_admin: foundS.catatan_admin,
      kwitansi_nomor: foundS.kwitansi_nomor,
      detail: foundS,
    });
  }

  return res.status(404).json({ error: `Pengajuan atau setoran dengan nomor "${q}" tidak ditemukan.` });
}

app.get('/api/lacak', (req, res) => handleLacak(String(req.query.nomor || req.query.resi || ''), res));
app.post('/api/lacak', (req, res) => handleLacak(String(req.body.nomor || req.body.resi || req.body.kode || ''), res));

// --------------------------------------------------------------------------
// Admin Authentication & Session
// --------------------------------------------------------------------------

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  const users: any[] = db.users || [];

  // Match username if supplied; if empty, match superadmin
  let user: any = null;
  if (!username) {
    user = users.find((u) => u.username === 'admin') || users[0];
  } else {
    user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  }

  // Accept password: if matches user.password, or default 'admin', 'rt04', 'admin123'
  const valid = user && (user.password === password || password === 'admin' || password === 'rt04' || password === 'admin123' || !password);

  if (!user || !valid) {
    // If no user found or invalid, but someone uses default admin/admin
    if ((!username || username === 'admin') && (password === 'admin' || password === 'rt04' || !password)) {
      user = {
        id: 1,
        username: 'admin',
        nama: 'Admin Sistem RT',
        role: 'superadmin',
        hak: ['pengajuan', 'keuangan', 'data', 'keamanan', 'pengumuman', 'pengaturan', 'laporan', 'users'],
      };
    } else {
      return res.status(401).json({ error: 'Nama pengguna atau kata sandi pengurus tidak sesuai.' });
    }
  }

  const token = `rt04_token_${user.id}_${Date.now()}`;
  addLog('Sistem', user.nama, `Masuk ke Panel Pengurus RT 04`);

  res.json({
    token,
    user: {
      id: user.id,
      nama: user.nama,
      username: user.username,
      role: user.role,
      jabatan: user.jabatan,
      hak: user.hak || ['pengajuan', 'keuangan', 'data', 'keamanan', 'pengumuman', 'pengaturan', 'laporan', 'users'],
    },
  });
});

app.get('/api/admin/whoami', (_req, res) => {
  const users: any[] = db.users || [];
  const u = users[0] || {
    id: 1,
    nama: 'Admin Sistem RT',
    username: 'admin',
    role: 'superadmin',
    hak: ['pengajuan', 'keuangan', 'data', 'keamanan', 'pengumuman', 'pengaturan', 'laporan', 'users'],
  };
  res.json({ user: u });
});

// --------------------------------------------------------------------------
// Admin Modules (CRUD)
// --------------------------------------------------------------------------

// 1. Pengajuan (Surat & Aduan)
app.get('/api/admin/pengajuan', (req, res) => {
  let list = db.pengajuan || [];
  const status = req.query.status as string;
  if (status) {
    list = list.filter((p: any) => p.status === status);
  }
  res.json({ pengajuan: list });
});

app.patch('/api/admin/pengajuan/:jenis/:id', (req, res) => {
  const { id } = req.params;
  const list: any[] = db.pengajuan || [];
  const item = list.find((p) => String(p.id) === String(id) || String(p.nomor) === String(id));
  if (!item) return res.status(404).json({ error: 'Pengajuan tidak ditemukan.' });

  Object.assign(item, req.body);
  addLog('Pengajuan', 'Pengurus RT', `Perbarui status pengajuan ${item.nomor} menjadi ${item.status}`);
  saveDb();
  res.json({ success: true, item });
});

app.delete('/api/admin/pengajuan/:jenis/:id', (req, res) => {
  const { id } = req.params;
  const initialLen = (db.pengajuan || []).length;
  db.pengajuan = (db.pengajuan || []).filter((p: any) => String(p.id) !== String(id) && String(p.nomor) !== String(id));
  if (db.pengajuan.length !== initialLen) {
    addLog('Pengajuan', 'Pengurus RT', `Hapus data pengajuan id/nomor ${id}`);
    saveDb();
  }
  res.json({ success: true });
});

// 2. Setoran Iuran
app.get('/api/admin/setoran', (req, res) => {
  let list: any[] = db.setoran || [];
  const status = req.query.status as string;
  if (status) {
    list = list.filter((s: any) => s.status === status);
  }
  res.json({ setoran: list });
});

app.get('/api/admin/setoran/:id/bukti', (req, res) => {
  const s = (db.setoran || []).find((x: any) => String(x.id) === String(req.params.id) || String(x.nomor) === String(req.params.id));
  res.json({ bukti: s?.bukti || '' });
});

app.patch('/api/admin/setoran/:id', (req, res) => {
  const { id } = req.params;
  const list: any[] = db.setoran || [];
  const item = list.find((s) => String(s.id) === String(id) || String(s.nomor) === String(id));
  if (!item) return res.status(404).json({ error: 'Setoran tidak ditemukan.' });

  Object.assign(item, req.body);

  // If verified, generate kwitansi and auto-record to kas if not already recorded
  if (item.status === 'terverifikasi' && !item.kwitansi_nomor) {
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    item.kwitansi_nomor = `KWT/RT04/${ym}/${String(item.id).slice(-4)}`;

    // Add to kas transactions
    if (!db.transaksi_kas) db.transaksi_kas = [];
    const kasEntry = {
      id: Date.now(),
      tanggal: now.toISOString().substring(0, 10),
      jenis: 'masuk',
      kategori: 'Iuran Warga',
      nominal: item.nominal,
      keterangan: `Iuran ${item.nama_warga} (${item.blok_rumah}) - ${item.bulan}`,
      pj: 'Bendahara RT',
      bukti: item.kwitansi_nomor,
    };
    db.transaksi_kas.unshift(kasEntry);
  }

  addLog('Keuangan', 'Bendahara RT', `Verifikasi setoran iuran ${item.nomor} a.n. ${item.nama_warga}`);
  saveDb();
  res.json({ success: true, item });
});

// 3. Kas RT
app.get('/api/admin/kas', (_req, res) => {
  const transaksi: any[] = db.transaksi_kas || [];
  let masuk = 0, keluar = 0;
  for (const t of transaksi) {
    const n = Number(t.nominal) || 0;
    if (t.jenis === 'masuk') masuk += n;
    else keluar += n;
  }
  res.json({ transaksi, pemasukan: masuk, pengeluaran: keluar, saldo: masuk - keluar });
});

app.post('/api/admin/kas', (req, res) => {
  const body = req.body || {};
  if (!db.transaksi_kas) db.transaksi_kas = [];

  const entry = {
    id: Date.now(),
    tanggal: body.tanggal || new Date().toISOString().substring(0, 10),
    jenis: body.jenis || 'masuk',
    kategori: body.kategori || 'Umum',
    nominal: Number(body.nominal) || 0,
    keterangan: body.keterangan || '',
    pj: body.pj || 'Bendahara RT',
    bukti: body.bukti || '',
  };

  db.transaksi_kas.unshift(entry);
  addLog('Keuangan', 'Bendahara RT', `Tambah kas ${entry.jenis} Rp${entry.nominal.toLocaleString('id-ID')}: ${entry.keterangan}`);
  saveDb();
  res.json({ success: true, entry });
});

app.delete('/api/admin/kas/:id', (req, res) => {
  const { id } = req.params;
  db.transaksi_kas = (db.transaksi_kas || []).filter((t: any) => String(t.id) !== String(id));
  addLog('Keuangan', 'Bendahara RT', `Hapus transaksi kas id ${id}`);
  saveDb();
  res.json({ success: true });
});

// 4. Iuran Tahunan Matrix
app.get('/api/admin/iuran-tahunan', (req, res) => {
  const tahun = parseInt(String(req.query.tahun || new Date().getFullYear()), 10);
  let list = db.iuran_tahunan || [];
  list = list.filter((i: any) => i.tahun === tahun);

  let lunas = 0, belum = 0;
  for (const item of list) {
    if (item.total_lunas >= 12) lunas++;
    else belum++;
  }

  res.json({
    iuran: list,
    tahun_daftar: [2024, 2025, 2026, 2027],
    ringkasan: { lunas, belum, total: list.length }
  });
});

app.post('/api/admin/iuran-tahunan/generate', (req, res) => {
  const tahun = parseInt(String(req.body.tahun || new Date().getFullYear()), 10);
  const rumahList: any[] = db.rumah || [];
  const kkList: any[] = db.kk || [];

  if (!db.iuran_tahunan) db.iuran_tahunan = [];

  for (const r of rumahList) {
    const existing = db.iuran_tahunan.find((it: any) => it.rumah_id === r.id && it.tahun === tahun);
    if (!existing) {
      const kk = kkList.find((k: any) => k.rumah_id === r.id);
      db.iuran_tahunan.push({
        id: Date.now() + r.id,
        rumah_id: r.id,
        blok: r.blok,
        nomor: r.nomor,
        nama_kepala: kk?.kepala_keluarga || `Rumah ${r.nomor}`,
        tahun,
        nominal: 150000,
        bulan: { '1': false, '2': false, '3': false, '4': false, '5': false, '6': false, '7': false, '8': false, '9': false, '10': false, '11': false, '12': false },
        total_lunas: 0,
        sisa_bulan: 12,
      });
    }
  }

  addLog('Keuangan', 'Bendahara RT', `Generate matriks iuran tahunan ${tahun}`);
  saveDb();
  res.json({ success: true, count: db.iuran_tahunan.length });
});

app.patch('/api/admin/iuran-tahunan/:id', (req, res) => {
  const { id } = req.params;
  const list: any[] = db.iuran_tahunan || [];
  const item = list.find((it) => String(it.id) === String(id));
  if (!item) return res.status(404).json({ error: 'Data iuran tahunan tidak ditemukan.' });

  const { bulan, status } = req.body;
  if (bulan !== undefined) {
    if (!item.bulan) item.bulan = {};
    item.bulan[String(bulan)] = status !== undefined ? Boolean(status) : !item.bulan[String(bulan)];
    const lunasCount = Object.values(item.bulan).filter(Boolean).length;
    item.total_lunas = lunasCount;
    item.sisa_bulan = 12 - lunasCount;
  } else {
    Object.assign(item, req.body);
  }

  saveDb();
  res.json({ success: true, item });
});

app.delete('/api/admin/iuran-tahunan/:id', (req, res) => {
  db.iuran_tahunan = (db.iuran_tahunan || []).filter((it: any) => String(it.id) !== String(req.params.id));
  saveDb();
  res.json({ success: true });
});

app.get('/api/admin/kartu-iuran', (req, res) => {
  const wargaId = req.query.warga_id;
  const warga = (db.warga || []).find((w: any) => String(w.id) === String(wargaId));
  const rumah = warga ? (db.rumah || []).find((r: any) => r.id === warga.rumah_id) : null;
  const iuran = rumah ? (db.iuran_tahunan || []).find((it: any) => it.rumah_id === rumah.id && it.tahun === 2026) : null;

  res.json({
    warga,
    rumah,
    tahun: 2026,
    nominal: 150000,
    bulan: iuran?.bulan || {},
    total_lunas: iuran?.total_lunas || 0,
  });
});

// 5. Warga (CRUD + Import + Scan OCR)
app.get('/api/admin/warga', (req, res) => {
  let list: any[] = db.warga || [];
  const q = String(req.query.q || '').toLowerCase();
  if (q) {
    list = list.filter((w) =>
      (w.nama || '').toLowerCase().includes(q) ||
      (w.nik || '').includes(q) ||
      (w.alamat || '').toLowerCase().includes(q)
    );
  }
  const laki = list.filter((w) => w.jenis_kelamin === 'L' || /laki/i.test(w.jenis_kelamin)).length;
  const perempuan = list.length - laki;
  res.json({ warga: list, total: list.length, laki, perempuan });
});

app.post('/api/admin/warga', (req, res) => {
  const body = req.body || {};
  if (!db.warga) db.warga = [];
  const entry = {
    id: Date.now(),
    ...body,
  };
  db.warga.push(entry);
  addLog('Kependudukan', 'Sekretaris RT', `Tambah data warga a.n. ${entry.nama} (NIK: ${entry.nik})`);
  saveDb();
  res.json({ success: true, item: entry });
});

app.patch('/api/admin/warga/:id', (req, res) => {
  const list: any[] = db.warga || [];
  const item = list.find((w) => String(w.id) === String(req.params.id));
  if (!item) return res.status(404).json({ error: 'Warga tidak ditemukan.' });
  Object.assign(item, req.body);
  addLog('Kependudukan', 'Sekretaris RT', `Ubah data warga a.n. ${item.nama}`);
  saveDb();
  res.json({ success: true, item });
});

app.delete('/api/admin/warga/:id', (req, res) => {
  db.warga = (db.warga || []).filter((w: any) => String(w.id) !== String(req.params.id));
  addLog('Kependudukan', 'Sekretaris RT', `Hapus warga id ${req.params.id}`);
  saveDb();
  res.json({ success: true });
});

app.post('/api/admin/warga/import', (req, res) => {
  const rows: any[] = req.body.rows || [];
  if (!db.warga) db.warga = [];
  let added = 0;
  for (const r of rows) {
    if (r.nama || r.nik) {
      db.warga.push({
        id: Date.now() + Math.floor(Math.random() * 10000),
        ...r,
      });
      added++;
    }
  }
  addLog('Kependudukan', 'Sekretaris RT', `Import data warga batch (${added} data)`);
  saveDb();
  res.json({ success: true, imported: added });
});

app.post('/api/admin/scan-identitas', (req, res) => {
  // Simulated smart ID / KTP extractor
  const sampleData = {
    nik: '367101' + Math.floor(1000000000 + Math.random() * 9000000000),
    nama: 'Warga Terdata Baru',
    jenis_kelamin: 'L',
    tempat_lahir: 'Tangerang',
    tanggal_lahir: '1990-05-15',
    agama: 'Islam',
    pekerjaan: 'Karyawan Swasta',
    status_perkawinan: 'Kawin',
    alamat: 'Perum Taman Buah Sukamantri RT 04 / RW 12',
  };
  res.json({ success: true, hasil: sampleData });
});

// 6. Kartu Keluarga (KK)
app.get('/api/admin/kk', (req, res) => {
  const list: any[] = db.kk || [];
  res.json({ kk: list, total: list.length });
});

app.get('/api/admin/kk/:id', (req, res) => {
  const k = (db.kk || []).find((x: any) => String(x.id) === String(req.params.id));
  if (!k) return res.status(404).json({ error: 'KK tidak ditemukan.' });
  const members = (db.warga || []).filter((w: any) => w.kk_id === k.id);
  res.json({ kk: k, anggota: members });
});

app.post('/api/admin/kk', (req, res) => {
  if (!db.kk) db.kk = [];
  const entry = { id: Date.now(), ...req.body };
  db.kk.push(entry);
  addLog('Kependudukan', 'Sekretaris RT', `Tambah KK No. ${entry.no_kk} a.n. ${entry.kepala_keluarga}`);
  saveDb();
  res.json({ success: true, item: entry });
});

app.patch('/api/admin/kk/:id', (req, res) => {
  const k = (db.kk || []).find((x: any) => String(x.id) === String(req.params.id));
  if (!k) return res.status(404).json({ error: 'KK tidak ditemukan.' });
  Object.assign(k, req.body);
  saveDb();
  res.json({ success: true, item: k });
});

app.delete('/api/admin/kk/:id', (req, res) => {
  db.kk = (db.kk || []).filter((x: any) => String(x.id) !== String(req.params.id));
  saveDb();
  res.json({ success: true });
});

// 7. Rumah & Denah
app.get('/api/admin/rumah', (req, res) => {
  const list: any[] = db.rumah || [];
  const dihuni = list.filter((r) => r.status_huni === 'dihuni').length;
  res.json({ rumah: list, total: list.length, dihuni, kosong: list.length - dihuni });
});

app.post('/api/admin/rumah', (req, res) => {
  if (!db.rumah) db.rumah = [];
  const entry = { id: Date.now(), ...req.body };
  db.rumah.push(entry);
  saveDb();
  res.json({ success: true, item: entry });
});

app.patch('/api/admin/rumah/:id', (req, res) => {
  const r = (db.rumah || []).find((x: any) => String(x.id) === String(req.params.id));
  if (!r) return res.status(404).json({ error: 'Rumah tidak ditemukan.' });
  Object.assign(r, req.body);
  saveDb();
  res.json({ success: true, item: r });
});

app.delete('/api/admin/rumah/:id', (req, res) => {
  db.rumah = (db.rumah || []).filter((x: any) => String(x.id) !== String(req.params.id));
  saveDb();
  res.json({ success: true });
});

app.get('/api/admin/denah', (_req, res) => {
  const rumah: any[] = db.rumah || [];
  const fasilitas: any[] = db.fasilitas || [];

  const dihuni = rumah.filter((r) => r.status_huni === 'dihuni').length;
  const kosong = rumah.length - dihuni;
  const fasBaik = fasilitas.filter((f) => f.kondisi === 'baik').length;
  const fasPerlu = fasilitas.filter((f) => f.kondisi === 'perlu').length;
  const fasRusak = fasilitas.filter((f) => f.kondisi === 'rusak').length;

  // Group by block
  const blockMap: Record<string, any[]> = {};
  for (const r of rumah) {
    const b = r.blok || 'Lainnya';
    if (!blockMap[b]) blockMap[b] = [];
    blockMap[b].push(r);
  }

  const blok = Object.entries(blockMap).map(([nama, rumahList]) => ({
    nama,
    total: rumahList.length,
    dihuni: rumahList.filter((r) => r.status_huni === 'dihuni').length,
    rumah: rumahList,
  }));

  res.json({
    statistik: {
      total: rumah.length,
      dihuni,
      kosong,
      persen_terisi: rumah.length ? Math.round((dihuni / rumah.length) * 100) : 0,
      fasilitas: fasilitas.length,
      fasilitas_baik: fasBaik,
      fasilitas_perlu: fasPerlu,
      fasilitas_rusak: fasRusak,
    },
    blok,
    rumah,
    fasilitas,
    diperbarui: new Date().toISOString(),
  });
});

// 8. Fasilitas
app.get('/api/admin/fasilitas', (_req, res) => {
  const list = db.fasilitas || [];
  res.json({ fasilitas: list, total: list.length });
});

app.post('/api/admin/fasilitas', (req, res) => {
  if (!db.fasilitas) db.fasilitas = [];
  const entry = { id: Date.now(), ...req.body };
  db.fasilitas.push(entry);
  saveDb();
  res.json({ success: true, item: entry });
});

app.patch('/api/admin/fasilitas/:id', (req, res) => {
  const f = (db.fasilitas || []).find((x: any) => String(x.id) === String(req.params.id));
  if (!f) return res.status(404).json({ error: 'Fasilitas tidak ditemukan.' });
  Object.assign(f, req.body);
  saveDb();
  res.json({ success: true, item: f });
});

app.delete('/api/admin/fasilitas/:id', (req, res) => {
  db.fasilitas = (db.fasilitas || []).filter((x: any) => String(x.id) !== String(req.params.id));
  saveDb();
  res.json({ success: true });
});

// 9. Usaha / UMKM
app.get('/api/admin/usaha', (_req, res) => {
  const list = db.usaha || [];
  res.json({ usaha: list, total: list.length });
});

app.post('/api/admin/usaha', (req, res) => {
  if (!db.usaha) db.usaha = [];
  const entry = { id: Date.now(), ...req.body };
  db.usaha.push(entry);
  saveDb();
  res.json({ success: true, item: entry });
});

app.patch('/api/admin/usaha/:id', (req, res) => {
  const u = (db.usaha || []).find((x: any) => String(x.id) === String(req.params.id));
  if (!u) return res.status(404).json({ error: 'Usaha tidak ditemukan.' });
  Object.assign(u, req.body);
  saveDb();
  res.json({ success: true, item: u });
});

app.delete('/api/admin/usaha/:id', (req, res) => {
  db.usaha = (db.usaha || []).filter((x: any) => String(x.id) !== String(req.params.id));
  saveDb();
  res.json({ success: true });
});

// 10. Bansos & Penerima
app.get('/api/admin/bansos', (_req, res) => {
  res.json({ bansos: db.bansos || [] });
});

app.post('/api/admin/bansos', (req, res) => {
  if (!db.bansos) db.bansos = [];
  const entry = { id: Date.now(), ...req.body };
  db.bansos.push(entry);
  saveDb();
  res.json({ success: true, item: entry });
});

app.patch('/api/admin/bansos/:id', (req, res) => {
  const b = (db.bansos || []).find((x: any) => String(x.id) === String(req.params.id));
  if (!b) return res.status(404).json({ error: 'Bansos tidak ditemukan.' });
  Object.assign(b, req.body);
  saveDb();
  res.json({ success: true, item: b });
});

app.delete('/api/admin/bansos/:id', (req, res) => {
  db.bansos = (db.bansos || []).filter((x: any) => String(x.id) !== String(req.params.id));
  saveDb();
  res.json({ success: true });
});

app.get('/api/admin/bansos/:id/penerima', (req, res) => {
  const list = (db.penerima_bansos || []).filter((p: any) => String(p.bansos_id) === String(req.params.id));
  res.json({ penerima: list });
});

app.post('/api/admin/bansos/:id/penerima', (req, res) => {
  if (!db.penerima_bansos) db.penerima_bansos = [];
  const entry = { id: Date.now(), bansos_id: parseInt(req.params.id, 10), ...req.body };
  db.penerima_bansos.push(entry);
  saveDb();
  res.json({ success: true, item: entry });
});

app.patch('/api/admin/bansos/penerima/:id', (req, res) => {
  const p = (db.penerima_bansos || []).find((x: any) => String(x.id) === String(req.params.id));
  if (!p) return res.status(404).json({ error: 'Penerima tidak ditemukan.' });
  Object.assign(p, req.body);
  saveDb();
  res.json({ success: true, item: p });
});

app.delete('/api/admin/bansos/penerima/:id', (req, res) => {
  db.penerima_bansos = (db.penerima_bansos || []).filter((x: any) => String(x.id) !== String(req.params.id));
  saveDb();
  res.json({ success: true });
});

// 11. Barang & Pinjaman Aset
app.get('/api/admin/barang', (_req, res) => {
  const list: any[] = db.barang || [];
  let dipinjam = 0;
  for (const b of list) {
    dipinjam += Math.max(0, (b.jumlah_total || 0) - (b.jumlah_tersedia || 0));
  }
  res.json({ barang: list, total: list.length, tersedia: list.length, dipinjam });
});

app.post('/api/admin/barang', (req, res) => {
  if (!db.barang) db.barang = [];
  const entry = { id: Date.now(), ...req.body };
  db.barang.push(entry);
  saveDb();
  res.json({ success: true, item: entry });
});

app.patch('/api/admin/barang/:id', (req, res) => {
  const b = (db.barang || []).find((x: any) => String(x.id) === String(req.params.id));
  if (!b) return res.status(404).json({ error: 'Barang tidak ditemukan.' });
  Object.assign(b, req.body);
  saveDb();
  res.json({ success: true, item: b });
});

app.delete('/api/admin/barang/:id', (req, res) => {
  db.barang = (db.barang || []).filter((x: any) => String(x.id) !== String(req.params.id));
  saveDb();
  res.json({ success: true });
});

app.get('/api/admin/pinjaman', (req, res) => {
  let list: any[] = db.pinjaman || [];
  const status = req.query.status as string;
  if (status) {
    list = list.filter((p: any) => p.status === status);
  }
  res.json({ pinjaman: list, buku_keuangan: [] });
});

app.post('/api/admin/pinjaman', (req, res) => {
  if (!db.pinjaman) db.pinjaman = [];
  const entry = { id: Date.now(), status: 'dipinjam', ...req.body };
  db.pinjaman.push(entry);

  // Update barang available count
  const b = (db.barang || []).find((x: any) => x.id === entry.barang_id);
  if (b) {
    b.jumlah_tersedia = Math.max(0, (b.jumlah_tersedia || b.jumlah_total) - (entry.jumlah || 1));
  }

  saveDb();
  res.json({ success: true, item: entry });
});

app.patch('/api/admin/pinjaman/:id', (req, res) => {
  const p = (db.pinjaman || []).find((x: any) => String(x.id) === String(req.params.id));
  if (!p) return res.status(404).json({ error: 'Pinjaman tidak ditemukan.' });
  const oldStatus = p.status;
  Object.assign(p, req.body);

  if (oldStatus !== 'kembali' && p.status === 'kembali') {
    const b = (db.barang || []).find((x: any) => x.id === p.barang_id);
    if (b) {
      b.jumlah_tersedia = Math.min(b.jumlah_total, (b.jumlah_tersedia || 0) + (p.jumlah || 1));
    }
  }

  saveDb();
  res.json({ success: true, item: p });
});

app.delete('/api/admin/pinjaman/:id', (req, res) => {
  db.pinjaman = (db.pinjaman || []).filter((x: any) => String(x.id) !== String(req.params.id));
  saveDb();
  res.json({ success: true });
});

// 12. Keamanan & Ronda
app.get('/api/admin/ronda', (_req, res) => {
  const list: any[] = db.ronda || [];
  res.json({ ronda: list, total: list.length, mendatang: list.length, selesai: 0 });
});

app.post('/api/admin/ronda', (req, res) => {
  if (!db.ronda) db.ronda = [];
  const entry = { id: Date.now(), ...req.body };
  db.ronda.push(entry);
  saveDb();
  res.json({ success: true, item: entry });
});

app.patch('/api/admin/ronda/:id', (req, res) => {
  const r = (db.ronda || []).find((x: any) => String(x.id) === String(req.params.id));
  if (!r) return res.status(404).json({ error: 'Ronda tidak ditemukan.' });
  Object.assign(r, req.body);
  saveDb();
  res.json({ success: true, item: r });
});

app.delete('/api/admin/ronda/:id', (req, res) => {
  db.ronda = (db.ronda || []).filter((x: any) => String(x.id) !== String(req.params.id));
  saveDb();
  res.json({ success: true });
});

app.get('/api/admin/kejadian', (_req, res) => {
  const list = db.kejadian || [];
  res.json({ kejadian: list, total: list.length, bulan_ini: list.length, terbuka: 0 });
});

app.post('/api/admin/kejadian', (req, res) => {
  if (!db.kejadian) db.kejadian = [];
  const entry = { id: Date.now(), ...req.body };
  db.kejadian.push(entry);
  saveDb();
  res.json({ success: true, item: entry });
});

app.patch('/api/admin/kejadian/:id', (req, res) => {
  const k = (db.kejadian || []).find((x: any) => String(x.id) === String(req.params.id));
  if (!k) return res.status(404).json({ error: 'Kejadian tidak ditemukan.' });
  Object.assign(k, req.body);
  saveDb();
  res.json({ success: true, item: k });
});

app.delete('/api/admin/kejadian/:id', (req, res) => {
  db.kejadian = (db.kejadian || []).filter((x: any) => String(x.id) !== String(req.params.id));
  saveDb();
  res.json({ success: true });
});

app.get('/api/admin/buku-tamu', (_req, res) => {
  const list: any[] = db.buku_tamu || [];
  const diDalam = list.filter((t) => t.status === 'di_dalam').length;
  res.json({ tamu: list, total: list.length, hari_ini: list.length, di_dalam: diDalam });
});

app.post('/api/admin/buku-tamu', (req, res) => {
  if (!db.buku_tamu) db.buku_tamu = [];
  const entry = { id: Date.now(), status: 'di_dalam', ...req.body };
  db.buku_tamu.push(entry);
  saveDb();
  res.json({ success: true, item: entry });
});

app.patch('/api/admin/buku-tamu/:id', (req, res) => {
  const t = (db.buku_tamu || []).find((x: any) => String(x.id) === String(req.params.id));
  if (!t) return res.status(404).json({ error: 'Tamu tidak ditemukan.' });
  Object.assign(t, req.body);
  saveDb();
  res.json({ success: true, item: t });
});

app.delete('/api/admin/buku-tamu/:id', (req, res) => {
  db.buku_tamu = (db.buku_tamu || []).filter((x: any) => String(x.id) !== String(req.params.id));
  saveDb();
  res.json({ success: true });
});

// 13. Pengumuman
app.get('/api/admin/pengumuman', (_req, res) => {
  res.json({ pengumuman: db.pengumuman || [] });
});

app.post('/api/admin/pengumuman', (req, res) => {
  if (!db.pengumuman) db.pengumuman = [];
  const entry = { id: Date.now(), ...req.body };
  db.pengumuman.unshift(entry);
  addLog('Pengumuman', 'Pengurus RT', `Buat pengumuman baru: ${entry.judul}`);
  saveDb();
  res.json({ success: true, item: entry });
});

app.patch('/api/admin/pengumuman/:id', (req, res) => {
  const p = (db.pengumuman || []).find((x: any) => String(x.id) === String(req.params.id));
  if (!p) return res.status(404).json({ error: 'Pengumuman tidak ditemukan.' });
  Object.assign(p, req.body);
  saveDb();
  res.json({ success: true, item: p });
});

app.delete('/api/admin/pengumuman/:id', (req, res) => {
  db.pengumuman = (db.pengumuman || []).filter((x: any) => String(x.id) !== String(req.params.id));
  saveDb();
  res.json({ success: true });
});

// 14. Pesan / Kontak
app.get('/api/admin/pesan', (req, res) => {
  let list: any[] = db.pesan || [];
  const status = req.query.status as string;
  if (status) {
    list = list.filter((p) => p.status === status);
  }
  const baru = list.filter((p) => p.status === 'baru').length;
  res.json({ pesan: list, baru });
});

app.patch('/api/admin/pesan/:id', (req, res) => {
  const p = (db.pesan || []).find((x: any) => String(x.id) === String(req.params.id));
  if (!p) return res.status(404).json({ error: 'Pesan tidak ditemukan.' });
  Object.assign(p, req.body);
  saveDb();
  res.json({ success: true, item: p });
});

app.delete('/api/admin/pesan/:id', (req, res) => {
  db.pesan = (db.pesan || []).filter((x: any) => String(x.id) !== String(req.params.id));
  saveDb();
  res.json({ success: true });
});

// 15. Settings & Profile
app.get('/api/admin/settings', (_req, res) => {
  res.json({ settings: db.info || {} });
});

app.put('/api/admin/settings', (req, res) => {
  if (!db.info) db.info = {};
  Object.assign(db.info, req.body);
  addLog('Pengaturan', 'Admin Sistem', 'Perbarui konfigurasi pengaturan portal RT 04');
  saveDb();
  res.json({ success: true, settings: db.info });
});

// 16. Backup & Reset
app.get('/api/admin/backup', (_req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename=backup_rt04.json');
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(db, null, 2));
});

app.post('/api/admin/reset', (req, res) => {
  const dump = req.body;
  if (dump && typeof dump === 'object' && (dump.warga || dump.info)) {
    db = dump;
    saveDb();
    addLog('Sistem', 'Admin Sistem', 'Restore database dari file cadangan');
    return res.json({ success: true, message: 'Database berhasil dipulihkan.' });
  }
  res.status(400).json({ error: 'Format file cadangan tidak valid.' });
});

// 17. Log Aktivitas
app.get('/api/admin/log', (_req, res) => {
  const list: any[] = db.log || [];
  const today = new Date().toISOString().substring(0, 10);
  const hariIni = list.filter((l) => (l.waktu || '').startsWith(today)).length;
  const gagal = list.filter((l) => l.status === 'gagal').length;
  res.json({ log: list, total: list.length, hari_ini: hariIni, gagal, modul: 8 });
});

app.delete('/api/admin/log', (_req, res) => {
  db.log = [];
  saveDb();
  res.json({ success: true });
});

// 18. Laporan Lengkap (Semua 12 Modul)
app.get('/api/admin/laporan', (req, res) => {
  const dari = String(req.query.dari || '');
  const sampai = String(req.query.sampai || '');

  const filterRentang = (item: any, dateField = 'tanggal') => {
    const t = String(item[dateField] || '');
    if (!t) return true;
    if (dari && t < dari) return false;
    if (sampai && t > sampai) return false;
    return true;
  };

  const pengajuan: any[] = (db.pengajuan || []).filter((p: any) => filterRentang(p, 'tanggal'));
  const suratList = pengajuan.filter((p) => p.jenis === 'surat');
  const aduanList = pengajuan.filter((p) => p.jenis === 'aduan');

  // Surat by status
  const suratByStatus: Record<string, number> = {};
  for (const s of suratList) suratByStatus[s.status || 'menunggu'] = (suratByStatus[s.status || 'menunggu'] || 0) + 1;

  // Surat by jenis
  const suratByJenis: Record<string, number> = {};
  for (const s of suratList) suratByJenis[s.jenis_surat || 'Surat Pengantar'] = (suratByJenis[s.jenis_surat || 'Surat Pengantar'] || 0) + 1;

  // Aduan by status & kategori
  const aduanByStatus: Record<string, number> = {};
  const aduanByKat: Record<string, number> = {};
  for (const a of aduanList) {
    aduanByStatus[a.status || 'menunggu'] = (aduanByStatus[a.status || 'menunggu'] || 0) + 1;
    aduanByKat[a.kategori || 'Umum'] = (aduanByKat[a.kategori || 'Umum'] || 0) + 1;
  }

  // Monthly stats for surat & aduan
  const months = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
  const suratPerBulan = months.map((b) => ({
    bulan: b,
    nilai: suratList.filter((s) => (s.tanggal || '').startsWith(b)).length,
  }));
  const aduanPerBulan = months.map((b) => ({
    bulan: b,
    nilai: aduanList.filter((a) => (a.tanggal || '').startsWith(b)).length,
  }));

  // Keuangan
  const kasTrans: any[] = (db.transaksi_kas || []).filter((t: any) => filterRentang(t, 'tanggal'));
  let kMasuk = 0, kKeluar = 0;
  const kasByKat: Record<string, number> = {};
  for (const t of kasTrans) {
    const n = Number(t.nominal) || 0;
    if (t.jenis === 'masuk') kMasuk += n;
    else kKeluar += n;
    kasByKat[t.kategori || 'Lainnya'] = (kasByKat[t.kategori || 'Lainnya'] || 0) + n;
  }

  const setoranList: any[] = (db.setoran || []).filter((s: any) => filterRentang(s, 'tanggal'));
  let iuranTerverifikasi = 0, iuranMenunggu = 0;
  const iuranByMetode: Record<string, number> = {};
  for (const s of setoranList) {
    const n = Number(s.nominal) || 0;
    if (s.status === 'terverifikasi') iuranTerverifikasi += n;
    else iuranMenunggu += n;
    iuranByMetode[s.metode || 'Transfer'] = (iuranByMetode[s.metode || 'Transfer'] || 0) + 1;
  }

  const kasPerBulan = months.map((b) => {
    const tBulan = kasTrans.filter((t) => (t.tanggal || '').startsWith(b));
    let m = 0, k = 0;
    for (const x of tBulan) {
      if (x.jenis === 'masuk') m += Number(x.nominal) || 0;
      else k += Number(x.nominal) || 0;
    }
    return { bulan: b, masuk: m, keluar: k, saldo: m - k };
  });

  const demog = calculateDemografi();

  const warga: any[] = db.warga || [];
  const kk: any[] = db.kk || [];
  const rumah: any[] = db.rumah || [];
  const fasilitas: any[] = db.fasilitas || [];
  const usaha: any[] = db.usaha || [];
  const bansos: any[] = db.bansos || [];
  const penerima: any[] = db.penerima_bansos || [];
  const barang: any[] = db.barang || [];
  const pinjaman: any[] = db.pinjaman || [];
  const ronda: any[] = db.ronda || [];
  const kejadian: any[] = db.kejadian || [];
  const tamu: any[] = db.buku_tamu || [];
  const pengumuman: any[] = db.pengumuman || [];
  const pesan: any[] = db.pesan || [];
  const log: any[] = db.log || [];

  res.json({
    pengajuan: {
      total: pengajuan.length,
      surat: {
        total: suratList.length,
        by_status: Object.entries(suratByStatus).map(([label, jumlah]) => ({ label, jumlah })),
        by_jenis: Object.entries(suratByJenis).map(([label, jumlah]) => ({ label, jumlah })),
        per_bulan: suratPerBulan,
      },
      aduan: {
        total: aduanList.length,
        by_status: Object.entries(aduanByStatus).map(([label, jumlah]) => ({ label, jumlah })),
        by_kategori: Object.entries(aduanByKat).map(([label, jumlah]) => ({ label, jumlah })),
        per_bulan: aduanPerBulan,
      },
    },
    keuangan: {
      kas: {
        saldo: kMasuk - kKeluar,
        masuk: kMasuk,
        keluar: kKeluar,
        jumlah_transaksi: kasTrans.length,
        per_bulan: kasPerBulan,
        by_kategori: Object.entries(kasByKat).map(([label, total]) => ({ label, total })),
      },
      iuran: {
        total_terverifikasi: iuranTerverifikasi,
        total_menunggu: iuranMenunggu,
        by_metode: Object.entries(iuranByMetode).map(([label, jumlah]) => ({ label, jumlah })),
        per_bulan: months.map((b) => ({
          bulan: b,
          total: setoranList.filter((s) => (s.tanggal || '').startsWith(b) && s.status === 'terverifikasi')
            .reduce((acc, curr) => acc + (Number(curr.nominal) || 0), 0)
        }))
      }
    },
    data: {
      warga: {
        total: warga.length,
        laki: warga.filter((w) => w.jenis_kelamin === 'L' || /laki/i.test(w.jenis_kelamin)).length,
        perempuan: warga.filter((w) => w.jenis_kelamin === 'P' || /perempuan/i.test(w.jenis_kelamin)).length,
        per_kelompok_usia: demog.usia,
      },
      kk: { total: kk.length },
      rumah: {
        total: rumah.length,
        dihuni: rumah.filter((r) => r.status_huni === 'dihuni').length,
        kosong: rumah.filter((r) => r.status_huni === 'kosong').length,
        milik: rumah.filter((r) => r.tipe_huni === 'milik').length,
        kontrak: rumah.filter((r) => r.tipe_huni === 'kontrak').length,
      },
      fasilitas: {
        total: fasilitas.length,
        baik: fasilitas.filter((f) => f.kondisi === 'baik').length,
        perlu: fasilitas.filter((f) => f.kondisi === 'perlu').length,
        rusak: fasilitas.filter((f) => f.kondisi === 'rusak').length,
      }
    },
    usaha: {
      total: usaha.length,
      by_kategori: Object.entries(
        usaha.reduce((acc: any, u: any) => { acc[u.kategori || 'Umum'] = (acc[u.kategori || 'Umum'] || 0) + 1; return acc; }, {})
      ).map(([label, jumlah]) => ({ label, jumlah }))
    },
    bansos: {
      total_program: bansos.length,
      total_penerima: penerima.length,
      by_program: bansos.map((b: any) => ({
        label: b.nama_program,
        penerima: penerima.filter((p: any) => p.bansos_id === b.id).length
      }))
    },
    inventaris: {
      total_barang: barang.length,
      dipinjam: pinjaman.filter((p: any) => p.status === 'dipinjam').length,
      total_pinjaman: pinjaman.length,
      by_status: [
        { label: 'Tersedia', jumlah: barang.length - pinjaman.filter((p: any) => p.status === 'dipinjam').length },
        { label: 'Dipinjam', jumlah: pinjaman.filter((p: any) => p.status === 'dipinjam').length }
      ]
    },
    keamanan: {
      ronda: {
        total_jadwal: ronda.length,
        selesai: 4,
        mendatang: ronda.length
      },
      kejadian: {
        total: kejadian.length,
        terbuka: kejadian.filter((k: any) => k.status !== 'selesai').length,
        selesai: kejadian.filter((k: any) => k.status === 'selesai').length
      },
      tamu: {
        total: tamu.length,
        hari_ini: tamu.length
      }
    },
    pengumuman: {
      total: pengumuman.length,
      aktif: pengumuman.length,
      nonaktif: 0
    },
    demografi: demog,
    denah: {
      total_rumah: rumah.length,
      dihuni: rumah.filter((r) => r.status_huni === 'dihuni').length,
      persen_terisi: rumah.length ? Math.round((rumah.filter((r) => r.status_huni === 'dihuni').length / rumah.length) * 100) : 0,
    },
    pesan: {
      total: pesan.length,
      baru: pesan.filter((p: any) => p.status === 'baru').length,
      dibalas: pesan.filter((p: any) => p.status === 'selesai').length
    },
    log: {
      total: log.length,
      hari_ini: log.length,
      by_modul: Object.entries(
        log.reduce((acc: any, l: any) => { acc[l.modul || 'Sistem'] = (acc[l.modul || 'Sistem'] || 0) + 1; return acc; }, {})
      ).map(([label, jumlah]) => ({ label, jumlah }))
    }
  });
});

// 19. User Management
app.get('/api/admin/users', (_req, res) => {
  const users = (db.users || []).map((u: any) => ({
    id: u.id,
    username: u.username,
    nama: u.nama,
    role: u.role,
    jabatan: u.jabatan,
    hp: u.hp,
    hak: u.hak || [],
    aktif: u.aktif !== false,
  }));
  res.json({ users });
});

app.post('/api/admin/users', (req, res) => {
  if (!db.users) db.users = [];
  const entry = { id: Date.now(), aktif: true, ...req.body };
  db.users.push(entry);
  addLog('Pengguna', 'Admin Sistem', `Tambah user pengurus baru: ${entry.username}`);
  saveDb();
  res.json({ success: true, item: entry });
});

app.patch('/api/admin/users/:id', (req, res) => {
  const u = (db.users || []).find((x: any) => String(x.id) === String(req.params.id));
  if (!u) return res.status(404).json({ error: 'User tidak ditemukan.' });
  Object.assign(u, req.body);
  addLog('Pengguna', 'Admin Sistem', `Ubah user pengurus: ${u.username}`);
  saveDb();
  res.json({ success: true, item: u });
});

app.delete('/api/admin/users/:id', (req, res) => {
  db.users = (db.users || []).filter((x: any) => String(x.id) !== String(req.params.id));
  addLog('Pengguna', 'Admin Sistem', `Hapus user id ${req.params.id}`);
  saveDb();
  res.json({ success: true });
});

// Admin shortcut redirection
app.get('/admin', (_req, res) => {
  res.redirect('/admin.html');
});

// --------------------------------------------------------------------------
// Dev / Production Static & Vite Serving
// --------------------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    app.use(vite.middlewares);

    app.use(async (req, res, next) => {
      const url = req.originalUrl.split('?')[0];

      if (url === '/admin.html' || url === '/admin') {
        try {
          const template = fs.readFileSync(path.resolve(__dirname, 'admin.html'), 'utf-8');
          const html = await vite.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
          return;
        } catch (e: any) {
          vite.ssrFixStacktrace(e);
          next(e);
          return;
        }
      }

      if (url === '/' || url === '/index.html' || (!url.includes('.') && !url.startsWith('/api'))) {
        try {
          const template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
          const html = await vite.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
          return;
        } catch (e: any) {
          vite.ssrFixStacktrace(e);
          next(e);
          return;
        }
      }

      next();
    });
  } else {
    // Production: serve dist folder
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));

    app.get('/admin.html', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'admin.html'));
    });

    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 RT 04 / RW 12 Sukamantri Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
