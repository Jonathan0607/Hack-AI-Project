"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Home, Key, MapPin, Phone, Mail, Shield } from "lucide-react";

export default function HousingLandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-md">
                <Home className="w-5 h-5" />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-800">
                Clearview Homes
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#" className="text-slate-500 hover:text-blue-600 font-medium transition-colors">Properties</a>
              <a href="#" className="text-slate-500 hover:text-blue-600 font-medium transition-colors">Services</a>
              <a href="#" className="text-slate-500 hover:text-blue-600 font-medium transition-colors">About Us</a>
              <a href="#" className="text-slate-500 hover:text-blue-600 font-medium transition-colors">Contact</a>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-all shadow-sm hover:shadow">
                Schedule Tour
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-white pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-blue-50 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-40 mix-blend-overlay"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6 leading-tight">
            Find Your <span className="text-blue-600">Perfect Space</span> Today
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-slate-600 mb-10 leading-relaxed">
            Discover a place to thrive with our modern, comfortable, and affordable properties tailored to your unique lifestyle.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-lg shadow-blue-600/20 hover:shadow-xl hover:-translate-y-0.5">
              Browse Properties
            </button>
            <button className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-sm hover:shadow">
              Meet Our Agents
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { icon: Shield, title: "Secure Living", desc: "Enjoy peace of mind with 24/7 monitoring and controlled access." },
              { icon: MapPin, title: "Prime Locations", desc: "Our properties are near the best schools, parks, and dining." },
              { icon: Key, title: "Easy Move-in", desc: "Streamlined processes mean you get your keys faster than ever." },
            ].map((feature, i) => (
              <div key={i} className="text-center p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-100 transition-colors">
                <div className="w-14 h-14 mx-auto bg-blue-100 text-blue-600 flex items-center justify-center rounded-2xl mb-6 shadow-sm">
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5 text-slate-500" />
            <span className="font-semibold text-slate-200">Clearview Homes Inc.</span>
          </div>
          <div className="flex gap-6 text-sm">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            {/* The Special Button to trigger the real login */}
            <button 
              onClick={() => router.push('/login')}
              className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              Agent Portal
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
