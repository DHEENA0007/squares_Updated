import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const propertyFormSchema = z.object({
  userType: z.enum(["owner", "agent", "builder"]),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  phone: z.string().regex(/^[0-9]{10}$/, "Must be 10 digits"),
  lookingTo: z.enum(["sell", "rent", "lease"]),
  propertyType: z.string().min(1, "Required"),
  city: z.string().min(1, "Required"),
  locality: z.string().min(1, "Required"),
  expectedPrice: z.string().min(1, "Required"),
});

export type PropertyFormValues = z.infer<typeof propertyFormSchema>;

export const usePropertyForm = () => {
  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      userType: "owner",
      lookingTo: "sell",
    },
  });

  return { form, propertyFormSchema };
};
