// Utility function to log user activities
export const logActivity = async (activityData) => {
    try {
        // Get client IP address (best effort)
        const getClientIP = async () => {
            try {
                const response = await fetch('https://api.ipify.org?format=json');
                const data = await response.json();
                return data.ip;
            } catch {
                return 'Unknown';
            }
        };

        const ipAddress = await getClientIP();
        const userAgent = navigator.userAgent;

        const logData = {
            ...activityData,
            ipAddress,
            userAgent,
            timestamp: new Date().toISOString()
        };

        const response = await fetch('/api/activity-logs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(logData),
        });

        if (!response.ok) {
            console.error('Failed to log activity:', await response.text());
        }
    } catch (error) {
        console.error('Error logging activity:', error);
    }
};

// Predefined activity types
export const ACTIVITY_TYPES = {
    // Authentication
    LOGIN: 'login',
    LOGOUT: 'logout',
    
    // Report management
    CREATE_REPORT: 'create_report',
    EDIT_REPORT: 'edit_report',
    DELETE_REPORT: 'delete_report',
    VIEW_REPORT: 'view_report',
    EXPORT_REPORT: 'export_report',
    
    // Task management
    ASSIGN_TASK: 'assign_task',
    UPDATE_TASK: 'update_task',
    DELETE_TASK: 'delete_task',
    VIEW_TASK: 'view_task',
    COMPLETE_TASK: 'complete_task',
    
    // Admin actions
    ADMIN_ACCESS: 'admin_access',
    BULK_DELETE: 'bulk_delete',
    BULK_EXPORT: 'bulk_export',
    
    // System
    PAGE_VIEW: 'page_view',
    ERROR: 'error'
};

// Helper functions for common activities
export const logLogin = (userName, userType) => {
    return logActivity({
        userName,
        userType,
        action: ACTIVITY_TYPES.LOGIN,
        details: `User ${userName} logged in as ${userType}`
    });
};

export const logLogout = (userName, userType) => {
    return logActivity({
        userName,
        userType,
        action: ACTIVITY_TYPES.LOGOUT,
        details: `User ${userName} logged out`
    });
};

export const logReportCreate = (userName, userType, reportTitle) => {
    return logActivity({
        userName,
        userType,
        action: ACTIVITY_TYPES.CREATE_REPORT,
        details: `Created report: ${reportTitle}`
    });
};

export const logReportEdit = (userName, userType, reportTitle) => {
    return logActivity({
        userName,
        userType,
        action: ACTIVITY_TYPES.EDIT_REPORT,
        details: `Edited report: ${reportTitle}`
    });
};

export const logReportDelete = (userName, userType, reportTitle) => {
    return logActivity({
        userName,
        userType,
        action: ACTIVITY_TYPES.DELETE_REPORT,
        details: `Deleted report: ${reportTitle}`
    });
};

export const logReportView = (userName, userType, reportTitle) => {
    return logActivity({
        userName,
        userType,
        action: ACTIVITY_TYPES.VIEW_REPORT,
        details: `Viewed report: ${reportTitle}`
    });
};

export const logReportExport = (userName, userType, reportTitle) => {
    return logActivity({
        userName,
        userType,
        action: ACTIVITY_TYPES.EXPORT_REPORT,
        details: `Exported report: ${reportTitle}`
    });
};

export const logAdminAccess = (userName) => {
    return logActivity({
        userName,
        userType: 'admin',
        action: ACTIVITY_TYPES.ADMIN_ACCESS,
        details: `Admin ${userName} accessed admin panel`
    });
};

export const logBulkDelete = (userName, userType, count) => {
    return logActivity({
        userName,
        userType,
        action: ACTIVITY_TYPES.BULK_DELETE,
        details: `Bulk deleted ${count} reports`
    });
};

export const logBulkExport = (userName, userType, count) => {
    return logActivity({
        userName,
        userType,
        action: ACTIVITY_TYPES.BULK_EXPORT,
        details: `Bulk exported ${count} reports`
    });
};

export const logPageView = (userName, userType, pageName) => {
    return logActivity({
        userName,
        userType,
        action: ACTIVITY_TYPES.PAGE_VIEW,
        details: `Viewed page: ${pageName}`
    });
};

export const logError = (userName, userType, errorMessage) => {
    return logActivity({
        userName,
        userType,
        action: ACTIVITY_TYPES.ERROR,
        details: `Error occurred: ${errorMessage}`
    });
};

// Helper function to log grid input activities
export const logGridInput = (userName, userType, x, y, value, details = '') => {
    return logActivity({
        userName,
        userType,
        action: 'grid_input',
        details: details || `Input data at grid (${x}, ${y}) with value: ${value}`,
        gridData: {
            x,
            y,
            value,
            timestamp: new Date().toISOString()
        }
    });
};

