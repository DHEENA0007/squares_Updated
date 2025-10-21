import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  Heart, 
  Search, 
  Plus,
  MessageSquare,
  TrendingUp,
  Calendar,
  MapPin,
  Star,
  Eye
} from "lucide-react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  // Mock data - in real app, this would come from API
  const stats = [
    {
      title: "Properties Viewed",
      value: "47",
      change: "+12 this week",
      icon: Eye,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Saved Favorites",
      value: "8",
      change: "+3 new",
      icon: Heart,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      title: "Active Inquiries",
      value: "5",
      change: "2 pending response",
      icon: MessageSquare,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "My Properties",
      value: "2",
      change: "1 active listing",
      icon: Home,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  const recentActivities = [
    {
      id: 1,
      type: "favorite",
      message: "Added property to favorites",
      property: "3BHK Apartment in Powai",
      time: "2 hours ago",
      icon: Heart,
    },
    {
      id: 2,
      type: "inquiry",
      message: "Sent inquiry for property",
      property: "Villa in Whitefield",
      time: "1 day ago",
      icon: MessageSquare,
    },
    {
      id: 3,
      type: "search",
      message: "Searched properties in Mumbai",
      property: "Mumbai, Maharashtra",
      time: "2 days ago",
      icon: Search,
    },
  ];

  const recommendedProperties = [
    {
      id: 1,
      title: "Luxury 3BHK Apartment",
      location: "Bandra West, Mumbai",
      price: "₹1.5 Cr",
      image: "/api/placeholder/300/200",
      rating: 4.5,
    },
    {
      id: 2,
      title: "Modern Villa with Garden",
      location: "Koramangala, Bangalore",
      price: "₹2.8 Cr",
      image: "/api/placeholder/300/200",
      rating: 4.8,
    },
    {
      id: 3,
      title: "Premium 2BHK Flat",
      location: "Gurgaon, Delhi NCR",
      price: "₹95 Lac",
      image: "/api/placeholder/300/200",
      rating: 4.3,
    },
  ];

  return (
    <div className="space-y-6 pt-16">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, John!</h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your property journey
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/customer/search">
            <Button>
              <Search className="w-4 h-4 mr-2" />
              Search Properties
            </Button>
          </Link>
          <Link to="/customer/post-property">
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Post Property
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest interactions and searches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div key={activity.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.message}</p>
                      <p className="text-sm text-muted-foreground">{activity.property}</p>
                      <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4">
              <Button variant="outline" className="w-full">
                View All Activity
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Frequently used features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/customer/favorites">
              <Button variant="outline" className="w-full justify-start">
                <Heart className="w-4 h-4 mr-2" />
                My Favorites (8)
              </Button>
            </Link>
            <Link to="/customer/messages">
              <Button variant="outline" className="w-full justify-start">
                <MessageSquare className="w-4 h-4 mr-2" />
                Messages (3)
              </Button>
            </Link>
            <Link to="/customer/my-properties">
              <Button variant="outline" className="w-full justify-start">
                <Home className="w-4 h-4 mr-2" />
                My Properties
              </Button>
            </Link>
            <Link to="/customer/services">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="w-4 h-4 mr-2" />
                Book Services
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recommended Properties */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Recommended for You</CardTitle>
              <CardDescription>Properties matching your preferences</CardDescription>
            </div>
            <Link to="/customer/search">
              <Button variant="outline">View All</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendedProperties.map((property) => (
              <div key={property.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <Home className="w-12 h-12 text-muted-foreground" />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm line-clamp-1">{property.title}</h3>
                    <Button size="sm" variant="ghost" className="p-1">
                      <Heart className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground mb-2">
                    <MapPin className="w-3 h-3 mr-1" />
                    <span className="line-clamp-1">{property.location}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary">{property.price}</span>
                    <div className="flex items-center">
                      <Star className="w-3 h-3 text-yellow-400 mr-1" />
                      <span className="text-xs">{property.rating}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle>Your Subscription</CardTitle>
          <CardDescription>Current plan and benefits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Premium Plan</h3>
                <p className="text-sm text-muted-foreground">Active until Dec 31, 2024</p>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="default" className="mb-2">Active</Badge>
              <p className="text-sm text-muted-foreground">25 days remaining</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span>Property listings priority</span>
              <Badge variant="secondary">Enabled</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;