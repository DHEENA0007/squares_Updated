export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  createdAt: string;
  status: "active" | "inactive";
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingPeriod: "monthly" | "yearly";
  features: string[];
  subscriberCount: number;
  status: "active" | "inactive";
}

export interface SubscribedClient {
  id: string;
  name: string;
  email: string;
  planName: string;
  subscriptionDate: string;
  expiryDate: string;
  status: "active" | "expired" | "cancelled";
  amount: number;
}

export interface Property {
  id: string;
  title: string;
  address: string;
  type: "apartment" | "house" | "commercial" | "land";
  price: number;
  area: number;
  bedrooms?: number;
  bathrooms?: number;
  status: "available" | "sold" | "pending";
  listedDate: string;
}

export const sampleRoles: Role[] = [
  {
    id: "1",
    name: "Administrator",
    description: "Full system access with all permissions",
    permissions: ["create", "read", "update", "delete", "manage_users"],
    userCount: 5,
    createdAt: "2024-01-15",
    status: "active",
  },
  {
    id: "2",
    name: "Manager",
    description: "Manage content and users",
    permissions: ["create", "read", "update", "manage_content"],
    userCount: 12,
    createdAt: "2024-01-20",
    status: "active",
  },
  {
    id: "3",
    name: "Editor",
    description: "Edit and publish content",
    permissions: ["create", "read", "update"],
    userCount: 25,
    createdAt: "2024-02-01",
    status: "active",
  },
  {
    id: "4",
    name: "Viewer",
    description: "Read-only access",
    permissions: ["read"],
    userCount: 50,
    createdAt: "2024-02-10",
    status: "active",
  },
];

export const samplePlans: Plan[] = [
  {
    id: "1",
    name: "Basic",
    price: 9.99,
    currency: "USD",
    billingPeriod: "monthly",
    features: ["5 Projects", "Basic Support", "10GB Storage"],
    subscriberCount: 150,
    status: "active",
  },
  {
    id: "2",
    name: "Professional",
    price: 29.99,
    currency: "USD",
    billingPeriod: "monthly",
    features: ["Unlimited Projects", "Priority Support", "100GB Storage", "Advanced Analytics"],
    subscriberCount: 85,
    status: "active",
  },
  {
    id: "3",
    name: "Enterprise",
    price: 99.99,
    currency: "USD",
    billingPeriod: "monthly",
    features: ["Unlimited Everything", "24/7 Support", "1TB Storage", "Custom Integrations", "SLA"],
    subscriberCount: 20,
    status: "active",
  },
  {
    id: "4",
    name: "Yearly Basic",
    price: 99.99,
    currency: "USD",
    billingPeriod: "yearly",
    features: ["5 Projects", "Basic Support", "10GB Storage", "2 Months Free"],
    subscriberCount: 45,
    status: "active",
  },
];

export const sampleClients: SubscribedClient[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john.doe@example.com",
    planName: "Professional",
    subscriptionDate: "2024-01-15",
    expiryDate: "2025-01-15",
    status: "active",
    amount: 29.99,
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane.smith@example.com",
    planName: "Basic",
    subscriptionDate: "2024-02-01",
    expiryDate: "2025-02-01",
    status: "active",
    amount: 9.99,
  },
  {
    id: "3",
    name: "Acme Corporation",
    email: "contact@acme.com",
    planName: "Enterprise",
    subscriptionDate: "2023-12-01",
    expiryDate: "2024-12-01",
    status: "expired",
    amount: 99.99,
  },
  {
    id: "4",
    name: "Tech Startup Inc",
    email: "admin@techstartup.io",
    planName: "Professional",
    subscriptionDate: "2024-03-10",
    expiryDate: "2024-06-10",
    status: "cancelled",
    amount: 29.99,
  },
  {
    id: "5",
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    planName: "Yearly Basic",
    subscriptionDate: "2024-01-01",
    expiryDate: "2025-01-01",
    status: "active",
    amount: 99.99,
  },
];

export const sampleProperties: Property[] = [
  {
    id: "1",
    title: "Modern Downtown Apartment",
    address: "123 Main St, New York, NY 10001",
    type: "apartment",
    price: 550000,
    area: 1200,
    bedrooms: 2,
    bathrooms: 2,
    status: "available",
    listedDate: "2024-01-15",
  },
  {
    id: "2",
    title: "Luxury Family House",
    address: "456 Oak Avenue, Los Angeles, CA 90001",
    type: "house",
    price: 1200000,
    area: 3500,
    bedrooms: 4,
    bathrooms: 3,
    status: "available",
    listedDate: "2024-02-01",
  },
  {
    id: "3",
    title: "Commercial Office Space",
    address: "789 Business Blvd, San Francisco, CA 94102",
    type: "commercial",
    price: 2500000,
    area: 5000,
    status: "pending",
    listedDate: "2024-01-20",
  },
  {
    id: "4",
    title: "Prime Development Land",
    address: "321 Rural Road, Austin, TX 78701",
    type: "land",
    price: 350000,
    area: 10000,
    status: "available",
    listedDate: "2024-03-01",
  },
  {
    id: "5",
    title: "Cozy Studio Apartment",
    address: "567 Park Place, Chicago, IL 60601",
    type: "apartment",
    price: 280000,
    area: 600,
    bedrooms: 1,
    bathrooms: 1,
    status: "sold",
    listedDate: "2023-12-15",
  },
];
