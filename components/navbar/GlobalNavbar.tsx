"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useUnreadCounts } from "@/components/providers/UnreadCountProvider"; // ADDED: Centralized unread count management
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Bell,
  Menu,
  User,
  Settings,
  LogOut,
  LayoutDashboard,
  GraduationCap,
  MessageCircle,
  BookOpen,
  Briefcase,
  Laptop,
  Newspaper,
  Users,
  BarChart3,
  MessageSquare,
  UserCircle,
} from "lucide-react";

// Navbar navigation items and each name is a diffrent service or platform 
// that the user can access. Each item has a name, href, and description.
// // The items are used in both desktop and mobile navigation menus.
// The first 8 items are shown in the desktop navigation menu, and the rest are in the dropdown menu.

const navItems = [
  {
    name: "Students Interlinked",
    href: "/students-interlinked",
    description: "Connect with fellow students",
  },
  {
    name: "Messages",
    href: "/messages",
    description: "Chat with students and educators",
  },
  {
    name: "Notifications",
    href: "/notifications",
    description: "Stay updated with latest activity",
  },
  {
    name: "EDU Matrix Hub",
    href: "/edu-matrix-hub",
    description: "Institutions management system",
  },
  {
    name: "Courses",
    href: "/courses",
    description: "Browse available courses",
  },
  {
    name: "Jobs",
    href: "/jobs",
    description: "Career opportunities",
  },
  {
    name: "Freelancing",
    href: "/freelancing",
    description: "Find freelance opportunities",
  },
  {
    name: "Edu News",
    href: "/edu-news",
    description: "Latest education news",
  },
  {
    name: "Community Room",
    href: "/community",
    description: "Join discussions",
  },
  {
    name: "Stats",
    href: "/stats",
    description: "Platform statistics",
  },
  {
    name: "Feedback",
    href: "/feedback",
    description: "Share your feedback",
  },
  {
    name: "Profile",
    href: "/profile",
    description: "Your profile/resume",
  },
];

