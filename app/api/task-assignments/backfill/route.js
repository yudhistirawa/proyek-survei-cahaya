import { NextResponse } from 'next/server';
import { adminDb } from '../../../lib/firebase-admin.js';

// POST - Backfill createdBy on task_assignments
export async function POST(request) {
  try {
    const adminId = request.headers.get('x-admin-id') || '';
    if (!adminId) {
      return NextResponse.json({ success: false, error: 'Admin ID is required in headers' }, { status: 401 });
    }

    const { limit = 500 } = await request.json().catch(() => ({ limit: 500 }));

    // Collect docs where createdBy is 'admin' or ''
    const queries = [
      adminDb.collection('task_assignments').where('createdBy', '==', 'admin').limit(limit),
      adminDb.collection('task_assignments').where('createdBy', '==', '').limit(limit)
    ];

    let targets = [];
    for (const q of queries) {
      const snap = await q.get();
      for (const doc of snap.docs) {
        targets.push(doc);
      }
    }

    // Also try to find docs missing createdBy (best-effort): fetch recent docs and filter
    const recentSnap = await adminDb.collection('task_assignments').orderBy('createdAt', 'desc').limit(limit).get().catch(() => null);
    if (recentSnap && !recentSnap.empty) {
      for (const d of recentSnap.docs) {
        const data = d.data() || {};
        if (!('createdBy' in data) || data.createdBy === null || typeof data.createdBy === 'undefined') {
          targets.push(d);
        }
      }
    }

    if (targets.length === 0) {
      return NextResponse.json({ success: true, updated: 0, message: 'No documents to backfill' });
    }

    // Deduplicate by id
    const map = new Map();
    for (const d of targets) map.set(d.id, d);
    const uniqueTargets = Array.from(map.values());

    const batch = adminDb.batch();
    let count = 0;
    for (const d of uniqueTargets) {
      batch.update(d.ref, { createdBy: adminId, updatedAt: new Date() });
      count++;
      if (count % 450 === 0) { // stay below batch limit 500
        await batch.commit();
      }
    }
    await batch.commit();

    return NextResponse.json({ success: true, updated: uniqueTargets.length });
  } catch (error) {
    console.error('Backfill error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
