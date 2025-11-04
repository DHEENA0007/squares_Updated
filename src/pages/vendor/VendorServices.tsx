import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building, Clock, Users, Sparkles } from "lucide-react";

const VendorServices = () => {

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="max-w-2xl w-full mx-4 shadow-[var(--shadow-large)]">
        <CardContent className="p-12 text-center">
          {/* Main Icon */}
          <div className="mb-8">
            <div className="relative inline-flex">
              <Building className="w-20 h-20 text-primary mx-auto" />
              <div className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-xs px-2 py-1 rounded-full">
                Soon
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Services Portal
          </h1>
          
          {/* Subtitle */}
          <h2 className="text-xl text-primary mb-6 font-semibold">
            Coming Soon!
          </h2>

          {/* Description */}
          <p className="text-muted-foreground text-lg leading-relaxed mb-8">
            We're working hard to bring you an amazing services platform where you can 
            offer value-added services to your property clients and grow your business.
          </p>

          {/* Features Preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-left">
            <div className="flex items-center space-x-3 p-4 bg-white rounded-lg shadow-sm">
              <Users className="w-6 h-6 text-blue-500" />
              <span className="text-gray-700">Service Management</span>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-white rounded-lg shadow-sm">
              <Sparkles className="w-6 h-6 text-purple-500" />
              <span className="text-gray-700">Premium Services</span>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-white rounded-lg shadow-sm">
              <Clock className="w-6 h-6 text-green-500" />
              <span className="text-gray-700">Real-time Booking</span>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-white rounded-lg shadow-sm">
              <Building className="w-6 h-6 text-orange-500" />
              <span className="text-gray-700">Business Growth Tools</span>
            </div>
          </div>

          {/* CTA Button */}
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 text-lg font-medium"
            disabled
          >
            <Clock className="w-5 h-5 mr-2" />
            Launching Soon
          </Button>

          {/* Footer Text */}
          <p className="text-sm text-gray-500 mt-6">
            Stay tuned for updates! This feature will be available very soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorServices;