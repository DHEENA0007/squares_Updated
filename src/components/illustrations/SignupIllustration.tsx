import React, { useRef, useEffect } from 'react';

const SignupIllustration: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadGSAP = async () => {
      try {
        // Dynamic import of GSAP with plugins
        const { gsap } = await import('../../../gsap-public/gsap-public/src/index.js');
        
        if (!containerRef.current) return;

        // Create animated gradient background
        gsap.to('.gradient-bg', {
          rotation: 360,
          duration: 20,
          repeat: -1,
          ease: "none",
          transformOrigin: "center"
        });

        // Animate floating cards
        gsap.utils.toArray('.floating-card').forEach((card: any, i: number) => {
          gsap.to(card, {
            y: -20,
            duration: 2 + i * 0.5,
            repeat: -1,
            yoyo: true,
            ease: "power2.inOut",
            delay: i * 0.3
          });

          gsap.from(card, {
            scale: 0,
            rotation: 180,
            duration: 1,
            ease: "back.out(1.7)",
            delay: i * 0.2
          });
        });

        // Animate particles
        gsap.utils.toArray('.particle').forEach((particle: any, i: number) => {
          gsap.set(particle, {
            x: Math.random() * 400,
            y: Math.random() * 300,
            opacity: Math.random() * 0.5 + 0.3
          });

          gsap.to(particle, {
            y: "-=100",
            x: "+=50",
            rotation: 360,
            duration: 8 + Math.random() * 4,
            repeat: -1,
            ease: "none"
          });
        });

        // Text animations
        const titleChars = textRef.current?.querySelectorAll('.title-char');
        if (titleChars) {
          gsap.from(titleChars, {
            y: 100,
            opacity: 0,
            rotation: 45,
            duration: 0.8,
            stagger: 0.05,
            ease: "back.out(1.7)"
          });
        }

        // Stats counters animation
        gsap.utils.toArray('.stat-number').forEach((stat: any) => {
          const endValue = parseInt(stat.textContent);
          const obj = { value: 0 };
          
          gsap.to(obj, {
            value: endValue,
            duration: 2,
            ease: "power2.out",
            onUpdate: () => {
              stat.textContent = Math.round(obj.value);
            },
            delay: 1
          });
        });

        // Interactive hover effects
        gsap.utils.toArray('.interactive-element').forEach((element: any) => {
          const hoverTL = gsap.timeline({ paused: true });
          hoverTL.to(element, {
            scale: 1.1,
            y: -10,
            boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
            duration: 0.3,
            ease: "power2.out"
          });

          element.addEventListener('mouseenter', () => hoverTL.play());
          element.addEventListener('mouseleave', () => hoverTL.reverse());
        });

        return () => {
          gsap.killTweensOf("*");
        };

      } catch (error) {
        console.warn('GSAP not found, using CSS fallback');
      }
    };

    loadGSAP();
  }, []);

  return (
    <div ref={containerRef} className="w-full h-auto flex items-center justify-center p-8 overflow-hidden relative">
      {/* Animated Background */}
      <div className="gradient-bg absolute inset-0 opacity-30 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-400 rounded-2xl"></div>
      
      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-lg mx-auto">
        {/* Hero Text Section */}
        <div ref={textRef} className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            {'Join Our Community'.split('').map((char, i) => (
              <span key={i} className="title-char inline-block" style={{animationDelay: `${i * 0.05}s`}}>
                {char === ' ' ? '\u00A0' : char}
              </span>
            ))}
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Experience the future of real estate with BuildHomeMart Squares
          </p>
          
          {/* Stats Counter */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="text-center">
              <div className="stat-number text-3xl font-bold text-blue-600 mb-2">1000000</div>
              <div className="text-sm text-gray-500">Happy Customers</div>
            </div>
            <div className="text-center">
              <div className="stat-number text-3xl font-bold text-green-600 mb-2">50000</div>
              <div className="text-sm text-gray-500">Properties Listed</div>
            </div>
          </div>
        </div>

        {/* Floating Cards */}
        <div className="space-y-6 mb-8">
          {[
            { icon: '🏠', title: 'Premium Properties', desc: 'Luxury homes and apartments', color: 'from-blue-500 to-purple-600' },
            { icon: '🔑', title: 'Easy Process', desc: 'Simple and secure transactions', color: 'from-green-500 to-teal-600' },
            { icon: '💼', title: 'Expert Support', desc: '24/7 professional assistance', color: 'from-orange-500 to-red-600' },
          ].map((card, i) => (
            <div 
              key={i}
              className={`floating-card interactive-element p-6 rounded-xl bg-gradient-to-r ${card.color} text-white shadow-lg transform transition-all duration-300`}
            >
              <div className="flex items-center space-x-4">
                <div className="text-3xl">{card.icon}</div>
                <div>
                  <h3 className="font-semibold text-lg">{card.title}</h3>
                  <p className="text-sm opacity-90">{card.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Feature Icons Grid */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: '🎯', label: 'Accurate' },
            { icon: '⚡', label: 'Fast' },
            { icon: '🛡️', label: 'Secure' },
            { icon: '💰', label: 'Affordable' },
            { icon: '📱', label: 'Mobile' },
            { icon: '🌟', label: 'Premium' },
          ].map((feature, i) => (
            <div 
              key={i}
              className="floating-card interactive-element text-center p-4 bg-white rounded-lg shadow-md"
            >
              <div className="text-2xl mb-2">{feature.icon}</div>
              <div className="text-xs font-medium text-gray-600">{feature.label}</div>
            </div>
          ))}
        </div>

        {/* Progress Indicators */}
        <div className="flex justify-center space-x-6 mb-8">
          {[85, 92, 78].map((progress, i) => (
            <div key={i} className="text-center">
              <div className="relative w-16 h-16 mb-2">
                <svg className="transform -rotate-90 w-16 h-16">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="#e5e7eb"
                    strokeWidth="4"
                    fill="transparent"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke={`hsl(${120 - i * 40}, 70%, 50%)`}
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress / 100)}`}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-gray-700">{progress}%</span>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {i === 0 ? 'Satisfaction' : i === 1 ? 'Success Rate' : 'Efficiency'}
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-full shadow-lg">
            <span className="text-sm font-medium">Ready to get started?</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className="particle absolute w-2 h-2 bg-white rounded-full opacity-60"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          ></div>
        ))}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .floating-card {
          animation: float 6s ease-in-out infinite;
        }
        
        .floating-card:nth-child(2) {
          animation-delay: -2s;
        }
        
        .floating-card:nth-child(3) {
          animation-delay: -4s;
        }
        
        .title-char {
          animation: fadeInUp 0.8s ease-out forwards;
          opacity: 0;
        }
        
        .particle {
          animation: float 8s ease-in-out infinite;
        }
        
        .gradient-bg {
          animation: float 20s ease-in-out infinite;
        }
        
        .interactive-element {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .interactive-element:hover {
          transform: translateY(-10px) scale(1.02);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
};

export default SignupIllustration;
