import { NextResponse } from 'next/server';
import { adminDb } from '../../lib/firebase-admin.js';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit')) || 50;
        const offset = parseInt(searchParams.get('offset')) || 0;
        const userType = searchParams.get('userType'); // 'admin' or 'petugas'
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        let query = adminDb.collection('activity_logs').orderBy('timestamp', 'desc');

        // Filter by user type if specified
        if (userType) {
            query = query.where('userType', '==', userType);
        }

        // Filter by date range if specified
        if (startDate) {
            query = query.where('timestamp', '>=', new Date(startDate));
        }
        if (endDate) {
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            query = query.where('timestamp', '<=', endDateTime);
        }

        const snapshot = await query.limit(limit).offset(offset).get();
        
        const logs = [];
        snapshot.forEach(doc => {
            logs.push({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp.toDate().toISOString()
            });
        });

        // Get total count for pagination
        const totalSnapshot = await adminDb.collection('activity_logs').get();
        const total = totalSnapshot.size;

        return NextResponse.json({
            logs,
            total,
            hasMore: (offset + limit) < total
        });

    } catch (error) {
        console.error('Error fetching activity logs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch activity logs', details: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const {
            userName,
            userType, // 'admin' or 'petugas'
            action, // 'login', 'logout', 'create_report', 'edit_report', 'delete_report', 'export_report'
            details,
            ipAddress,
            userAgent,
            gridData, // For grid input activities
            imageData, // For image upload activities
            adminAction // For detailed admin actions
        } = body;

        // Get device info from user agent
        const deviceInfo = parseUserAgent(userAgent);

        const logEntry = {
            userName: userName || 'Unknown',
            userType: userType || 'unknown',
            action: action || 'unknown',
            details: details || '',
            ipAddress: ipAddress || 'Unknown',
            userAgent: userAgent || 'Unknown',
            deviceType: deviceInfo.deviceType,
            browser: deviceInfo.browser,
            os: deviceInfo.os,
            timestamp: new Date(),
            createdAt: new Date()
        };

        // Add optional detailed data
        if (gridData) {
            logEntry.gridData = gridData;
        }

        if (imageData) {
            logEntry.imageData = imageData;
        }

        if (adminAction) {
            logEntry.adminAction = adminAction;
        }

        const docRef = await adminDb.collection('activity_logs').add(logEntry);

        return NextResponse.json({
            success: true,
            id: docRef.id,
            message: 'Activity logged successfully'
        });

    } catch (error) {
        console.error('Error logging activity:', error);
        return NextResponse.json(
            { error: 'Failed to log activity', details: error.message },
            { status: 500 }
        );
    }
}

// Helper function to parse user agent
function parseUserAgent(userAgent) {
    if (!userAgent) {
        return {
            deviceType: 'Unknown',
            browser: 'Unknown',
            os: 'Unknown'
        };
    }

    // Detect device type
    let deviceType = 'Desktop';
    if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
        deviceType = 'Mobile';
    } else if (/Tablet|iPad/i.test(userAgent)) {
        deviceType = 'Tablet';
    }

    // Detect browser
    let browser = 'Unknown';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    else if (userAgent.includes('Opera')) browser = 'Opera';

    // Detect OS
    let os = 'Unknown';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    return { deviceType, browser, os };
}
