import { NextResponse } from 'next/server';
import { adminDb } from '../../lib/firebase-admin.js';

// DELETE dummy survey docs by street names for the current admin
export async function POST(request) {
  try {
    const url = new URL(request.url);
    const qpAdmin = url.searchParams.get('admin') || '';
    const adminId = request.headers.get('x-admin-id') || qpAdmin || '';
    if (!adminId) {
      return NextResponse.json({ success: false, error: 'Admin ID header (x-admin-id) required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const qpNames = (url.searchParams.get('names') || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const names = Array.isArray(body?.names) && body.names.length > 0
      ? body.names
      : (qpNames.length > 0 ? qpNames : ['Jalan Sudirman', 'Jalan Thamrin']);

    const collections = [
      'survey_existing',
      'Survey_Existing_Report',
      'apj_propose_tiang',
      'APJ_Propose_Tiang'
    ];

    let deleted = 0;

    for (const col of collections) {
      for (const name of names) {
        const snap = await adminDb
          .collection(col)
          .where('adminId', '==', adminId)
          .where('namaJalan', '==', name)
          .get();

        if (!snap.empty) {
          const batch = adminDb.batch();
          snap.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
          deleted += snap.size;
        }

        // Fallback: some docs may store street name as 'nama_jalan'
        const snapAlt = await adminDb
          .collection(col)
          .where('adminId', '==', adminId)
          .where('nama_jalan', '==', name)
          .get();
        if (!snapAlt.empty) {
          const batch2 = adminDb.batch();
          snapAlt.docs.forEach(d => batch2.delete(d.ref));
          await batch2.commit();
          deleted += snapAlt.size;
        }
      }
    }

    return NextResponse.json({ success: true, deleted, names, adminId });
  } catch (error) {
    console.error('cleanup-dummy-surveys error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
