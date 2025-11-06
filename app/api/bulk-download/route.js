import { NextResponse } from 'next/server';

// Optimized bulk download for multiple images
export async function POST(request) {
    try {
        const { imageUrls } = await request.json();
        
        if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
            return NextResponse.json({ error: 'imageUrls must be a non-empty array' }, { status: 400 });
        }

        // Limit concurrent downloads to prevent overwhelming the server
        const CONCURRENT_LIMIT = 10;
        const results = [];
        
        // Process images in batches
        for (let i = 0; i < imageUrls.length; i += CONCURRENT_LIMIT) {
            const batch = imageUrls.slice(i, i + CONCURRENT_LIMIT);
            
            const batchPromises = batch.map(async (imageUrl, index) => {
                try {
                    // Use optimized fetch with connection reuse
                    const response = await fetch(imageUrl, {
                        method: 'GET',
                        headers: {
                            'Accept': 'image/*',
                            'Cache-Control': 'public, max-age=3600',
                            'Connection': 'keep-alive', // Reuse connections
                        },
                        signal: AbortSignal.timeout(20000), // 20 second timeout per image
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const arrayBuffer = await response.arrayBuffer();
                    const base64 = Buffer.from(arrayBuffer).toString('base64');
                    const contentType = response.headers.get('content-type') || 'image/webp';

                    return {
                        success: true,
                        url: imageUrl,
                        base64Data: base64,
                        contentType: contentType,
                        index: i + index
                    };
                } catch (error) {
                    console.error(`Error downloading image ${imageUrl}:`, error);
                    return {
                        success: false,
                        url: imageUrl,
                        error: error.message,
                        index: i + index
                    };
                }
            });

            // Wait for current batch to complete
            const batchResults = await Promise.allSettled(batchPromises);
            
            // Extract results from Promise.allSettled
            batchResults.forEach(result => {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                } else {
                    results.push({
                        success: false,
                        error: result.reason?.message || 'Unknown error',
                        index: results.length
                    });
                }
            });
        }

        // Sort results by original index to maintain order
        results.sort((a, b) => a.index - b.index);

        const successCount = results.filter(r => r.success).length;
        const failureCount = results.length - successCount;

        return NextResponse.json({
            success: true,
            results: results,
            summary: {
                total: imageUrls.length,
                successful: successCount,
                failed: failureCount
            }
        }, {
            headers: {
                'Cache-Control': 'public, max-age=1800', // Cache for 30 minutes
            }
        });

    } catch (error) {
        console.error('Error in bulk download:', error);
        return NextResponse.json({ 
            error: 'Failed to process bulk download',
            details: error.message 
        }, { status: 500 });
    }
}
