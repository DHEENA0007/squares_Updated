import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Edit, Eye, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchWithAuth, handleApiResponse } from "@/utils/apiUtils";

interface PolicySection {
  id: string;
  title: string;
  content: string;
  order: number;
}

interface PrivacyPolicyData {
  _id?: string;
  title: string;
  lastUpdated: string;
  updatedBy: string;
  sections: PolicySection[];
  isActive: boolean;
}

const PrivacyPolicy = () => {
  const [policy, setPolicy] = useState<PrivacyPolicyData>({
    title: "Privacy Policy",
    lastUpdated: new Date().toISOString(),
    updatedBy: "",
    sections: [
      {
        id: "1",
        title: "Information We Collect",
        content: "We collect information you provide directly to us, such as when you create an account, list a property, or contact us for support...",
        order: 1
      },
      {
        id: "2", 
        title: "How We Use Your Information",
        content: "We use the information we collect to provide, maintain, and improve our services, including to process transactions and communicate with you...",
        order: 2
      },
      {
        id: "3",
        title: "Information Sharing", 
        content: "We may share your information in certain limited circumstances, such as with your consent or to comply with legal obligations...",
        order: 3
      },
      {
        id: "4",
        title: "Data Security",
        content: "We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction...",
        order: 4
      },
      {
        id: "5",
        title: "Your Rights and Choices",
        content: "You have certain rights regarding your personal information, including the right to access, update, or delete your data...",
        order: 5
      },
      {
        id: "6",
        title: "Cookies and Tracking",
        content: "We use cookies and similar tracking technologies to enhance your experience on our platform and analyze usage patterns...",
        order: 6
      },
      {
        id: "7",
        title: "Contact Information",
        content: "If you have any questions about this Privacy Policy, please contact us at privacy@buildhomemartsquares.com...",
        order: 7
      }
    ],
    isActive: true
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth('/subadmin/policies/privacy');
      const data = await handleApiResponse<{ data: PrivacyPolicyData }>(response);
      
      if (data.data) {
        setPolicy(data.data);
      }
    } catch (error: any) {
      console.log('No existing policy found, using default');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetchWithAuth('/subadmin/policies/privacy', {
        method: 'POST',
        body: JSON.stringify(policy)
      });
      
      const data = await handleApiResponse(response);
      
      toast({
        title: "Success",
        description: "Privacy policy updated successfully",
      });
      
      setIsEditing(false);
      await fetchPolicy();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save privacy policy",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSection = (sectionId: string, field: keyof PolicySection, value: string) => {
    setPolicy(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId 
          ? { ...section, [field]: value }
          : section
      )
    }));
  };

  const addSection = () => {
    const newSection: PolicySection = {
      id: Date.now().toString(),
      title: "New Section",
      content: "Enter section content here...",
      order: policy.sections.length + 1
    };
    
    setPolicy(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
  };

  const removeSection = (sectionId: string) => {
    setPolicy(prev => ({
      ...prev,
      sections: prev.sections.filter(section => section.id !== sectionId)
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="text-muted-foreground mt-1">
            Manage the platform's privacy policy
          </p>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="text-muted-foreground mt-1">
            Manage the platform's privacy policy and data protection terms
          </p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Policy
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {isEditing ? (
              <Input
                value={policy.title}
                onChange={(e) => setPolicy(prev => ({ ...prev, title: e.target.value }))}
                className="text-lg font-semibold"
              />
            ) : (
              policy.title
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {policy.sections.map((section) => (
              <div key={section.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  {isEditing ? (
                    <Input
                      value={section.title}
                      onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                      className="font-semibold"
                    />
                  ) : (
                    <h3 className="text-lg font-semibold">{section.title}</h3>
                  )}
                  {isEditing && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeSection(section.id)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                
                {isEditing ? (
                  <Textarea
                    value={section.content}
                    onChange={(e) => updateSection(section.id, 'content', e.target.value)}
                    rows={6}
                    className="w-full"
                  />
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{section.content}</p>
                  </div>
                )}
              </div>
            ))}
            
            {isEditing && (
              <Button variant="outline" onClick={addSection} className="w-full">
                Add New Section
              </Button>
            )}
          </div>
          
          <div className="mt-6 pt-4 border-t text-sm text-muted-foreground">
            <p>Last updated: {new Date(policy.lastUpdated).toLocaleDateString()}</p>
            <p>Status: <span className="text-green-600 font-medium">Active</span></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivacyPolicy;
