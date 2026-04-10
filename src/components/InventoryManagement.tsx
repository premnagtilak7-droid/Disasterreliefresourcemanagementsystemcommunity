import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Package, 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp, 
  Search,
  Filter,
  Plus,
  Truck,
  BarChart3
} from 'lucide-react';

const mockInventory = [
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

const statusColors = {
  critical: 'bg-red-100 text-red-800',
  low: 'bg-yellow-100 text-yellow-800',
  good: 'bg-green-100 text-green-800',
  overstocked: 'bg-blue-100 text-blue-800',
};

const categoryColors = {
  Medical: 'bg-red-50 text-red-700',
  Food: 'bg-green-50 text-green-700',
  Water: 'bg-blue-50 text-blue-700',
  Shelter: 'bg-purple-50 text-purple-700',
};

export function InventoryManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<typeof mockInventory[0] | null>(null);

  const filteredInventory = mockInventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStockPercentage = (current: number, min: number, max: number) => {
    return Math.min((current / max) * 100, 100);
  };

  const criticalItems = mockInventory.filter(item => item.status === 'critical').length;
  const lowItems = mockInventory.filter(item => item.status === 'low').length;
  const totalValue = mockInventory.reduce((sum, item) => sum + (item.currentStock * 25), 0); // Mock price calculation

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Inventory Management</h1>
          <p className="text-muted-foreground">
            Track and manage relief supplies across all warehouses
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Truck className="h-4 w-4 mr-2" />
            Request Delivery
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{mockInventory.length}</p>
                <p className="text-sm text-muted-foreground">Total Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-600">{criticalItems}</p>
                <p className="text-sm text-muted-foreground">Critical Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold text-yellow-600">{lowItems}</p>
                <p className="text-sm text-muted-foreground">Low Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Inventory Items</CardTitle>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-48"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Medical">Medical</SelectItem>
                    <SelectItem value="Food">Food</SelectItem>
                    <SelectItem value="Water">Water</SelectItem>
                    <SelectItem value="Shelter">Shelter</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredInventory.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedItem?.id === item.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium">{item.name}</h3>
                        <Badge className={categoryColors[item.category as keyof typeof categoryColors]}>
                          {item.category}
                        </Badge>
                        <Badge className={statusColors[item.status as keyof typeof statusColors]}>
                          {item.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {item.currentStock} {item.unit} • {item.location}
                      </p>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span>Stock Level</span>
                          <span>{item.currentStock}/{item.maxStock} {item.unit}</span>
                        </div>
                        <Progress 
                          value={getStockPercentage(item.currentStock, item.minStock, item.maxStock)} 
                          className="h-2"
                        />
                        <p className="text-xs text-muted-foreground">
                          Min: {item.minStock} • Updated {item.lastUpdated}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {item.status === 'critical' && (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      )}
                      {item.status === 'low' && (
                        <TrendingDown className="h-5 w-5 text-yellow-500" />
                      )}
                      {item.status === 'good' && (
                        <TrendingUp className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Item Details */}
        <div className="space-y-4">
          {selectedItem ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{selectedItem.name}</CardTitle>
                <CardDescription>Item details and management options</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Stock Information</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-2 bg-blue-50 rounded">
                        <p className="text-lg font-bold text-blue-600">{selectedItem.currentStock}</p>
                        <p className="text-xs text-blue-600">Current Stock</p>
                      </div>
                      <div className="text-center p-2 bg-orange-50 rounded">
                        <p className="text-lg font-bold text-orange-600">{selectedItem.minStock}</p>
                        <p className="text-xs text-orange-600">Min Required</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Location</h4>
                    <p className="text-sm text-muted-foreground">{selectedItem.location}</p>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Supplier</h4>
                    <p className="text-sm text-muted-foreground">{selectedItem.supplier}</p>
                  </div>

                  <div className="space-y-2">
                    <Button className="w-full" size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Restock Item
                    </Button>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Truck className="h-4 w-4 mr-1" />
                        Transfer
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        Edit Details
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Select an Item</CardTitle>
                <CardDescription>Click on any item to view details and manage stock</CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full text-left justify-start" size="sm">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  View Critical Items
                </Button>
                <Button variant="outline" className="w-full text-left justify-start" size="sm">
                  <Truck className="h-4 w-4 mr-2" />
                  Schedule Delivery
                </Button>
                <Button variant="outline" className="w-full text-left justify-start" size="sm">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}