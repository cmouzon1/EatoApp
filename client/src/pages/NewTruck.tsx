import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { insertTruckSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { z } from "zod";

export default function NewTruck() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<z.infer<typeof insertTruckSchema>>({
    resolver: zodResolver(insertTruckSchema),
    defaultValues: {
      ownerId: user?.id || "",
      name: "",
      cuisine: "",
      description: "",
      priceRange: "",
      menuItems: [],
      images: [],
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: z.infer<typeof insertTruckSchema>) => {
      const response = await apiRequest("POST", "/api/trucks", values);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create truck");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trucks/my-trucks"] });
      toast({
        title: "Truck created",
        description: "Your truck has been created successfully",
      });
      setLocation("/dashboard/truck");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create truck",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof insertTruckSchema>) => {
    createMutation.mutate({ ...values, ownerId: user?.id || "" });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Please log in to create a truck</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Create New Truck</h1>
          <p className="text-muted-foreground">
            Add your food truck to start receiving booking requests
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Truck Details</CardTitle>
            <CardDescription>
              Fill in the information about your food truck
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Truck Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Taco Paradise"
                          value={field.value || ""}
                          onChange={field.onChange}
                          data-testid="input-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cuisine"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cuisine Type</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Mexican, Asian Fusion, BBQ"
                          value={field.value || ""}
                          onChange={field.onChange}
                          data-testid="input-cuisine"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your food truck, specialties, and what makes you unique..."
                          value={field.value || ""}
                          onChange={field.onChange}
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormDescription>
                        Share what makes your food truck special
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priceRange"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price Range</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. $, $$, $$$"
                          value={field.value || ""}
                          onChange={field.onChange}
                          data-testid="input-price-range"
                        />
                      </FormControl>
                      <FormDescription>
                        Use $ signs to indicate price range ($ = budget-friendly, $$$ = upscale)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/dashboard/truck")}
                    data-testid="button-cancel-truck"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    data-testid="button-save-truck"
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Truck"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
