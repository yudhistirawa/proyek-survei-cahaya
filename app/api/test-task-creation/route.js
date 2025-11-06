import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Test endpoint berfungsi',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request) {
  try {
    const testData = await request.json();
    
    return NextResponse.json({
      success: true,
      message: 'Test POST berhasil',
      receivedData: testData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