// Helper function to log image upload activities
export const logImageUpload = (userName, userType, file, uploadUrl, details = '') => {
    return logActivity({
        userName,
        userType,
        action: 'image_upload',
        details: details || `Uploaded image: ${file.name}`,
        imageData: {
            filename: file.name,
            size: file.size,
            type: file.type,
            width: file.width || null,
            height: file.height || null,
            url: uploadUrl,
            timestamp: new Date().toISOString()
        }
    });
};

// Helper function to log admin view actions with detailed data
export const logAdminViewDetailed = (userName, reportId, reportTitle, reportDate, details = '') => {
    return logActivity({
        userName,
        userType: 'admin',
        action: ACTIVITY_TYPES.VIEW_REPORT,
        details: details || `Viewed report: ${reportTitle}`,
        adminAction: {
            viewData: {
                reportId,
                title: reportTitle,
                date: reportDate
            }
        }
    });
};

// Helper function to log admin edit actions with before/after data
export const logAdminEditDetailed = (userName, beforeData, afterData, details = '') => {
    return logActivity({
        userName,
        userType: 'admin',
        action: ACTIVITY_TYPES.EDIT_REPORT,
        details: details || `Edited report data`,
        adminAction: {
            editData: {
                before: beforeData,
                after: afterData,
                timestamp: new Date().toISOString()
            }
        }
    });
};

// Helper function to log admin delete actions with detailed data
export const logAdminDeleteDetailed = ({ userName, details, deletedData }) => {
    return logActivity({
        userName,
        userType: 'admin',
        action: ACTIVITY_TYPES.DELETE_REPORT,
        details,
        adminAction: {
            deleteData: {
                ...deletedData,
                deletedAt: new Date().toISOString()
            }
        }
    });
};

// Helper functions for task management activities
export const logTaskAssignment = (adminName, taskData) => {
    const taskTypeLabel = taskData.taskType === 'existing' ? 'Zona Existing' : 'Propose';
    const proposeDataInfo = taskData.proposeData && taskData.proposeData.length > 0 
        ? ` dengan ${taskData.proposeData.length} data propose` 
        : '';
    
    return logActivity({
        userName: adminName,
        userType: 'admin',
        action: ACTIVITY_TYPES.ASSIGN_TASK,
        details: `Memberikan tugas ${taskTypeLabel} kepada ${taskData.surveyorName} (${taskData.surveyorEmail})${proposeDataInfo}`,
        taskAction: {
            assignmentData: {
                taskId: taskData.id || 'pending',
                taskType: taskData.taskType,
                surveyorId: taskData.surveyorId,
                surveyorName: taskData.surveyorName,
                surveyorEmail: taskData.surveyorEmail,
                description: taskData.description,
                mapsLink: taskData.mapsLink,
                startDate: taskData.startDate,
                deadline: taskData.deadline,
                priority: taskData.priority,
                proposeDataCount: taskData.proposeData ? taskData.proposeData.length : 0,
                proposeData: taskData.proposeData || [],
                assignedAt: new Date().toISOString()
            }
        }
    });
};

export const logTaskUpdate = (adminName, taskId, updateData, details = '') => {
    return logActivity({
        userName: adminName,
        userType: 'admin',
        action: ACTIVITY_TYPES.UPDATE_TASK,
        details: details || `Updated task ${taskId}`,
        taskAction: {
            updateData: {
                taskId,
                changes: updateData,
                updatedAt: new Date().toISOString()
            }
        }
    });
};

export const logTaskView = (userName, userType, taskId, taskTitle) => {
    return logActivity({
        userName,
        userType,
        action: ACTIVITY_TYPES.VIEW_TASK,
        details: `Viewed task: ${taskTitle}`,
        taskAction: {
            viewData: {
                taskId,
                title: taskTitle,
                viewedAt: new Date().toISOString()
            }
        }
    });
};

export const logTaskCompletion = (userName, userType, taskId, taskTitle) => {
    return logActivity({
        userName,
        userType,
        action: ACTIVITY_TYPES.COMPLETE_TASK,
        details: `Completed task: ${taskTitle}`,
        taskAction: {
            completionData: {
                taskId,
                title: taskTitle,
                completedAt: new Date().toISOString()
            }
        }
    });
};

export const logTaskDeletion = (adminName, taskId, taskTitle, assignedTo) => {
    return logActivity({
        userName: adminName,
        userType: 'admin',
        action: ACTIVITY_TYPES.DELETE_TASK,
        details: `Deleted task: ${taskTitle} (assigned to ${assignedTo})`,
        taskAction: {
            deleteData: {
                taskId,
                title: taskTitle,
                assignedTo,
                deletedAt: new Date().toISOString()
            }
        }
    });
};
