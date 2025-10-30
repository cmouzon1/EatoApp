import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Truck, Calendar, CheckCircle, TrendingUp, Users, MapPin } from "lucide-react";
import heroImage from "@assets/generated_images/Food_truck_festival_hero_9868224b.png";

export default function Landing() {
  const features = [
    {
      icon: Truck,
      title: "For Food Trucks",
      description: "Discover catering opportunities and connect with event organizers looking for amazing food",
      cta: "Browse Events",
      href: "/events",
    },
    {
      icon: Calendar,
      title: "For Event Organizers",
      description: "Find the perfect food trucks for your event from our curated marketplace of vendors",
      cta: "Browse Trucks",
      href: "/trucks",
    },
  ];

  const benefits = [
    { icon: CheckCircle, text: "Verified food truck vendors" },
    { icon: TrendingUp, text: "Grow your catering business" },
    { icon: Users, text: "Connect with event organizers" },
    { icon: MapPin, text: "Discover local opportunities" },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[500px] md:h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Food truck festival"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />
        </div>
        
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 font-heading" data-testid="text-hero-title">
            Connect Food Trucks with Events
          </h1>
          <p className="text-lg md:text-xl text-white/95 mb-8 max-w-2xl mx-auto">
            The premier marketplace for food truck owners and event organizers to connect,
            collaborate, and create amazing food experiences
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="text-base px-8" data-testid="button-get-started">
              <a href="/api/login">Get Started</a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="text-base px-8 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
              data-testid="button-browse-trucks"
            >
              <Link href="/trucks">Browse Trucks</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 font-heading">
            Built for Both Sides of the Marketplace
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature) => (
              <Card key={feature.title} className="hover-elevate transition-all duration-300">
                <CardContent className="p-8">
                  <feature.icon className="h-12 w-12 text-primary mb-4" />
                  <h3 className="text-2xl font-semibold mb-3 font-heading">{feature.title}</h3>
                  <p className="text-muted-foreground mb-6">{feature.description}</p>
                  <Button asChild>
                    <Link href={feature.href}>{feature.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 font-heading">
            Why Choose FoodTruck?
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit) => (
              <div key={benefit.text} className="flex items-start gap-3">
                <benefit.icon className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <p className="font-medium">{benefit.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 font-heading">
            Ready to Get Started?
          </h2>
          <p className="text-lg mb-8 opacity-95">
            Join our marketplace today and start connecting with amazing opportunities
          </p>
          <Button size="lg" variant="secondary" asChild className="text-base px-8">
            <a href="/api/login" data-testid="button-sign-up">Sign Up Now</a>
          </Button>
        </div>
      </section>
    </div>
  );
}
