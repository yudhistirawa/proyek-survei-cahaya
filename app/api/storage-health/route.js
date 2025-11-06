import { NextResponse } from 'next/server';
import { getAdminBucket } from '../../lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const usingEnvBucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || null;
  const projectIdEnv = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || null;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || null;

  try {
    const bucket = await getAdminBucket();
    const [metadata] = await bucket.getMetadata();

    return NextResponse.json({
      ok: true,
      usingEnvBucket,
      resolvedBucketId: metadata.name,
      location: metadata.location,
      projectNumber: metadata.projectNumber
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      usingEnvBucket,
      projectIdEnv,
      clientEmail,
      code: error.code || null,
      message: error.message || String(error)
    }, { status: 500 });
  }
}
