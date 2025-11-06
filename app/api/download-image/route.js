import { NextResponse } from 'next/server';

// Simple in-memory cache for frequently accessed images
const imageCache = new Map();
const CACHE_MAX_SIZE = 50; // Maximum number of cached images
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes TTL

export async function POST(request) {
    try {
        // Cleanup expired cache entries
        cleanupCache();

        const { imageUrl } = await request.json();
        
        if (!imageUrl) {
            return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
        }

        // Check cache first
        const cacheKey = imageUrl;
        const cached = imageCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return NextResponse.json({ 
                success: true, 
                base64Data: cached.data,
                contentType: cached.contentType,
                fromCache: true
            });
        }

        // Fetch image from Firebase Storage URL with optimized settings
        const response = await fetch(imageUrl, {
            method: 'GET',
            headers: {
                'Accept': 'image/*',
                'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
            },
            // Add timeout and connection optimizations
            signal: AbortSignal.timeout(30000), // 30 second timeout
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const contentType = response.headers.get('content-type') || 'image/webp';

        // Cache the result if cache isn't full
        if (imageCache.size < CACHE_MAX_SIZE) {
            imageCache.set(cacheKey, {
                data: base64,
                contentType: contentType,
                timestamp: Date.now()
            });
        } else {
            // Remove oldest entry if cache is full
            const oldestKey = imageCache.keys().next().value;
            imageCache.delete(oldestKey);
            imageCache.set(cacheKey, {
                data: base64,
                contentType: contentType,
                timestamp: Date.now()
            });
        }

        return NextResponse.json({ 
            success: true, 
            base64Data: base64,
            contentType: contentType,
            fromCache: false
        }, {
            headers: {
                'Cache-Control': 'public, max-age=3600', // Cache response for 1 hour
                'ETag': `"${Buffer.from(imageUrl).toString('base64')}"` // Simple ETag
            }
        });

    } catch (error) {
        console.error('Error downloading image:', error);
        return NextResponse.json({ 
            error: 'Failed to download image',
            details: error.message 
        }, { status: 500 });
    }
}

// Clean up expired cache entries when needed
function cleanupCache() {
    const now = Date.now();
    for (const [key, value] of imageCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            imageCache.delete(key);
        }
    }
}
