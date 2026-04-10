// Mock data for the disaster relief management system

export const mockVolunteers = [
  {
    id: 1,
    name: 'Sarah Johnson',
    email: 'sarah.j@email.com',
    phone: '(555) 123-4567',
    status: 'active',
    location: 'Zone A - Sector 3',
    skills: ['Medical', 'Translation'],
    hoursThisWeek: 24,
    assignedTasks: 3,
    completedTasks: 15,
    joinDate: '2024-01-15',
    lastActive: '5 min ago'
  },
  {
    id: 2,
    name: 'Michael Chen',
    email: 'mike.chen@email.com',
    phone: '(555) 234-5678',
    status: 'available',
    location: 'Zone B - Sector 1',
    skills: ['Logistics', 'Heavy Lifting'],
    hoursThisWeek: 18,
    assignedTasks: 2,
    completedTasks: 23,
    joinDate: '2024-02-01',
    lastActive: '2 hours ago'
  },
  {
    id: 3,
    name: 'Emily Rodriguez',
    email: 'emily.r@email.com',
    phone: '(555) 345-6789',
    status: 'off_duty',
    location: 'Zone C - Sector 2',
    skills: ['Child Care', 'Cooking'],
    hoursThisWeek: 0,
    assignedTasks: 0,
    completedTasks: 8,
    joinDate: '2024-03-10',
    lastActive: '1 day ago'
  },
];

export const mockInventory = [
  {
    id: 1,
    name: 'Medical Supplies - Antibiotics',
    category: 'Medical',
    currentStock: 45,
    minStock: 100,
    maxStock: 500,
    location: 'Warehouse A - Section 2',
    lastUpdated: '2 hours ago',
    status: 'critical',
    unit: 'boxes',
    supplier: 'MedCorp Solutions'
  },
  {
    id: 2,
    name: 'Emergency Food Packages',
    category: 'Food',
    currentStock: 1250,
    minStock: 500,
    maxStock: 2000,
    location: 'Warehouse B - Section 1',
    lastUpdated: '30 min ago',
    status: 'good',
    unit: 'packages',
    supplier: 'Relief Foods Inc'
  },
  {
    id: 3,
    name: 'Water Purification Tablets',
    category: 'Water',
    currentStock: 78,
    minStock: 200,
    maxStock: 1000,
    location: 'Warehouse A - Section 3',
    lastUpdated: '1 hour ago',
    status: 'low',
    unit: 'bottles',
    supplier: 'AquaSafe Corp'
  },
  {
    id: 4,
    name: 'Emergency Blankets',
    category: 'Shelter',
    currentStock: 890,
    minStock: 300,
    maxStock: 1500,
    location: 'Warehouse C - Section 1',
    lastUpdated: '45 min ago',
    status: 'good',
    unit: 'pieces',
    supplier: 'Warmth Solutions'
  },
];

export const mockLocations = [
  {
    id: 1,
    type: 'volunteer',
    name: 'Relief Team Alpha',
    lat: 40.7128,
    lng: -74.0060,
    status: 'active',
    details: '5 volunteers, Medical supplies',
    timestamp: '2 min ago'
  },
  {
    id: 2,
    type: 'request',
    name: 'Emergency Aid Request',
    lat: 40.7589,
    lng: -73.9851,
    status: 'urgent',
    details: '50 families, Food and water needed',
    timestamp: '5 min ago'
  },
  {
    id: 3,
    type: 'warehouse',
    name: 'Distribution Center B',
    lat: 40.6892,
    lng: -74.0445,
    status: 'operational',
    details: 'Medical supplies, Food packages',
    timestamp: '1 hour ago'
  },
  {
    id: 4,
    type: 'completed',
    name: 'Relief Operation Complete',
    lat: 40.7505,
    lng: -73.9934,
    status: 'completed',
    details: '120 families served',
    timestamp: '3 hours ago'
  },
];

export const mockVolunteerTasks = [
  {
    id: 'TASK-001',
    title: 'Food Distribution - Zone A',
    priority: 'high',
    status: 'assigned',
    location: 'Community Center, Zone A',
    scheduledTime: '2024-12-20T09:00:00',
    estimatedDuration: '4 hours',
    teamSize: 6,
    description: 'Distribute emergency food packages to affected families'
  },
  {
    id: 'TASK-002',
    title: 'Medical Supply Delivery',
    priority: 'medium',
    status: 'in_progress',
    location: 'Relief Station B',
    scheduledTime: '2024-12-20T14:00:00',
    estimatedDuration: '2 hours',
    teamSize: 3,
    description: 'Transport medical supplies to remote relief station'
  },
];

export const mockVolunteerAssignments = [
  {
    id: 1,
    title: 'Emergency Response Team Lead',
    area: 'Zone A - Sectors 1-3',
    type: 'leadership',
    status: 'active',
    startDate: '2024-12-15',
    volunteers: 12
  },
  {
    id: 2,
    title: 'Medical Aid Coordinator',
    area: 'Mobile Unit 2',
    type: 'specialized',
    status: 'scheduled',
    startDate: '2024-12-22',
    volunteers: 4
  },
];

export const mockDonations = [
  {
    id: 'DON-001',
    amount: 5000,
    date: '2024-12-15',
    project: 'Emergency Food Relief',
    status: 'processed',
    impact: '250 families fed for 1 week'
  },
  {
    id: 'DON-002',
    amount: 2500,
    date: '2024-12-01',
    project: 'Medical Supply Drive',
    status: 'delivered',
    impact: '100 medical kits distributed'
  },
];

export const mockAidRequests = [
  {
    id: 'REQ-001',
    type: 'Medical',
    status: 'in_progress',
    priority: 'high',
    submitted: '2 days ago',
    estimatedResponse: 'Within 24 hours',
    assignedTeam: 'Medical Team Alpha'
  },
  {
    id: 'REQ-002',
    type: 'Food & Water',
    status: 'completed',
    priority: 'medium',
    submitted: '5 days ago',
    completedDate: '3 days ago',
    assignedTeam: 'Relief Team Beta'
  },
];

export const mockAvailableResources = [
  { name: 'Emergency Shelter', location: '0.5 miles away', available: true },
  { name: 'Food Distribution Center', location: '1.2 miles away', available: true },
  { name: 'Medical Station', location: '0.8 miles away', available: true },
  { name: 'Emergency Hotline', contact: '1-800-RELIEF', available: true },
];

export const mockActiveProjects = [
  {
    id: 1,
    name: 'Winter Shelter Program',
    goal: 50000,
    raised: 34500,
    donors: 145,
    daysLeft: 12,
    urgency: 'high'
  },
  {
    id: 2,
    name: 'Clean Water Initiative',
    goal: 25000,
    raised: 18200,
    donors: 89,
    daysLeft: 25,
    urgency: 'medium'
  },
];