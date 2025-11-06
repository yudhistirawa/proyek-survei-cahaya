# Mini Maps Feature Documentation

## Overview
The Mini Maps feature provides a floating, interactive map component that appears when a surveyor starts a task. It displays the user's current location, survey points, and task boundaries, and persists across all surveyor pages until the task is completed or the user logs out.

## Key Features

### 1. Global Persistence
- **Session Storage**: Uses `sessionStorage` to persist task state across page navigations
- **Global Visibility**: Mini maps appear on all surveyor pages when a task is active
- **Automatic Cleanup**: Task state is cleared on logout or task completion

### 2. Task Status Management
- **Persistent Status**: Task status (`pending`, `started`, `completed`) persists across page navigations
- **Button States**: 
  - "Mulai Tugas" (green) when task is pending
  - "Tugas Sedang Berlangsung" (grey, disabled) when task is started
  - "Tugas Selesai" (blue, disabled) when task is completed
  - "Selesai Tugas" (orange) button appears only when task is started

### 3. Map Functionality
- **Current Location**: Shows user's real-time GPS location
- **Survey Points**: Displays existing survey points from "Survey Existing" and "Survey APJ Propose"
- **Task Boundaries**: Shows polygons, coordinates, and lines from the assigned task
- **Interactive Controls**: Expand/collapse, close, and refresh location

## Technical Implementation

### Session Storage Keys
```javascript
sessionStorage.setItem('currentTaskId', taskId);
sessionStorage.setItem('currentTaskKmz', kmzUrl);
sessionStorage.setItem('currentTaskDest', JSON.stringify([lat, lng]));
```

### Component Integration
MiniMapsComponent is integrated into all surveyor pages:
- `SurveyorDashboardPage.js`
- `DaftarTugasPage.js`
- `DetailTugasPage.js`
- `SurveyExistingPage.js`
- `SurveyARMPage.js`
- `SurveyTiangAPJProposePage.js`
- `SurveyTiangAPJNewPage.js`
- `SurveyTrafoPage.js`
- `SurveyFasosFasumPage.js`
- `ValidSurveyDataPage.js`

### Task Status Initialization
```javascript
// In DetailTugasPage.js
useEffect(() => {
    const storedTaskId = sessionStorage.getItem('currentTaskId');
    if (storedTaskId === task.id) {
        setTaskStatus('started');
    } else if (task.status === 'completed') {
        setTaskStatus('completed');
    } else {
        setTaskStatus('pending');
    }
}, [task.id, task.status]);
```

### Event System
- `currentTaskChanged` event is dispatched when task starts/completes
- Components listen for this event to update their state
- Storage events are also listened to for cross-tab synchronization

## User Flow

### Starting a Task
1. User clicks "Mulai Tugas" in DetailTugasPage
2. Task status changes to 'started'
3. Session storage is updated with task data
4. `currentTaskChanged` event is dispatched
5. Alert "Berhasil Memulai Tugas" is shown
6. Mini maps automatically appear on all surveyor pages

### During Task Execution
- Mini maps remain visible on all surveyor pages
- User can hide/show mini maps using the floating button
- Task status persists when navigating between pages
- Survey points are updated in real-time

### Completing a Task
1. User clicks "Selesai Tugas" in DetailTugasPage
2. Task status changes to 'completed'
3. Session storage is cleared
4. `currentTaskChanged` event is dispatched
5. Alert shows completion message
6. Mini maps disappear from all pages

### Logout Cleanup
- Session storage is cleared on logout
- Mini maps disappear
- Task state is reset

## Map Data Structure
The mini maps expect task data in the same format as KMZMapComponent:
```javascript
{
    coordinates: [...], // Array of coordinate points
    polygons: [...],    // Array of polygon data
    lines: [...]        // Array of line data
}
```

## Styling and Animations
- Smooth slide-in/slide-out animations
- CSS transitions for show/hide states
- Responsive design for different screen sizes
- Custom markers and popups for different data types

## Error Handling
- Graceful fallbacks for geolocation errors
- Error states for map loading failures
- Console logging for debugging
- User-friendly error messages

## Future Enhancements
- Offline map support
- Route planning integration
- Real-time collaboration features
- Advanced filtering and search
