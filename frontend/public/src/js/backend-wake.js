// API requests are sent directly to the backend.
// Do not poll /api/health or delay fetch calls from this file: Render handles
// service startup, and the API request itself should reach the service at once.
