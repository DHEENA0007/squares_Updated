import signupHero from "@/assets/reg-pg.png";

const SignupIllustration: React.FC = () => {
  return (
    <div className="w-full h-auto flex items-center justify-center">
      <img
        src={signupHero}
        alt="Signup Illustration"
        className="w-full h-auto max-w-4xl"
      />
    </div>
  );
};

export default SignupIllustration;