    // Mengimpor modul yang diperlukan untuk Firebase Functions
    const functions = require('firebase-functions');
    const admin = require('firebase-admin');
    const cors = require('cors')({ origin: true }); // Mengaktifkan CORS untuk menerima permintaan dari frontend

    // Inisialisasi Firebase Admin SDK
    admin.initializeApp();
    const db = admin.firestore(); // Mendapatkan instance Firestore

    // ===================================================================
    // == Firebase Function: POST untuk Menyimpan/Memperbarui Laporan ==
    // ===================================================================
    // Fungsi ini akan menangani permintaan POST
    exports.saveReport = functions.https.onRequest((req, res) => {
      cors(req, res, async () => { // Gunakan middleware CORS
        if (req.method !== 'POST') {
          return res.status(405).send('Method Not Allowed');
        }

        try {
          const reportData = req.body; // Data dikirim di body permintaan
          const { id, ...dataToSave } = reportData;

          // Validasi data sederhana
          if (!dataToSave.surveyorName || !dataToSave.gridData || !dataToSave.projectTitle) {
            return res.status(400).json({ message: 'Data tidak lengkap. Nama petugas, judul proyek, dan data grid diperlukan.' });
          }

          // Buat versi lowercase dari nama petugas untuk query case-insensitive
          const dataWithLowercase = {
            ...dataToSave,
            surveyorName_lowercase: dataToSave.surveyorName.toLowerCase() // Pastikan nama kolom di database Anda 'surveyorName_lowercase'
          };

          let resultData;

          if (id) {
            // --- LOGIKA UPDATE DENGAN FIRESTORE ---
            const docRef = db.collection("laporan").doc(id);
            await docRef.update({
              ...dataWithLowercase,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(), // Timestamp dari server Firestore
            });
            resultData = { id: id };
            return res.status(200).json({ id: id, message: 'Laporan berhasil diperbarui' });

          } else {
            // --- LOGIKA CREATE DENGAN FIRESTORE ---
            const docRef = await db.collection("laporan").add({
              ...dataWithLowercase,
              createdAt: admin.firestore.FieldValue.serverTimestamp() // Timestamp dari server Firestore
            });
            resultData = { id: docRef.id };
            return res.status(201).json({ id: docRef.id });
          }

        } catch (error) {
          console.error('Firebase Function POST Error:', error);
          return res.status(500).json({ message: 'Terjadi kesalahan di server saat menyimpan laporan.', error: error.message });
        }
      });
    });

    // ===================================================================
    // == Firebase Function: GET untuk Mengambil Laporan             ==
    // ===================================================================
    // Fungsi ini akan menangani permintaan GET
    exports.getReports = functions.https.onRequest((req, res) => {
      cors(req, res, async () => { // Gunakan middleware CORS
        if (req.method !== 'GET') {
          return res.status(405).send('Method Not Allowed');
        }

        try {
          // Mengambil parameter query dari URL permintaan
          const surveyorName = req.query.surveyorName;
          
          let queryRef;

          if (surveyorName) {
            // Filter berdasarkan nama petugas (case-insensitive)
            queryRef = db.collection("laporan").where('surveyorName_lowercase', '==', surveyorName.toLowerCase());
          } else {
            // Ambil semua laporan
            queryRef = db.collection("laporan");
          }
          
          const querySnapshot = await queryRef.get();
          
          const reportsData = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              // Mengubah objek Timestamp Firestore menjadi string yang dapat dibaca oleh klien
              createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
              updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
            };
          });

          // Lakukan pengurutan data di server setelah data diambil
          reportsData.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB - dateA; // Urutkan dari yang terbaru ke terlama
          });

          return res.status(200).json(reportsData);

        } catch (error) {
          console.error('Firebase Function GET Error:', error);
          return res.status(500).json({ message: 'Terjadi kesalahan di server saat mengambil laporan.', error: error.message });
        }
      });
    });
    