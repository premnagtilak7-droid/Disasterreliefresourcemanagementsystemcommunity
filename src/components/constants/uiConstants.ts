// UI Constants for consistent styling and configuration

export const statusColors = {
  active: 'bg-green-100 text-green-800',
  available: 'bg-blue-100 text-blue-800',
  off_duty: 'bg-gray-100 text-gray-800',
  busy: 'bg-yellow-100 text-yellow-800',
  critical: 'bg-red-100 text-red-800',
  low: 'bg-yellow-100 text-yellow-800',
  good: 'bg-green-100 text-green-800',
  overstocked: 'bg-blue-100 text-blue-800',
  urgent: 'bg-red-500',
  operational: 'bg-blue-500',
  completed: 'bg-gray-500',
  pending: 'bg-yellow-500',
};

export const categoryColors = {
  Medical: 'bg-red-50 text-red-700',
  Food: 'bg-green-50 text-green-700',
  Water: 'bg-blue-50 text-blue-700',
  Shelter: 'bg-purple-50 text-purple-700',
};

export const roleColors = {
  admin: 'bg-red-100 text-red-800',
  volunteer: 'bg-blue-100 text-blue-800',
  victim: 'bg-orange-100 text-orange-800',
};

export const priorityLevels = [
  { value: 'low', label: 'Low Priority', color: 'bg-blue-100 text-blue-800' },
  { value: 'medium', label: 'Medium Priority', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High Priority', color: 'bg-orange-100 text-orange-800' },
  { value: 'critical', label: 'Critical Emergency', color: 'bg-red-100 text-red-800' },
];

export const aidTypes = [
  { 
    id: 'food', 
    label: 'Food & Water', 
    description: 'Emergency food supplies and clean water' 
  },
  { 
    id: 'medical', 
    label: 'Medical Aid', 
    description: 'Medical supplies and healthcare assistance' 
  },
  { 
    id: 'shelter', 
    label: 'Shelter', 
    description: 'Temporary housing and shelter materials' 
  },
  { 
    id: 'emergency', 
    label: 'Emergency Rescue', 
    description: 'Immediate rescue and evacuation' 
  },
];

export const navigationItems = {
  admin: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'volunteers', label: 'Volunteers' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'map', label: 'Map View' },
  ],
  volunteer: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'tasks', label: 'My Tasks' },
    { id: 'assignments', label: 'Assignments' },
    { id: 'map', label: 'Field Map' },
  ],
  victim: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'request', label: 'Request Aid' },
    { id: 'status', label: 'Aid Status' },
    { id: 'resources', label: 'Resources' },
  ],
};

export const roleDescriptions = {
  admin: 'Manage resources, volunteers, and system operations',
  volunteer: 'Coordinate aid delivery and field operations',
  victim: 'Request assistance and track aid status',
};
