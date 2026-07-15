import { Navbar } from "@/components/Navbar";
import { TickerRibbon } from "@/components/TickerRibbon";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Users, Target, Award } from "lucide-react";
import { SEO } from "@/components/SEO";

const stats = [
  { label: "Active Traders", value: "50,000+", icon: Users },
  { label: "Data Points Analyzed", value: "10M+", icon: TrendingUp },
  { label: "Accuracy Rate", value: "99.9%", icon: Target },
  { label: "Years of Experience", value: "5+", icon: Award },
];

const About = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="About OptionWorld — Institutional-Grade Options Analytics"
        description="Learn about OptionWorld, our mission to deliver institutional-grade options analytics to Indian NSE traders, and the team behind the platform."
        path="/about"
      />
      <div className="sticky top-0 z-50">
        <TickerRibbon />
        <Navbar />
      </div>
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">About OptionWorld</h1>
            <p className="text-xl text-muted-foreground">
              Empowering retail traders with institutional-grade analytics and tools for the Indian options market.
            </p>
          </div>
        </section>

        {/* Stats Section */}
        <section className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <Card key={index} className="text-center">
                <CardContent className="pt-6">
                  <stat.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Mission Section */}
        <section className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-center">Our Mission</h2>
            <p className="text-lg text-muted-foreground mb-4">
              At OptionWorld, we believe every trader deserves access to professional-grade tools. Our mission is to democratize options analytics and give retail traders the same edge that institutions have.
            </p>
            <p className="text-lg text-muted-foreground">
              Founded in 2020, we've grown from a small team of traders and developers to a platform serving thousands of active traders across India. We're committed to continuous innovation and delivering the most accurate, real-time data for informed trading decisions.
            </p>
          </div>
        </section>

        {/* Values Section */}
        <section className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-center">Our Values</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-lg mb-2">Transparency</h3>
                  <p className="text-muted-foreground">We provide clear, accurate data so traders can make informed decisions with confidence.</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-lg mb-2">Innovation</h3>
                  <p className="text-muted-foreground">We continuously improve our platform with cutting-edge analytics and features.</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-lg mb-2">Reliability</h3>
                  <p className="text-muted-foreground">Our infrastructure ensures 99.9% uptime during market hours when you need it most.</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-lg mb-2">Community</h3>
                  <p className="text-muted-foreground">We're building a community of informed traders who share knowledge and grow together.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
