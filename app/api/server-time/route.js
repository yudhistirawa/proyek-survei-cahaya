export const dynamic = 'force-dynamic';

export async function GET() {
  // Selalu kembalikan waktu server dalam UTC ISO
  const now = new Date().toISOString();
  return new Response(JSON.stringify({ now }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
