import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Download, Building2, CheckCircle, Clock, XCircle, Search } from "lucide-react";
import { authService } from "@/services/authService";
import { toast } from "@/hooks/use-toast";

interface Property {
  _id: string;
  title: string;
  propertyType: string;
  listingType: string;
  status: string;
  price: number;
  currency: string;
  address: {
    city?: string;
    locality?: string;
  };
  owner: {
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  createdAt: string;
}

const PropertiesDetails = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({
    totalProperties: 0,
    thisMonthProperties: 0,
    activeProperties: 0,
    pendingProperties: 0,
    rejectedProperties: 0,
    soldProperties: 0
  });

  useEffect(() => {
    fetchPropertiesData();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = properties.filter(prop =>
        (prop.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (prop.propertyType?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (prop.address?.city?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (prop.status?.toLowerCase() || '').includes(searchQuery.toLowerCase())
      );
      setFilteredProperties(filtered);
    } else {
      setFilteredProperties(properties);
    }
  }, [searchQuery, properties]);

  const fetchPropertiesData = async () => {
    try {
      const token = authService.getToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/properties?limit=1000`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch properties data');

      const data = await response.json();
      if (data.success) {
        const props = data.data.properties;
        setProperties(props);
        setFilteredProperties(props);

        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const thisMonth = props.filter((p: Property) =>
          new Date(p.createdAt) >= firstDayOfMonth
        ).length;

        setStats({
          totalProperties: props.length,
          thisMonthProperties: thisMonth,
          activeProperties: props.filter((p: Property) => p.status === 'available').length,
          pendingProperties: props.filter((p: Property) => p.status === 'pending').length,
          rejectedProperties: props.filter((p: Property) => p.status === 'rejected').length,
          soldProperties: props.filter((p: Property) => ['sold', 'rented', 'leased'].includes(p.status)).length
        });
      }
    } catch (error) {
      console.error('Error fetching properties data:', error);
      toast({
        title: "Error",
        description: "Failed to load properties data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'sold':
      case 'rented':
      case 'leased':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      default:
        return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/admin/dashboard')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Properties Details</h1>
          <p className="text-muted-foreground">Complete property listings and statistics</p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Properties
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalProperties}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.thisMonthProperties}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.activeProperties}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingProperties}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejectedProperties}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sold/Rented</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.soldProperties}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search properties by title, type, city, or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Properties List */}
      <Card>
        <CardHeader>
          <CardTitle>All Properties ({filteredProperties.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredProperties.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No properties found</p>
            ) : (
              filteredProperties.map((property) => (
                <div key={property._id} className="border rounded-lg p-4 hover:bg-accent/50 transition">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                    <div className="col-span-2">
                      <p className="font-medium">{property.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {property.address.locality}, {property.address.city}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p className="text-sm font-medium">{property.propertyType}</p>
                      <p className="text-xs text-muted-foreground">{property.listingType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Price</p>
                      <p className="font-bold text-emerald-600">{formatCurrency(property.price, property.currency)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Listed</p>
                      <p className="text-sm">{formatDate(property.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(property.status)}
                      <span className="text-sm capitalize">{property.status}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PropertiesDetails;
