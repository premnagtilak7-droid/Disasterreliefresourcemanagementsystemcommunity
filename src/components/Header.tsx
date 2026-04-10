import React from 'react';
import { User } from './AuthSystem';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { ThemeToggle } from './ThemeToggle';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from './ui/dropdown-menu';
import { 
  Shield, 
  Heart, 
  Users, 
  UserCheck, 
  LogOut, 
  Settings,
  Bell,
  Menu
} from 'lucide-react';
import { navigationItems, roleColors } from './constants/uiConstants';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  activeView: string;
  setActiveView: (view: string) => void;
}

const roleIcons = {
  admin: Shield,
  donor: Heart,
  volunteer: Users,
  victim: UserCheck,
};

export function Header({ user, onLogout, activeView, setActiveView }: HeaderProps) {
  const Icon = roleIcons[user.role];
  const navigation = navigationItems[user.role];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 border-b border-border/50 shadow-sm transition-colors duration-300">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 rounded-lg flex items-center justify-center shadow-sm transition-all duration-200 hover:shadow-md">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-lg font-semibold">Relief Portal</h1>
          </div>
          
          <nav className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => (
              <Button
                key={item.id}
                variant={activeView === item.id ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveView(item.id)}
                className="text-sm transition-all duration-200 hover:scale-105"
              >
                {item.label}
              </Button>
            ))}
          </nav>
        </div>

        <div className="flex items-center space-x-3">
          <ThemeToggle />
          
          <Button variant="ghost" size="sm" className="relative transition-all duration-200 hover:scale-105">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs"></span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 px-2 transition-all duration-200 hover:bg-accent/50">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium">{user.name}</span>
                  <Badge className={`text-xs ${roleColors[user.role]}`}>
                    <Icon className="h-3 w-3 mr-1" />
                    {user.role}
                  </Badge>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex flex-col space-y-1 p-2">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="sm" className="md:hidden">
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}