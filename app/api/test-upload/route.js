import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Upload API endpoint test berhasil',
    endpoint: '/api/database-propose/upload',
    method: 'POST',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('kmzFile');
    
    return NextResponse.json({
      success: true,
      message: 'Test upload berhasil',
      fileName: file ? file.name : 'No file',
      fileSize: file ? file.size : 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 400 });
  }
} 