// Helper component for NavigationMenu list items
const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & { title: string }
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Get unread counts from centralized provider
  const { messageUnreadCount, notificationUnreadCount, isLoading: unreadLoading } = useUnreadCounts();

  const isLoading = status === "loading";
  const isLoggedIn = status === "authenticated";
  // Get user info from session
  const user = session?.user;
  const userInitials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "U";

  // Handle protected navigation
  const handleProtectedNavigation = (href: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
    }
    
    if (!isLoggedIn) {
      // Redirect to sign-in with return URL
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(href)}`);
    } else {
      // Navigate directly to the service
      router.push(href);    }
  };
  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };
  return (
    <div className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      {/* Main Navbar */}
      <div className="container max-w-screen-2xl mx-auto px-3 sm:px-4">
        <div className="flex h-14 sm:h-16 items-center justify-between">
          {/* Logo - Mobile Optimized */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2 sm:space-x-3">
              <Image 
                src="/logo-icon.svg" 
                alt="Edu Matrix Interlinked" 
                width={32} 
                height={32}
                className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0"
              />
              <div className="flex flex-col justify-center">
                <span className="font-bold text-sm sm:text-base bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent leading-tight">
                  EDU Matrix
                </span>
                <span className="text-[10px] sm:text-xs text-primary/70 font-semibold -mt-0.5 leading-tight tracking-wide">
                  INTERLINKED
                </span>
              </div>
            </Link>
          </div>          {/* Desktop Navigation Menu */}
          <div className="hidden lg:flex items-center space-x-1">
            <NavigationMenu>
              <NavigationMenuList className="flex space-x-0.5">
                {navItems.slice(0, 9).map((item) => (
                  <NavigationMenuItem key={item.name}>
                    <button
                      onClick={() => handleProtectedNavigation(item.href)}
                      className={cn(navigationMenuTriggerStyle(), "text-sm font-medium cursor-pointer px-2.5 py-2 relative")}
                    >
                      {item.name}
                      {/* Show unread count badge for Messages */}
                      {item.name === "Messages" && messageUnreadCount > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center"
                        >
                          {messageUnreadCount > 99 ? '99+' : messageUnreadCount}
                        </Badge>
                      )}
                    </button>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
            
            {/* More Menu using proper DropdownMenu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-sm font-medium px-2.5 py-2 h-auto">
                  More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[300px]">
                {navItems.slice(9).map((item) => (
                  <DropdownMenuItem
                    key={item.name}
                    onClick={() => handleProtectedNavigation(item.href)}
                    className="cursor-pointer p-3 flex-col items-start"
                  >
                    <div className="font-medium text-sm">{item.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {item.description}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Messages Quick Access */}
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0" asChild>
              <Link href="/messages" className="relative" title="Messages">
                <MessageCircle className="h-4 w-4" />
                {messageUnreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-4 w-4 text-xs p-0 flex items-center justify-center"
                  >
                    {messageUnreadCount > 9 ? '9+' : messageUnreadCount}
                  </Badge>
                )}
              </Link>
            </Button>
              {/* Notifications */}
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0" asChild>
              <Link href="/notifications" className="relative" title="Notifications">
                <Bell className="h-4 w-4" />
                {notificationUnreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-4 w-4 text-xs p-0 flex items-center justify-center"
                  >
                    {notificationUnreadCount > 9 ? '9+' : notificationUnreadCount}
                  </Badge>
                )}
              </Link>
            </Button>
            
            {/* User Menu or Auth Buttons */}
            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="flex items-center">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                {isLoading ? (
                  <Button variant="ghost" size="sm" disabled className="text-sm font-medium">
                    Loading...
                  </Button>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" className="text-sm font-medium" asChild>
                      <Link href="/auth/signin">Sign in</Link>
                    </Button>
                    <Button size="sm" className="text-sm font-medium" asChild>
                      <Link href="/auth/register">Register</Link>
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Mobile Actions & Menu - Completely Redesigned */}
          <div className="flex md:hidden items-center">
            {/* Mobile Action Bar */}
            <div className="flex items-center space-x-1">
              {/* Mobile Authentication - Always Visible */}
              {!isLoggedIn ? (
                <div className="flex items-center space-x-1">
                  <Button 
                    size="sm" 
                    className="h-9 px-3 text-xs font-medium rounded-full" 
                    asChild
                  >
                    <Link href="/auth/register">Join</Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 px-3 text-xs font-medium rounded-full" 
                    asChild
                  >
                    <Link href="/auth/signin">Sign in</Link>
                  </Button>
                </div>
              ) : (
                <>
                  {/* Mobile Quick Access - Larger Touch Targets */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-10 w-10 p-0 relative touch-manipulation rounded-full" 
                    onClick={() => handleProtectedNavigation('/messages')}
                    aria-label="Messages"
                  >
                    <MessageCircle className="h-5 w-5" />
                    {messageUnreadCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center min-w-[20px] rounded-full"
                      >
                        {messageUnreadCount > 9 ? '9+' : messageUnreadCount}
                      </Badge>
                    )}
                  </Button>

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-10 w-10 p-0 relative touch-manipulation rounded-full" 
                    onClick={() => handleProtectedNavigation('/notifications')}
                    aria-label="Notifications"
                  >
                    <Bell className="h-5 w-5" />
                    {notificationUnreadCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center min-w-[20px] rounded-full"
                      >
                        {notificationUnreadCount > 9 ? '9+' : notificationUnreadCount}
                      </Badge>
                    )}
                  </Button>

                  {/* Mobile Profile Quick Access */}
                  <Button 
                    variant="ghost" 
                    className="h-10 w-10 p-0 rounded-full touch-manipulation" 
                    onClick={() => handleProtectedNavigation('/profile')}
                    aria-label="Profile"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </>
              )}

              {/* Mobile Menu Button */}
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-10 w-10 p-0 ml-1 touch-manipulation rounded-full"
                    aria-label="Open menu"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent 
                  side="right" 
                  className="w-[280px] p-0 flex flex-col h-full"
                >
                  {/* Compact Header */}
                  <SheetHeader className="px-4 py-3 border-b">
                    <SheetTitle className="text-left text-base font-semibold">Menu</SheetTitle>
                  </SheetHeader>
                  
                  {/* Compact Content */}
                  <div className="flex-1 overflow-y-auto">
                    <div className="px-4 py-3 space-y-4">
                      
                      {/* User Info - If Logged In */}
                      {isLoggedIn && (
                        <div className="flex items-center space-x-3 p-3 bg-accent/30 rounded-lg">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                              {userInitials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user?.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                          </div>
                        </div>
                      )}

                      {/* Navigation Links - Compact List */}
                      <div className="space-y-1">
                        {navItems.map((item) => {
                          const hasMessageBadge = item.name === "Messages" && messageUnreadCount > 0;
                          const hasNotificationBadge = item.name === "Notifications" && notificationUnreadCount > 0;
                          const badgeCount = hasMessageBadge ? messageUnreadCount : (hasNotificationBadge ? notificationUnreadCount : 0);
                          
                          return (
                            <button
                              key={item.name}
                              onClick={() => {
                                setIsOpen(false);
                                handleProtectedNavigation(item.href);
                              }}
                              className="flex items-center justify-between w-full p-3 text-left hover:bg-accent rounded-lg transition-colors touch-manipulation group"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                                  {item.name === "Messages" && <MessageCircle className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />}
                                  {item.name === "Students Interlinked" && <GraduationCap className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />}
                                  {item.name === "Notifications" && <Bell className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />}
                                  {item.name === "EDU Matrix Hub" && <LayoutDashboard className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />}
                                  {item.name === "Courses" && <BookOpen className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />}
                                  {item.name === "Jobs" && <Briefcase className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />}
                                  {item.name === "Freelancing" && <Laptop className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />}
                                  {item.name === "Edu News" && <Newspaper className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />}
                                  {item.name === "Community Room" && <Users className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />}
                                  {item.name === "Stats" && <BarChart3 className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />}
                                  {item.name === "Feedback" && <MessageSquare className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />}
                                  {item.name === "Profile" && <UserCircle className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />}
                                </div>
                                <span className="text-sm font-medium">{item.name}</span>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                {(hasMessageBadge || hasNotificationBadge) && (
                                  <Badge 
                                    variant="destructive" 
                                    className="h-4 w-4 text-xs p-0 flex items-center justify-center rounded-full"
                                  >
                                    {badgeCount > 9 ? '9+' : badgeCount}
                                  </Badge>
                                )}
                                {!isLoggedIn && (
                                  <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5">
                                    Login
                                  </Badge>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Account Actions - If Logged In */}
                      {isLoggedIn && (
                        <div className="pt-3 border-t space-y-1">
                          <Link
                            href="/dashboard"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center space-x-3 p-3 text-sm hover:bg-accent rounded-lg transition-colors touch-manipulation"
                          >
                            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                            <span>Dashboard</span>
                          </Link>
                          <Link
                            href="/settings"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center space-x-3 p-3 text-sm hover:bg-accent rounded-lg transition-colors touch-manipulation"
                          >
                            <Settings className="h-4 w-4 text-muted-foreground" />
                            <span>Settings</span>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsOpen(false);
                              handleSignOut();
                            }}
                            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 p-3 h-auto"
                          >
                            <LogOut className="mr-3 h-4 w-4" />
                            Sign out
                          </Button>
                        </div>
                      )}

                      {/* Auth Buttons - If Not Logged In */}
                      {!isLoggedIn && (
                        <div className="pt-3 border-t space-y-2">
                          <Button 
                            className="w-full h-10" 
                            asChild
                          >
                            <Link href="/auth/register" onClick={() => setIsOpen(false)}>
                              Get Started
                            </Link>
                          </Button>
                          <Button 
                            variant="outline" 
                            className="w-full h-10" 
                            asChild
                          >
                            <Link href="/auth/signin" onClick={() => setIsOpen(false)}>
                              Sign in
                            </Link>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
      </div>
    </div>
    </div>
  );
}
