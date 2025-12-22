import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Clock,
  Bell,
  Star,
  TrendingUp,
  Zap,
  ArrowRight
} from "lucide-react";

const VendorLeads = () => {
  return (
    <div className="space-y-6 mt-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads Management</h1>
          <p className="text-muted-foreground">Track and manage your property inquiries</p>
        </div>
      </div>

      {/* Coming Soon Section */}
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-2xl mx-auto">
          <CardContent className="p-12 text-center">
            {/* Icon */}
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-12 h-12 text-primary" />
            </div>

            {/* Title */}
            <h2 className="text-3xl font-bold mb-4">Coming Soon</h2>
            
            {/* Description */}
            <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
              We're building an amazing leads management system to help you track, manage, and convert your property inquiries more effectively.
            </p>

            {/* Features Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg">
                <Bell className="w-6 h-6 text-blue-500" />
                <div className="text-left">
                  <h4 className="font-semibold">Real-time Notifications</h4>
                  <p className="text-sm text-muted-foreground">Get instant alerts for new leads</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg">
                <Star className="w-6 h-6 text-yellow-500" />
                <div className="text-left">
                  <h4 className="font-semibold">Lead Scoring</h4>
                  <p className="text-sm text-muted-foreground">Prioritize high-quality leads</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-500" />
                <div className="text-left">
                  <h4 className="font-semibold">Analytics & Insights</h4>
                  <p className="text-sm text-muted-foreground">Track conversion rates</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg">
                <Zap className="w-6 h-6 text-purple-500" />
                <div className="text-left">
                  <h4 className="font-semibold">Quick Actions</h4>
                  <p className="text-sm text-muted-foreground">Respond to leads instantly</p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="mb-8">
              <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Expected launch: Coming Soon</span>
              </div>
            </div>

            {/* Action Button */}
            <Button size="lg" className="group">
              Get Notified When Ready
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>

            {/* Contact Info */}
            <div className="mt-8 pt-8 border-t">
              <p className="text-sm text-muted-foreground">
                Questions about leads management? Contact our support team
              </p>
              <Button variant="link" size="sm" className="mt-2">
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Preview (Placeholder) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 opacity-50">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold">--</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">New Today</p>
                <p className="text-2xl font-bold">--</p>
              </div>
              <Bell className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">--%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Response</p>
                <p className="text-2xl font-bold">--h</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VendorLeads;
